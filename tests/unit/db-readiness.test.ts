// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createDatabase } from "@/db/client";
import { checkDatabaseReadiness } from "@/db/readiness";
import {
  fakeDatabaseUrl,
  tidbResponse,
  type DatabaseFetch,
} from "../fixtures/tidb-http";

afterEach(() => {
  vi.unstubAllEnvs();
});

it.each(["INT", "UNSIGNED INT", "BIGINT", "UNSIGNED BIGINT"])(
  "checks %s connectivity through the real ORM/driver with one SELECT",
  async (type) => {
    const transport = vi.fn<DatabaseFetch>(async () => tidbResponse("1", type));
    const acquire = vi.fn(() => createDatabase(fakeDatabaseUrl, transport));
    expect(await checkDatabaseReadiness(acquire)).toEqual({ status: "ok" });
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(JSON.parse(transport.mock.calls[0][1]!.body)).toEqual({
      query: "SELECT 1 AS ok",
    });
  },
);

it.each([undefined, "invalid"])(
  "returns unavailable for missing or invalid DB config without network",
  async (raw) => {
    const transport = vi.fn<DatabaseFetch>();
    expect(
      await checkDatabaseReadiness(() => createDatabase(raw, transport)),
    ).toEqual({ status: "error" });
    expect(transport).not.toHaveBeenCalled();
  },
);

it("uses the lazy getter by default and handles missing configuration", async () => {
  vi.stubEnv("DATABASE_URL", undefined);
  expect(await checkDatabaseReadiness()).toEqual({ status: "error" });
});

const failures: [string, DatabaseFetch][] = [
  ...["1garbage", "1.9", "1e9", " 1", "1 "].map(
    (value): [string, DatabaseFetch] => [
      `malformed INT ${value}`,
      async () => tidbResponse(value, "INT"),
    ],
  ),
  [
    "surplus cells",
    async () =>
      Response.json(
        { types: [{ name: "ok", type: "INT" }], rows: [["1", "unexpected"]] },
        { headers: { "TiDB-Session": "fixture" } },
      ),
  ],
  [
    "duplicate fields",
    async () =>
      Response.json(
        {
          types: [
            { name: "ok", type: "INT" },
            { name: "ok", type: "INT" },
          ],
          rows: [["0", "1"]],
        },
        { headers: { "TiDB-Session": "fixture" } },
      ),
  ],
  ["unexpected FLOAT type", async () => tidbResponse("1", "FLOAT")],
  ["unexpected VARCHAR type", async () => tidbResponse("1", "VARCHAR")],
  [
    "network",
    async () => {
      throw new Error(fakeDatabaseUrl);
    },
  ],
  [
    "timeout",
    async () => {
      throw new DOMException(fakeDatabaseUrl, "TimeoutError");
    },
  ],
  [
    "abort",
    async () => {
      throw new DOMException(fakeDatabaseUrl, "AbortError");
    },
  ],
  [
    "provider",
    async () =>
      Response.json(
        { message: fakeDatabaseUrl, code: "fixture" },
        { status: 503 },
      ),
  ],
  [
    "invalid JSON",
    async () =>
      new Response("malformed", { headers: { "TiDB-Session": "fixture" } }),
  ],
  [
    "empty result",
    async () =>
      Response.json(
        { types: [], rows: [] },
        { headers: { "TiDB-Session": "fixture" } },
      ),
  ],
  [
    "malformed rows",
    async () =>
      Response.json(
        { types: {}, rows: {} },
        { headers: { "TiDB-Session": "fixture" } },
      ),
  ],
  ["missing session", async () => Response.json({})],
  ["unexpected value", async () => tidbResponse("0")],
  [
    "extra rows",
    async () =>
      Response.json(
        { types: [{ name: "ok", type: "INT" }], rows: [["1"], ["1"]] },
        { headers: { "TiDB-Session": "fixture" } },
      ),
  ],
];
it.each(failures)(
  "classifies %s safely with no retry",
  async (_name, fakeFetch) => {
    const transport = vi.fn(fakeFetch);
    expect(
      await checkDatabaseReadiness(() =>
        createDatabase(fakeDatabaseUrl, transport),
      ),
    ).toEqual({ status: "error" });
    expect(transport).toHaveBeenCalledTimes(1);
  },
);

it("propagates unexpected acquisition bugs without claiming readiness", async () => {
  const bug = new Error("Unexpected programming bug");
  await expect(
    checkDatabaseReadiness(() => {
      throw bug;
    }),
  ).rejects.toBe(bug);
});
