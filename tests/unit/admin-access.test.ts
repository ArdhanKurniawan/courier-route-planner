// @vitest-environment node
import { hash } from "@node-rs/argon2";
import type { CookieStore } from "iron-session";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as passwords from "@/lib/security/admin-password";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { requireAdmin } from "@/lib/security/admin";
import { getDatabase } from "@/db/client";
import DepotPage from "@/app/(admin)/depots/page";

const boundary = vi.hoisted(() => ({
  allowed: true,
  unavailable: false,
  consumeCalls: 0,
}));
let store: CookieStore;
let values: Map<string, string>;
vi.mock("next/headers", () => ({ cookies: async () => store }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("REDIRECT:" + path);
  },
}));
vi.mock("@/db/client", () => ({
  getDatabase: vi.fn(() => {
    throw new Error("TiDB must not be acquired");
  }),
}));
vi.mock("@/lib/security/login-rate-limit", async (importOriginal) => {
  const real =
    await importOriginal<typeof import("@/lib/security/login-rate-limit")>();
  return {
    ...real,
    createLoginRateLimiter: () => ({
      limit: async () => {
        boundary.consumeCalls++;
        if (boundary.unavailable) throw new Error("synthetic provider detail");
        return {
          success: boundary.allowed,
          limit: 5,
          remaining: boundary.allowed ? 4 : 0,
          reset: Date.now() + 900000,
          pending: Promise.resolve(),
        };
      },
    }),
  };
});
let phc: string;
const password = "Synthetic-only-password-2026!";
beforeAll(async () => {
  phc = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
});
beforeEach(() => {
  for (const [key, value] of Object.entries({
    APP_ENV: "development",
    AUTH_ORIGIN: "http://localhost:3000",
    ADMIN_USERNAME: "fixture_admin",
    ADMIN_PASSWORD_HASH: phc,
    AUTH_SESSION_SECRET: "synthetic-session-secret-".repeat(3),
    AUTH_CREDENTIAL_VERSION: "fixture-v1",
    UPSTASH_REDIS_REST_URL: "https://limiter.invalid",
    UPSTASH_REDIS_REST_TOKEN: "synthetic-token",
  }))
    vi.stubEnv(key, value);
  values = new Map();
  store = {
    get: (name) =>
      values.has(name) ? { name, value: values.get(name)! } : undefined,
    set: (name, value) => {
      values.set(name, value);
    },
  };
  boundary.allowed = true;
  boundary.unavailable = false;
  boundary.consumeCalls = 0;
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  expect(getDatabase).not.toHaveBeenCalled();
});
function request(
  body: unknown = { username: "fixture_admin", password },
  origin = "http://localhost:3000",
) {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
describe("auth HTTP and server authorization", () => {
  it("protects the server-rendered Depot entry before rendering data", async () => {
    await expect(DepotPage()).rejects.toThrow("REDIRECT:/login");
  });
  it("cannot authorize a missing session and acquires no application DB", async () => {
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });
  it("successful credential login mints a session, then logout denies further access", async () => {
    const response = await login(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await requireAdmin()).toMatchObject({ environment: "development" });
    expect((await logout(request({}))).status).toBe(200);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });
  it("rejects wrong credentials generically with no session cookie", async () => {
    for (const body of [
      { username: "other", password },
      { username: "fixture_admin", password: password + "wrong" },
    ]) {
      const response = await login(request(body));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials." },
      });
    }
    expect(values.size).toBe(0);
    expect(boundary.consumeCalls).toBe(2);
  });
  it("configuration absence fails closed before KDF or limiter", async () => {
    const verify = vi.spyOn(passwords, "verifyAdminPassword");
    vi.stubEnv("ADMIN_PASSWORD_HASH", undefined);
    const response = await login(request());
    expect(response.status).toBe(503);
    expect(verify).not.toHaveBeenCalled();
    expect(boundary.consumeCalls).toBe(0);
    expect(values.size).toBe(0);
  });
  it("rejects cross-origin before password verification", async () => {
    const verify = vi.spyOn(passwords, "verifyAdminPassword");
    expect(
      (await login(request(undefined, "https://attacker.invalid"))).status,
    ).toBe(403);
    expect(verify).not.toHaveBeenCalled();
    expect(boundary.consumeCalls).toBe(0);
    expect((await logout(request({}, "https://attacker.invalid"))).status).toBe(
      403,
    );
  });
  it("rejects client claims and over-limit attempts before KDF", async () => {
    const verify = vi.spyOn(passwords, "verifyAdminPassword");
    expect(
      (
        await login(
          request({ username: "fixture_admin", password, role: "admin" }),
        )
      ).status,
    ).toBe(400);
    boundary.allowed = false;
    const denied = await login(request());
    expect(denied.status).toBe(429);
    expect(denied.headers.get("retry-after")).toBe("900");
    expect(verify).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
  });
  it("keeps provider errors private and does not fail open", async () => {
    boundary.unavailable = true;
    const response = await login(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(
      "synthetic provider detail",
    );
    expect(values.size).toBe(0);
    expect(boundary.consumeCalls).toBe(1);
  });
});
