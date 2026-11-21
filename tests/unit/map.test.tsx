import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Browser, Map as LeafletMap, Polyline, type LatLng, type LatLngBounds } from "leaflet";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapManager from "@/components/map/map-manager";
import type { ScenarioMapData } from "@/components/map/map-data";

const scenarioA = { id: "10", depotId: "100", name: "Scenario A" };
const scenarioB = { id: "20", depotId: "200", name: "Scenario B" };
const depotA = {
  id: "100",
  name: "Gudang A",
  address: "Alamat Depot A",
  latitude: -6.9,
  longitude: 110.4,
};
const depotB = {
  id: "200",
  name: "Gudang B",
  address: null,
  latitude: -6.8,
  longitude: 110.5,
};
const orderA = {
  id: "1000",
  scenarioId: "10",
  orderCode: "QA-A",
  customerName: "Pelanggan A",
  address: "Alamat Order A",
  latitude: -6.91,
  longitude: 110.41,
};
const orderB = {
  ...orderA,
  id: "2000",
  scenarioId: "20",
  orderCode: "QA-B",
  customerName: "Pelanggan B",
};
const scenarioList = "/api/scenarios?limit=100";
const ordersA = "/api/scenarios/10/orders?limit=100";
const ordersB = "/api/scenarios/20/orders?limit=100";
const leafletSvg = Browser.svg;
const optimizeLabel = "Optimasi Rute (NN + 2-Opt)";

function page<T>(data: T[], nextCursor: string | null = null) {
  return { data, nextCursor };
}

