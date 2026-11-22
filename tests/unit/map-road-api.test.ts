// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reads = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getScenario: vi.fn(),
  getDepot: vi.fn(),
  listOrders: vi.fn(),
}));
vi.mock("@/lib/security/admin", () => ({ requireAdmin: reads.requireAdmin }));
vi.mock("@/lib/http/scenario-api", () => ({
  scenarioService: () => ({ getScenario: reads.getScenario }),
}));
vi.mock("@/lib/http/depot-api", () => ({
  depotService: () => ({ getDepot: reads.getDepot }),
}));
vi.mock("@/lib/http/order-api", () => ({
  orderService: () => ({ listOrders: reads.listOrders }),
}));

const origin = "http://localhost:3000";
const depot = { id: "1", name: "Gudang", longitude: 110, latitude: -7 };
const first = {
  id: "2", scenarioId: "10", orderCode: "QA-2", customerName: "A",
  longitude: 110.01, latitude: -7.01,
};
const second = {
  id: "9007199254740993", scenarioId: "10", orderCode: "QA-3", customerName: "B",
  longitude: 110.02, latitude: -7.02,
};
const distances = [[0, 2, 3], [4, 0, 4], [20, 2, 0]];
const points = [depot, first, second].map(({ longitude, latitude }) => ({
  location: [longitude, latitude],
}));
const waypointOrder = [points[0], points[2], points[1], points[0]];
const fetcher = vi.fn<typeof fetch>();

function tableReply(value = distances) {
  return Response.json({ code: "Ok", distances: value, sources: points, destinations: points });
}

function geometryReply() {
  return Response.json({
    code: "Ok",
    waypoints: waypointOrder,
    routes: [{
      legs: [{}, {}, {}],
      distance: 999,
      geometry: { type: "LineString", coordinates: waypointOrder.map((point) => point.location) },
    }],
  });
}

