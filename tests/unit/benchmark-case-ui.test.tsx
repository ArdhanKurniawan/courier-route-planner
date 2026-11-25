import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FreezePanel from "@/components/benchmark-cases/freeze-panel";
import BenchmarkCaseDetail from "@/components/benchmark-cases/benchmark-case-detail";
import BenchmarkCaseHistory from "@/components/benchmark-cases/benchmark-case-history";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const scenarioId = "9007199254740995";
const caseId = "9007199254740997";
const inputHash = "b".repeat(64);
const requestId = "dcdfdb87-e66a-4a7b-9eeb-49eba5a61c00";
const frozenAt = "2026-01-02T13:14:15.123Z";
const preview = {
  scenario: {
    id: scenarioId,
    name: "Snapshot Scenario",
    distributionPattern: "random",
  },
  configuredCustomerCount: 5,
  actualOrderCount: 1,
  pointCount: 2,
  inputHash,
  version: "benchmark-case-input/v1",
  provenance: {},
  nodes: [
    {
      id: "3",
      kind: "depot",
      index: 0,
      name: "Snapshot Depot",
      latitude: -6.98,
      longitude: 110.4,
    },
    {
      id: "4",
      kind: "order",
      index: 1,
      orderCode: "SYNTH-1",
      customerName: "Snapshot Customer",
      latitude: -6.92,
      longitude: 110.45,
    },
  ],
};
const committed = {
  ...preview,
  provenance: { benchmarkCaseId: caseId, frozenAt },
};
const data = (value: unknown) => Response.json({ data: value });
const reject = (code: string, status: number) =>
  Response.json({ error: { code } }, { status });
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

async function ready() {
  return screen.findByRole("button", { name: "Konfirmasi Freeze" });
}

