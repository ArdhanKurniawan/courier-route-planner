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
import MapPage from "@/app/(admin)/map/page";
import MapManager from "@/components/map/map-manager";
import type { ScenarioMapData } from "@/components/map/map-data";

vi.mock("@/lib/security/admin", () => ({
  requireAdmin: async () => ({ origin: "http://localhost:3000", environment: "development" }),
}));

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
const roadPath = "/api/scenarios/10/road-route";
const roadStops = [
  { id: "100", label: "Depot Gudang A", position: [-6.9, 110.4] },
  { id: "1000", label: "QA-A — Pelanggan A", position: [-6.91, 110.41] },
  { id: "100", label: "Depot Gudang A", position: [-6.9, 110.4] },
];
const roadPositions = [[-6.9, 110.4], [-6.905, 110.407], [-6.91, 110.41], [-6.9, 110.4]];
function roadReply(positions: number[][] | null = roadPositions) {
  return { data: {
    scenarioId: "10",
    route: { stops: roadStops, nnInitialDistanceM: 400, totalDistanceM: 325, savingsM: 75 },
    positions,
  } };
}

function chooseRoadMode() {
  fireEvent.change(screen.getByRole("combobox", { name: "Mode jarak" }), {
    target: { value: "osrm" },
  });
}

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
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function enableLocalDemo() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("AUTH_ORIGIN", "http://localhost:3000");
  vi.stubEnv("OSRM_MAP_DEMO", "1");
  vi.stubEnv("MAP_LOCAL_SCENARIO_DEMO", "1");
  vi.stubEnv("VERCEL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("VERCEL_TARGET_ENV", undefined);
}

