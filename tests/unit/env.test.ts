// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { AppEnvValidationError, parseAppEnv } from "@/config/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("APP_ENV parser", () => {
  it.each(["development", "testing", "production"] as const)(
    "accepts the exact value %s",
    (value) => {
      expect(parseAppEnv(value)).toBe(value);
    },
  );

  it.each([
    undefined,
    "",
    " ",
    "\t\n",
    "test",
    "staging",
    "Development",
    "DEVELOPMENT",
    " development",
    "development ",
    " testing",
    "production\n",
  ])("rejects invalid input %j", (value) => {
    expect(() => parseAppEnv(value)).toThrow(AppEnvValidationError);
  });

  it("uses the same safe error message without repeating invalid input", () => {
    const values = ["invalid-app-env-marker", "another-invalid-value"];
    const errors = values.map((value) => {
      try {
        parseAppEnv(value);
      } catch (error) {
        expect(error).toBeInstanceOf(AppEnvValidationError);
        return error as Error;
      }
      throw new Error("Expected invalid APP_ENV to be rejected");
    });

    expect(errors[0].message).not.toBe("");
    expect(errors[0].message).toBe(errors[1].message);
    for (const error of errors) {
      for (const value of values) {
        expect(error.message).not.toContain(value);
      }
    }
  });

  it("validates only its explicit input and leaves process.env unchanged", () => {
    vi.stubEnv("APP_ENV", "production");

    expect(parseAppEnv("development")).toBe("development");
    expect(() => parseAppEnv(undefined)).toThrow(AppEnvValidationError);
    expect(process.env.APP_ENV).toBe("production");
  });

  it("can be imported with APP_ENV absent", async () => {
    vi.stubEnv("APP_ENV", undefined);
    vi.resetModules();

    const importedEnv = await import("@/config/env");

    expect(importedEnv.parseAppEnv("testing")).toBe("testing");
    expect(process.env.APP_ENV).toBeUndefined();
  });
});