describe("Scenario Freeze", () => {
  it("previews read-only and displays the configured/actual mismatch and frozen node order", async () => {
    fetcher.mockImplementationOnce(async () => data(preview));
    render(<FreezePanel scenarioId={scenarioId} />);
    expect(screen.getByText("Memuat preview…")).toBeInTheDocument();
    await ready();
    expect(
      screen.getByText(/jumlah pelanggan konfigurasi berbeda/i),
    ).toBeInTheDocument();
    const nodes = within(
      screen.getByRole("table", { name: "Urutan node snapshot" }),
    );
    const [, depot, order] = nodes.getAllByRole("row");
    expect(depot).toHaveTextContent(/0.*Snapshot Depot/);
    expect(order).toHaveTextContent(/1.*Snapshot Customer/);
    expect(screen.getByText(inputHash)).toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
  });

  it("requires confirmation and submits once when clicked twice", async () => {
    let finish!: (response: Response) => void;
    fetcher
      .mockImplementationOnce(async () => data(preview))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    render(<FreezePanel scenarioId={scenarioId} />);
    const button = await ready();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(button);
    expect(postCalls()).toHaveLength(0);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(postCalls()).toHaveLength(1);
    expect(JSON.parse(String(postCalls()[0][1]?.body))).toEqual({
      scenarioId,
      requestId,
      expectedInputHash: inputHash,
    });
    await act(async () => finish(data(committed)));
    expect(
      await screen.findByRole("link", { name: "Lihat Benchmark Case" }),
    ).toHaveAttribute("href", "/benchmark-cases/" + caseId);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("requires a fresh preview after SOURCE_CHANGED", async () => {
    fetcher
      .mockImplementationOnce(async () => data(preview))
      .mockImplementationOnce(async () => reject("SOURCE_CHANGED", 409))
      .mockImplementationOnce(async () =>
        data({ ...preview, inputHash: "c".repeat(64) }),
      );
    render(<FreezePanel scenarioId={scenarioId} />);
    fireEvent.click(await ready());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /preview ulang/i,
    );
    expect(
      screen.getByRole("button", { name: "Konfirmasi Freeze" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang preview" }));
    expect(await screen.findByText("c".repeat(64))).toBeInTheDocument();
    expect(await ready()).toBeEnabled();
    expect(postCalls()).toHaveLength(1);
  });

  it("keeps the request recoverable when a receipt arrives after navigating away", async () => {
    let finish!: (response: Response) => void;
    fetcher
      .mockImplementationOnce(async () => data(preview))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockImplementationOnce(async () => data(preview))
      .mockImplementationOnce(async () => data(committed));
    const original = render(<FreezePanel scenarioId={scenarioId} />);
    fireEvent.click(await ready());
    original.unmount();
    render(<FreezePanel scenarioId={scenarioId} />);
    await ready();
    await act(async () => finish(data(committed)));

    expect(
      screen.getByRole("button", { name: "Konfirmasi Freeze" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Periksa hasil freeze" }),
    );
    await screen.findByRole("link", { name: "Lihat Benchmark Case" });
    expect(postCalls()).toHaveLength(1);
  });

  it("fails closed when the request cannot be persisted for recovery", async () => {
    fetcher.mockImplementationOnce(async () => data(preview));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw Error("Storage denied");
    });
    render(<FreezePanel scenarioId={scenarioId} />);
    fireEvent.click(await ready());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /freeze belum dikirim/i,
    );
    expect(postCalls()).toHaveLength(0);
  });

  it("shows a confirmed UUID conflict without retrying or claiming success", async () => {
    fetcher
      .mockImplementationOnce(async () => data(preview))
      .mockImplementationOnce(async () =>
        reject("FREEZE_REQUEST_CONFLICT", 409),
      );
    render(<FreezePanel scenarioId={scenarioId} />);
    fireEvent.click(await ready());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /uuid sudah digunakan/i,
    );
    expect(
      screen.queryByRole("link", { name: "Lihat Benchmark Case" }),
    ).not.toBeInTheDocument();
    expect(postCalls()).toHaveLength(1);
  });

  it.each(["COMMIT_UNKNOWN", "ROLLBACK_UNKNOWN"])(
    "preserves %s across refresh and uses only read-only recovery",
    async (code) => {
      fetcher
        .mockImplementationOnce(async () => data(preview))
        .mockImplementationOnce(async () => reject(code, 503))
        .mockImplementationOnce(async () => data(preview))
        .mockImplementationOnce(async () => data(null))
        .mockImplementationOnce(async () => data(committed));
      const { unmount } = render(<FreezePanel scenarioId={scenarioId} />);
      fireEvent.click(await ready());
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /hasil freeze belum pasti/i,
      );
      expect(window.sessionStorage.length).toBe(1);
      unmount();
      render(<FreezePanel scenarioId={scenarioId} />);
      await ready();
      fireEvent.click(
        screen.getByRole("button", { name: "Periksa hasil freeze" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /belum membuktikan rollback/i,
      );
      expect(
        screen.getByRole("button", { name: "Konfirmasi Freeze" }),
      ).toBeDisabled();
      fireEvent.click(
        screen.getByRole("button", { name: "Periksa hasil freeze" }),
      );
      await screen.findByRole("link", { name: "Lihat Benchmark Case" });
      expect(postCalls()).toHaveLength(1);
      expect(fetcher.mock.calls[3][0]).toBe(
        `/api/benchmark-cases/recovery/${requestId}?scenarioId=${scenarioId}&expectedInputHash=${inputHash}`,
      );
      expect(window.sessionStorage.length).toBe(0);
    },
  );
});

describe("Benchmark Case history and detail", () => {
  it("shows a reloadable error for a malformed detail payload", async () => {
    fetcher.mockImplementationOnce(async () => data(null));
    render(<BenchmarkCaseDetail caseId={caseId} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /belum dapat dimuat/i,
    );
    expect(
      screen.getByRole("button", { name: "Muat ulang detail" }),
    ).toBeEnabled();
  });

  it("links immutable history rows to stored details", async () => {
    fetcher
      .mockImplementationOnce(async () =>
        Response.json({
          data: [
            {
              id: caseId,
              scenarioId,
              scenarioName: preview.scenario.name,
              actualOrderCount: 1,
              pointCount: 2,
              frozenAt,
              inputHash,
            },
          ],
          nextCursor: null,
        }),
      )
      .mockImplementationOnce(async () => data(committed));
    const { unmount } = render(<BenchmarkCaseHistory />);
    expect(
      await screen.findByRole("link", { name: "Snapshot Scenario" }),
    ).toHaveAttribute("href", "/benchmark-cases/" + caseId);
    unmount();
    render(<BenchmarkCaseDetail caseId={caseId} />);
    expect(await screen.findByText(/FK RESTRICT/)).toBeInTheDocument();
    expect(screen.getByText("Snapshot Customer")).toBeInTheDocument();
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/benchmark-cases",
      "/api/benchmark-cases/" + caseId,
    ]);
    expect(postCalls()).toHaveLength(0);
  });

  it("shows loading, a recoverable error and an honest empty state", async () => {
    fetcher
      .mockRejectedValueOnce(Error("Offline"))
      .mockImplementationOnce(async () =>
        Response.json({ data: [], nextCursor: null }),
      );
    render(<BenchmarkCaseHistory />);
    expect(screen.getByText("Memuat riwayat…")).toBeInTheDocument();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang riwayat" }));
    expect(
      await screen.findByText("Belum ada Benchmark Case."),
    ).toBeInTheDocument();
  });
});
