// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { nearestNeighborTwoOpt } from "@/domain/nn-two-opt";
import { createOsrmClient } from "@/infrastructure/osrm-client";

const depot = { id: "1", latitude: -7, longitude: 110 };
const first = { id: "2", latitude: -7.01, longitude: 110.01 };
const second = { id: "9007199254740993", latitude: -7.02, longitude: 110.02 };
const input = { depot, orders: [second, first] };
const distances = [[0, 9, 2], [3, 0, 1], [8, 4, 0]];
const waypoints = [
  { location: [110.0001, -7], distance: 11.1 },
  { location: [110.0101, -7.01], distance: 11.1 },
  { location: [110.0201, -7.02], distance: 11.1 },
];
const visit = [0, 2, 1, 0];
const coordinates = [
  waypoints[0].location,
  [110.013, -7.005],
  waypoints[2].location,
  waypoints[1].location,
  waypoints[0].location,
];

function tableReply(extra: Record<string, unknown> = {}) {
  return {
    code: "Ok",
    distances,
    sources: waypoints,
    destinations: waypoints,
    data_version: "fixture-data-version",
    ...extra,
  };
}

function routeReply(extra: Record<string, unknown> = {}) {
  return Response.json({
    code: "Ok",
    waypoints: visit.map((index) => waypoints[index]),
    routes: [{
      distance: 999,
      legs: [{}, {}, {}],
      geometry: { type: "LineString", coordinates },
    }],
    ...extra,
  });
}

function fixture(timeoutMs = 5000) {
  const fetcher = vi.fn<typeof fetch>();
  const client = createOsrmClient({
    baseUrl: "https://osrm.invalid/routed-car/",
    profile: "driving",
    userAgent: "CourierRoutePlanner synthetic test",
    timeoutMs,
    fetcher,
  });
  return { client, fetcher };
}

afterEach(() => vi.useRealTimers());