async function post(
  id = "10",
  requestOrigin = origin,
  requestUrl = origin,
  requestHost = new URL(requestUrl).host,
) {
  const { POST } = await import("@/app/api/scenarios/[id]/road-route/route");
  return POST(
    new Request(`${requestUrl}/api/scenarios/${id}/road-route`, {
      method: "POST",
      headers: { Origin: requestOrigin, Host: requestHost },
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  Reflect.deleteProperty(globalThis, Symbol.for("courier-route-planner.osrm-map-demo"));
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("AUTH_ORIGIN", origin);
  vi.stubEnv("OSRM_MAP_DEMO", "1");
  vi.stubEnv("MAP_LOCAL_SCENARIO_DEMO", undefined);
  vi.stubEnv("VERCEL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
  vi.stubEnv("VERCEL_TARGET_ENV", undefined);
  vi.stubGlobal("fetch", fetcher);
  reads.requireAdmin.mockResolvedValue({ origin, environment: "development" });
  reads.getScenario.mockResolvedValue({ id: "10", depotId: "1" });
  reads.getDepot.mockResolvedValue(depot);
  reads.listOrders.mockResolvedValue({ data: [second, first], nextCursor: null, totalCount: "2" });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, Symbol.for("courier-route-planner.osrm-map-demo"));
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("local OSRM Map endpoint", () => {
  it("optimizes the eight demo stops with one Table and one Route without database reads", async () => {
    vi.stubEnv("MAP_LOCAL_SCENARIO_DEMO", "1");
    fetcher.mockImplementation(async (input) => {
      const path = new URL(String(input)).pathname;
      const coordinates = path.split("/").at(-1)!.split(";").map((pair) =>
        pair.split(",").map(Number),
      );
      const waypoints = coordinates.map((location) => ({ location }));
      if (path.includes("/table/")) {
        expect(coordinates).toHaveLength(9);
        for (const [longitude, latitude] of coordinates) {
          expect(longitude).toBeGreaterThan(110.35);
          expect(longitude).toBeLessThan(110.5);
          expect(latitude).toBeGreaterThan(-7.06);
          expect(latitude).toBeLessThan(-6.92);
        }
        return Response.json({
          code: "Ok",
          distances: coordinates.map((_, from) => coordinates.map((_, to) =>
            from === to ? 0 : 1 + ((to - from + 9) % 9),
          )),
          sources: waypoints,
          destinations: waypoints,
        });
      }
      expect(path).toContain("/route/");
      expect(coordinates).toHaveLength(10);
      expect(coordinates.at(-1)).toEqual(coordinates[0]);
      return Response.json({
        code: "Ok",
        waypoints,
        routes: [{ legs: Array.from({ length: 9 }, () => ({})), geometry: {
          type: "LineString", coordinates,
        } }],
      });
    });

    const response = await post("local-demo");
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.scenarioId).toBe("local-demo");
    expect(data.route.stops).toHaveLength(10);
    expect(data.route.stops.at(-1)).toEqual(data.route.stops[0]);
    expect(new Set(data.route.stops.slice(0, -1).map(({ id }: { id: string }) => id)).size).toBe(9);
    expect(data.route.totalDistanceM).toBeLessThanOrEqual(data.route.nnInitialDistanceM);
    expect(data.route.legDistancesM).toHaveLength(9);
    expect(data.route.legDistancesM.reduce((sum: number, leg: number) => sum + leg, 0))
      .toBeCloseTo(data.route.totalDistanceM, 8);
    expect(data.positions[0]).toEqual(data.route.stops[0].position);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(reads.getScenario).not.toHaveBeenCalled();
    expect(reads.getDepot).not.toHaveBeenCalled();
    expect(reads.listOrders).not.toHaveBeenCalled();
    expect((await post()).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["MAP_LOCAL_SCENARIO_DEMO", undefined],
    ["OSRM_MAP_DEMO", undefined],
    ["NODE_ENV", "production"],
    ["APP_ENV", "testing"],
    ["VERCEL_ENV", "preview"],
    ["VERCEL_TARGET_ENV", "production"],
  ])("rejects direct fixture access for %s=%s", async (key, value) => {
    vi.stubEnv("MAP_LOCAL_SCENARIO_DEMO", "1");
    vi.stubEnv(key!, value);
    expect((await post("local-demo")).status).toBe(404);
    expect(reads.getScenario).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requires an admin and a matching origin for the fixture", async () => {
    vi.stubEnv("MAP_LOCAL_SCENARIO_DEMO", "1");
    const { HttpError } = await import("@/lib/http/request-security");
    reads.requireAdmin.mockRejectedValueOnce(new HttpError(401, "UNAUTHORIZED", "Authentication required."));
    expect((await post("local-demo")).status).toBe(401);
    expect((await post("local-demo", "https://different.example")).status).toBe(403);
    expect((await post("local-demo", origin, "http://192.0.2.1:3000")).status).toBe(403);
    expect(reads.getScenario).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses the directed Table, preserves BIGINT visit order, and converts GeoJSON for Leaflet", async () => {
    fetcher.mockResolvedValueOnce(tableReply()).mockResolvedValueOnce(geometryReply());
    const response = await post();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(reads.getScenario).toHaveBeenCalledWith(BigInt(10));
    expect(reads.getDepot).toHaveBeenCalledWith(BigInt(1));
    expect(reads.listOrders).toHaveBeenCalledWith(BigInt(10), { limit: 10 });
    const { data } = await response.json();
    expect(data.scenarioId).toBe("10");
    expect(data.route).toMatchObject({
      totalDistanceM: 9, nnInitialDistanceM: 26, savingsM: 17,
      legDistancesM: [3, 2, 4],
    });
    expect(data.route.stops.map(({ id }: { id: string }) => id)).toEqual([
      "1", "9007199254740993", "2", "1",
    ]);
    expect(data.positions).toEqual([[-7, 110], [-7.02, 110.02], [-7.01, 110.01], [-7, 110]]);
    const [table, route] = fetcher.mock.calls.map(([url]) => new URL(String(url)));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(table.href).toContain("https://routing.openstreetmap.de/routed-car/table/v1/driving/");
    expect(table.searchParams.get("annotations")).toBe("distance");
    expect(route.pathname).toContain("/route/v1/driving/110,-7;110.02,-7.02;110.01,-7.01;110,-7");
    expect(route.searchParams.get("geometries")).toBe("geojson");
    // A development hot reload must not reset the provider cooldown.
    vi.resetModules();
    expect((await post()).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps the optimizer result if Route is unavailable", async () => {
    fetcher.mockResolvedValueOnce(tableReply())
      .mockResolvedValueOnce(Response.json({ code: "NoRoute" }, { status: 400 }));
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { positions: null, route: { totalDistanceM: 9, legDistancesM: [3, 2, 4] } },
    });
  });

  it("reports a Table timeout without trying geometry", async () => {
    vi.useFakeTimers();
    try {
      fetcher.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }));
      const pending = post();
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
      await vi.advanceTimersByTimeAsync(10_000);
      const response = await pending;
      expect(response.status).toBe(504);
      expect(await response.json()).toMatchObject({ error: { code: "OSRM_TIMEOUT" } });
      expect(fetcher).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports rejected Table data without a second request", async () => {
    fetcher.mockResolvedValueOnce(Response.json({ code: "NoTable" }, { status: 400 }));
    const response = await post();
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: "OSRM_UNAVAILABLE" } });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it.each([
    ["OSRM_MAP_DEMO", undefined],
    ["NODE_ENV", "production"],
    ["APP_ENV", "testing"],
    ["VERCEL", "1"],
    ["VERCEL_ENV", "preview"],
    ["VERCEL_TARGET_ENV", "production"],
    ["AUTH_ORIGIN", "https://public.example"],
  ])("fails closed for %s=%s", async (name, value) => {
    vi.stubEnv(name!, value);
    expect((await post()).status).toBe(404);
    expect(reads.getScenario).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requires admin identity and same-origin requests before reading data", async () => {
    const { HttpError } = await import("@/lib/http/request-security");
    reads.requireAdmin.mockRejectedValueOnce(new HttpError(401, "UNAUTHORIZED", "Authentication required."));
    expect((await post()).status).toBe(401);
    expect((await post("10", "https://different.example")).status).toBe(403);
    expect((await post("10", origin, "http://192.0.2.1:3000")).status).toBe(403);
    expect((await post("10", origin, origin, "192.0.2.1:3000")).status).toBe(403);
    expect((await post("10", origin, "https://localhost:3000")).status).toBe(403);
    expect((await post("a")).status).toBe(400);
    expect(reads.getScenario).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts the loopback Host when Next dev normalizes the internal URL to localhost", async () => {
    const loopback = "http://127.0.0.1:3000";
    vi.stubEnv("AUTH_ORIGIN", loopback);
    reads.requireAdmin.mockResolvedValue({ origin: loopback, environment: "development" });
    fetcher.mockResolvedValueOnce(tableReply()).mockResolvedValueOnce(geometryReply());
    const response = await post("10", loopback, origin, "127.0.0.1:3000");
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects empty, truncated, oversized and foreign Order sets before OSRM", async () => {
    reads.listOrders
      .mockResolvedValueOnce({ data: [], totalCount: "0", nextCursor: null })
      .mockResolvedValueOnce({ data: [first], totalCount: "2", nextCursor: null })
      .mockResolvedValueOnce({ data: [first, second], totalCount: "11", nextCursor: second.id })
      .mockResolvedValueOnce({ data: [{ ...first, scenarioId: "20" }], totalCount: "1", nextCursor: null });
    for (const status of [422, 409, 422, 409]) {
      expect((await post()).status).toBe(status);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});
