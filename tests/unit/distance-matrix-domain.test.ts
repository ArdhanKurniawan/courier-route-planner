// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildDistanceMatrixSnapshot,
  restoreDistanceMatrixSnapshot,
} from "@/domain/distance-matrix";

const point0 = { longitude: 0, latitude: 0, distanceM: 0 };
const point1 = { longitude: 2, latitude: 1, distanceM: 1.5 };
const input = {
  version: "distance-matrix/v1",
  provider: "osrm",
  profile: "driving",
  endpoint: "https://matrix.example.invalid/osrm/",
  options: { annotations: "distance", generateHints: false, snapRadiusM: 25 },
  unit: "meter",
  directed: true,
  inputHash: "a".repeat(64),
  nodeOrder: [
    { index: 0, kind: "depot", id: "1", latitude: 0, longitude: 0 },
    {
      index: 1,
      kind: "order",
      id: "9007199254740993",
      latitude: 1,
      longitude: 2,
    },
  ],
  matrix: [
    [0, 301.25],
    [499, 0],
  ],
  snapping: [
    { source: point0, destination: point0 },
    { source: point1, destination: point1 },
  ],
  provenance: {
    generatedAt: "2026-11-25T13:00:00.000Z",
    apiVersion: "v1",
    dataVersion: null,
    softwareVersion: null,
    networkExtract: null,
    codeRevision: null,
  },
};

describe("distance-matrix/v1", () => {
  it("matches the SHA-256 golden vector and preserves direction and large string IDs", () => {
    const snapshot = buildDistanceMatrixSnapshot(input);
    expect(snapshot.matrixHash).toBe(
      "7f976e60b0a984957cbb147d731ae0902e28ca48c612e4d783a548bf460bce5c",
    );
    expect(snapshot.matrix).toEqual([
      [0, 301.25],
      [499, 0],
    ]);
    expect(snapshot.nodeOrder[1].id).toBe("9007199254740993");
    expect(snapshot.comparisonEligible).toBe(true);
    expect(restoreDistanceMatrixSnapshot(input, snapshot.matrixHash)).toEqual(
      snapshot,
    );
    expect(Object.isFrozen(snapshot.matrix[0])).toBe(true);
  });

  it("normalizes negative zero, canonicalizes key order and excludes generation time", () => {
    const reordered = Object.fromEntries(Object.entries(input).reverse());
    const generated = buildDistanceMatrixSnapshot({
      ...reordered,
      matrix: [
        [-0, 301.25],
        [499, -0],
      ],
      provenance: {
        ...input.provenance,
        generatedAt: "2026-11-26T01:00:00.000Z",
      },
    });
    expect(Object.is(generated.matrix[0][0], -0)).toBe(false);
    expect(generated.matrixHash).toBe(
      "7f976e60b0a984957cbb147d731ae0902e28ca48c612e4d783a548bf460bce5c",
    );
  });

  it.each([
    ["shape", [[0, 1], [2]]],
    [
      "unreachable",
      [
        [0, null],
        [2, 0],
      ],
    ],
    [
      "non-zero diagonal",
      [
        [1, 1],
        [2, 0],
      ],
    ],
    [
      "negative",
      [
        [0, -1],
        [2, 0],
      ],
    ],
    [
      "infinite",
      [
        [0, Infinity],
        [2, 0],
      ],
    ],
    [
      "NaN",
      [
        [0, NaN],
        [2, 0],
      ],
    ],
  ])("rejects invalid %s", (_label, matrix) => {
    expect(() => buildDistanceMatrixSnapshot({ ...input, matrix })).toThrow();
  });

  it("reports the exact zero direction and makes it ineligible for comparison", () => {
    const snapshot = buildDistanceMatrixSnapshot({
      ...input,
      matrix: [
        [0, 0],
        [2, 0],
      ],
    });
    expect(snapshot.zeroPairs).toEqual([{ from: 0, to: 1 }]);
    expect(snapshot.comparisonEligible).toBe(false);
    expect(snapshot.matrixHash).toBe(
      "fdd121c568ce52285c9a3db0af4e70b93b24461564508b6df6e79aee81037d26",
    );
  });

  it.each([
    {
      matrix: [
        [0, 499],
        [301.25, 0],
      ],
    },
    { inputHash: "b".repeat(64) },
    { profile: "car" },
    { endpoint: "https://another.example.invalid/" },
    { options: { ...input.options, snapRadiusM: 26 } },
    { nodeOrder: [input.nodeOrder[0], { ...input.nodeOrder[1], id: "5" }] },
  ])("detects changed content during readback", (changes) => {
    expect(() =>
      restoreDistanceMatrixSnapshot(
        { ...input, ...changes },
        "7f976e60b0a984957cbb147d731ae0902e28ca48c612e4d783a548bf460bce5c",
      ),
    ).toThrow(expect.objectContaining({ code: "INTEGRITY" }));
  });

  it("rejects reordered or duplicate Order identities and inconsistent snapping", () => {
    expect(() =>
      buildDistanceMatrixSnapshot({
        ...input,
        nodeOrder: [...input.nodeOrder].reverse(),
      }),
    ).toThrow();
    expect(() =>
      buildDistanceMatrixSnapshot({
        ...input,
        nodeOrder: [...input.nodeOrder, { ...input.nodeOrder[1], index: 2 }],
      }),
    ).toThrow();
    expect(() =>
      buildDistanceMatrixSnapshot({
        ...input,
        snapping: [
          input.snapping[0],
          { source: point1, destination: { ...point1, longitude: 3 } },
        ],
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_SNAP" }));
  });
});
