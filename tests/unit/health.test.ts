// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import * as env from "@/config/env";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("app-only health", () => {
  it.each(["development", "testing", "production"] as const)(
    "returns minimal uncached JSON for %s",
    async (value) => {
      vi.stubEnv("APP_ENV", value);
      const response = GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok" });
      expect(response.headers.get("Content-Type")).toContain("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    },
  );

  it("remains healthy with DATABASE_URL absent", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("DATABASE_URL", undefined);

    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it.each([
    undefined,
    "",
    " ",
    "\t\n",
    "staging",
    "test",
    "Development",
    "DEVELOPMENT",
    " development",
    "development ",
    "production\n",
    "invalid-app-env-marker",
  ])("returns only a safe configuration failure for %j", async (value) => {
    vi.stubEnv("APP_ENV", value);
    const response = GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error" });
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("can be imported without APP_ENV and validates on invocation", async () => {
    vi.stubEnv("APP_ENV", undefined);
    vi.resetModules();
    const route = await import("@/app/api/health/route");

    const response = route.GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error" });
  });

  it("validates the current value on consecutive calls", async () => {
    vi.stubEnv("APP_ENV", "development");
    const healthy = GET();
    vi.stubEnv("APP_ENV", "staging");
    const invalid = GET();
    vi.stubEnv("APP_ENV", "production");
    const healthyAgain = GET();

    expect(healthy.status).toBe(200);
    expect(await healthy.json()).toEqual({ status: "ok" });
    expect(invalid.status).toBe(503);
    expect(await invalid.json()).toEqual({ status: "error" });
    expect(healthyAgain.status).toBe(200);
    expect(await healthyAgain.json()).toEqual({ status: "ok" });
  });

  it("propagates unexpected exceptions for the framework to handle", () => {
    vi.stubEnv("APP_ENV", "development");
    const unexpected = new Error("unexpected-test-failure");
    vi.spyOn(env, "parseAppEnv").mockImplementationOnce(() => {
      throw unexpected;
    });

    expect(() => GET()).toThrow(unexpected);
  });
});

