// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "@/lib/security/admin";
import { createDatabase, getDatabase } from "@/db/client";
import { scenarioDtoFixture, scenarioWire } from "../fixtures/scenario";
import { fakeDatabaseUrl } from "../fixtures/tidb-http";
import { HttpError } from "@/lib/http/request-security";
import { ScenarioError } from "@/lib/validation/scenario";
import { DepotError } from "@/lib/validation/depot";
import { POST } from "@/app/api/scenarios/[id]/dummy-orders/preview/route";
import DummyGeneratorPage from "@/app/(admin)/dummy-generator/page";

const reads = vi.hoisted(() => ({ getScenario: vi.fn(), getDepot: vi.fn() }));
vi.mock("@/lib/security/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/client", async (original) => ({
  ...(await original<typeof import("@/db/client")>()),
  getDatabase: vi.fn(),
}));
vi.mock("@/lib/http/scenario-api", () => ({ scenarioService: vi.fn() }));
vi.mock("@/lib/http/depot-api", () => ({ depotService: vi.fn() }));
import { scenarioService } from "@/lib/http/scenario-api";
import { depotService } from "@/lib/http/depot-api";
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
const updatedAt = "2026-11-14T12:00:00.000Z";
const scenario = {
  id: "10",
  depotId: "100",
  name: "Scenario A",
  distributionPattern: "random",
  status: "draft",
  updatedAt,
};
const depot = {
  id: "100",
  name: "Depot A",
  isActive: true,
  latitude: -6.2,
  longitude: 106.8,
  updatedAt,
};