describe("OSRM Table", () => {
  it("requests a full distance table using canonical BIGINT order and preserves asymmetry and snapping", async () => {
    const { client, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(Response.json(tableReply()));
    const table = await client.getDistanceTable(input);
    const [request, init] = fetcher.mock.calls[0];
    const url = new URL(String(request));
    expect(url.pathname).toBe("/routed-car/table/v1/driving/110,-7;110.01,-7.01;110.02,-7.02");
    expect(url.searchParams.get("annotations")).toBe("distance");
    expect(url.searchParams.has("sources")).toBe(false);
    expect(url.searchParams.has("destinations")).toBe(false);
    expect(url.searchParams.has("fallback_speed")).toBe(false);
    expect(init).toMatchObject({ method: "GET", cache: "no-store", redirect: "error" });
    expect(new Headers(init?.headers).get("user-agent")).toBe("CourierRoutePlanner synthetic test");
    expect(input.orders.map(({id}) => id)).toEqual(["9007199254740993", "2"]);
    expect(table.nodes.map(({kind, id}) => [kind, id])).toEqual([
      ["depot", "1"], ["order", "2"], ["order", "9007199254740993"],
    ]);
    expect(table).toMatchObject({
      unit: "meter",
      directed: true,
      matrix: distances,
      sources: waypoints,
      destinations: waypoints,
      dataVersion: "fixture-data-version",
    });
    expect(table.matrix[0][1]).not.toBe(table.matrix[1][0]);
  });

  it.each([
    { depot: { ...depot, latitude: 91 }, orders: [first] },
    { depot, orders: [{ ...first, longitude: -181 }] },
    { depot, orders: [{ ...first, longitude: NaN }] },
    { depot, orders: [{ ...first, longitude: Infinity }] },
    { depot, orders: [{ ...first, id: "02" }] },
    { depot, orders: [first, first] },
    { depot, orders: [] },
  ])("rejects invalid coordinates or node identity before any request", async (badInput) => {
    const { client, fetcher } = fixture();
    await expect(client.getDistanceTable(badInput)).rejects.toMatchObject({
      code: "INVALID_INPUT", service: "table",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [[0, 3], [2, 0]],
    [[0, 9, 2], [3, 0], [8, 4, 0]],
    [[0, -1, 2], [3, 0, 1], [8, 4, 0]],
    [[0, 9, 2], [3, 1, 1], [8, 4, 0]],
    [[0, 9, 2], [3, 0, "1"], [8, 4, 0]],
    [[0, 9, 2], [3, 0, Infinity], [8, 4, 0]],
    [[0, 9, 2], [3, 0, undefined], [8, 4, 0]],
  ].map((matrix) => ({ matrix })))("rejects malformed distance cells or shape", async ({ matrix }) => {
    const { client, fetcher } = fixture();
    const reply = new Response();
    vi.spyOn(reply, "json").mockResolvedValueOnce(tableReply({ distances: matrix }));
    fetcher.mockResolvedValueOnce(reply);
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({
      code: "INVALID_MATRIX", service: "table",
    });
  });

  it("rejects an unreachable pair and provider fallback estimates", async () => {
    const { client, fetcher } = fixture();
    fetcher
      .mockResolvedValueOnce(Response.json(tableReply({
        distances: [[0, null, 2], [3, 0, 1], [8, 4, 0]],
      })))
      .mockResolvedValueOnce(Response.json(tableReply({ fallback_speed_cells: [[0, 1]] })));
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({ code: "UNREACHABLE" });
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({ code: "INVALID_MATRIX" });
  });

  it("rejects duration-only responses and a provider that does not implement distance", async () => {
    const { client, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(Response.json({ code: "Ok", durations: distances }))
      .mockResolvedValueOnce(Response.json({ code: "NotImplemented" }, { status: 400 }));
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({ code: "DISTANCE_UNSUPPORTED" });
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({
      code: "DISTANCE_UNSUPPORTED", providerCode: "NotImplemented",
    });
  });

  it("rejects incomplete snapping metadata and unexpected provider codes", async () => {
    const { client, fetcher } = fixture();
    fetcher
      .mockResolvedValueOnce(Response.json(tableReply({ destinations: waypoints.slice(1) })))
      .mockResolvedValueOnce(Response.json({ code: "TooBig" }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ code: "NoTable" }, { status: 400 }));
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({
      code: "PROVIDER_ERROR", providerCode: "TooBig", httpStatus: 400,
    });
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({
      code: "UNREACHABLE", providerCode: "NoTable",
    });
  });
});

describe("OSRM Route", () => {
  it("requests GeoJSON in optimizer order, returns to the Depot and keeps matrix cost separate", async () => {
    const { client, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(Response.json(tableReply())).mockResolvedValueOnce(routeReply());
    const table = await client.getDistanceTable(input);
    const solution = nearestNeighborTwoOpt(table.matrix);
    expect(solution.route).toEqual(visit);
    expect(solution.totalDistanceM).toBe(9);
    const geometry = await client.getRouteGeometry(table, solution.route);
    const request = new URL(String(fetcher.mock.calls[1][0]));
    expect(request.pathname).toBe("/routed-car/route/v1/driving/110,-7;110.02,-7.02;110.01,-7.01;110,-7");
    expect(request.searchParams.get("geometries")).toBe("geojson");
    expect(request.searchParams.get("overview")).toBe("full");
    expect(geometry).toMatchObject({
      geometry: { type: "LineString", coordinates },
      waypoints: visit.map((index) => waypoints[index]),
    });
    expect(geometry).not.toHaveProperty("distance");
    expect(geometry).not.toHaveProperty("matrix");
    expect(solution.totalDistanceM).toBe(9);
  });

  it.each([[0, 1, 1, 0], [0, 2, 1], [0, 1, 3, 0], [0, 1, 2, 1]].map((route) => ({ route })))(
    "rejects invalid waypoint index order before sending a Route request",
    async ({ route }) => {
      const { client, fetcher } = fixture();
      fetcher.mockResolvedValueOnce(Response.json(tableReply()));
      const table = await client.getDistanceTable(input);
      await expect(client.getRouteGeometry(table, route)).rejects.toMatchObject({
        code: "INVALID_INPUT", service: "route",
      });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it("rejects a response with the same waypoints reordered or missing", async () => {
    const { client, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(Response.json(tableReply()))
      .mockResolvedValueOnce(routeReply({ waypoints: [waypoints[0], waypoints[1], waypoints[2], waypoints[0]] }))
      .mockResolvedValueOnce(routeReply({ waypoints: [waypoints[0], waypoints[2], waypoints[0]] }));
    const table = await client.getDistanceTable(input);
    await expect(client.getRouteGeometry(table, visit)).rejects.toMatchObject({ code: "WAYPOINT_MISMATCH" });
    await expect(client.getRouteGeometry(table, visit)).rejects.toMatchObject({ code: "WAYPOINT_MISMATCH" });
  });

  it("uses the same route indices to form the request and validate its reply", async () => {
    const { client, fetcher } = fixture();
    const mutableVisit = [...visit];
    fetcher.mockResolvedValueOnce(Response.json(tableReply()))
      .mockImplementationOnce(async () => {
        mutableVisit.reverse();
        return routeReply();
      });
    const table = await client.getDistanceTable(input);
    await expect(client.getRouteGeometry(table, mutableVisit)).resolves.toMatchObject({
      waypoints: visit.map((index) => waypoints[index]),
    });
  });

  it.each([
    { type: "MultiLineString", coordinates },
    { type: "LineString", coordinates: [[110, -7]] },
    { type: "LineString", coordinates: [[110, -7], [-7, 110]] },
    { type: "LineString", coordinates: [[111, -7], waypoints[0].location] },
    { type: "LineString", coordinates: [...coordinates].reverse() },
  ])("rejects malformed or inconsistent GeoJSON", async (geometry) => {
    const { client, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(Response.json(tableReply()))
      .mockResolvedValueOnce(routeReply({ routes: [{ legs: [{}, {}, {}], geometry }] }));
    const table = await client.getDistanceTable(input);
    await expect(client.getRouteGeometry(table, visit)).rejects.toMatchObject({
      code: "INVALID_GEOMETRY", service: "route",
    });
  });

  it("reports NoRoute without altering valid Table or optimizer results", async () => {
    const { client, fetcher } = fixture();
    fetcher.mockResolvedValueOnce(Response.json(tableReply()))
      .mockResolvedValueOnce(Response.json({ code: "NoRoute" }, { status: 400 }));
    const table = await client.getDistanceTable(input);
    await expect(client.getRouteGeometry(table, visit)).rejects.toMatchObject({
      code: "UNREACHABLE", service: "route", providerCode: "NoRoute",
    });
    expect(nearestNeighborTwoOpt(table.matrix).totalDistanceM).toBe(9);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("OSRM transport", () => {
  it("distinguishes network failure, HTTP failure, and invalid provider JSON", async () => {
    const { client, fetcher } = fixture();
    fetcher.mockRejectedValueOnce(new Error("internal transport details"))
      .mockResolvedValueOnce(new Response("maintenance", { status: 503 }))
      .mockResolvedValueOnce(new Response("not JSON"));
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({ code: "NETWORK" });
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({ code: "HTTP_ERROR", httpStatus: 503 });
    await expect(client.getDistanceTable(input)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it.each(["request", "body"])("aborts a pending %s at its deadline without retry", async (stage) => {
    vi.useFakeTimers();
    const { client, fetcher } = fixture(25);
    fetcher.mockImplementation(async (_url, init) => {
      const pending = new Promise<never>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
      if (stage === "request") return pending;
      const response = new Response();
      vi.spyOn(response, "json").mockReturnValue(pending);
      return response;
    });
    const verdict = expect(client.getDistanceTable(input)).rejects.toMatchObject({
      code: "TIMEOUT", service: "table",
    });
    await Promise.all([vi.advanceTimersByTimeAsync(25), verdict]);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not contact the provider when the caller already canceled", async () => {
    const { client, fetcher } = fixture();
    await expect(client.getDistanceTable(input, AbortSignal.abort())).rejects.toMatchObject({
      code: "ABORTED", service: "table",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
