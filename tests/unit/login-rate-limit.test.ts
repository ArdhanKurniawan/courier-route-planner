// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  consumeLoginAttempt,
  createLoginRateLimiter,
} from "@/lib/security/login-rate-limit";
import type { AuthConfig } from "@/config/auth";
const now = 1800000000000;
const allowance = {
  success: true,
  limit: 5,
  remaining: 4,
  reset: now + 900000,
  pending: Promise.resolve(),
};
describe("shared login limiter fail-closed boundary", () => {
  it("uses the real Redis SDK transport with one shared environment bucket across instances and window edges", async () => {
    const counters = new Map<string, number>();
    let clock = now + 899999;
    const time = vi.spyOn(Date, "now").mockImplementation(() => clock);
    const network = vi.fn<typeof fetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      function execute(command: unknown[]) {
        if (String(command[0]).toUpperCase() !== "EVALSHA")
          throw new Error("Unexpected synthetic Redis command");
        const key = String(command[3]),
          count = (counters.get(key) ?? 0) + 1;
        counters.set(key, count);
        return { result: [count, 5] };
      }
      return Response.json(
        Array.isArray(body[0]) ? body.map(execute) : execute(body),
      );
    });
    vi.stubGlobal("fetch", network);
    const config: AuthConfig = {
      environment: "development",
      origin: "http://localhost:3000",
      username: "fixture",
      passwordHash: "synthetic-unused",
      sessionSecret: "synthetic-unused",
      credentialVersion: "fixture",
      redisUrl: "https://limiter.invalid",
      redisToken: "synthetic-token",
      cookieName: "fixture",
      secure: false,
    };
    try {
      const first = createLoginRateLimiter(config),
        second = createLoginRateLimiter(config);
      for (let i = 0; i < 5; i++)
        expect(
          (await consumeLoginAttempt(i % 2 ? first : second, clock)).allowed,
        ).toBe(true);
      expect((await consumeLoginAttempt(first, clock)).allowed).toBe(false);
      expect(counters.size).toBe(1);
      expect([...counters.keys()][0]).toContain(
        "crp:login:development:single-admin:",
      );
      clock++;
      for (let i = 0; i < 5; i++)
        expect((await consumeLoginAttempt(second, clock)).allowed).toBe(true);
      expect(network).toHaveBeenCalledTimes(11);
    } finally {
      time.mockRestore();
      vi.unstubAllGlobals();
    }
  });
  it("consumes a constant account bucket without user/IP-dependent identifiers", async () => {
    const keys: string[] = [];
    const limiter = {
      limit: async (key: string) => {
        keys.push(key);
        return allowance;
      },
    };
    expect(await consumeLoginAttempt(limiter, now)).toEqual({
      allowed: true,
      retryAfter: 0,
    });
    expect(await consumeLoginAttempt(limiter, now)).toEqual({
      allowed: true,
      retryAfter: 0,
    });
    expect(keys).toEqual(["single-admin", "single-admin"]);
  });
  it("returns bounded Retry-After when actual store rejects", async () => {
    expect(
      await consumeLoginAttempt(
        { limit: async () => ({ ...allowance, success: false, remaining: 0 }) },
        now,
      ),
    ).toEqual({ allowed: false, retryAfter: 900 });
  });
  it.each([
    { ...allowance, reason: "timeout" },
    { ...allowance, success: "true" },
    { ...allowance, remaining: Infinity },
    { ...allowance, limit: 100 },
    null,
  ])(
    "does not treat malformed or timeout-success as permission",
    async (result) => {
      await expect(
        consumeLoginAttempt({ limit: async () => result }, now),
      ).rejects.toThrow("Authentication unavailable.");
    },
  );
  it("does not allow through service/quota errors or retry them", async () => {
    const limit = vi
      .fn()
      .mockRejectedValue(new Error("synthetic private provider detail"));
    await expect(consumeLoginAttempt({ limit }, now)).rejects.toThrow(
      "Authentication unavailable.",
    );
    expect(limit).toHaveBeenCalledTimes(1);
  });
});
