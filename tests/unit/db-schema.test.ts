// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("imports the sole approved schema without DB configuration or network", async () => {
  vi.stubEnv("DATABASE_URL", undefined);
  const network = vi.fn(() => {
    throw new Error("No network allowed");
  });
  vi.stubGlobal("fetch", network);
  try {
    const schema = await import("@/db/schema");
    expect(Object.keys(schema)).toEqual(["depots"]);
    expect(getTableName(schema.depots)).toBe("depots");
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
