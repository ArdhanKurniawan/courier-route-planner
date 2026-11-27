// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getMatrixOsrmConfig } from "@/config/distance-matrix-osrm";
import { createOsrmDistanceMatrixProvider } from "@/infrastructure/osrm-distance-matrix";
import type { DistanceMatrixNode } from "@/domain/distance-matrix";

const env = {
  DISTANCE_MATRIX_GENERATION: "1",
  DISTANCE_MATRIX_OSRM_URL: "https://dedicated.example.invalid/osrm/",
  DISTANCE_MATRIX_OSRM_PROFILE: "driving",
  DISTANCE_MATRIX_OSRM_MAX_POINTS: "51",
  DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M: "20",
};
const config = getMatrixOsrmConfig(env)!;
const hash = "b".repeat(64);
const points: readonly DistanceMatrixNode[] = [
  { index: 0, kind: "depot", id: "1", longitude: 110, latitude: -6 },
  {
    index: 1,
    kind: "order",
    id: "9007199254740993",
    longitude: 111,
    latitude: -7,
  },
  { index: 2, kind: "order", id: "2", longitude: 109, latitude: -5 },
];
const snap = points.map(({ longitude, latitude }) => ({
  location: [longitude, latitude],
  distance: 0,
}));
const distances = [
  [0, 12.5, 30],
  [17, 0, 22],
  [40, 23, 0],
];
const response = {
  code: "Ok",
  distances,
  sources: snap,
  destinations: snap,
};

