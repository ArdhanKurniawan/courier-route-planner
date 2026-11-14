import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { OrderError } from "@/lib/validation/order";
import { ScenarioError } from "@/lib/validation/scenario";
import { DepotError } from "@/lib/validation/depot";

const limits = { order: 3, scenario: 2, depot: 1 } as const;
const kinds = ["order", "scenario", "depot"] as const;
const parentKind = { order: "scenario", scenario: "depot" } as const;
const idSchema = z
  .string()
  .regex(/^[1-9]\d{0,18}$/u)
  .refine((id) => id.length < 19 || id <= "9223372036854775807");
const entrySchema = z.strictObject({
  kind: z.enum(kinds),
  taggedName: z.string().min(1).max(64),
  parentId: idSchema.nullable(),
  id: idSchema.nullable(),
  state: z.enum([
    "create-intent",
    "created",
    "delete-intent",
    "absent",
    "rejected",
  ]),
});
const receiptSchema = z.strictObject({
  version: z.literal(1),
  runId: z.uuidv4(),
  target: z.string().regex(/^[a-f0-9]{64}$/u),
  writerPid: z.number().int().positive(),
  cleanupComplete: z.boolean(),
  fixtures: z.array(entrySchema).max(7),
});
type Receipt = z.infer<typeof receiptSchema>;
type Entry = z.infer<typeof entrySchema>;
type OwnedEntry = Entry & { id: string };
type FixtureKind = Entry["kind"];
type Row = Pick<OwnedEntry, "id" | "taggedName" | "parentId">;
export type FixtureLookup = (entry: Readonly<Entry>) => Promise<readonly Row[]>;
type Remove = (entry: Readonly<OwnedEntry>) => Promise<unknown>;
class FixtureStopped extends Error {}

function tag(runId: string) {
  return "order-integration-" + runId;
}

function tagMatches(runId: string, kind: FixtureKind, name: string) {
  const prefix = tag(runId) + "-";
  return (
    name.startsWith(kind === "order" ? prefix.toUpperCase() : prefix) &&
    name.length > prefix.length &&
    name.length <= 64
  );
}

function presentIdentity(entry: Entry, row: Row) {
  return (
    idSchema.safeParse(row.id).success &&
    (entry.id === null || entry.id === row.id) &&
    entry.taggedName === row.taggedName &&
    entry.parentId === row.parentId
  );
}

function knownRejection(error: unknown) {
  return (
    (error instanceof OrderError ||
      error instanceof ScenarioError ||
      error instanceof DepotError) &&
    error.code !== "MUTATION_OUTCOME_UNKNOWN"
  );
}

