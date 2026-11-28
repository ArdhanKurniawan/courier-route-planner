// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getMatrixProviderConfigs } from "@/config/distance-matrix-osrm";
import { createMatrixProviderManager } from "@/infrastructure/matrix-provider-manager";
import type { DistanceMatrixNode } from "@/domain/distance-matrix";

const preview = {
  NODE_ENV: "production",
  APP_ENV: "testing",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_TARGET_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "testing",
  DISTANCE_MATRIX_GENERATION: "1",
  DISTANCE_MATRIX_OSRM_SNAP_RADIUS_M: "20",
  DISTANCE_MATRIX_JUST_ROUTING_VERIFIED: "1",
  DISTANCE_MATRIX_JUST_ROUTING_API_KEY: "mock-primary-api-key",
  DISTANCE_MATRIX_JUST_ROUTING_MAX_POINTS: "51",
  DISTANCE_MATRIX_OSRM_PLUS_VERIFIED: "1",
  DISTANCE_MATRIX_OSRM_PLUS_API_KEY: "mock-secondary-api-key",
  DISTANCE_MATRIX_OSRM_PLUS_MAX_POINTS: "26",
  DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_DAY: "10",
  DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_MINUTE: "3",
  DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_SECOND: "1",
};
const hash = "b".repeat(64);

function nodesOf(size: number): DistanceMatrixNode[] {
  return Array.from({ length: size }, (_, index) => ({
    index,
    kind: index === 0 ? "depot" : "order",
    id: String(index + 1),
    latitude: -7,
    longitude: 110 + index / 100,
  }));
}

function table(nodes: DistanceMatrixNode[]) {
  const waypoints = nodes.map(({ longitude, latitude }) => ({
    location: [longitude, latitude], distance: 0,
  }));
  return {
    code: "Ok",
    distances: nodes.map(({ index: from }) =>
      nodes.map(({ index: to }) => (from === to ? 0 : 1 + from * 2 + to)),
    ),
    sources: waypoints,
    destinations: waypoints,
  };
}

function setup(size = 11, environment = preview) {
  const nodes = nodesOf(size);
  const response = table(nodes);
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json(response));
  const quota = {
    reserve: vi.fn<() => Promise<"allowed" | "limited" | "unavailable">>().mockResolvedValue("allowed"),
    cooldown: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  };
  const configs = getMatrixProviderConfigs(environment);
  const manager = createMatrixProviderManager(configs, quota, fetcher);
  return { nodes, response, fetcher, quota, manager };
}

describe("verified Testing-only provider configuration", () => {
  it.each([
    { DISTANCE_MATRIX_GENERATION: "0" },
    { NODE_ENV: "development", APP_ENV: "development" },
    { VERCEL_ENV: "production" },
    { VERCEL_TARGET_ENV: "production" },
    { VERCEL_GIT_COMMIT_REF: "feature/other" },
    { DISTANCE_MATRIX_JUST_ROUTING_VERIFIED: "0", DISTANCE_MATRIX_OSRM_PLUS_VERIFIED: "0" },
  ])("denies %j", (overrides) => {
    expect(getMatrixProviderConfigs({ ...preview, ...overrides })).toEqual([]);
  });

  it("skips providers with missing capabilities or unsafe credentials", () => {
    expect(getMatrixProviderConfigs({
      ...preview,
      DISTANCE_MATRIX_JUST_ROUTING_API_KEY: "invalid\nkey",
      DISTANCE_MATRIX_OSRM_PLUS_REQUESTS_PER_SECOND: "0",
    })).toEqual([]);
  });
});