function preview(
  body: unknown = parameters,
  id = "10",
  origin = "https://testing.invalid",
) {
  return POST(
    new Request(
      "https://testing.invalid/api/scenarios/10/dummy-orders/preview",
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
  vi.mocked(scenarioService).mockReturnValue({
    getScenario: reads.getScenario,
    listScenarios: vi.fn(),
    createScenario: vi.fn(),
    updateScenario: vi.fn(),
    deleteScenario: vi.fn(),
  });
  vi.mocked(depotService).mockReturnValue({
    getDepot: reads.getDepot,
    listDepots: vi.fn(),
    createDepot: vi.fn(),
    updateDepot: vi.fn(),
    deleteDepot: vi.fn(),
  });
  vi.mocked(requireAdmin).mockResolvedValue({
    origin: "https://testing.invalid",
  } as Awaited<ReturnType<typeof requireAdmin>>);
  reads.getScenario.mockResolvedValue(scenario);
  reads.getDepot.mockResolvedValue(depot);
});
afterEach(() => vi.unstubAllEnvs());

describe("read-only dummy preview API", () => {
  it("issues only the two scoped SELECTs through the real service and repository wiring", async () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("DATABASE_URL", fakeDatabaseUrl);
    vi.mocked(scenarioService).mockImplementation(
      (
        await vi.importActual<typeof import("@/lib/http/scenario-api")>(
          "@/lib/http/scenario-api",
        )
      ).scenarioService,
    );
    vi.mocked(depotService).mockImplementation(
      (
        await vi.importActual<typeof import("@/lib/http/depot-api")>(
          "@/lib/http/depot-api",
        )
      ).depotService,
    );
    const depotWire = {
      types: [
        ["id", "BIGINT"],
        ["name", "VARCHAR"],
        ["address", "TEXT"],
        ["latitude", "VARCHAR"],
        ["longitude", "VARCHAR"],
        ["is_active", "VARCHAR"],
        ["created_at", "DATETIME"],
        ["updated_at", "DATETIME"],
      ].map(([name, type]) => ({ name, type })),
      rows: [
        [
          scenarioDtoFixture.depotId,
          "Fixture Depot",
          null,
          "-6.2",
          "106.8",
          "1",
          "2026-01-01 00:00:00.000",
          "2026-01-01 00:00:00.000",
        ],
      ],
    };
    const queries: string[] = [];
    const fixtures = [scenarioWire(), depotWire];
    const db = createDatabase(fakeDatabaseUrl, async (_url, init) => {
      const { query } = JSON.parse(init!.body);
      queries.push(query);
      if (!/^select\b/i.test(query) || fixtures.length === 0)
        throw new Error("Unexpected synthetic SQL");
      return Response.json(fixtures.shift(), {
        headers: { "TiDB-Session": "fixture" },
      });
    });
    vi.mocked(getDatabase).mockReturnValue(db);
    const response = await preview(parameters, scenarioDtoFixture.id);
    expect(response.status).toBe(200);
    expect(queries).toEqual([
      expect.stringMatching(
        /from `scenarios` where `scenarios`\.`id` = '?9007199254740995'?/i,
      ),
      expect.stringMatching(
        /from `depots` where `depots`\.`id` = '?9007199254740993'?/i,
      ),
    ]);
  });
  it("denies the page and API before data access when the session is missing", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new HttpError(401, "UNAUTHORIZED", "Authentication required."),
    );
    await expect(DummyGeneratorPage()).rejects.toThrow("REDIRECT:/login");
    expect((await preview()).status).toBe(401);
    expect(reads.getScenario).not.toHaveBeenCalled();
    expect(reads.getDepot).not.toHaveBeenCalled();
  });

  it("denies a different Origin before data access", async () => {
    const response = await preview(parameters, "10", "https://other.invalid");
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(reads.getScenario).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...parameters, count: 101 }, "10"],
    [{ ...parameters, radiusMaxM: 99 }, "10"],
    [{ ...parameters, seed: 42 }, "10"],
    [{ ...parameters, depotId: "200" }, "10"],
    [parameters, "01"],
  ])("rejects malformed input before reading data", async (body, id) => {
    expect((await preview(body, id)).status).toBe(400);
    expect(reads.getScenario).not.toHaveBeenCalled();
  });

  it("returns the same coordinates and revision with only scoped reads", async () => {
    const first = await preview();
    const second = await preview();
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    const { data } = await first.json();
    expect(await second.json()).toEqual({ data });
    expect(data).toMatchObject({
      scenario: {
        id: "10",
        depotId: "100",
        name: "Scenario A",
        distributionPattern: "random",
        status: "draft",
      },
      depot: { id: "100", name: "Depot A", latitude: -6.2, longitude: 106.8 },
      version: "random-v1",
      parameters,
      revision: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(data.points).toHaveLength(3);
    expect(reads.getScenario.mock.calls).toEqual([[BigInt(10)], [BigInt(10)]]);
    expect(reads.getDepot.mock.calls).toEqual([[BigInt(100)], [BigInt(100)]]);
    expect(getDatabase).not.toHaveBeenCalled();
    expect(data.depot).not.toHaveProperty("updatedAt");
  });

  it("changes the revision when a generation input or a Depot coordinate changes", async () => {
    const first = (await (await preview()).json()).data.revision;
    const second = (await (await preview({ ...parameters, seed: "0" })).json())
      .data.revision;
    reads.getDepot.mockResolvedValue({ ...depot, latitude: -6.3 });
    const third = (await (await preview()).json()).data.revision;
    expect(new Set([first, second, third]).size).toBe(3);
  });

  it.each([{ distributionPattern: "clustered" }, { status: "frozen" }])(
    "rejects an ineligible Scenario without reading the Depot",
    async (override) => {
      reads.getScenario.mockResolvedValue({ ...scenario, ...override });
      expect((await preview()).status).toBe(409);
      expect(reads.getDepot).not.toHaveBeenCalled();
    },
  );

  it.each([{ isActive: false }, { latitude: 91 }])(
    "rejects an invalid Depot",
    async (override) => {
      reads.getDepot.mockResolvedValue({ ...depot, ...override });
      expect((await preview()).status).toBe(409);
    },
  );

  it("does not accept records outside the requested Scenario and Depot", async () => {
    reads.getScenario.mockResolvedValueOnce({ ...scenario, id: "20" });
    expect((await preview()).status).toBe(503);
    expect(reads.getDepot).not.toHaveBeenCalled();
    reads.getDepot.mockResolvedValue({ ...depot, id: "200" });
    expect((await preview()).status).toBe(503);
  });

  it("handles absent Scenario and Depot without leaking internal failures", async () => {
    reads.getScenario.mockRejectedValueOnce(new ScenarioError("NOT_FOUND"));
    expect((await preview()).status).toBe(404);
    reads.getDepot.mockRejectedValueOnce(new DepotError("NOT_FOUND"));
    expect((await preview()).status).toBe(409);
    reads.getScenario.mockRejectedValueOnce(
      new Error("private provider detail"),
    );
    const unavailable = await preview();
    expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).not.toContain("private provider detail");
  });

  it("returns an exhaustion error without partial coordinates", async () => {
    reads.getDepot.mockResolvedValue({ ...depot, latitude: 0, longitude: 0 });
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