describe("Scenario Demo Lokal", () => {
  it("makes the fixture selectable and navigable without calling the database APIs", async () => {
    enableLocalDemo();
    Object.defineProperty(Browser, "svg", { value: true });
    const overlay = vi.spyOn(Polyline.prototype, "onAdd");
    const fetcher = vi.fn(async (path: string) => {
      if (path === scenarioList) return new Response(null, { status: 503 });
      throw Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetcher);
    const { worker, complete } = mockRouteWorker();
    render(await MapPage());
    await selectScenario("Scenario Demo Lokal", "local-demo");
    expect(await screen.findByText("8 Order sintetis")).toBeInTheDocument();
    await screen.findByRole("region", { name: "Peta Depot dan Order" });
    expect(screen.queryByRole("link", { name: /Kelola Depot|Kelola Order/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Order DEMO-01" }));
    expect(screen.queryByRole("link", { name: "Edit Order" })).not.toBeInTheDocument();
    expect(window.location.search).toBe("?scenarioId=local-demo");
    expect(fetcher).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: optimizeLabel }));
    const [fixture] = worker.postMessage.mock.calls[0];
    expect(fixture.orders).toHaveLength(8);
    await complete();
    expect(await screen.findByRole("list", { name: "Urutan kunjungan" })).toBeInTheDocument();
    await waitFor(() => expect(overlay).toHaveBeenCalledTimes(1));
    expect(fetcher).not.toHaveBeenCalled();

    const depot = {
      id: fixture.depot.id,
      label: `Depot ${fixture.depot.name}`,
      position: fixture.depot.position,
    };
    const stops = fixture.orders.map((order) => ({
      id: order.id, label: `${order.orderCode} — ${order.customerName}`, position: order.position,
    }));
    const roadVisit = [depot, ...stops, depot];
    const positions = roadVisit.map((stop) => stop.position);
    fetcher.mockResolvedValueOnce(Response.json({ data: {
      scenarioId: "local-demo",
      route: { stops: roadVisit, nnInitialDistanceM: 400, totalDistanceM: 325, savingsM: 75 },
      positions,
    } }));
    chooseRoadMode();
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: optimizeLabel }));
    expect(await screen.findByText("Rute jalan OSRM")).toBeInTheDocument();
    expect(screen.getByText("325 m")).toBeInTheDocument();
    expect(fetcher.mock.calls).toEqual([["/api/scenarios/local-demo/road-route", expect.objectContaining({ method: "POST" })]]);
    await waitFor(() => expect(overlay).toHaveBeenCalledTimes(2));
    const [line] = (overlay.mock.contexts.at(-1) as Polyline).getLatLngs() as LatLng[][];
    expect(line.map(({ lat, lng }) => [lat, lng])).toEqual(positions);

    fireEvent.click(screen.getByRole("button", { name: "Muat daftar Scenario database" }));
    expect(await screen.findByText("Daftar Scenario gagal dimuat.")).toBeInTheDocument();
    expect(screen.getByText("8 Order sintetis")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Scenario Demo Lokal" })).toBeInTheDocument();
  });

  it("opens a bookmarked demo directly without requesting the database list", async () => {
    enableLocalDemo();
    vi.stubEnv("OSRM_MAP_DEMO", undefined);
    const fetcher = mockReads();
    render(await MapPage({ searchParams: Promise.resolve({ scenarioId: "local-demo" }) }));
    expect(await screen.findByText("8 Order sintetis")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Jarak Jalan (OSRM)" })).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("still loads and selects a saved Scenario on request", async () => {
    enableLocalDemo();
    const fetcher = mockReads();
    render(await MapPage());
    fireEvent.click(screen.getByRole("button", { name: "Muat daftar Scenario database" }));
    await selectScenario("Scenario A", "10");
    expect(await screen.findByRole("button", { name: "Order QA-A" })).toBeInTheDocument();
    expect(fetcher.mock.calls.map(([path]) => path)).toContain(ordersA);
    await selectScenario("Scenario Demo Lokal", "local-demo");
    expect(await screen.findByText("8 Order sintetis")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Order QA-A" })).not.toBeInTheDocument();
  });

  it.each([
    ["MAP_LOCAL_SCENARIO_DEMO", undefined],
    ["NODE_ENV", "production"],
    ["APP_ENV", "testing"],
    ["VERCEL_ENV", "preview"],
    ["VERCEL_TARGET_ENV", "production"],
  ])("hides the fixture for %s=%s", async (key, value) => {
    enableLocalDemo();
    vi.stubEnv(key!, value);
    mockReads();
    render(await MapPage({ searchParams: Promise.resolve({ scenarioId: "local-demo" }) }));
    expect(await screen.findByRole("option", { name: "Scenario A" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Scenario Demo Lokal" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Tautan Scenario tidak valid.");
  });
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

  it("offers road routing only when enabled and sends one scoped request on explicit action", async () => {
    Object.defineProperty(Browser, "svg", { value: true });
    const overlay = vi.spyOn(Polyline.prototype, "onAdd");
    const fetcher = mockReads({ [roadPath]: roadReply() });
    render(<MapManager initialScenarioId="10" osrmEnabled />);
    const optimize = await screen.findByRole("button", { name: optimizeLabel });
    expect(screen.getByRole("combobox", { name: "Mode jarak" })).toHaveValue("haversine");
    expect(screen.getByText(/Estimasi garis lurus/)).toBeInTheDocument();
    chooseRoadMode();
    expect(fetcher.mock.calls.some(([path]) => path === roadPath)).toBe(false);
    fireEvent.click(optimize);
    expect(await screen.findByRole("list", { name: "Urutan kunjungan" })).toHaveTextContent("QA-A");
    expect(screen.getByText("325 m")).toBeInTheDocument();
    expect(screen.getByText("75 m")).toBeInTheDocument();
    expect(await screen.findByText("Rute jalan OSRM")).toBeInTheDocument();
    const layer = overlay.mock.contexts[0] as Polyline;
    const [line] = layer.getLatLngs() as LatLng[][];
    expect(line.map(({ lat, lng }) => [lat, lng])).toEqual(roadPositions);
    expect(fetcher.mock.calls.filter(([path]) => path === roadPath)).toEqual([
      [roadPath, expect.objectContaining({ method: "POST", credentials: "same-origin" })],
    ]);
  });

  it("keeps road metrics and visit order visible when geometry is unavailable", async () => {
    const overlay = vi.spyOn(Polyline.prototype, "onAdd");
    mockReads({ [roadPath]: roadReply(null) });
    render(<MapManager initialScenarioId="10" osrmEnabled />);
    await screen.findByRole("button", { name: "Order QA-A" });
    chooseRoadMode();
    fireEvent.click(screen.getByRole("button", { name: optimizeLabel }));
    expect(await screen.findByText(/Geometri rute jalan belum tersedia/)).toBeInTheDocument();
    expect(screen.getByText("325 m")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Urutan kunjungan" })).toBeInTheDocument();
    expect(overlay).not.toHaveBeenCalled();
  });

  it("shows an OSRM timeout without starting the Haversine worker", async () => {
    mockReads({ [roadPath]: Response.json({ error: { code: "OSRM_TIMEOUT" } }, { status: 504 }) });
    const { create } = mockRouteWorker();
    render(<MapManager initialScenarioId="10" osrmEnabled />);
    const optimize = await screen.findByRole("button", { name: optimizeLabel });
    chooseRoadMode();
    fireEvent.click(optimize);
    expect(await screen.findByRole("alert")).toHaveTextContent(/OSRM.*waktu/i);
    expect(screen.queryByRole("list", { name: "Urutan kunjungan" })).not.toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("aborts and ignores a late road result after selecting a different Scenario", async () => {
    let finish!: (value: unknown) => void;
    const pending = new Promise((resolve) => { finish = resolve; });
    const fetcher = mockReads({ [roadPath]: pending });
    render(<MapManager initialScenarioId="10" osrmEnabled />);
    const optimize = await screen.findByRole("button", { name: optimizeLabel });
    chooseRoadMode();
    fireEvent.click(optimize);
    const roadRequest = fetcher.mock.calls.find(([path]) => path === roadPath);
    await selectScenario("Scenario B", "20");
    await screen.findByRole("button", { name: "Order QA-B" });
    expect(roadRequest?.[1].signal?.aborted).toBe(true);
    await act(async () => { finish(roadReply()); });
    expect(screen.queryByRole("list", { name: "Urutan kunjungan" })).not.toBeInTheDocument();
  });

  it.each([
    ["coordinate", { position: [-6.92, 110.42] }],
    ["label", { label: "QA-A — Nama baru" }],
  ])("rejects road results when the %s differs from the loaded Map", async (_field, changed) => {
    const reply = roadReply();
    reply.data.route.stops = [roadStops[0], { ...roadStops[1], ...changed }, roadStops[2]];
    mockReads({ [roadPath]: reply });
    render(<MapManager initialScenarioId="10" osrmEnabled />);
    const optimize = await screen.findByRole("button", { name: optimizeLabel });
    chooseRoadMode();
    fireEvent.click(optimize);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Data Scenario berubah/i);
    expect(screen.queryByRole("list", { name: "Urutan kunjungan" })).not.toBeInTheDocument();
  });
});