function mockReads(replies: Record<string, unknown> = {}) {
  const responses: Record<string, unknown> = {
    [scenarioList]: page([scenarioA, scenarioB]),
    "/api/scenarios/10": { data: scenarioA },
    "/api/scenarios/20": { data: scenarioB },
    "/api/depots/100": { data: depotA },
    "/api/depots/200": { data: depotB },
    [ordersA]: page([orderA]),
    [ordersB]: page([orderB]),
    ...replies,
  };
  const fetchMock = vi.fn(async (path: string, init: RequestInit) => {
    expect(init.credentials).toBe("same-origin");
    if (!Object.hasOwn(responses, path))
      throw Error("Unexpected synthetic request");
    const reply = await responses[path];
    return reply instanceof Response ? reply : Response.json(reply);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function selectScenario(name: string, id: string) {
  await screen.findByRole("option", { name });
  fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
    target: { value: id },
  });
}

function mockRouteWorker() {
  const worker = {
    postMessage: vi.fn<(data: ScenarioMapData) => void>(),
    terminate: vi.fn(),
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as (() => void) | null,
  };
  const create = vi.fn<(url: URL, options?: WorkerOptions) => typeof worker>(
    function () { return worker; },
  );
  vi.stubGlobal("Worker", create);
  return {
    create,
    worker,
    async complete() {
      const { calculateMapRoute } = await import("@/components/map/map-route");
      const [data] = worker.postMessage.mock.calls[0];
      act(() => worker.onmessage?.(new MessageEvent("message", {
        data: calculateMapRoute(data),
      })));
    },
  };
}

afterEach(() => {
  Object.defineProperty(Browser, "svg", { value: leafletSvg });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin Map", () => {
  it("moves keyboard focus to the Edit action and back to the marker", async () => {
    mockReads();
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    const depot = await screen.findByRole("button", { name: "Depot Gudang A" });
    depot.focus();
    fireEvent.keyDown(depot, { key: "Enter" });
    const edit = await screen.findByRole("link", { name: "Edit Depot" });
    expect(edit).toHaveFocus();
    fireEvent.keyDown(edit, { key: "Escape" });
    expect(depot).toHaveFocus();
    await waitFor(() => expect(edit).not.toBeInTheDocument());
  });

  it.each(["unmount", "Scenario switch"])(
    "resizes Leaflet when the content width changes and releases the observer on %s",
    async (disposal) => {
      let resize: (() => void) | undefined;
      const observe = vi.fn();
      const disconnect = vi.fn();
      vi.stubGlobal(
        "ResizeObserver",
        class {
          observe = observe;
          disconnect = disconnect;

          constructor(callback: () => void) {
            resize = callback;
          }
        },
      );
      const invalidate = vi.spyOn(LeafletMap.prototype, "invalidateSize");
      mockReads();
      const { unmount } = render(<MapManager />);
      await selectScenario("Scenario A", "10");
      const map = await screen.findByRole("region", {
        name: "Peta Depot dan Order",
      });
      await waitFor(() => expect(observe).toHaveBeenCalledWith(map));
      expect(resize).toBeDefined();
      resize?.();
      expect(invalidate).toHaveBeenCalledWith({ debounceMoveend: true });

      if (disposal === "Scenario switch") {
        await selectScenario("Scenario B", "20");
        await waitFor(() => expect(observe).toHaveBeenCalledTimes(2));
        const replacement = screen.getByRole("region", {
          name: "Peta Depot dan Order",
        });
        expect(replacement).not.toBe(map);
        expect(observe).toHaveBeenLastCalledWith(replacement);
      } else {
        unmount();
      }
      expect(disconnect).toHaveBeenCalledOnce();
    },
  );

  it("loads all Scenario choices and all selected Order pages, then shows scoped markers and popup details", async () => {
    const second = {
      ...orderA,
      id: "1001",
      orderCode: "QA-A2",
      customerName: "Pelanggan A2",
    };
    const fetchMock = mockReads({
      [scenarioList]: page([scenarioB], "20"),
      [scenarioList + "&after=20"]: page([
        { ...scenarioA, id: "30", name: "Scenario A halaman dua" },
      ]),
      "/api/scenarios/30": { data: { ...scenarioA, id: "30" } },
      "/api/scenarios/30/orders?limit=100": page(
        [{ ...orderA, scenarioId: "30" }],
        "1000",
      ),
      "/api/scenarios/30/orders?limit=100&after=1000": page([
        { ...second, scenarioId: "30" },
      ]),
    });
    const { container } = render(<MapManager />);
    await screen.findByRole("option", { name: "Scenario A halaman dua" });
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      scenarioList,
      scenarioList + "&after=20",
    ]);

    await selectScenario("Scenario A halaman dua", "30");
    expect(
      await screen.findByRole("button", { name: "Depot Gudang A" }),
    ).toBeInTheDocument();
    const marker = await screen.findByRole("button", { name: "Order QA-A" });
    expect(
      await screen.findByRole("button", { name: "Order QA-A2" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 Order aktual")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kelola Depot" })).toHaveAttribute(
      "href",
      "/depots",
    );
    expect(screen.getByRole("link", { name: "Kelola Order" })).toHaveAttribute(
      "href",
      "/orders",
    );
    expect(screen.getByRole("link", { name: "OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );

    fireEvent.click(marker);
    await waitFor(() => {
      const popup = container.querySelector<HTMLElement>(
        ".leaflet-popup-content",
      );
      expect(popup).not.toBeNull();
      expect(within(popup!).getByText("Alamat Order A")).toBeInTheDocument();
      expect(within(popup!).getByText("Pelanggan A")).toBeInTheDocument();
      expect(
        within(popup!).getByRole("link", { name: "Edit Order" }),
      ).toHaveAttribute("href", "/orders?scenarioId=30&edit=1000");
    });
    fireEvent.click(screen.getByRole("button", { name: "Depot Gudang A" }));
    expect(
      await screen.findByRole("link", { name: "Edit Depot" }),
    ).toHaveAttribute("href", "/depots?scenarioId=30&edit=100");
  });

  it("shows an empty Scenario with its Depot and counts invalid coordinates without plotting them", async () => {
    mockReads({
      [ordersA]: page([]),
      [ordersB]: page([
        { ...orderB, latitude: 91 },
        { ...orderB, id: "2001", orderCode: "QA-B2", longitude: undefined },
      ]),
    });
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    expect(
      await screen.findByText("Belum ada Order pada Scenario ini."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Depot Gudang A" }),
    ).toBeInTheDocument();

    await selectScenario("Scenario B", "20");
    expect(await screen.findByText("2 Order aktual")).toBeInTheDocument();
    expect(screen.getByText("0 koordinat valid")).toBeInTheDocument();
    expect(screen.getByText("2 koordinat tidak valid")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Depot Gudang B" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Order QA-B/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Depot Gudang A" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("QA-B2")).toBeInTheDocument();
  });

  it("aborts an old request and ignores its result when a new Scenario is selected", async () => {
    let finish!: (response: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const fetchMock = mockReads({ [ordersA]: pending });
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    expect(screen.getByText("Memuat data peta...")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([path]) => path === ordersA)).toBe(
        true,
      ),
    );
    const oldCall = fetchMock.mock.calls.find(([path]) => path === ordersA);

    await selectScenario("Scenario B", "20");
    expect(
      await screen.findByRole("button", { name: "Order QA-B" }),
    ).toBeInTheDocument();
    expect(oldCall?.[1].signal?.aborted).toBe(true);
    await act(async () => {
      finish(page([orderA]));
    });
    expect(
      screen.getByRole("button", { name: "Order QA-B" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("QA-A")).not.toBeInTheDocument();
  });

  it.each([
    page([orderB]),
    page([orderA], "1000"),
    Response.json({ error: { code: "UNAVAILABLE" } }, { status: 503 }),
  ])(
    "fails closed for foreign Orders or a failed page without showing a partial list",
    async (response) => {
      mockReads({
        [ordersA]: response,
        [ordersA + "&after=1000"]: Response.json({}, { status: 503 }),
      });
      render(<MapManager />);
      await selectScenario("Scenario A", "10");
      expect(
        await screen.findByText("Data peta gagal dimuat."),
      ).toBeInTheDocument();
      expect(screen.queryByText("QA-A")).not.toBeInTheDocument();
      expect(screen.queryByText("QA-B")).not.toBeInTheDocument();
    },
  );

  it("keeps the text list and attribution available when a tile fails", async () => {
    mockReads();
    const { container } = render(<MapManager />);
    await selectScenario("Scenario A", "10");
    await screen.findByRole("button", { name: "Order QA-A" });
    const tile = container.querySelector("img.leaflet-tile");
    expect(tile).toHaveAttribute(
      "src",
      expect.stringContaining("https://tile.openstreetmap.org/"),
    );
    fireEvent.error(tile!);
    expect(
      await screen.findByText(/tile peta gagal dimuat/),
    ).toBeInTheDocument();
    expect(screen.getByText("QA-A")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "OpenStreetMap" }),
    ).toBeInTheDocument();
  });

  it("shows a closed Haversine route and its distance comparison without more requests or resetting markers", async () => {
    Object.defineProperty(Browser, "svg", { value: true });
    const overlay = vi.spyOn(Polyline.prototype, "onAdd");
    const removeOverlay = vi.spyOn(Polyline.prototype, "onRemove");
    const fetchMock = mockReads();
    const calculation = mockRouteWorker();
    render(<MapManager />);
    await screen.findByRole("option", { name: "Scenario A" });
    expect(screen.queryByRole("button", { name: optimizeLabel })).not.toBeInTheDocument();
    await selectScenario("Scenario A", "10");
    const marker = await screen.findByRole("button", { name: "Order QA-A" });
    const requestsBeforeOptimization = fetchMock.mock.calls.length;
    const optimize = screen.getByRole("button", { name: optimizeLabel });
    fireEvent.click(optimize);
    expect(optimize).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Menghitung rute");
    expect(calculation.worker.postMessage).toHaveBeenCalledOnce();
    expect(calculation.create.mock.calls[0][1]?.type ?? "classic").toBe("classic");
    await calculation.complete();

    expect(screen.getByText(/Estimasi garis lurus/)).toBeInTheDocument();
    expect(screen.getByText("Jarak NN awal")).toBeInTheDocument();
    expect(screen.getByText("Jarak Hybrid")).toBeInTheDocument();
    expect(screen.getByText("Selisih jarak")).toBeInTheDocument();
    const stops = within(screen.getByRole("list", { name: "Urutan kunjungan" }));
    expect(stops.getAllByRole("listitem").map((stop) => stop.textContent)).toEqual([
      "Depot Gudang A", "QA-A — Pelanggan A", "Kembali ke Depot Gudang A",
    ]);
    const layer = overlay.mock.contexts[0] as Polyline;
    expect(layer.getLatLngs()).toEqual([[
      expect.objectContaining({ lat: depotA.latitude, lng: depotA.longitude }),
      expect.objectContaining({ lat: orderA.latitude, lng: orderA.longitude }),
      expect.objectContaining({ lat: depotA.latitude, lng: depotA.longitude }),
    ]]);
    expect(screen.getByRole("button", { name: "Order QA-A" })).toBe(marker);
    expect(fetchMock.mock.calls).toHaveLength(requestsBeforeOptimization);
    expect(fetchMock.mock.calls.every(([, init]) => !init.method || init.method === "GET")).toBe(true);
    expect(calculation.worker.terminate).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Muat ulang data peta" }));
    expect(screen.queryByRole("list", { name: "Urutan kunjungan" })).not.toBeInTheDocument();
    expect(removeOverlay).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: optimizeLabel })).toBeEnabled();
    expect(fetchMock.mock.calls.length).toBeGreaterThan(requestsBeforeOptimization);
  });

  it("refuses a partial route when one Order coordinate is missing", async () => {
    mockReads({
      [ordersA]: page([orderA, { ...orderA, id: "1001", orderCode: "QA-MISSING", longitude: undefined }]),
    });
    const calculation = mockRouteWorker();
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    fireEvent.click(await screen.findByRole("button", { name: optimizeLabel }));
    await calculation.complete();
    expect(screen.getByRole("alert")).toHaveTextContent(/koordinat Order QA-MISSING/i);
    expect(screen.queryByRole("list", { name: "Urutan kunjungan" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Order QA-A" })).toBeInTheDocument();
  });

  it("draws the short local crossing when locations straddle the antimeridian", async () => {
    Object.defineProperty(Browser, "svg", { value: true });
    const overlay = vi.spyOn(Polyline.prototype, "onAdd");
    const fit = vi.spyOn(LeafletMap.prototype, "fitBounds");
    mockReads({
      "/api/depots/100": { data: { ...depotA, longitude: 179.9 } },
      [ordersA]: page([{ ...orderA, longitude: -179.9 }]),
    });
    const calculation = mockRouteWorker();
    render(<MapManager initialScenarioId="10" />);
    await screen.findByRole("button", { name: "Order QA-A" });
    fireEvent.click(screen.getByRole("button", { name: optimizeLabel }));
    await calculation.complete();

    const [bounds] = fit.mock.calls[0] as [LatLngBounds];
    expect(bounds.getEast() - bounds.getWest()).toBeCloseTo(0.2);
    const layer = overlay.mock.contexts[0] as Polyline;
    const [stops] = layer.getLatLngs() as LatLng[][];
    expect(stops.map(({ lng }) => lng)).toEqual([179.9, 180.1, 179.9]);
  });

  it("splits a short connection at the world edges when the Depot is far from the crossing", async () => {
    Object.defineProperty(Browser, "svg", { value: true });
    const overlay = vi.spyOn(Polyline.prototype, "onAdd");
    mockReads({
      "/api/depots/100": { data: { ...depotA, latitude: 0, longitude: 0 } },
      [ordersA]: page([
        { ...orderA, latitude: 0, longitude: 179.9 },
        { ...orderA, id: "1001", orderCode: "QA-WEST", latitude: 0, longitude: -179.9 },
      ]),
    });
    const calculation = mockRouteWorker();
    render(<MapManager initialScenarioId="10" />);
    fireEvent.click(await screen.findByRole("button", { name: optimizeLabel }));
    await calculation.complete();

    const layer = overlay.mock.contexts[0] as Polyline;
    const segments = layer.getLatLngs() as LatLng[][];
    expect(segments.map((stops) => stops.map(({ lng }) => lng))).toEqual([
      [0, 179.9, 180],
      [-180, -179.9, 0],
    ]);
  });

  it("shows the empty state when the Scenario has no Orders", async () => {
    mockReads({ [ordersA]: page([]) });
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    expect(await screen.findByRole("button", { name: optimizeLabel })).toBeDisabled();
    expect(screen.getByText("Tambahkan Order untuk menghitung rute.")).toBeInTheDocument();
  });

  it("cancels pending optimization when the Scenario changes", async () => {
    mockReads();
    const { worker } = mockRouteWorker();
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    fireEvent.click(await screen.findByRole("button", { name: optimizeLabel }));
    const lateReply = worker.onmessage;
    expect(lateReply).not.toBeNull();
    await selectScenario("Scenario B", "20");
    expect(worker.terminate).toHaveBeenCalledOnce();
    act(() => lateReply?.(new MessageEvent("message", {
      data: { status: "error", message: "Hasil Scenario lama" },
    })));
    expect(await screen.findByRole("button", { name: "Order QA-B" })).toBeInTheDocument();
    expect(screen.queryByText("Hasil Scenario lama")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: optimizeLabel })).toBeEnabled();
  });
});
