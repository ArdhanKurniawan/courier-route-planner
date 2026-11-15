import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DummyPreviewManager from "@/components/generator/dummy-preview-manager";
import type { DummyOperationView } from "@/lib/validation/dummy-preview";

vi.mock("@/components/map/leaflet-map", () => ({ default: () => null }));

const operationId = "00000000-0000-4000-8000-000000000001";
const parameters = { count: 1, radiusMinM: 0, radiusMaxM: 100, seed: "10" };
const scenario = {
  id: "10",
  depotId: "100",
  name: "Scenario A",
  status: "draft",
  distributionPattern: "random",
  customerCount: 1,
  radiusMinM: 0,
  radiusMaxM: 100,
  generationSeed: "10",
};
const op = (status: DummyOperationView["status"], replacedCount = 0) => ({
  data: {
    operationId,
    scenarioId: "10",
    status,
    savedCount: status === "committed" || status === "confirmed" ? 1 : 0,
    replacedCount,
  },
});
const failure = (code: string, status: number) =>
  Response.json({ error: { code } }, { status });

function setup(
  dummyCount: number,
  write: (init: RequestInit) => Promise<Response>,
  status = () => Response.json({ data: null }),
  scenarioStatus = "draft",
) {
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(operationId);
  const request = vi.fn(async (path: string, init: RequestInit) => {
    if (path.includes("?limit="))
      return Response.json({
        data: [{ ...scenario, status: scenarioStatus }],
        nextCursor: null,
      });
    if (path.endsWith("/preview"))
      return Response.json({
        data: {
          scenario,
          parameters,
          depot: {
            id: "100",
            name: "Depot",
            latitude: 0,
            longitude: 0,
            isActive: true,
          },
          version: "random-v1",
          points: [{ latitude: 0.0001, longitude: 0 }],
          revision: "a".repeat(64),
          dummyCount,
        },
      });
    if (init.method === "GET") return status();
    return write(init);
  });
  vi.stubGlobal("fetch", request);
}

async function choose(generate = true) {
  fireEvent.change(await screen.findByRole("combobox", { name: "Scenario" }), {
    target: { value: "10" },
  });
  if (generate)
    fireEvent.click(screen.getByRole("button", { name: "Generate Preview" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("requires confirmation and prevents a second replacement request in flight", async () => {
  let resolve!: (response: Response) => void;
  const save = vi.fn<(init: RequestInit) => Promise<Response>>(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  setup(2, save);
  render(<DummyPreviewManager />);
  await choose();
  const button = await screen.findByRole("button", {
    name: "Ganti Order Dummy",
  });
  expect(button).toBeDisabled();
  expect(screen.getByText(/2 Order dummy akan diganti/)).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /ganti 2 Order dummy/i }),
  );
  fireEvent.click(button);
  fireEvent.click(button);
  expect(save).toHaveBeenCalledOnce();
  expect(JSON.parse(String(save.mock.calls[0]?.[0]?.body))).toEqual({
    operationId,
    parameters,
    revision: "a".repeat(64),
    replaceCount: 2,
    confirmReplace: true,
  });
  await act(async () => resolve(Response.json(op("committed", 2))));
  expect(screen.getByRole("link", { name: "Buka Orders" })).toHaveAttribute(
    "href",
    "/orders",
  );
  expect(screen.getByRole("link", { name: "Buka Map" })).toHaveAttribute(
    "href",
    "/map?scenarioId=10",
  );
  expect(
    screen.getByRole("button", { name: "Verifikasi hasil operasi" }),
  ).toBeInTheDocument();
});

it("invalidates a stale preview after 409", async () => {
  setup(0, async () => failure("STALE_PREVIEW", 409));
  render(<DummyPreviewManager />);
  await choose();
  fireEvent.click(
    await screen.findByRole("button", { name: "Simpan Order Dummy" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /buat preview baru/i,
  );
  expect(
    screen.queryByRole("button", { name: "Simpan Order Dummy" }),
  ).not.toBeInTheDocument();
});

it("gets COMMIT_UNKNOWN from the server after a lost response and again in a fresh browser view", async () => {
  let persisted = false;
  const save = vi.fn(async () => {
    persisted = true;
    throw Error("lost HTTP response");
  });
  setup(0, save, () =>
    Response.json(persisted ? op("commit_unknown") : { data: null }),
  );
  const original = render(<DummyPreviewManager />);
  await choose();
  fireEvent.click(
    await screen.findByRole("button", { name: "Simpan Order Dummy" }),
  );
  expect(
    await screen.findByText("Hasil penyimpanan belum dapat dipastikan."),
  ).toBeInTheDocument();
  original.unmount();
  render(<DummyPreviewManager />);
  await choose();
  expect(
    await screen.findByRole("button", { name: "Verifikasi hasil operasi" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Simpan Order Dummy" }),
  ).not.toBeInTheDocument();
  expect(save).toHaveBeenCalledOnce();
});

it("keeps a pending operation blocked until server proof, then requires a fresh preview", async () => {
  const write = vi
    .fn<(init: RequestInit) => Promise<Response>>()
    .mockResolvedValueOnce(failure("RECONCILIATION_INCONCLUSIVE", 409))
    .mockResolvedValueOnce(Response.json(op("confirmed")));
  setup(0, write, () => Response.json(op("committed")));
  render(<DummyPreviewManager />);
  await choose(false);
  const verify = await screen.findByRole("button", {
    name: "Verifikasi hasil operasi",
  });
  fireEvent.click(verify);
  expect(await screen.findByRole("alert")).toHaveTextContent(/tetap diblokir/i);
  fireEvent.click(
    await screen.findByRole("button", { name: "Verifikasi hasil operasi" }),
  );
  expect(
    await screen.findByText("Dataset Order dummy telah diverifikasi."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Simpan Order Dummy" }),
  ).not.toBeInTheDocument();
  expect(
    write.mock.calls.map(([init]) => [
      init.method,
      JSON.parse(String(init.body)),
    ]),
  ).toEqual([
    ["PATCH", { operationId }],
    ["PATCH", { operationId }],
  ]);
});

it("invalidates save as soon as preview inputs change", async () => {
  setup(0, vi.fn());
  render(<DummyPreviewManager />);
  await choose();
  await screen.findByRole("button", { name: "Simpan Order Dummy" });
  fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "20" } });
  expect(
    screen.queryByRole("button", { name: "Simpan Order Dummy" }),
  ).not.toBeInTheDocument();
});

it("can reconcile an operation after its Scenario is no longer eligible for preview", async () => {
  const write = vi.fn(async () => Response.json(op("rolled_back")));
  setup(0, write, () => Response.json(op("rollback_unknown")), "frozen");
  render(<DummyPreviewManager />);
  fireEvent.click(
    await screen.findByRole("checkbox", { name: /sertakan scenario lain/i }),
  );
  await choose(false);
  expect(
    screen.queryByRole("button", { name: "Generate Preview" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    await screen.findByRole("button", { name: "Verifikasi hasil operasi" }),
  );
  expect(
    await screen.findByText(/rollback terverifikasi/i),
  ).toBeInTheDocument();
  expect(write).toHaveBeenCalledOnce();
});