function syncDirectory(directory: string) {
  // Windows does not expose directory fsync through Node. The file is flushed
  // before a same-directory atomic rename, including on Windows.
  if (process.platform === "win32") return;
  const fd = openSync(directory, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

const windowsAclCheck = String.raw`
$ErrorActionPreference = 'Stop'
$path = $env:ORDER_RECEIPT_ACL_PATH
if (([IO.DriveInfo]::new([IO.Path]::GetPathRoot($path))).DriveType -ne 'Fixed') { exit 1 }
$acl = Get-Acl -LiteralPath $path
$user = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$trusted = @($user, 'S-1-5-18', 'S-1-5-32-544')
if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin $trusted) { exit 1 }
$descriptor = [Security.AccessControl.RawSecurityDescriptor]::new(
  $acl.GetSecurityDescriptorBinaryForm(), 0)
if ($null -eq $descriptor.DiscretionaryAcl) { exit 1 }
$traverseOnly = [Security.AccessControl.FileSystemRights]'Traverse, Synchronize'
$unsafe = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]) |
  Where-Object {
    $_.AccessControlType -eq 'Allow' -and $_.IdentityReference.Value -notin $trusted -and
    ($_.InheritanceFlags -ne 'None' -or ($_.FileSystemRights -band (-bnot $traverseOnly)) -ne 0)
  })
if ($unsafe.Count) { exit 1 }
`;

function assertWindowsPrivacy(directory: string) {
  const windows = process.env.SystemRoot;
  if (!windows || !isAbsolute(windows)) throw new Error();
  execFileSync(
    join(windows, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    [
      "-NoProfile",
      "-NonInteractive",
      "-EncodedCommand",
      Buffer.from(windowsAclCheck, "utf16le").toString("base64"),
    ],
    {
      env: {
        NODE_ENV: "test",
        SystemRoot: windows,
        ORDER_RECEIPT_ACL_PATH: directory,
      },
      stdio: "ignore",
      windowsHide: true,
      timeout: 5000,
    },
  );
}

// TiDB Starter routes by username on a shared gateway. Bind the receipt to
// that routing identity without storing it or depending on the password.
export function fixtureTarget(url: string | undefined) {
  try {
    const { hostname, port, pathname, username } = new URL(url ?? "");
    if (!hostname || !username) throw new Error();
    return createHash("sha256")
      .update(
        JSON.stringify([
          hostname.toLowerCase(),
          port,
          decodeURIComponent(pathname),
          decodeURIComponent(username),
        ]),
      )
      .digest("hex");
  } catch {
    throw new FixtureStopped("Invalid Testing receipt target.");
  }
}

function privateDirectory(directory: string | undefined) {
  try {
    if (!directory || !isAbsolute(directory)) throw new Error();
    const local = resolve(directory);
    const info = lstatSync(local);
    const physical = realpathSync(local);
    if (!info.isDirectory() || physical !== local) throw new Error();
    if (process.getuid && (info.uid !== process.getuid() || info.mode & 0o077))
      throw new Error();
    const fromProject = relative(realpathSync(process.cwd()), physical);
    if (
      !isAbsolute(fromProject) &&
      fromProject !== ".." &&
      !fromProject.startsWith(".." + sep)
    )
      throw new Error();
    for (let cursor = physical; ; cursor = dirname(cursor)) {
      if (existsSync(join(cursor, ".git"))) throw new Error();
      if (dirname(cursor) === cursor) break;
    }
    if (process.platform === "win32") assertWindowsPrivacy(physical);
    return physical;
  } catch {
    throw new FixtureStopped("Private receipt directory unavailable.");
  }
}

function writeSnapshot(file: string, data: unknown) {
  const staged = file + ".next";
  writeFileSync(staged, JSON.stringify(data) + "\n", {
    flag: "wx",
    mode: 0o600,
    flush: true,
  });
  renameSync(staged, file);
  syncDirectory(dirname(file));
}

export function readFixtureReceipt(file: string) {
  try {
    const info = lstatSync(file);
    if (!info.isFile() || info.size > 8192) throw new Error();
    const receipt = receiptSchema.parse(JSON.parse(readFileSync(file, "utf8")));
    if (join(dirname(dirname(file)), receipt.runId, "receipt.json") !== file)
      throw new Error();
    for (const kind of kinds) {
      const entries = receipt.fixtures.filter((entry) => entry.kind === kind);
      const ids = entries.flatMap((entry) =>
        entry.id === null ? [] : [entry.id],
      );
      if (ids.length > limits[kind] || new Set(ids).size !== ids.length)
        throw new Error();
    }
    for (const [index, entry] of receipt.fixtures.entries()) {
      const hasId =
        entry.state !== "create-intent" && entry.state !== "rejected";
      const hasParent =
        entry.kind === "depot"
          ? entry.parentId === null
          : entry.parentId !== null &&
            receipt.fixtures
              .slice(0, index)
              .some(
                (parent) =>
                  parent.kind ===
                    parentKind[entry.kind as keyof typeof parentKind] &&
                  parent.id === entry.parentId,
              );
      if (
        (entry.id !== null) !== hasId ||
        !hasParent ||
        !tagMatches(receipt.runId, entry.kind, entry.taggedName) ||
        (receipt.cleanupComplete &&
          entry.state !== "absent" &&
          entry.state !== "rejected")
      )
        throw new Error();
    }
    return receipt;
  } catch {
    throw new FixtureStopped("Manual reconciliation required: RECEIPT_INVALID");
  }
}

// This API never resumes writes. An unacknowledged INSERT remains unresolved
// on a zero-row read because it may still commit after the read.
export async function reconcileFixtureReceipt(
  file: string,
  lookup: FixtureLookup,
) {
  const receipt = readFixtureReceipt(file);
  const observations = [];
  for (const entry of receipt.fixtures) {
    if (entry.state === "rejected") continue;
    let rows: Awaited<ReturnType<FixtureLookup>>;
    try {
      rows = await lookup(entry);
    } catch {
      throw new FixtureStopped(
        "Manual reconciliation required: RECONCILIATION_READ_FAILED",
      );
    }
    const match =
      rows.length === 1 && presentIdentity(entry, rows[0]) ? rows[0] : null;
    const status = match
      ? "present"
      : rows.length
        ? "mismatch"
        : entry.id === null
          ? "unresolved"
          : "absent";
    observations.push({ ...entry, id: match?.id ?? entry.id, status });
  }
  return observations;
}

export async function reconcileOrderRun(
  directory: string | undefined,
  runId: string,
  target: string,
  lookup: FixtureLookup,
) {
  if (!z.uuidv4().safeParse(runId).success)
    throw new FixtureStopped("Invalid private receipt run ID.");
  const folder = join(privateDirectory(directory), runId);
  const dir = lstatSync(folder, { throwIfNoEntry: false });
  try {
    if (!dir?.isDirectory()) throw new Error();
    if (process.platform === "win32") assertWindowsPrivacy(folder);
  } catch {
    throw new FixtureStopped("Manual reconciliation required: RECEIPT_INVALID");
  }
  const file = join(folder, "receipt.json");
  const receipt = readFixtureReceipt(file);
  if (receipt.target !== target)
    throw new FixtureStopped(
      "Manual reconciliation required: RECEIPT_TARGET_MISMATCH",
    );
  if (!receipt.cleanupComplete) {
    try {
      process.kill(receipt.writerPid, 0);
      throw new FixtureStopped("Manual reconciliation required: WRITER_ACTIVE");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
        throw new FixtureStopped(
          "Manual reconciliation required: WRITER_NOT_CONFIRMED_STOPPED",
        );
      }
    }
  }
  const observations = await reconcileFixtureReceipt(file, lookup);
  try {
    writeSnapshot(
      join(folder, "reconciliation-" + randomUUID() + ".json"),
      observations,
    );
  } catch {
    throw new FixtureStopped(
      "Manual reconciliation required: RECONCILIATION_WRITE_FAILED",
    );
  }
  return observations.every((entry) => entry.status === "absent");
}

export class OrderIntegrationFixtures {
  readonly runId = randomUUID();
  readonly tag = tag(this.runId);
  readonly receiptFile: string;
  private receipt: Receipt;
  private stopped = false;
  private busy = false;

  constructor(directory: string | undefined, target: string) {
    this.receipt = receiptSchema.parse({
      version: 1,
      runId: this.runId,
      target,
      writerPid: process.pid,
      fixtures: [],
      cleanupComplete: false,
    });
    const parent = privateDirectory(directory);
    const folder = join(parent, this.runId);
    this.receiptFile = join(folder, "receipt.json");
    try {
      mkdirSync(folder, { mode: 0o700 });
      if (process.platform === "win32") assertWindowsPrivacy(folder);
      this.save(this.receipt, true);
      syncDirectory(parent);
    } catch {
      throw this.stop("RECEIPT_INIT_FAILED");
    }
  }

  private stop(category: string) {
    this.stopped = true;
    return new FixtureStopped("Manual reconciliation required: " + category);
  }

  private save(next: Receipt, initial = false) {
    try {
      if (
        !initial &&
        !isDeepStrictEqual(readFixtureReceipt(this.receiptFile), this.receipt)
      )
        throw new Error();
      writeSnapshot(this.receiptFile, next);
      this.receipt = next;
    } catch {
      throw this.stop("RECEIPT_WRITE_FAILED");
    }
  }

  private record(entry: Entry, index = this.receipt.fixtures.length) {
    const fixtures = [...this.receipt.fixtures];
    fixtures[index] = entry;
    this.save({ ...this.receipt, fixtures });
  }

  private assertRunning() {
    if (this.stopped || this.receipt.cleanupComplete)
      throw this.stop("RUN_STOPPED");
  }

  async mutate<T>(operation: () => Promise<T>): Promise<T> {
    this.assertRunning();
    try {
      return await operation();
    } catch (error) {
      if (error instanceof FixtureStopped || knownRejection(error)) throw error;
      throw this.stop("MUTATION_OUTCOME_UNKNOWN");
    }
  }

  private async exclusive<T>(operation: () => Promise<T>) {
    if (this.busy) throw this.stop("CONCURRENT_MUTATION");
    this.busy = true;
    try {
      return await this.mutate(operation);
    } finally {
      this.busy = false;
    }
  }

  async insert(
    kind: FixtureKind,
    taggedName: string,
    parentId: bigint | null,
    operation: () => Promise<bigint>,
  ) {
    return this.exclusive(async () => {
      const parent = parentId === null ? null : String(parentId);
      const { fixtures } = this.receipt;
      const ownedParent =
        kind === "depot"
          ? parent === null
          : parent !== null &&
            fixtures.some(
              (row) =>
                row.kind === parentKind[kind] &&
                row.id === parent &&
                row.state === "created",
            );
      if (
        !tagMatches(this.runId, kind, taggedName) ||
        !ownedParent ||
        fixtures.length >= 7 ||
        fixtures.some(
          (row) =>
            row.kind === kind &&
            row.taggedName === taggedName &&
            row.parentId === parent,
        ) ||
        fixtures.filter((row) => row.kind === kind && row.id !== null).length >=
          limits[kind]
      )
        throw this.stop("INSERT_SCOPE_INVALID");
      const index = fixtures.length;
      const entry: Entry = {
        kind,
        taggedName,
        parentId: parent,
        id: null,
        state: "create-intent",
      };
      this.record(entry);
      let id: bigint;
      try {
        id = await operation();
      } catch (error) {
        if (!knownRejection(error)) throw this.stop("INSERT_OUTCOME_UNCERTAIN");
        this.record({ ...entry, state: "rejected" }, index);
        throw error;
      }
      if (
        typeof id !== "bigint" ||
        !idSchema.safeParse(String(id)).success ||
        fixtures.some((row) => row.kind === kind && row.id === String(id))
      )
        throw this.stop("INSERT_IDENTITY_UNCERTAIN");
      this.record({ ...entry, id: String(id), state: "created" }, index);
      return id;
    });
  }

  private indexOf(kind: FixtureKind, id: bigint) {
    const index = this.receipt.fixtures.findIndex(
      (entry) =>
        entry.kind === kind &&
        entry.id === String(id) &&
        entry.state === "created",
    );
    if (index === -1) throw this.stop("UNOWNED_ID");
    return index;
  }

  async change<T>(kind: FixtureKind, id: bigint, operation: () => Promise<T>) {
    return this.exclusive(async () => {
      this.indexOf(kind, id);
      // Reconfirm the receipt is writable before UPDATE too.
      this.save(this.receipt);
      return operation();
    });
  }

  async remove(
    kind: FixtureKind,
    id: bigint,
    lookup: FixtureLookup,
    operation: Remove,
  ) {
    return this.exclusive(() =>
      this.removeAt(this.indexOf(kind, id), lookup, operation, true),
    );
  }

  private async removeAt(
    index: number,
    lookup: FixtureLookup,
    operation: Remove,
    requirePresent = false,
  ) {
    this.assertRunning();
    const entry = this.receipt.fixtures[index];
    if (entry.id === null) throw this.stop("UNOWNED_ID");
    const owned = { ...entry, id: entry.id };
    const before = await lookup(owned);
    this.assertRunning();
    if (requirePresent && before.length === 0)
      throw this.stop("EXPECTED_FIXTURE_ABSENT");
    if (before.length > 0) {
      if (before.length !== 1 || !presentIdentity(owned, before[0]))
        throw this.stop("OWNERSHIP_MISMATCH");
      this.record({ ...owned, state: "delete-intent" }, index);
      try {
        await operation(owned);
      } catch (error) {
        if (!knownRejection(error)) throw this.stop("DELETE_OUTCOME_UNCERTAIN");
        this.record(owned, index);
        throw error;
      }
      if ((await lookup(owned)).length !== 0)
        throw this.stop("DELETE_UNCONFIRMED");
    }
    this.record({ ...owned, state: "absent" }, index);
  }

  async cleanup(lookup: FixtureLookup, remove: Remove) {
    return this.exclusive(async () => {
      try {
        for (const kind of kinds) {
          for (const [index, entry] of this.receipt.fixtures.entries()) {
            if (entry.kind === kind && entry.state === "created")
              await this.removeAt(index, lookup, remove);
          }
        }
        this.assertRunning();
        this.save({ ...this.receipt, cleanupComplete: true });
      } catch (error) {
        if (error instanceof FixtureStopped) throw error;
        throw this.stop("CLEANUP_UNCONFIRMED");
      }
    });
  }
}
