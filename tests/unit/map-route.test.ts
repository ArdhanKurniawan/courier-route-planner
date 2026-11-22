// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { MapPosition, ScenarioMapData } from "@/components/map/map-data";
import { calculateMapRoute } from "@/components/map/map-route";
import { mapRoadResponse } from "@/lib/validation/map-road-route";

function order(id: string, position: MapPosition | null) {
  return { id, position, orderCode: `QA-${id}`, customerName: "Pelanggan", address: null };
}

function scenario(orders: ScenarioMapData["orders"]): ScenarioMapData {
  return {
    scenarioId: "10",
    depot: { id: "1", name: "Gudang", position: [0, 0], address: null },
    orders,
  };
}

describe("Map route demo", () => {
  it("keeps depot at index 0 and uses numeric Order ID order even beyond Number.MAX_SAFE_INTEGER", () => {
    const orders = [
      order("9007199254740993", [0, 1]),
      order("10", [0, 1]),
      order("9007199254740992", [0, 1]),
      order("2", [0, 1]),
    ];
    const result = calculateMapRoute(scenario(orders));
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a route");
    expect(result.route.stops.map(({ id }) => id)).toEqual([
      "1", "2", "10", "9007199254740992", "9007199254740993", "1",
    ]);
    expect(result.route.totalDistanceM).toBeCloseTo(222390.1605, 3);
    const [outbound, ...remaining] = result.route.legDistancesM;
    expect(outbound).toBeCloseTo(111195.0802, 3);
    expect(remaining).toEqual([0, 0, 0, outbound]);
    expect(calculateMapRoute(scenario(orders.toReversed()))).toEqual(result);
    expect(orders.map(({ id }) => id)).toEqual([
      "9007199254740993", "10", "9007199254740992", "2",
    ]);
  });

  it("returns NN, Hybrid and savings in meters for a known geometry", () => {
    const result = calculateMapRoute(scenario([
      order("2", [0, 1]),
      order("3", [0, 2]),
      order("4", [1, 0]),
      order("5", [2, 0]),
    ]));
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a route");
    expect(result.route.stops.map(({ id }) => id)).toEqual(["1", "2", "3", "5", "4", "1"]);
    expect(result.route.nnInitialDistanceM).toBeCloseTo(804605.059, 3);
    expect(result.route.totalDistanceM).toBeCloseTo(759255.560, 3);
    expect(result.route.savingsM).toBeCloseTo(45349.499, 3);
    expect(result.route.legDistancesM).toHaveLength(result.route.stops.length - 1);
    expect(result.route.legDistancesM[2]).toBeCloseTo(314475.239, 3);
    expect(result.route.legDistancesM.at(-1)).toBeCloseTo(111195.080, 3);
    expect(result.route.legDistancesM.reduce((sum, leg) => sum + leg, 0))
      .toBeCloseTo(result.route.totalDistanceM, 8);
  });

  it("uses the short arc across the antimeridian", () => {
    const data = scenario([order("2", [0, -179.9])]);
    data.depot.position = [0, 179.9];
    const result = calculateMapRoute(data);
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected a route");
    expect(result.route.totalDistanceM).toBeCloseTo(44478.032, 3);
  });

  it("rejects the complete dataset when any Order has missing or invalid coordinates", () => {
    expect(calculateMapRoute(scenario([order("2", [0, 1]), order("3", null)]))).toEqual({
      status: "error",
      message: expect.stringMatching(/koordinat Order QA-3/i),
    });
  });

  it("reports missing Depot coordinates and an empty Scenario", () => {
    const data = scenario([order("2", [0, 1])]);
    data.depot.position = null;
    expect(calculateMapRoute(data)).toEqual({
      status: "error",
      message: expect.stringMatching(/koordinat Depot/i),
    });
    expect(calculateMapRoute(scenario([]))).toEqual({
      status: "error",
      message: expect.stringMatching(/belum ada Order/i),
    });
  });
});

describe("Map road segment response validation", () => {
  function response(legDistancesM: number[], totalDistanceM = 0.3) {
    const depot = { id: "1", label: "Depot", position: [0, 0] };
    return { data: {
      scenarioId: "10",
      route: {
        stops: [depot, { id: "2", label: "Order", position: [0, 1] }, depot],
        nnInitialDistanceM: totalDistanceM,
        totalDistanceM,
        savingsM: 0,
        legDistancesM,
      },
      positions: null,
    } };
  }

  it("accepts a matching segment sum despite floating-point rounding", () => {
    expect(mapRoadResponse.safeParse(response([0.1, 0.2])).success).toBe(true);
  });

  it.each([
    { segments: [0.3], total: 0.3 },
    { segments: [0.1, 0.25], total: 0.3 },
    { segments: [-0.1, 0.4], total: 0.3 },
    { segments: [Number.NaN, 0.3], total: 0.3 },
    { segments: [Number.POSITIVE_INFINITY, 0], total: 0.3 },
    { segments: [Number.MAX_VALUE, Number.MAX_VALUE], total: Number.MAX_VALUE },
  ])("rejects invalid segment count, values or sum ($segments)", ({ segments, total }) => {
    expect(mapRoadResponse.safeParse(response(segments, total)).success).toBe(false);
  });
});
