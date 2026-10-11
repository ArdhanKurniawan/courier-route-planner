// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDatabase } from "@/db/client";
import { fakeDatabaseUrl, tidbResponse } from "../fixtures/tidb-http";
import { GET } from "@/app/api/ready/route";

const boundary = vi.hoisted(() => ({ acquire: vi.fn() }));
vi.mock("@/db/client", async (original) => ({
  ...(await original<typeof import("@/db/client")>()),
  getDatabase: boundary.acquire,
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("No real network allowed");
    }),
  );
  boundary.acquire.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function assertPayload(expected: "ok" | "error", status: number) {
  const response = await GET();
  expect(response.status).toBe(status);
  expect(response.headers.get("Content-Type")).toContain("application/json");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: expected });
}

it.each(["INT", "UNSIGNED INT", "BIGINT", "UNSIGNED BIGINT"])(
  "returns the exact 200 payload for %s through real readiness and fake HTTP",
  async (type) => {
    boundary.acquire.mockImplementation(() =>
      createDatabase(fakeDatabaseUrl, async () => tidbResponse("1", type)),
    );
    await assertPayload("ok", 200);
  },
);
it.each([undefined, "invalid"])(
  "returns the exact 503 payload for missing/invalid config",
  async (raw) => {
    boundary.acquire.mockImplementation(() => createDatabase(raw));
    await assertPayload("error", 503);
  },
);
it.each(["unavailable", "timeout", "provider", "invalid result"])(
  "redacts %s failures in the exact 503 payload",
  async (failure) => {
    boundary.acquire.mockImplementation(() =>
      createDatabase(fakeDatabaseUrl, async () => {
        if (failure === "timeout")
          throw new DOMException(fakeDatabaseUrl, "TimeoutError");
        if (failure === "unavailable") throw new Error(fakeDatabaseUrl);
        if (failure === "provider")
          return Response.json({ message: fakeDatabaseUrl }, { status: 500 });
        return tidbResponse("2");
      }),
    );
    await assertPayload("error", 503);
  },
);
it("propagates unexpected programming errors without a successful readiness response", async () => {
  const bug = new Error("Unexpected programming bug");
  boundary.acquire.mockImplementation(() => {
    throw bug;
  });
  await expect(GET()).rejects.toBe(bug);
});
