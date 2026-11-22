import { describe, expect, it } from "vitest";
import {
  benchmarkInputVersion,
  buildBenchmarkInput,
} from "@/domain/benchmark-input";
import {
  nearestNeighborTwoOpt,
  type DistanceMatrix,
} from "@/domain/nn-two-opt";

const scenarioId = "9007199254740993";

function order(id: string, latitude: number, longitude: number) {
  return {
    id,
    scenarioId,
    orderCode: `ORDER-${id}`,
    customerName: "Synthetic customer",
    address: null as string | null,
    latitude,
    longitude,
    source: "dummy" as "dummy" | "manual",
  };
}

function source() {
  return {
    scenario: {
      id: scenarioId,
      depotId: "2",
      name: "Synthetic scenario",
      distributionPattern: "random",
      customerCount: 7,
      radiusMinM: 100,
      radiusMaxM: 1000,
      generationSeed: "-9223372036854775808",
      generatorVersion: "random-v1",
      status: "draft",
    },
    depot: {
      id: "2",
      name: "Synthetic depot",
      address: "Synthetic depot address",
      latitude: -0,
      longitude: 110.123456789,
      isActive: true,
    },
    orders: [
      order("9007199254740993", -9, 108),
      order("10", -7, -0),
      order("9007199254740992", -8, 109),
      order("2", -6.123456789, 110.5),
    ],
    provenance: {
      frozenAt: "2026-01-01T00:00:00.000Z",
      benchmarkCaseId: "9007199254740994",
      gitCommitSha: "1".repeat(40),
    },
  };
}

// Exact UTF-8 bytes, independently hashed with System.Security.Cryptography.SHA256.
const canonicalOrderedInput =
  '{"version":"benchmark-case-input/v1","scenario":{"id":"9007199254740993","depotId":"2","distributionPattern":"random","configuredCustomerCount":7,"radiusMinM":100,"radiusMaxM":1000,"generationSeed":"-9223372036854775808","generatorVersion":"random-v1"},"nodes":[{"index":0,"kind":"depot","id":"2","latitude":0,"longitude":110.123456789},{"index":1,"kind":"order","id":"2","latitude":-6.123456789,"longitude":110.5},{"index":2,"kind":"order","id":"10","latitude":-7,"longitude":0},{"index":3,"kind":"order","id":"9007199254740992","latitude":-8,"longitude":109},{"index":4,"kind":"order","id":"9007199254740993","latitude":-9,"longitude":108}]}';
const orderedInputHash =
  "6aa77120acb91738d0c41c49ba2db785291a025f308bbee2eae85495ad56cb93";
const canonicalSingleOrderInput =
  '{"version":"benchmark-case-input/v1","scenario":{"id":"1","depotId":"9223372036854775807","distributionPattern":"directional","configuredCustomerCount":0,"radiusMinM":null,"radiusMaxM":null,"generationSeed":null,"generatorVersion":null},"nodes":[{"index":0,"kind":"depot","id":"9223372036854775807","latitude":90,"longitude":180},{"index":1,"kind":"order","id":"1","latitude":5e-8,"longitude":-180}]}';
const singleOrderInputHash =
  "9421ea35c9167016a9dbc4bc3623e615518d6f40fa329e3b50cd744629c38f50";

