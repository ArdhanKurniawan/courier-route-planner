import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BenchmarkCaseDetail from "@/components/benchmark-cases/benchmark-case-detail";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const caseId = "9007199254740997";
const matrixId = "9007199254740999";
const requestId = "dcdfdb87-e66a-4a7b-9eeb-49eba5a61c00";
const inputHash = "b".repeat(64);
const matrixHash = "c".repeat(64);
const generatedAt = "2026-01-02T13:14:15.123Z";
const detailUrl = "/api/benchmark-cases/" + caseId;
const historyUrl = detailUrl + "/distance-matrices";
const nodeOrder = [
  { id: "3", kind: "depot", index: 0, latitude: -6.98, longitude: 110.4 },
  { id: "4", kind: "order", index: 1, latitude: -6.92, longitude: 110.45 },
];
const storedCase = {
  scenario: { id: "5", name: "Stored Scenario", distributionPattern: "random" },
  configuredCustomerCount: 1,
  actualOrderCount: 1,
  pointCount: 2,
  inputHash,
  version: "benchmark-case-input/v1",
  provenance: { benchmarkCaseId: caseId, frozenAt: generatedAt },
  nodes: [
    { ...nodeOrder[0], name: "Stored Depot" },
    {
      ...nodeOrder[1],
      orderCode: "SYNTH-1",
      customerName: "Stored Customer",
    },
  ],
};
const storedMatrix = {
  id: matrixId,
  benchmarkCaseId: caseId,
  requestId,
  version: "distance-matrix/v1",
  provider: "osrm",
  profile: "driving",
  endpoint: "https://example.test/osrm",
  options: { annotations: "distance", generateHints: false, snapRadiusM: 25 },
  unit: "meter",
  directed: true,
  inputHash,
  matrixHash,
  nodeOrder,
  matrix: [[0, 17], [0, 0]],
  snapping: nodeOrder.map(({ latitude, longitude }, index) => ({
    source: { latitude, longitude, distanceM: index + 3 },
    destination: { latitude, longitude, distanceM: index + 5 },
  })),
  provenance: {
    generatedAt,
    apiVersion: "v1",
    dataVersion: null,
    softwareVersion: null,
    networkExtract: null,
    codeRevision: null,
  },
  zeroPairs: [{ from: 1, to: 0 }],
  comparisonEligible: false,
};
const summary = {
  id: matrixId,
  benchmarkCaseId: caseId,
  provider: "osrm",
  profile: "driving",
  pointCount: 2,
  inputHash,
  matrixHash,
  generatedAt,
  zeroPairCount: 1,
};
const data = (value: unknown) => Response.json({ data: value });
const error = (code: string, status: number) =>
  Response.json({ error: { code } }, { status });
function history(generationAvailable = true, items: unknown[] = [], generationProviders?: string[]) {
  return Response.json({ data: items, nextCursor: null, generationAvailable, generationProviders });
}

const fetcher = vi.fn<typeof fetch>();
const postCalls = () =>
  fetcher.mock.calls.filter(([, options]) => options?.method === "POST");

