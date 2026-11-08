// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  createOrderFixtureLookup,
  deleteOrderFixture,
} from "../fixtures/order-integration-lookup";
import { createDatabase } from "@/db/client";
import { OrderError } from "@/lib/validation/order";
import {
  fixtureTarget,
  OrderIntegrationFixtures,
  readFixtureReceipt,
  reconcileFixtureReceipt,
  reconcileOrderRun,
  type FixtureLookup,
} from "../fixtures/order-integration-fixtures";

const target = fixtureTarget(
  "mysql://fixture:synthetic@testing.invalid:4000/courier_route_planner_testing",
);
// Windows reads ACLs through bounded subprocesses at more than one step.
vi.setConfig({ testTimeout: 20_000 });
const directories: string[] = [];
type TestAcl = "private" | "broad" | "traverse-only";
function setWindowsTestAcl(dir: string, mode: TestAcl) {
  const windows = process.env.SystemRoot!;
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$path = $env:ORDER_RECEIPT_TEST_PATH
$user = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = Get-Acl -LiteralPath $path
$acl.SetAccessRuleProtection($true, $false)
$inherit = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
$rights = if ($env:ORDER_RECEIPT_TEST_MODE -eq 'traverse-only') { 'Modify' } else { 'FullControl' }
$acl.SetAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
  $user, $rights, $inherit, 'None', 'Allow'))
