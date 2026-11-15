// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { requireAdmin } from "@/lib/security/admin";
import { createDatabase, getDatabase } from "@/db/client";
import { fakeDatabaseUrl } from "../fixtures/tidb-http";
import { HttpError } from "@/lib/http/request-security";
import { POST } from "@/app/api/scenarios/[id]/dummy-orders/preview/route";
import DummyGeneratorPage from "@/app/(admin)/dummy-generator/page";

vi.mock("@/lib/security/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/client", async (original) => ({
  ...(await original<typeof import("@/db/client")>()),
  getDatabase: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("REDIRECT:" + path);
  },
}));

const parameters = {
  count: 3,
  radiusMinM: 100,
  radiusMaxM: 1000,
  seed: "-9223372036854775808",
};
const updatedAt = "2026-11-14 12:00:00.000000";
const scenario = {
  id: "9007199254740995",
  depotId: "100",
  name: "Scenario A",
  distributionPattern: "random",
  status: "draft",
  updatedAt,
  customerCount: "3",
  radiusMinM: null,
  radiusMaxM: null,
  generationSeed: null,
};
const depot = {
  id: "100",
  name: "Depot A",
  isActive: "1",
  latitude: "-6.2",
  longitude: "106.8",
  updatedAt,
};
const dummy = {
  id: "9007199254740997",
  scenarioId: scenario.id,
  orderCode: "DUMMY-OLD",
  customerName: "Fixture",
  address: null,
  latitude: "-6.2",
  longitude: "106.8",
  updatedAt,
  createdAt: updatedAt,
  source: "dummy",
};

function wire(
  sc: typeof scenario | null,
  de: typeof depot | null,
  order: typeof dummy | null,
  operationVersion = "0",
  operationPending = "0",
) {
  return {
    types: [
      "scenario",
      "depot",
      "dummy",
      "operationVersion",
      "operationPending",
    ].map((name) => ({
      name,
      type: "CHAR",
    })),
    rows: [
      [
        sc && JSON.stringify(sc),
        de && JSON.stringify(de),
        order && JSON.stringify(order),
        operationVersion,
        operationPending,
      ],
    ],
  };
}
function httpWire(body: unknown) {
  return Response.json(body, { headers: { "TiDB-Session": "fixture" } });
}
const transport = vi.fn<typeof fetch>();
function preview(
  body: unknown = parameters,
  id = scenario.id,
  origin = "https://testing.invalid",
) {
  return POST(
    new Request(
      "https://testing.invalid/api/scenarios/" + id + "/dummy-orders/preview",
      {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    ),
    { params: Promise.resolve({ id }) },
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("DATABASE_URL", fakeDatabaseUrl);
  transport.mockImplementation(async () =>
    httpWire(wire(scenario, depot, null)),
  );
  vi.mocked(getDatabase).mockReturnValue(
    createDatabase(fakeDatabaseUrl, transport),
  );
  vi.mocked(requireAdmin).mockResolvedValue({
    origin: "https://testing.invalid",
  } as Awaited<ReturnType<typeof requireAdmin>>);
});
afterEach(() => vi.unstubAllEnvs());

it.each([undefined, "recovery"])(
  "rejects Production Preview before any ledger read in mode %s",
  async (mode) => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("DUMMY_GENERATOR_PRODUCTION_MODE", mode);
    vi.stubEnv("DATABASE_URL", fakeDatabaseUrl.replace("_dev", "_production"));

    const response = await preview();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getDatabase).not.toHaveBeenCalled();
  },
);

it("shows the authenticated Production page as closed before activation", async () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("DUMMY_GENERATOR_PRODUCTION_MODE", undefined);
  const page = renderToStaticMarkup(await DummyGeneratorPage());

  expect(page).toContain("Dummy Generator belum diaktifkan.");
  expect(page).not.toContain("Memuat daftar Scenario");
});