beforeEach(() => {
  window.sessionStorage.clear();
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(crypto, "randomUUID").mockReturnValue(requestId);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function generateButton() {
  return screen.findByRole("button", { name: "Buat distance matrix" });
}

describe("Distance matrix on a stored Benchmark Case", () => {
  it("requires explicit confirmation, prevents duplicate submits and displays the new immutable snapshot", async () => {
    let finish!: (response: Response) => void;
    fetcher
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history())
      .mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
      .mockImplementationOnce(async () => history(true, [summary]));
    render(<BenchmarkCaseDetail caseId={caseId} />);
    expect(await screen.findByText("Belum ada distance matrix.")).toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);

    const button = await generateButton();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(button);
    expect(postCalls()).toHaveLength(0);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(postCalls()).toHaveLength(1);
    expect(postCalls()[0][0]).toBe(historyUrl);
    expect(JSON.parse(String(postCalls()[0][1]?.body))).toEqual({
      requestId,
      expectedInputHash: inputHash,
      selection: { mode: "operational" },
    });
    expect(screen.getByRole("button", { name: /membuat distance matrix/i })).toBeDisabled();
    await act(async () => finish(data(storedMatrix)));

    expect(await screen.findByText("Distance matrix tersimpan.")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Distance matrix terarah (meter)" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Lihat matriks #" + matrixId })).toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("offers only configured research providers and displays the actual provider in history and detail", async () => {
    fetcher
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history(true, [], ["osrm-plus"]))
      .mockImplementationOnce(async () => data({
        ...storedMatrix,
        provenance: { ...storedMatrix.provenance, actualProvider: "osrm-plus" },
      }))
      .mockImplementationOnce(async () => history(
        true,
        [{ ...summary, actualProvider: "osrm-plus" }],
        ["osrm-plus"],
      ));
    render(<BenchmarkCaseDetail caseId={caseId} />);

    const mode = await screen.findByRole("combobox", { name: "Mode pembuatan" });
    expect(mode).toHaveValue("operational");
    expect(within(mode).queryByRole("option", { name: /Just Routing/i })).not.toBeInTheDocument();
    fireEvent.change(mode, { target: { value: "osrm-plus" } });
    fireEvent.click(await generateButton());

    expect(JSON.parse(String(postCalls()[0][1]?.body))).toEqual({
      requestId,
      expectedInputHash: inputHash,
      selection: { mode: "research", provider: "osrm-plus" },
    });
    expect(await screen.findByText("Distance matrix tersimpan.")).toBeInTheDocument();
    expect(screen.getByText("OSRMPlus")).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "OSRMPlus / driving" })).toBeInTheDocument();
  });

  it("retains the research lock during read-only recovery after remount", async () => {
    fetcher
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history(true, [], ["just-routing", "osrm-plus"]))
      .mockImplementationOnce(async () => error("STORE_UNKNOWN", 503))
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history(false))
      .mockImplementationOnce(async () => data({
        ...storedMatrix,
        provenance: { ...storedMatrix.provenance, actualProvider: "osrm-plus" },
      }))
      .mockImplementationOnce(async () => data({
        ...storedMatrix,
        provenance: { ...storedMatrix.provenance, actualProvider: "just-routing" },
      }))
      .mockImplementationOnce(async () => history(false));
    const page = render(<BenchmarkCaseDetail caseId={caseId} />);
    fireEvent.change(await screen.findByRole("combobox", { name: "Mode pembuatan" }), {
      target: { value: "just-routing" },
    });
    fireEvent.click(await generateButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(/hasil penyimpanan belum pasti/i);
    page.unmount();
    render(<BenchmarkCaseDetail caseId={caseId} />);

    const recover = await screen.findByRole("button", { name: "Periksa hasil pembuatan" });
    expect(screen.getByText(/request pembuatan riset.*Just Routing/i)).toBeInTheDocument();
    fireEvent.click(recover);
    expect(await screen.findByRole("alert")).toHaveTextContent(/hasil belum dapat diperiksa/i);
    expect(await generateButton()).toBeDisabled();
    fireEvent.click(recover);
    expect(await screen.findByText("Distance matrix tersimpan.")).toBeInTheDocument();
    expect(postCalls()).toHaveLength(1);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("loads stored history and a selected directed matrix while generation is disabled", async () => {
    fetcher
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history(false, [summary]))
      .mockImplementationOnce(async () => data(storedMatrix));
    render(<BenchmarkCaseDetail caseId={caseId} />);
    const view = await screen.findByRole("button", { name: "Lihat matriks #" + matrixId });
    expect(await generateButton()).toBeDisabled();
    expect(screen.getByText("Pembuatan distance matrix dinonaktifkan.")).toBeInTheDocument();
    fireEvent.click(view);

    const matrix = within(await screen.findByRole("table", { name: "Distance matrix terarah (meter)" }));
    expect(matrix.getByRole("columnheader", { name: "Ke 1 · Order #4" })).toHaveAttribute("scope", "col");
    expect(matrix.getByRole("rowheader", { name: "Dari 0 · Depot #3" })).toHaveAttribute("scope", "row");
    const [, first, second] = matrix.getAllByRole("row");
    expect(within(first).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["0", "17"]);
    expect(within(second).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["0", "0"]);
    const snap = within(screen.getByRole("table", { name: "Bukti snapping OSRM" }));
    expect(snap.getByRole("columnheader", { name: /koordinat awal/i })).toBeInTheDocument();
    expect(snap.getByRole("columnheader", { name: /deviasi tujuan/i })).toBeInTheDocument();
    expect(screen.getByText("Semua pasangan dapat dirutekan.")).toBeInTheDocument();
    expect(screen.getByText(/1 pasangan.*jarak nol/i)).toBeInTheDocument();
    expect(screen.getByText("Dari 1 · Order #4 ke 0 · Depot #3")).toBeInTheDocument();
    const provenance = screen.getByText("Provenance OSRM").closest("details")!;
    expect(within(provenance).getByText("https://example.test/osrm")).toBeInTheDocument();
    expect(within(provenance).getByText("v1")).toBeInTheDocument();
    expect(within(provenance).getAllByText("Tidak tersedia")).toHaveLength(4);
    expect(screen.getAllByText(inputHash).length).toBeGreaterThan(1);
    expect(screen.getAllByText(matrixHash).length).toBeGreaterThan(1);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      detailUrl,
      historyUrl,
      historyUrl + "/" + matrixId,
    ]);
    expect(postCalls()).toHaveLength(0);
  });

  it("recovers an uncertain store by the same UUID after remount with read-only checks", async () => {
    fetcher
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history())
      .mockImplementationOnce(async () => error("STORE_UNKNOWN", 503))
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history())
      .mockImplementationOnce(async () => data(null))
      .mockImplementationOnce(async () => data(storedMatrix))
      .mockImplementationOnce(async () => history(true, [summary]));
    const page = render(<BenchmarkCaseDetail caseId={caseId} />);
    await screen.findByText("Belum ada distance matrix.");
    fireEvent.click(await generateButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(/hasil penyimpanan belum pasti/i);
    expect(window.sessionStorage.length).toBe(1);
    page.unmount();
    render(<BenchmarkCaseDetail caseId={caseId} />);

    const recover = await screen.findByRole("button", { name: "Periksa hasil pembuatan" });
    expect(await generateButton()).toBeDisabled();
    fireEvent.click(recover);
    expect(await screen.findByRole("alert")).toHaveTextContent(/belum ada hasil terverifikasi/i);
    expect(await generateButton()).toBeDisabled();
    fireEvent.click(recover);
    expect(await screen.findByText("Distance matrix tersimpan.")).toBeInTheDocument();
    expect(postCalls()).toHaveLength(1);
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("?requestId=")).map(([url]) => url)).toEqual([
      historyUrl + "?requestId=" + requestId, historyUrl + "?requestId=" + requestId,
    ]);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("shows a definitive snap rejection and allows a separate confirmed action", async () => {
    fetcher
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history())
      .mockImplementationOnce(async () => error("SNAP_INVALID", 422));
    render(<BenchmarkCaseDetail caseId={caseId} />);
    await screen.findByText("Belum ada distance matrix.");
    fireEvent.click(await generateButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(/snapping/i);
    expect(await generateButton()).toBeEnabled();
    expect(window.sessionStorage.length).toBe(0);
    expect(postCalls()).toHaveLength(1);
  });

  it("reloads a history error and reads the next stored history page", async () => {
    fetcher
      .mockImplementationOnce(async () => data(storedCase))
      .mockImplementationOnce(async () => history(true, [null]))
      .mockImplementationOnce(async () =>
        Response.json({
          data: [summary],
          nextCursor: matrixId,
          generationAvailable: false,
        }),
      )
      .mockImplementationOnce(async () => history(false, []));
    render(<BenchmarkCaseDetail caseId={caseId} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Riwayat distance matrix belum dapat dimuat.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang riwayat matriks" }));
    fireEvent.click(await screen.findByRole("button", { name: "Matriks berikutnya" }));
    expect(await screen.findByText("Belum ada distance matrix.")).toBeInTheDocument();
    expect(fetcher.mock.calls[3][0]).toBe(historyUrl + "?after=" + matrixId);
    expect(postCalls()).toHaveLength(0);
  });
});
