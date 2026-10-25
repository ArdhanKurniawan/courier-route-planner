// @vitest-environment node
import { hash } from "@node-rs/argon2";
import { beforeAll, describe, expect, it } from "vitest";
import { parseAuthConfig } from "@/config/auth";
import {
  parseLoginInput,
  verifyAdminPassword,
} from "@/lib/security/admin-password";
import {
  startAdminSession,
  readAdminSession,
  clearAdminSession,
  validateAdminSession,
} from "@/lib/security/admin-session";
import { assertSameOrigin, readJson } from "@/lib/http/request-security";
import type { CookieStore } from "iron-session";

// All identities, credentials, PHC values and cookies in this file are synthetic.
const password = "Synthetic-only-password-2026!";
let phc: string;
beforeAll(async () => {
  phc = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
});
function env(overrides: Record<string, string | undefined> = {}) {
  return {
    APP_ENV: "development",
    AUTH_ORIGIN: "http://localhost:3000",
    ADMIN_USERNAME: "fixture_admin",
    ADMIN_PASSWORD_HASH: phc,
    AUTH_SESSION_SECRET: "synthetic-session-secret-".repeat(3),
    AUTH_CREDENTIAL_VERSION: "fixture-v1",
    UPSTASH_REDIS_REST_URL: "https://limiter.invalid",
    UPSTASH_REDIS_REST_TOKEN: "synthetic-token",
    ...overrides,
  };
}
function jar() {
  const values = new Map<string, string>();
  const writes: { name: string; value: string; options: unknown }[] = [];
  const store: CookieStore = {
    get: (name) =>
      values.has(name) ? { name, value: values.get(name)! } : undefined,
    set: (name, value, options) => {
      values.set(name, value);
      writes.push({ name, value, options });
    },
  };
  return { store, values, writes };
}
describe("admin configuration and credentials", () => {
  it("accepts only a complete environment-specific configuration", () => {
    expect(parseAuthConfig(env())).toMatchObject({
      environment: "development",
      origin: "http://localhost:3000",
      secure: false,
    });
    expect(
      parseAuthConfig(
        env({
          APP_ENV: "testing",
          VERCEL_ENV: "preview",
          AUTH_ORIGIN: "https://preview.invalid",
        }),
      ),
    ).toMatchObject({ environment: "testing", secure: true });
  });
  it.each([
    { ADMIN_USERNAME: undefined },
    { ADMIN_PASSWORD_HASH: "plain-secret" },
    { AUTH_SESSION_SECRET: "short" },
    { AUTH_CREDENTIAL_VERSION: "" },
    { UPSTASH_REDIS_REST_TOKEN: undefined },
    {
      APP_ENV: "production",
      VERCEL_ENV: "preview",
      AUTH_ORIGIN: "https://app.invalid",
    },
    { APP_ENV: "testing", VERCEL_ENV: undefined },
    { APP_ENV: "production", AUTH_ORIGIN: "http://localhost:3000" },
    { AUTH_ORIGIN: "http://localhost:3000/" },
    { AUTH_ORIGIN: "https://*.invalid" },
  ])("fails closed on invalid config %j", (changes) => {
    expect(() => parseAuthConfig(env(changes))).toThrow(
      "Authentication unavailable.",
    );
  });
  it("rejects unbounded hash work before any verification", () => {
    expect(() =>
      parseAuthConfig(
        env({ ADMIN_PASSWORD_HASH: phc.replace("m=19456", "m=99999999") }),
      ),
    ).toThrow();
  });
  it("verifies a synthetic Argon2id hash without normalizing password or trusting username", async () => {
    const config = parseAuthConfig(env());
    expect(
      await verifyAdminPassword(
        { username: "fixture_admin", password },
        config,
      ),
    ).toBe(true);
    expect(
      await verifyAdminPassword({ username: "other", password }, config),
    ).toBe(false);
    expect(
      await verifyAdminPassword(
        { username: "fixture_admin", password: password + " " },
        config,
      ),
    ).toBe(false);
  });
  it.each([
    { username: "fixture_admin", password: "short" },
    { username: "fixture_admin", password, role: "admin" },
    { username: "", password },
    { username: "fixture_admin", password: "x".repeat(129) },
  ])("rejects malformed login input", (input) =>
    expect(() => parseLoginInput(input)).toThrow(),
  );
});
describe("absolute twelve-hour session", () => {
  const t0 = 1800000000000;
  it("accepts immediately before the boundary, expires exactly at it, and never renews on reads", async () => {
    const config = parseAuthConfig(env()),
      cookie = jar();
    await startAdminSession(config, cookie.store, t0);
    const issued = cookie.values.get(config.cookieName);
    expect(issued).toEqual(expect.any(String));
    expect(cookie.writes[0].options).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: false,
      maxAge: 43200,
    });
    expect(await readAdminSession(config, cookie.store, t0 + 43199999)).toEqual(
      { subject: "single-admin" },
    );
    expect(await readAdminSession(config, cookie.store, t0 + 1000)).toEqual({
      subject: "single-admin",
    });
    expect(cookie.values.get(config.cookieName)).toBe(issued);
    expect(cookie.writes).toHaveLength(1);
    await expect(
      readAdminSession(config, cookie.store, t0 + 43200000),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      readAdminSession(config, cookie.store, t0 + 43200001),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("uses host-only secure cookies for hosted environments and isolates credentials", async () => {
    const config = parseAuthConfig(
        env({
          APP_ENV: "production",
          VERCEL_ENV: "production",
          AUTH_ORIGIN: "https://app.invalid",
        }),
      ),
      cookie = jar();
    await startAdminSession(config, cookie.store, t0);
    expect(cookie.writes[0]).toMatchObject({
      name: "__Host-crp-admin-production",
      options: {
        secure: true,
        httpOnly: true,
        maxAge: 43200,
        path: "/",
        sameSite: "strict",
      },
    });
    expect(cookie.writes[0].options).not.toHaveProperty("domain");
    const changed = { ...config, credentialVersion: "fixture-v2" };
    await expect(
      readAdminSession(changed, cookie.store, t0 + 1),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      readAdminSession(
        { ...config, sessionSecret: "different-synthetic-secret-".repeat(3) },
        cookie.store,
        t0 + 1,
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("logout removes the browser cookie without pretending to revoke a captured copy", async () => {
    const config = parseAuthConfig(env()),
      cookie = jar();
    await startAdminSession(config, cookie.store, t0);
    const copied = cookie.values.get(config.cookieName)!;
    await clearAdminSession(config, cookie.store);
    expect(cookie.writes.at(-1)?.options).toMatchObject({ maxAge: 0 });
    await expect(
      readAdminSession(config, cookie.store, t0 + 1),
    ).rejects.toMatchObject({ status: 401 });
    cookie.values.set(config.cookieName, copied);
    expect(await readAdminSession(config, cookie.store, t0 + 1)).toEqual({
      subject: "single-admin",
    });
    await expect(
      readAdminSession(config, cookie.store, t0 + 43200000),
    ).rejects.toMatchObject({ status: 401 });
  });
  it.each([
    {},
    {
      subject: "single-admin",
      environment: "development",
      credentialVersion: "fixture-v1",
      issuedAt: t0 + 1,
      expiresAt: t0 + 43200000,
    },
    {
      subject: "single-admin",
      environment: "development",
      credentialVersion: "fixture-v1",
      issuedAt: t0,
      expiresAt: t0 + 43200001,
    },
    {
      subject: "single-admin",
      environment: "development",
      credentialVersion: "fixture-v1",
      issuedAt: NaN,
      expiresAt: t0 + 43200000,
    },
  ])("rejects invalid session data", (data) =>
    expect(() =>
      validateAdminSession(data, parseAuthConfig(env()), t0),
    ).toThrow(),
  );
  it("rejects authenticated identity/context mismatch", () => {
    expect(() =>
      validateAdminSession(
        {
          subject: "other",
          environment: "development",
          credentialVersion: "fixture-v1",
          issuedAt: t0,
          expiresAt: t0 + 43200000,
        },
        parseAuthConfig(env()),
        t0,
      ),
    ).toThrow();
  });
  it("rejects a tampered cookie without writing a new session", async () => {
    const config = parseAuthConfig(env()),
      cookie = jar();
    cookie.values.set(config.cookieName, "synthetic-tampered-cookie");
    await expect(
      readAdminSession(config, cookie.store, t0),
    ).rejects.toMatchObject({ status: 401 });
    expect(cookie.writes).toHaveLength(0);
  });
});
describe("same-origin bounded JSON", () => {
  const origin = "https://app.invalid";
  it.each([
    undefined,
    "null",
    "https://attacker.invalid",
    origin + ", " + origin,
  ])("rejects missing/cross/duplicate Origin", (value) => {
    const headers = new Headers();
    if (value) headers.set("origin", value);
    expect(() =>
      assertSameOrigin(new Request(origin, { headers }), origin),
    ).toThrow();
  });
  it("accepts exact origin but rejects cross-site metadata", () => {
    expect(() =>
      assertSameOrigin(new Request(origin, { headers: { origin } }), origin),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(
        new Request(origin, {
          headers: { origin, "sec-fetch-site": "cross-site" },
        }),
        origin,
      ),
    ).toThrow();
  });
  it("rejects invalid JSON, media type and streamed overflow", async () => {
    await expect(
      readJson(
        new Request(origin, {
          method: "POST",
          body: "{}",
          headers: { "content-type": "text/plain" },
        }),
        4096,
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readJson(
        new Request(origin, {
          method: "POST",
          body: "{",
          headers: { "content-type": "application/json" },
        }),
        4096,
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      readJson(
        new Request(origin, {
          method: "POST",
          body: JSON.stringify({ value: "x".repeat(5000) }),
          headers: { "content-type": "application/json" },
        }),
        4096,
      ),
    ).rejects.toMatchObject({ status: 413 });
    expect(
      await readJson(
        new Request(origin, {
          method: "POST",
          body: '{"ok":true}',
          headers: { "content-type": "application/json" },
        }),
        4096,
      ),
    ).toEqual({ ok: true });
  });
});