describe("read-only dummy preview API", () => {
  it("uses one scoped read and returns deterministic coordinates and revision", async () => {
    const first = await preview();
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    const { data } = await first.json();
    expect(await (await preview()).json()).toEqual({ data });
    expect(data).toMatchObject({
      scenario: { id: scenario.id, depotId: "100", name: "Scenario A" },
      depot: { id: "100", name: "Depot A", latitude: -6.2, longitude: 106.8 },
      version: "random-v1",
      parameters,
      dummyCount: 0,
      revision: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(data.points).toHaveLength(3);
    expect(data.depot).not.toHaveProperty("updatedAt");
    expect(transport).toHaveBeenCalledTimes(2);
    for (const [, init] of transport.mock.calls) {
      const { query } = JSON.parse(String(init?.body));
      expect(query).toMatch(/^\s*select\b/i);
      expect(query).toContain(scenario.id);
      expect(query).toMatch(
        /left join orders o on o.scenario_id = s.id and o.source = 'dummy'/i,
      );
    }
  });

  it("withholds a usable preview while blocked and changes revision after terminal rollback", async () => {
    const before = (await (await preview()).json()).data;
    transport.mockResolvedValueOnce(
      httpWire(wire(scenario, depot, null, "1", "1")),
    );
    const blocked = await preview();
    expect(blocked.status).toBe(409);
    expect(await blocked.json()).toMatchObject({
      error: { code: "OPERATION_PENDING" },
    });
    transport.mockResolvedValueOnce(httpWire(wire(scenario, depot, null, "1")));
    const after = (await (await preview()).json()).data;
    expect(after.revision).not.toBe(before.revision);
    expect(after.points).toEqual(before.points);
  });

  it("denies the page and API before data access when the session is missing", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new HttpError(401, "UNAUTHORIZED", "Authentication required."),
    );
    await expect(DummyGeneratorPage()).rejects.toThrow("REDIRECT:/login");
    expect((await preview()).status).toBe(401);
    expect(transport).not.toHaveBeenCalled();
  });

  it("denies a different Origin before data access", async () => {
    const response = await preview(
      parameters,
      scenario.id,
      "https://other.invalid",
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...parameters, count: 101 }, scenario.id],
    [{ ...parameters, radiusMaxM: 99 }, scenario.id],
    [{ ...parameters, seed: 42 }, scenario.id],
    [{ ...parameters, depotId: "200" }, scenario.id],
    [parameters, "01"],
  ])("rejects malformed input before reading data", async (body, id) => {
    expect((await preview(body, id)).status).toBe(400);
    expect(transport).not.toHaveBeenCalled();
  });

  it("changes revision for generation inputs, Depot coordinates and edits to a dummy Order", async () => {
    transport.mockImplementation(async () =>
      httpWire(wire(scenario, depot, dummy)),
    );
    const first = (await (await preview()).json()).data;
    const second = (await (await preview({ ...parameters, seed: "0" })).json())
      .data;
    transport.mockResolvedValueOnce(
      httpWire(wire(scenario, { ...depot, latitude: "-6.3" }, dummy)),
    );
    const third = (await (await preview()).json()).data;
    transport.mockResolvedValueOnce(
      httpWire(wire(scenario, depot, { ...dummy, customerName: "Edited" })),
    );
    const fourth = (await (await preview()).json()).data;
    expect(first.dummyCount).toBe(1);
    expect(first).not.toHaveProperty("orders");
    expect(
      new Set([first, second, third, fourth].map(({ revision }) => revision))
        .size,
    ).toBe(4);
  });

  it.each([{ distributionPattern: "clustered" }, { status: "frozen" }])(
    "rejects ineligible Scenarios",
    async (override) => {
      transport.mockResolvedValueOnce(
        httpWire(wire({ ...scenario, ...override }, depot, null)),
      );
      expect((await preview()).status).toBe(409);
    },
  );

  it.each([{ isActive: "0" }, { latitude: "91" }])(
    "rejects an invalid Depot",
    async (override) => {
      transport.mockResolvedValueOnce(
        httpWire(wire(scenario, { ...depot, ...override }, null)),
      );
      expect((await preview()).status).toBe(409);
    },
  );

  it("rejects Scenario, Depot and dummy rows outside the requested scope", async () => {
    transport.mockResolvedValueOnce(
      httpWire(wire({ ...scenario, id: "20" }, depot, null)),
    );
    expect((await preview()).status).toBe(503);
    transport.mockResolvedValueOnce(
      httpWire(wire(scenario, { ...depot, id: "200" }, null)),
    );
    expect((await preview()).status).toBe(503);
    transport.mockResolvedValueOnce(
      httpWire(wire(scenario, depot, { ...dummy, scenarioId: "20" })),
    );
    expect((await preview()).status).toBe(503);
  });

  it("distinguishes explicit absence from invalid database results and sanitizes failures", async () => {
    transport.mockResolvedValueOnce(httpWire(wire(null, null, null)));
    expect((await preview()).status).toBe(404);
    transport.mockResolvedValueOnce(httpWire(wire(scenario, null, null)));
    expect((await preview()).status).toBe(409);
    transport.mockResolvedValueOnce(
      httpWire({ types: [{ name: "scenario", type: "CHAR" }] }),
    );
    expect((await preview()).status).toBe(503);
    transport.mockResolvedValueOnce(
      httpWire(wire(scenario, { ...depot, latitude: "malformed" }, null)),
    );
    expect((await preview()).status).toBe(503);
    transport.mockRejectedValueOnce(new Error("private provider detail"));
    const unavailable = await preview();
    expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).not.toContain("private provider detail");
  });

  it("returns an exhaustion error without partial coordinates", async () => {
    transport.mockResolvedValueOnce(
      httpWire(
        wire(scenario, { ...depot, latitude: "0", longitude: "0" }, null),
      ),
    );
    const response = await preview({
      count: 9,
      radiusMinM: 0,
      radiusMaxM: 2,
      seed: "0",
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: { code: "GENERATION_EXHAUSTED", message: expect.any(String) },
    });
  });
});