describe("OSRM research Table adapter", () => {
  it("requests the full archived order without resorting BIGINT IDs", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(response));
    const provider = createOsrmDistanceMatrixProvider(
      config,
      transport,
      () => new Date("2026-11-25T00:00:00.000Z"),
    );
    const result = await provider.generate(hash, points);
    const [rawUrl, request] = transport.mock.calls[0];
    const url = new URL(String(rawUrl));
    expect(url.pathname).toBe("/osrm/table/v1/driving/110,-6;111,-7;109,-5");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      annotations: "distance",
      generate_hints: "false",
      radiuses: "20;20;20",
    });
    expect(request).toMatchObject({
      method: "GET",
      cache: "no-store",
      redirect: "error",
    });
    expect(result).toMatchObject({
      matrix: distances,
      nodeOrder: points,
      snapping: [
        { source: { longitude: 110, latitude: -6, distanceM: 0 } },
        expect.anything(),
        expect.anything(),
      ],
      provenance: {
        dataVersion: null,
        softwareVersion: null,
        networkExtract: null,
      },
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it.each([
    [11, 121],
    [26, 676],
    [51, 2601],
  ])(
    "accepts a %d-point mock response containing all %d directed cells",
    async (size, cells) => {
      const nodes: DistanceMatrixNode[] = Array.from(
        { length: size },
        (_, index) => ({
          index,
          kind: index === 0 ? "depot" : "order",
          id: String(index + 1),
          longitude: 110 + index / 10,
          latitude: -6,
        }),
      );
      const waypoints = nodes.map(({ longitude, latitude }) => ({
        location: [longitude, latitude],
        distance: 0,
      }));
      const matrix = nodes.map(({ index: from }) =>
        nodes.map(({ index: to }) => (from === to ? 0 : 1 + from * 2 + to)),
      );
      const transport = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          code: "Ok",
          distances: matrix,
          sources: waypoints,
          destinations: waypoints,
          data_version: "2026-11-25T00:00:00Z",
        }),
      );
      const snapshot = await createOsrmDistanceMatrixProvider(
        config,
        transport,
      ).generate(hash, nodes);
      expect(snapshot.matrix.flat()).toHaveLength(cells);
      expect(snapshot.matrix[0][1]).not.toBe(snapshot.matrix[1][0]);
      expect(snapshot.provenance.dataVersion).toBe("2026-11-25T00:00:00Z");
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [
      {
        ...response,
        distances: [
          [0, null, 30],
          [17, 0, 22],
          [40, 23, 0],
        ],
      },
      "UNREACHABLE",
    ],
    [
      {
        ...response,
        distances: [
          [0, 3],
          [1, 0],
        ],
      },
      "INVALID_MATRIX",
    ],
    [
      { ...response, distances: undefined, durations: distances },
      "PROVIDER_UNSUPPORTED",
    ],
    [{ ...response, fallback_speed_cells: [[0, 1]] }, "INVALID_MATRIX"],
    [
      {
        ...response,
        sources: [snap[0], { ...snap[1], distance: 21 }, snap[2]],
      },
      "SNAP_INVALID",
    ],
    [
      {
        ...response,
        sources: [snap[0], { location: snap[1].location }, snap[2]],
      },
      "SNAP_INVALID",
    ],
    [
      { ...response, destinations: [snap[0], snap[2], snap[1]] },
      "SNAP_INVALID",
    ],
    [{ ...response, destinations: snap.slice(1) }, "INVALID_MATRIX"],
    [{ code: "NoSegment" }, "UNREACHABLE"],
    [{ code: "TooBig" }, "POINT_LIMIT"],
  ])("rejects invalid OSRM responses as %s", async (body, code) => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(body));
    const provider = createOsrmDistanceMatrixProvider(config, transport);
    await expect(provider.generate(hash, points)).rejects.toMatchObject({
      code,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("respects the configured size cap before touching the provider", async () => {
    const transport = vi.fn<typeof fetch>();
    const provider = createOsrmDistanceMatrixProvider(
      { ...config, maxPoints: 2 },
      transport,
    );
    await expect(provider.generate(hash, points)).rejects.toMatchObject({
      code: "POINT_LIMIT",
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("rejects both waypoint arrays reordered away from their frozen inputs", async () => {
    const reordered = [snap[0], snap[2], snap[1]];
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        ...response,
        sources: reordered,
        destinations: reordered,
      }),
    );
    await expect(
      createOsrmDistanceMatrixProvider(config, transport).generate(
        hash,
        points,
      ),
    ).rejects.toMatchObject({ code: "SNAP_INVALID" });
  });
});

describe("explicit OSRM provider configuration", () => {
  it("carries declared software and extract identity only when configured", async () => {
    const known = getMatrixOsrmConfig({
      ...env,
      DISTANCE_MATRIX_OSRM_SOFTWARE_VERSION: "v5.27.1",
      DISTANCE_MATRIX_OSRM_EXTRACT_SHA256: "f".repeat(64),
    })!;
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(response));
    const snapshot = await createOsrmDistanceMatrixProvider(
      known,
      transport,
    ).generate(hash, points);
    expect(snapshot.provenance).toMatchObject({
      softwareVersion: "v5.27.1",
      networkExtract: "sha256:" + "f".repeat(64),
      dataVersion: null,
    });
  });

  it.each([
    { DISTANCE_MATRIX_GENERATION: undefined },
    { APP_ENV: "production" },
    { VERCEL_ENV: "production" },
    {
      DISTANCE_MATRIX_OSRM_URL: "https://routing.openstreetmap.de/routed-car/",
    },
    { DISTANCE_MATRIX_OSRM_URL: "https://router.project-osrm.org/" },
    { DISTANCE_MATRIX_OSRM_URL: "http://dedicated.example.invalid/" },
    {
      DISTANCE_MATRIX_OSRM_URL: "https://user:pass@dedicated.example.invalid/",
    },
    {
      DISTANCE_MATRIX_OSRM_URL: "https://dedicated.example.invalid/?query=bad",
    },
    { DISTANCE_MATRIX_OSRM_MAX_POINTS: "52" },
    { DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M: "0" },
  ])(
    "leaves generation disabled for an unsafe or incomplete setting",
    (overrides) => {
      expect(getMatrixOsrmConfig({ ...env, ...overrides })).toBeNull();
    },
  );
});