if ($env:ORDER_RECEIPT_TEST_MODE -ne 'private') {
  $everyone = [Security.Principal.SecurityIdentifier]::new('S-1-1-0')
  if ($env:ORDER_RECEIPT_TEST_MODE -eq 'broad') {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
      $everyone, 'Read', $inherit, 'None', 'Allow'))
  } else {
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new(
      $everyone, 'Traverse, Synchronize', 'None', 'None', 'Allow'))
  }
}
Set-Acl -LiteralPath $path -AclObject $acl
`;
  execFileSync(
    join(windows, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      Buffer.from(script, "utf16le").toString("base64"),
    ],
    {
      env: {
        NODE_ENV: "test",
        SystemRoot: windows,
        ORDER_RECEIPT_TEST_PATH: dir,
        ORDER_RECEIPT_TEST_MODE: mode,
      },
      stdio: "ignore",
      windowsHide: true,
      timeout: 5000,
    },
  );
}
function privateDirectory(mode: TestAcl = "private") {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "order-receipt-test-")));
  directories.push(dir);
  if (process.platform === "win32") setWindowsTestAcl(dir, mode);
  else chmodSync(dir, mode === "broad" ? 0o755 : 0o700);
  return dir;
}
function fixture() {
  return new OrderIntegrationFixtures(privateDirectory(), target);
}
afterEach(() => {
  for (const dir of directories.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

async function setupScenario(run: OrderIntegrationFixtures) {
  const depot = await run.insert("depot", run.tag + "-depot", null, async () =>
    BigInt(1),
  );
  return run.insert("scenario", run.tag + "-scenario", depot, async () =>
    BigInt(2),
  );
}
function code(run: OrderIntegrationFixtures, suffix = "CAFÉ") {
  return run.tag.toUpperCase() + "-" + suffix;
}

it("publishes the initial receipt and CREATE intent before transport and saves the ID before returning", async () => {
  const run = fixture();
  expect(readFixtureReceipt(run.receiptFile)).toMatchObject({
    runId: run.runId,
    fixtures: [],
  });
  const scenario = await setupScenario(run);
  const taggedName = code(run);
  const id = BigInt("9007199254740997");
  await run.insert("order", taggedName, scenario, async () => {
    expect(readFixtureReceipt(run.receiptFile).fixtures.at(-1)).toEqual({
      kind: "order",
      taggedName,
      parentId: "2",
      id: null,
      state: "create-intent",
    });
    return id;
  });
  expect(readFixtureReceipt(run.receiptFile).fixtures).toMatchObject([
    { kind: "depot", id: "1", parentId: null, state: "created" },
    { kind: "scenario", id: "2", parentId: "1", state: "created" },
    { kind: "order", id: "9007199254740997", parentId: "2", state: "created" },
  ]);
});

it("recovers an empty run interrupted before the first CREATE", async () => {
  const run = fixture();
  const lookup = vi.fn();
  await expect(
    reconcileFixtureReceipt(run.receiptFile, lookup),
  ).resolves.toEqual([]);
  expect(lookup).not.toHaveBeenCalled();
});

it("uses the durable tag to recover a row after CREATE without an acknowledged ID", async () => {
  const run = fixture();
  const scenario = await setupScenario(run);
  const taggedName = code(run);
  const id = "9007199254740997";
  const insert = vi.fn(async () => {
    throw new Error("private provider detail");
  });
  await expect(
    run.insert("order", taggedName, scenario, insert),
  ).rejects.toThrow(
    /^Manual reconciliation required: INSERT_OUTCOME_UNCERTAIN$/,
  );
  await expect(
    run.insert("order", taggedName, scenario, insert),
  ).rejects.toThrow();
  expect(insert).toHaveBeenCalledTimes(1);

  const receiptBefore = readFileSync(run.receiptFile);
  const lookup = vi.fn(async (fixture: Parameters<FixtureLookup>[0]) =>
    fixture.kind === "order" ? [{ id, taggedName, parentId: "2" }] : [],
  );
  const recovered = await reconcileFixtureReceipt(run.receiptFile, lookup);
  expect(lookup).toHaveBeenCalledWith({
    kind: "order",
    taggedName,
    parentId: "2",
    id: null,
    state: "create-intent",
  });
  expect(recovered.at(-1)).toMatchObject({ id, status: "present" });
  expect(readFileSync(run.receiptFile)).toEqual(receiptBefore);

  const noRows = await reconcileFixtureReceipt(run.receiptFile, async () => []);
  expect(noRows.at(-1)).toMatchObject({ id: null, status: "unresolved" });
});

it("recovers an acknowledged ID from disk without replaying CREATE", async () => {
  const run = fixture();
  const taggedName = run.tag + "-depot";
  await run.insert("depot", taggedName, null, async () => BigInt(1));
  const lookup = vi.fn(async () => [{ id: "1", taggedName, parentId: null }]);
  const recovered = await reconcileFixtureReceipt(run.receiptFile, lookup);
  expect(lookup).toHaveBeenCalledTimes(1);
  expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
  expect(recovered).toMatchObject([{ id: "1", status: "present" }]);
});

it("refuses transport when the intent cannot be persisted", async () => {
  const run = fixture();
  renameSync(run.receiptFile, run.receiptFile + ".backup");
  const insert = vi.fn();
  await expect(
    run.insert("depot", run.tag + "-depot", null, insert),
  ).rejects.toThrow("RECEIPT_WRITE_FAILED");
  expect(insert).not.toHaveBeenCalled();
});

it("stops on ID persistence failure and retains the durable intent", async () => {
  const run = fixture();
  await expect(
    run.insert("depot", run.tag + "-depot", null, async () => {
      writeFileSync(run.receiptFile + ".next", "simulated interrupted write", {
        flag: "wx",
      });
      return BigInt(1);
    }),
  ).rejects.toThrow("RECEIPT_WRITE_FAILED");
  expect(readFixtureReceipt(run.receiptFile).fixtures).toMatchObject([
    { id: null, state: "create-intent" },
  ]);
  const remove = vi.fn(),
    lookup = vi.fn();
  await expect(run.cleanup(lookup, remove)).rejects.toThrow();
  expect(lookup).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

it.each(["corrupt", "missing"])(
  "rejects a %s receipt before any reconciliation read",
  async (state) => {
    const run = fixture();
    if (state === "corrupt") writeFileSync(run.receiptFile, '{"version":1}');
    else renameSync(run.receiptFile, run.receiptFile + ".backup");
    const lookup = vi.fn();
    await expect(
      reconcileFixtureReceipt(run.receiptFile, lookup),
    ).rejects.toThrow("RECEIPT_INVALID");
    expect(lookup).not.toHaveBeenCalled();
  },
);

it("cleans child-first and persists independently verified absence", async () => {
  const run = fixture();
  const scenario = await setupScenario(run);
  const taggedName = code(run);
  await run.insert("order", taggedName, scenario, async () => BigInt(3));
  const rows = new Map([
    ["1", { id: "1", taggedName: run.tag + "-depot", parentId: null }],
    ["2", { id: "2", taggedName: run.tag + "-scenario", parentId: "1" }],
    ["3", { id: "3", taggedName, parentId: "2" }],
  ]);
  const removed: string[] = [];
  await run.cleanup(
    async ({ id }) => {
      const row = rows.get(id ?? "");
      return row ? [row] : [];
    },
    async (entry) => {
      expect(
        readFixtureReceipt(run.receiptFile).fixtures.find(
          (f) => f.id === entry.id,
        )?.state,
      ).toBe("delete-intent");
      removed.push(entry.id!);
      rows.delete(entry.id!);
    },
  );
  expect(removed).toEqual(["3", "2", "1"]);
  expect(readFixtureReceipt(run.receiptFile)).toMatchObject({
    cleanupComplete: true,
    fixtures: [{ state: "absent" }, { state: "absent" }, { state: "absent" }],
  });
});

it("preserves partial cleanup when a later delete acknowledgement is lost", async () => {
  const run = fixture();
  const scenario = await setupScenario(run);
  const taggedName = code(run);
  await run.insert("order", taggedName, scenario, async () => BigInt(3));
  const removed = new Set<string>();
  const lookup = async ({
    id,
    taggedName,
    parentId,
  }: {
    id: string | null;
    taggedName: string;
    parentId: string | null;
  }) => (!id || removed.has(id) ? [] : [{ id, taggedName, parentId }]);
  const remove = vi.fn(async ({ id }: { id: string }) => {
    removed.add(id);
    if (id === "2") throw Error("connection lost");
  });
  await expect(run.cleanup(lookup, remove)).rejects.toThrow();
  await expect(run.cleanup(lookup, remove)).rejects.toThrow();
  expect(remove.mock.calls.map(([entry]) => entry.id)).toEqual(["3", "2"]);
  expect(readFixtureReceipt(run.receiptFile).fixtures).toMatchObject([
    { id: "1", state: "created" },
    { id: "2", state: "delete-intent" },
    { id: "3", state: "absent" },
  ]);
  await expect(
    reconcileFixtureReceipt(run.receiptFile, lookup),
  ).resolves.toMatchObject([
    { id: "1", status: "present" },
    { id: "2", status: "absent" },
    { id: "3", status: "absent" },
  ]);
});

it.each(["tag", "parent", "id"])(
  "refuses DELETE on mismatched %s",
  async (wrong) => {
    const run = fixture();
    const scenario = await setupScenario(run);
    const taggedName = code(run);
    await run.insert("order", taggedName, scenario, async () => BigInt(3));
    const remove = vi.fn();
    const lookup = async () => [
      {
        id: wrong === "id" ? "4" : "3",
        taggedName: wrong === "tag" ? taggedName + "-different" : taggedName,
        parentId: wrong === "parent" ? "4" : "2",
      },
    ];
    await expect(run.cleanup(lookup, remove)).rejects.toThrow();
    expect(remove).not.toHaveBeenCalled();
    expect(
      (await reconcileFixtureReceipt(run.receiptFile, lookup)).at(-1),
    ).toMatchObject({ status: "mismatch" });
  },
);

it("records a definitive duplicate rejection without preventing cleanup", async () => {
  const run = fixture();
  const scenario = await setupScenario(run);
  await expect(
    run.insert("order", code(run), scenario, async () => {
      throw new OrderError("ORDER_CODE_CONFLICT");
    }),
  ).rejects.toMatchObject({ code: "ORDER_CODE_CONFLICT" });
  expect(readFixtureReceipt(run.receiptFile).fixtures.at(-1)).toMatchObject({
    state: "rejected",
    id: null,
  });
  await run.cleanup(async () => [], vi.fn());
  expect(readFixtureReceipt(run.receiptFile).cleanupComplete).toBe(true);
});

it("rejects a receipt directory inside the Git checkout", () => {
  expect(() => new OrderIntegrationFixtures(process.cwd(), target)).toThrow(
    "Private receipt directory unavailable.",
  );
});

it("does not interpret a malformed readback as independent absence", async () => {
  const lookup = createOrderFixtureLookup(async () => ({ rows: [] }));
  await expect(
    lookup({
      kind: "order",
      id: "3",
      parentId: "2",
      taggedName: "SYNTHETIC",
      state: "delete-intent",
    }),
  ).rejects.toThrow();
});

it("accepts independently reported zero rows only with the expected readback shape", async () => {
  const lookup = createOrderFixtureLookup(async () => ({
    rows: [{ row_count: "0", id: null, tagged_name: null, parent_id: null }],
  }));
  await expect(
    lookup({
      kind: "order",
      id: "3",
      parentId: "2",
      taggedName: "SYNTHETIC",
      state: "delete-intent",
    }),
  ).resolves.toEqual([]);
});

it("rejects a receipt directory that grants read access to other users", () => {
  expect(
    () => new OrderIntegrationFixtures(privateDirectory("broad"), target),
  ).toThrow("Private receipt directory unavailable.");
});

it.skipIf(process.platform !== "win32")(
  "reuses a private folder with ordinary write access and a non-inheriting traverse-only ACE",
  () => {
    const run = new OrderIntegrationFixtures(
      privateDirectory("traverse-only"),
      target,
    );
    expect(readFixtureReceipt(run.receiptFile).runId).toBe(run.runId);
  },
);

it("rejects reconciliation on a different target or while a writer is active", async () => {
  const directory = privateDirectory();
  const run = new OrderIntegrationFixtures(directory, target);
  const lookup = vi.fn();
  await expect(
    reconcileOrderRun(directory, run.runId, "0".repeat(64), lookup),
  ).rejects.toThrow("RECEIPT_TARGET_MISMATCH");
  await expect(
    reconcileOrderRun(directory, run.runId, target, lookup),
  ).rejects.toThrow("WRITER_NOT_CONFIRMED_STOPPED");
  expect(lookup).not.toHaveBeenCalled();
});

it("recovers a dead writer's durable intent into a separate private read-only report", async () => {
  const directory = privateDirectory();
  const run = new OrderIntegrationFixtures(directory, target);
  const taggedName = run.tag + "-depot";
  await expect(
    run.insert("depot", taggedName, null, async () => {
      throw new Error("simulated lost CREATE acknowledgement");
    }),
  ).rejects.toThrow("INSERT_OUTCOME_UNCERTAIN");
  const original = readFileSync(run.receiptFile);
  const deadWriter = vi.spyOn(process, "kill").mockImplementationOnce(() => {
    throw Object.assign(new Error("simulated dead writer"), { code: "ESRCH" });
  });
  try {
    await expect(
      reconcileOrderRun(directory, run.runId, target, async () => [
        { id: "1", taggedName, parentId: null },
      ]),
    ).resolves.toBe(false);
    expect(deadWriter).toHaveBeenCalledWith(process.pid, 0);
  } finally {
    deadWriter.mockRestore();
  }
  const report = readdirSync(join(directory, run.runId)).find((f) =>
    f.startsWith("reconciliation-"),
  );
  expect(report).toBeDefined();
  expect(
    JSON.parse(readFileSync(join(directory, run.runId, report!), "utf8")),
  ).toMatchObject([{ id: "1", state: "create-intent", status: "present" }]);
  expect(readFileSync(run.receiptFile)).toEqual(original);
});

it("requires an explicit CRUD DELETE to observe its owned fixture before mutation", async () => {
  const run = fixture();
  await run.insert("depot", run.tag + "-depot", null, async () => BigInt(1));
  const remove = vi.fn();
  await expect(
    run.remove("depot", BigInt(1), async () => [], remove),
  ).rejects.toThrow("EXPECTED_FIXTURE_ABSENT");
  expect(remove).not.toHaveBeenCalled();
});

it("halts an in-flight cleanup before DELETE when a competing operation stops the run", async () => {
  const run = fixture();
  const taggedName = run.tag + "-depot";
  await run.insert("depot", taggedName, null, async () => BigInt(1));
  const remove = vi.fn();
  let finish!: (
    rows: [{ id: string; taggedName: string; parentId: null }],
  ) => void;
  const result = new Promise<
    [{ id: string; taggedName: string; parentId: null }]
  >((resolve) => {
    finish = resolve;
  });
  const cleanup = run.cleanup(() => result, remove);
  await expect(
    run.remove("depot", BigInt(1), async () => [], remove),
  ).rejects.toThrow("CONCURRENT_MUTATION");
  finish([{ id: "1", taggedName, parentId: null }]);
  await expect(cleanup).rejects.toThrow("RUN_STOPPED");
  expect(remove).not.toHaveBeenCalled();
});

it("sends DELETE with exact ID, parent and byte-matched tag through the existing driver", async () => {
  const request = vi.fn(async (_input: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect(body.query).toContain("9007199254740997");
    expect(body.query).toContain("scenario_id");
    expect(body.query).toMatch(/=\s*\x27?2\x27?(?:\W|$)/u);
    expect(body.query).toContain("BINARY");
    expect(body.query).toContain("SYNTHETIC-CAFÉ");
    return new Response(JSON.stringify({ rowsAffected: 1 }), {
      headers: { "TiDB-Session": "synthetic" },
    });
  });
  const db = createDatabase(
    "mysql://fixture:synthetic@testing.invalid:4000/courier_route_planner_testing",
    request,
  );
  await expect(
    deleteOrderFixture(db, {
      kind: "order",
      id: "9007199254740997",
      parentId: "2",
      taggedName: "SYNTHETIC-CAFÉ",
      state: "delete-intent",
    }),
  ).resolves.toBe(1);
  expect(request).toHaveBeenCalledTimes(1);
});

it("binds receipts to the TiDB routing username on a shared gateway", () => {
  const first = fixtureTarget(
    "mysql://instance-a.fixture:synthetic@gateway.invalid:4000/courier_route_planner_testing",
  );
  const other = fixtureTarget(
    "mysql://instance-b.fixture:synthetic@gateway.invalid:4000/courier_route_planner_testing",
  );
  const rotated = fixtureTarget(
    "mysql://instance-a.fixture:new-synthetic@gateway.invalid:4000/courier_route_planner_testing",
  );
  expect(first).not.toBe(other);
  expect(first).toBe(rotated);
});
