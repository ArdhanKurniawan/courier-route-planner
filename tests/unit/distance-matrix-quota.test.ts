// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDistanceMatrixQuota } from "@/lib/security/distance-matrix-quota";

const credentials = {
  url: "https://redis.invalid",
  token: "synthetic-token",
};
const provider = "just-routing";
const limits = {
  requests: 2,
  requestWindowSeconds: 10,
  requestsPerSecond: 1,
  elements: 18,
  elementWindowSeconds: 20,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("distance matrix quota", () => {
  it("uses one atomic reservation per attempt and shares provider keys across clients", async () => {
    const heldKeys = new Set<string>();
    const fetchRedis = vi.fn<typeof fetch>(async (_url, init) => {
      const [command, script, keyCount, usageKey, cooldownKey, ...args] =
        JSON.parse(String(init?.body));
      if (String(command).toUpperCase() !== "EVAL" || keyCount !== 2) {
        throw new Error("Expected one atomic Redis command with two keys");
      }
      expect(script).toEqual(expect.any(String));
      expect(cooldownKey).not.toBe(usageKey);
      expect(args).toEqual([2, 10, 1, 18, 20, 9, expect.any(String), 0, 0]);
      if (heldKeys.has(usageKey)) return Response.json({ result: 0 });
      heldKeys.add(usageKey);
      return Response.json({ result: 1 });
    });
    vi.stubGlobal("fetch", fetchRedis);
    const first = createDistanceMatrixQuota(credentials);
    const second = createDistanceMatrixQuota(credentials);
    const responses = await Promise.all([
      first.reserve(provider, limits, 9),
      second.reserve(provider, limits, 9),
      first.reserve("osrm-plus", limits, 9),
    ]);
    expect(responses.slice(0, 2).sort()).toEqual(["allowed", "limited"]);
    expect(responses[2]).toBe("allowed");
    expect(fetchRedis).toHaveBeenCalledTimes(3);
    expect(heldKeys.size).toBe(2);
  });

  it("fails closed without retrying an ambiguous reservation", async () => {
    let recorded = false;
    const fetchRedis = vi.fn<typeof fetch>(async () => {
      if (recorded) return Response.json({ result: 0 });
      recorded = true;
      throw new Error("lost result after Redis recorded usage");
    });
    vi.stubGlobal("fetch", fetchRedis);
    const quota = createDistanceMatrixQuota(credentials);

    await expect(quota.reserve(provider, limits, 9)).resolves.toBe(
      "unavailable",
    );
    expect(fetchRedis).toHaveBeenCalledTimes(1);
    await expect(quota.reserve(provider, limits, 9)).resolves.toBe("limited");
  });

  it("binds competing selections for the same UUID through one Redis command per attempt", async () => {
    const entries = new Map<string, string>();
    const fetchRedis = vi.fn<typeof fetch>(async (_url, init) => {
      const [command, script, keyCount, key, value, ...rest] = JSON.parse(String(init?.body));
      expect(command.toUpperCase()).toBe("EVAL");
      expect(keyCount).toBe(1);
      expect(rest).toEqual([]);
      expect(script).toContain('redis.call("SET", KEYS[1], ARGV[1], "NX")');
      const existing = entries.get(key);
      if (existing === undefined) entries.set(key, value);
      return Response.json({ result: existing === undefined || existing === value ? 1 : 0 });
    });
    vi.stubGlobal("fetch", fetchRedis);
    const first = createDistanceMatrixQuota(credentials);
    const second = createDistanceMatrixQuota(credentials);
    const caseId = "9007199254740995";
    const id = "dcdfdb87-e66a-4a7b-9eeb-49eba5a61c00";
    const original = { mode: "research", provider: "just-routing" } as const;
    const other = { mode: "research", provider: "osrm-plus" } as const;

    const answers = await Promise.all([
      first.bindSelection(caseId, id, original),
      second.bindSelection(caseId, id, other),
    ]);
    expect(answers.sort()).toEqual(["allowed", "conflict"]);
    const winner = [...entries.values()][0] === "research:just-routing" ? original : other;
    expect(entries.size).toBe(1);
    await expect(first.bindSelection(caseId, id, winner)).resolves.toBe("allowed");
    await expect(second.bindSelection(caseId, id, { mode: "operational" })).resolves.toBe("conflict");
    expect(fetchRedis).toHaveBeenCalledTimes(4);
  });

  it("sends optional minute and day caps in the same reservation", async () => {
    const fetchRedis = vi.fn<typeof fetch>(async (_url, init) => {
      const [, , , , , ...args] = JSON.parse(String(init?.body));
      expect(args).toEqual([
        60,
        86_400,
        2,
        0,
        0,
        121,
        expect.any(String),
        6,
        10,
      ]);
      return Response.json({ result: 1 });
    });
    vi.stubGlobal("fetch", fetchRedis);
    const quota = createDistanceMatrixQuota(credentials);

    await expect(
      quota.reserve(
        provider,
        {
          requests: 60,
          requestWindowSeconds: 86_400,
          requestsPerSecond: 2,
          requestsPerMinute: 6,
          requestsPerDay: 10,
        },
        121,
      ),
    ).resolves.toBe("allowed");
    expect(fetchRedis).toHaveBeenCalledTimes(1);
  });

  it.each([true, false, "1", "0", null, 2])(
    "fails closed on unexpected Redis result %j",
    async (result) => {
      vi.stubGlobal(
        "fetch",
        vi.fn<typeof fetch>(async () => Response.json({ result })),
      );
      const quota = createDistanceMatrixQuota(credentials);

      await expect(quota.reserve(provider, limits, 9)).resolves.toBe(
        "unavailable",
      );
      await expect(quota.cooldown(provider, 1_000)).resolves.toBe(false);
    },
  );

  it("allows a later reservation when Redis reports capacity has reset", async () => {
    let reserved = true;
    const fetchRedis = vi.fn<typeof fetch>(async () =>
      Response.json({ result: reserved ? 0 : 1 }),
    );
    vi.stubGlobal("fetch", fetchRedis);
    const quota = createDistanceMatrixQuota(credentials);

    await expect(quota.reserve(provider, limits, 9)).resolves.toBe("limited");
    reserved = false;
    await expect(quota.reserve(provider, limits, 9)).resolves.toBe("allowed");
  });

  it("writes cooldown and reads it on the same provider key across clients", async () => {
    const expirations = new Map<string, number>();
    let now = 100_000;
    const fetchRedis = vi.fn<typeof fetch>(async (_url, init) => {
      const [command, , keyCount, ...args] = JSON.parse(String(init?.body));
      if (String(command).toUpperCase() !== "EVAL")
        throw new Error("Expected EVAL");
      if (keyCount === 1) {
        const [key, duration] = args;
        expirations.set(
          key,
          Math.max(expirations.get(key) ?? 0, now + duration),
        );
        return Response.json({ result: 1 });
      }
      const [, key] = args;
      return Response.json({
        result: (expirations.get(key) ?? 0) > now ? 0 : 1,
      });
    });
    vi.stubGlobal("fetch", fetchRedis);
    const first = createDistanceMatrixQuota(credentials);
    const second = createDistanceMatrixQuota(credentials);

    await expect(first.cooldown(provider, 5_000)).resolves.toBe(true);
    await expect(second.cooldown(provider, 1_000)).resolves.toBe(true);
    now += 2_000;
    await expect(second.reserve(provider, limits, 9)).resolves.toBe("limited");
    await expect(second.reserve("osrm-plus", limits, 9)).resolves.toBe(
      "allowed",
    );
    await expect(second.cooldown(provider, 4_000)).resolves.toBe(true);
    now += 3_000;
    await expect(second.reserve(provider, limits, 9)).resolves.toBe("limited");
    now += 1_000;
    await expect(first.reserve(provider, limits, 9)).resolves.toBe("allowed");
  });

  it("reports Redis command errors without accepting cooldown or usage", async () => {
    const fetchRedis = vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          error: "synthetic Redis error",
        },
        { status: 503 },
      ),
    );
    vi.stubGlobal("fetch", fetchRedis);
    const quota = createDistanceMatrixQuota(credentials);

    await expect(quota.reserve(provider, limits, 9)).resolves.toBe(
      "unavailable",
    );
    await expect(quota.cooldown(provider, 1_000)).resolves.toBe(false);
    expect(fetchRedis).toHaveBeenCalledTimes(2);
  });

  it("rejects a reservation response that arrives after the Redis timeout", async () => {
    const controller = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
    const fetchRedis = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.signal).toBe(controller.signal);
      controller.abort();
      return Response.json({ result: 1 });
    });
    vi.stubGlobal("fetch", fetchRedis);
    const quota = createDistanceMatrixQuota(credentials);

    await expect(quota.reserve(provider, limits, 9)).resolves.toBe(
      "unavailable",
    );
    expect(timeout).toHaveBeenCalledWith(1_000);
    expect(fetchRedis).toHaveBeenCalledTimes(1);
  });

  it("denies a late Redis response before the timeout event is processed", async () => {
    const clock = vi.spyOn(performance, "now").mockReturnValue(1_000);
    const fetchRedis = vi.fn<typeof fetch>(async () => {
      clock.mockReturnValue(2_001);
      return Response.json({ result: 1 });
    });
    vi.stubGlobal("fetch", fetchRedis);
    const quota = createDistanceMatrixQuota(credentials);

    await expect(quota.reserve(provider, limits, 9)).resolves.toBe(
      "unavailable",
    );
  });

  it("does not send invalid limits or element counts to Redis", async () => {
    const fetchRedis = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchRedis);
    const quota = createDistanceMatrixQuota(credentials);

    await expect(quota.reserve(provider, limits, Number.NaN)).resolves.toBe(
      "unavailable",
    );
    await expect(
      quota.reserve(provider, { ...limits, requests: -1 }, 9),
    ).resolves.toBe("unavailable");
    await expect(
      quota.reserve(
        provider,
        { ...limits, elementWindowSeconds: undefined },
        9,
      ),
    ).resolves.toBe("unavailable");
    await expect(quota.cooldown(provider, -1)).resolves.toBe(false);
    expect(fetchRedis).not.toHaveBeenCalled();
  });
});