describe("Distance Matrix provider manager", () => {
  it.each([11, 26, 51])("uses one provider and charges all %i-point cells", async (size) => {
    const { manager, nodes, fetcher, quota } = setup(size);
    const snapshot = await manager.generate(hash, nodes);
    expect(snapshot.provenance.actualProvider).toBe("just-routing");
    expect(snapshot.matrix[0][1]).not.toBe(snapshot.matrix[1][0]);
    expect(snapshot.matrix.flat()).toHaveLength(size ** 2);
    expect(quota.reserve).toHaveBeenCalledWith("just-routing", expect.any(Object), size ** 2);
    const [[input, init]] = fetcher.mock.calls;
    const url = new URL(String(input));
    expect(url.origin).toBe("https://api.justrouting.tech");
    expect(url.searchParams.get("annotations")).toBe("distance");
    expect(url.searchParams.get("radiuses")?.split(";")).toHaveLength(size);
    expect(init?.redirect).toBe("manual");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer mock-primary-api-key");
    expect(url.href + JSON.stringify(snapshot)).not.toContain("mock-primary-api-key");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([429, 503, 504])("backs off after HTTP %i and uses the secondary once", async (status) => {
    const { manager, nodes, fetcher, quota } = setup();
    fetcher.mockResolvedValueOnce(new Response("private body", {
      status, headers: { "Retry-After": "180" },
    }));
    expect((await manager.generate(hash, nodes)).provenance.actualProvider).toBe("osrm-plus");
    expect(quota.cooldown).toHaveBeenCalledWith("just-routing", 180_000);
    const [input, init] = fetcher.mock.calls[1];
    expect(new URL(String(input)).hostname).toBe("api.osrmplus.com");
    expect(new Headers(init?.headers).get("x-api-key")).toBe("mock-secondary-api-key");
    expect(new Headers(init?.headers).has("authorization")).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([[0, 1], [5, 5_000]])("uses Retry-After %i in place of the default quota hold", async (value, cooldown) => {
    const { manager, nodes, fetcher, quota } = setup();
    fetcher.mockResolvedValueOnce(new Response(null, {
      status: 429, headers: { "Retry-After": String(value) },
    }));
    expect((await manager.generate(hash, nodes)).provenance.actualProvider).toBe("osrm-plus");
    expect(quota.cooldown).toHaveBeenCalledWith("just-routing", cooldown);
  });

  it("fails over after quota exhaustion and lazily fails back once eligible", async () => {
    const { manager, nodes, fetcher, quota } = setup();
    quota.reserve.mockResolvedValueOnce("limited");
    expect((await manager.generate(hash, nodes)).provenance.actualProvider).toBe("osrm-plus");
    expect((await manager.generate(hash, nodes)).provenance.actualProvider).toBe("just-routing");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("falls back after the 8-second attempt deadline", async () => {
    vi.useFakeTimers();
    try {
      const { manager, nodes, fetcher, quota } = setup();
      fetcher.mockImplementationOnce(async (_, init) => new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      }));
      const result = manager.generate(hash, nodes);
      await vi.advanceTimersByTimeAsync(8_000);
      expect((await result).provenance.actualProvider).toBe("osrm-plus");
      expect(quota.cooldown).toHaveBeenCalledWith("just-routing", 30_000);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not loop over providers when both are unavailable", async () => {
    const { manager, nodes, fetcher, quota } = setup();
    // The first response supplies only an HTTP status. The second is a network failure.
    fetcher.mockResolvedValueOnce(new Response(null, { status: 502 }));
    fetcher.mockRejectedValueOnce(new Error("private transport details"));
    await expect(manager.generate(hash, nodes)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(quota.reserve).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not reserve providers under the requested size", async () => {
    const { manager, nodes, quota } = setup(26, {
      ...preview, DISTANCE_MATRIX_JUST_ROUTING_MAX_POINTS: "11",
    });
    expect((await manager.generate(hash, nodes)).provenance.actualProvider).toBe("osrm-plus");
    expect(quota.reserve).toHaveBeenCalledExactlyOnceWith("osrm-plus", expect.any(Object), 676);
  });

  it("holds OSRMPlus on a daily quota rejection without guessing a reset time", async () => {
    const { manager, nodes, fetcher, quota } = setup();
    fetcher.mockResolvedValueOnce(Response.json(
      { error: { code: "daily_limit_exceeded" } }, { status: 429 },
    ));
    await expect(manager.generate(hash, nodes, undefined, {
      mode: "research", provider: "osrm-plus",
    })).rejects.toMatchObject({ code: "PROVIDER_CAPACITY" });
    expect(quota.cooldown).toHaveBeenCalledWith("osrm-plus", 86_400_000);
  });

  it("checks capability before reserving and fails closed without shared quota", async () => {
    const { manager, nodes, fetcher, quota } = setup(51);
    quota.reserve.mockResolvedValueOnce("limited");
    await expect(manager.generate(hash, nodes)).rejects.toMatchObject({ code: "PROVIDER_CAPACITY" });
    expect(quota.reserve).toHaveBeenCalledTimes(1);
    quota.reserve.mockResolvedValueOnce("unavailable");
    await expect(manager.generate(hash, nodes)).rejects.toMatchObject({ code: "QUOTA_UNAVAILABLE" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["just-routing", "osrm-plus"] as const)("locks research to %s", async (provider) => {
    const { manager, nodes, fetcher, quota } = setup();
    const selection = { mode: "research" as const, provider };
    expect((await manager.generate(hash, nodes, undefined, selection)).provenance.actualProvider).toBe(provider);
    expect(quota.reserve).toHaveBeenCalledWith(provider, expect.any(Object), 121);
    fetcher.mockRejectedValueOnce(new Error("private transport details"));
    await expect(manager.generate(hash, nodes, undefined, selection)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid inputs before quota and invalid snapping without fallback", async () => {
    const { manager, nodes, fetcher, quota, response } = setup();
    await expect(manager.generate(hash, [...nodes].reverse())).rejects.toMatchObject({ code: "INVALID_MATRIX" });
    expect(quota.reserve).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce(Response.json({ ...response, sources: response.sources.map((point) => ({ ...point, distance: 999 })) }));
    await expect(manager.generate(hash, nodes)).rejects.toMatchObject({ code: "SNAP_INVALID" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not fall back on authentication or hide a null pair", async () => {
    const { manager, nodes, fetcher, quota, response } = setup();
    fetcher.mockResolvedValueOnce(new Response("mock-primary-api-key", { status: 401 }));
    await expect(manager.generate(hash, nodes)).rejects.toMatchObject({ code: "PROVIDER_AUTH", message: "PROVIDER_AUTH" });
    expect(quota.cooldown).toHaveBeenCalledTimes(1);
    const distances = response.distances.map((row, index) => index === 0 ? [0, null, ...row.slice(2)] : row);
    fetcher.mockResolvedValueOnce(Response.json({ ...response, distances }));
    await expect(manager.generate(hash, nodes)).rejects.toMatchObject({ code: "UNREACHABLE" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([302, 404, 405])("stops on HTTP %i without forwarding the key or failing over", async (status) => {
    const { manager, nodes, fetcher, quota } = setup();
    fetcher.mockResolvedValueOnce(new Response(null, {
      status, headers: { Location: "https://other.example.invalid/" },
    }));
    await expect(manager.generate(hash, nodes)).rejects.toMatchObject({ code: "PROVIDER_CONFIGURATION" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(quota.cooldown).toHaveBeenCalledWith("just-routing", 3_600_000);
  });

  it("honors Retry-After even when a 429 body stalls", async () => {
    vi.useFakeTimers();
    try {
      const { manager, nodes, fetcher, quota } = setup();
      fetcher.mockImplementationOnce(async (_, init) => new Response(
        new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener("abort", () => controller.error("aborted"), { once: true });
          },
        }),
        { status: 429, headers: { "Retry-After": "300" } },
      ));
      const result = manager.generate(hash, nodes);
      await vi.advanceTimersByTimeAsync(8_000);
      expect((await result).provenance.actualProvider).toBe("osrm-plus");
      expect(quota.cooldown).toHaveBeenCalledWith("just-routing", 300_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([400, 422])("does not fail over when the HTTP %i body stalls", async (status) => {
    vi.useFakeTimers();
    try {
      const { manager, nodes, fetcher } = setup();
      fetcher.mockImplementationOnce(async (_, init) => new Response(
        new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener("abort", () => controller.error("aborted"), { once: true });
          },
        }),
        { status },
      ));
      const result = expect(manager.generate(hash, nodes)).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
      });
      await vi.advanceTimersByTimeAsync(8_000);
      await result;
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("redacts a credential echoed by the upstream and rejects invalid shape", async () => {
    const { manager, nodes, fetcher, response } = setup();
    fetcher.mockResolvedValueOnce(Response.json({
      ...response, data_version: "version:mock-primary-api-key",
    }));
    const snapshot = await manager.generate(hash, nodes);
    expect(snapshot.provenance.dataVersion).toBeNull();
    expect(JSON.stringify(snapshot)).not.toContain("mock-primary-api-key");
    fetcher.mockResolvedValueOnce(Response.json({ ...response, distances: [[0]] }));
    await expect(manager.generate(hash, nodes)).rejects.toMatchObject({ code: "INVALID_MATRIX" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