describe("buildBenchmarkInput", () => {
  it("freezes a deterministic input and matches the numeric ordering golden vector", () => {
    const snapshot = buildBenchmarkInput(source());

    expect(snapshot).toEqual(buildBenchmarkInput(source()));
    expect(snapshot.version).toBe(benchmarkInputVersion);
    expect(snapshot.canonicalInput).toBe(canonicalOrderedInput);
    expect(snapshot.inputHash).toBe(orderedInputHash);
    expect(snapshot.configuredCustomerCount).toBe(7);
    expect(snapshot.actualOrderCount).toBe(4);
    expect(snapshot.pointCount).toBe(5);
    expect(
      snapshot.nodes.map(({ index, kind, id }) => [index, kind, id]),
    ).toEqual([
      [0, "depot", "2"],
      [1, "order", "2"],
      [2, "order", "10"],
      [3, "order", "9007199254740992"],
      [4, "order", "9007199254740993"],
    ]);
    expect(Object.is(snapshot.nodes[0].latitude, -0)).toBe(false);
  });

  it("matches the single-order vector with null configuration and original precision", () => {
    const input = source();
    const snapshot = buildBenchmarkInput({
      scenario: {
        ...input.scenario,
        id: "1",
        depotId: "9223372036854775807",
        distributionPattern: "directional",
        customerCount: 0,
        radiusMinM: null,
        radiusMaxM: null,
        generationSeed: null,
        generatorVersion: undefined,
      },
      depot: {
        ...input.depot,
        id: "9223372036854775807",
        latitude: 90,
        longitude: 180,
      },
      orders: [{ ...order("1", 5e-8, -180), scenarioId: "1" }],
    });

    expect(snapshot.canonicalInput).toBe(canonicalSingleOrderInput);
    expect(snapshot.inputHash).toBe(singleOrderInputHash);
    expect(snapshot.scenario.generatorVersion).toBeNull();
    expect(snapshot.configuredCustomerCount).toBe(0);
    expect(snapshot.actualOrderCount).toBe(1);
  });

  it("keeps the hash and node order independent of arrival order and negative zero", () => {
    const input = source();
    const original = buildBenchmarkInput(input);

    input.orders = [
      input.orders[2],
      input.orders[0],
      input.orders[3],
      input.orders[1],
    ];
    input.orders[3].longitude = 0;
    input.depot.latitude = 0;
    expect(buildBenchmarkInput(input)).toEqual(original);
  });

  it.each([
    [
      "depot coordinates",
      (input: ReturnType<typeof source>) => {
        input.depot.latitude = 1e-12;
      },
    ],
    [
      "Order coordinates",
      (input: ReturnType<typeof source>) => {
        input.orders[3].latitude += 1e-12;
      },
    ],
    [
      "Scenario identity",
      (input: ReturnType<typeof source>) => {
        input.scenario.id = "9007199254740994";
        input.orders.forEach((row) => {
          row.scenarioId = input.scenario.id;
        });
      },
    ],
    [
      "depot identity",
      (input: ReturnType<typeof source>) => {
        input.depot.id = input.scenario.depotId = "3";
      },
    ],
    [
      "Order identity and resulting node index",
      (input: ReturnType<typeof source>) => {
        input.orders[3].id = "11";
      },
    ],
    [
      "configured count",
      (input: ReturnType<typeof source>) => {
        input.scenario.customerCount = 8;
      },
    ],
    [
      "distribution pattern",
      (input: ReturnType<typeof source>) => {
        input.scenario.distributionPattern = "clustered";
      },
    ],
    [
      "radius",
      (input: ReturnType<typeof source>) => {
        input.scenario.radiusMinM = 200;
      },
    ],
    [
      "seed",
      (input: ReturnType<typeof source>) => {
        input.scenario.generationSeed = "0";
      },
    ],
    [
      "generator version",
      (input: ReturnType<typeof source>) => {
        input.scenario.generatorVersion = "random-v2";
      },
    ],
  ])("changes the hash when %s changes", (_field, change) => {
    const input = source();
    const original = buildBenchmarkInput(input);
    change(input);
    expect(buildBenchmarkInput(input).inputHash).not.toBe(original.inputHash);
  });

  it("keeps provenance and display fields in the snapshot outside the input hash", () => {
    const input = source();
    const original = buildBenchmarkInput(input);

    input.scenario.name = "Renamed scenario";
    input.depot.name = "Renamed depot";
    input.orders[0].orderCode = "PRESENTATION";
    input.orders[0].customerName = "Renamed customer";
    input.orders[0].address = "Changed address";
    input.provenance.frozenAt = "2026-01-02T00:00:00.000Z";
    input.provenance.benchmarkCaseId = "9007199254740995";
    input.provenance.gitCommitSha = "2".repeat(40);

    const snapshot = buildBenchmarkInput(input);
    expect(snapshot.scenario.name).toBe(input.scenario.name);
    expect(snapshot.nodes[0].name).toBe(input.depot.name);
    expect(snapshot.nodes[4]).toMatchObject({
      orderCode: input.orders[0].orderCode,
      customerName: input.orders[0].customerName,
      address: input.orders[0].address,
    });
    expect(snapshot.provenance).toEqual(input.provenance);
    expect(snapshot.canonicalInput).toBe(original.canonicalInput);
    expect(snapshot.inputHash).toBe(original.inputHash);
  });

  it("leaves the source untouched and owns deeply frozen copies", () => {
    const input = source();
    const before = {
      scenario: { ...input.scenario },
      depot: { ...input.depot },
      orders: input.orders.map((row) => ({ ...row })),
      provenance: { ...input.provenance },
    };
    const snapshot = buildBenchmarkInput(input);

    expect(input).toEqual(before);
    expect(Object.isFrozen(input.orders)).toBe(false);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.scenario)).toBe(true);
    expect(Object.isFrozen(snapshot.nodes)).toBe(true);
    expect(snapshot.nodes.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(snapshot.provenance)).toBe(true);

    input.scenario.name = "Edited";
    input.scenario.customerCount = 100;
    input.depot.longitude = 107;
    input.orders[3].latitude = 0;
    input.orders.reverse();
    input.orders.pop();
    input.provenance.benchmarkCaseId = "9007199254740995";

    expect(snapshot).toEqual(buildBenchmarkInput(before));
  });

  it.each([
    [
      "empty orders",
      (input: ReturnType<typeof source>) => {
        input.orders = [];
      },
    ],
    [
      "non-draft Scenario",
      (input: ReturnType<typeof source>) => {
        input.scenario.status = "archived";
      },
    ],
    [
      "foreign Order",
      (input: ReturnType<typeof source>) => {
        input.orders[0].scenarioId = "1";
      },
    ],
    [
      "duplicate Order identity",
      (input: ReturnType<typeof source>) => {
        input.orders[1].id = input.orders[0].id;
      },
    ],
    [
      "mismatched depot identity",
      (input: ReturnType<typeof source>) => {
        input.depot.id = "3";
      },
    ],
    [
      "non-canonical ID",
      (input: ReturnType<typeof source>) => {
        input.orders[0].id = "01";
      },
    ],
    [
      "ID beyond signed BIGINT",
      (input: ReturnType<typeof source>) => {
        input.orders[0].id = "9223372036854775808";
      },
    ],
    [
      "signed seed below minimum",
      (input: ReturnType<typeof source>) => {
        input.scenario.generationSeed = "-9223372036854775809";
      },
    ],
    [
      "negative count",
      (input: ReturnType<typeof source>) => {
        input.scenario.customerCount = -1;
      },
    ],
    [
      "inverted radii",
      (input: ReturnType<typeof source>) => {
        input.scenario.radiusMinM = 1001;
      },
    ],
    [
      "NaN latitude",
      (input: ReturnType<typeof source>) => {
        input.depot.latitude = NaN;
      },
    ],
    [
      "infinite longitude",
      (input: ReturnType<typeof source>) => {
        input.orders[0].longitude = Infinity;
      },
    ],
    [
      "out-of-range latitude",
      (input: ReturnType<typeof source>) => {
        input.orders[0].latitude = 90.00001;
      },
    ],
    [
      "out-of-range longitude",
      (input: ReturnType<typeof source>) => {
        input.depot.longitude = -180.00001;
      },
    ],
  ])("rejects %s", (_case, invalidate) => {
    const input = source();
    invalidate(input);
    expect(() => buildBenchmarkInput(input)).toThrow();
  });

  it("rejects numeric IDs and coerced coordinates", () => {
    const input = source();
    expect(() =>
      buildBenchmarkInput({ ...input, depot: { ...input.depot, id: 2 } }),
    ).toThrow();
    expect(() =>
      buildBenchmarkInput({
        ...input,
        depot: { ...input.depot, latitude: "0" },
      }),
    ).toThrow();
  });

  it("resolves a closed NN + 2-Opt tour by frozen indices of a directed matrix", () => {
    const input = source();
    const snapshot = buildBenchmarkInput({
      ...input,
      orders: [input.orders[1], input.orders[3]],
    });
    const matrix: DistanceMatrix = [
      [0, 1, 8],
      [8, 0, 2],
      [3, 8, 0],
    ];

    expect(matrix).toHaveLength(snapshot.pointCount);
    const { route, totalDistanceM } = nearestNeighborTwoOpt(matrix);
    expect(
      route.map((index) => [
        snapshot.nodes[index].kind,
        snapshot.nodes[index].id,
      ]),
    ).toEqual([
      ["depot", "2"],
      ["order", "2"],
      ["order", "10"],
      ["depot", "2"],
    ]);
    expect(totalDistanceM).toBe(6);
  });
});
