import { describe, expect, it } from "vitest";
import {
  parseScenarioId,
  parseScenarioInput,
  parseScenarioQuery,
  serializeScenario,
} from "@/lib/validation/scenario";

const input = {
  depotId: "9007199254740993",
  name: "  Synthetic Scenario  ",
  distributionPattern: "random",
  customerCount: 25,
  radiusMinM: null,
  radiusMaxM: 1000,
  generationSeed: "-9007199254740993",
};
describe("Scenario validation and lossless transport", () => {
  it("normalizes a config without interpreting configured count as persisted orders", () => {
    expect(parseScenarioInput(input)).toEqual({
      ...input,
      name: "Synthetic Scenario",
    });
    expect(parseScenarioId(input.depotId)).toBe(BigInt("9007199254740993"));
  });
  it.each(["random", "clustered", "circular", "directional"])(
    "accepts the approved %s configuration pattern",
    (distributionPattern) => {
      expect(
        parseScenarioInput({ ...input, distributionPattern })
          .distributionPattern,
      ).toBe(distributionPattern);
    },
  );
  it.each([
    { name: " " },
    { name: "x".repeat(256) },
    { depotId: 9007199254740992 },
    { depotId: "0" },
    { depotId: "01" },
    { depotId: "9223372036854775808" },
    { distributionPattern: "unsupported" },
    { customerCount: -1 },
    { customerCount: 1.5 },
    { customerCount: "25" },
    { customerCount: 2147483648 },
    { radiusMinM: -1 },
    { radiusMaxM: 1.5 },
    { radiusMaxM: Infinity },
    { radiusMinM: 1001, radiusMaxM: 1000 },
    { generationSeed: 9007199254740992 },
    { generationSeed: "01" },
    { generationSeed: "-0" },
    { generationSeed: "9223372036854775808" },
    { generationSeed: "-9223372036854775809" },
    { status: "frozen" },
    { status: "draft" },
    { actualOrderCount: 25 },
  ])("rejects invalid or unsupported configuration %j", (change) => {
    expect(() => parseScenarioInput({ ...input, ...change })).toThrow();
  });
  it("accepts empty-draft count, inclusive radii, null seed and signed BIGINT endpoints", () => {
    expect(
      parseScenarioInput({
        ...input,
        customerCount: 0,
        radiusMinM: 0,
        radiusMaxM: 0,
        generationSeed: null,
      }),
    ).toMatchObject({
      customerCount: 0,
      radiusMinM: 0,
      radiusMaxM: 0,
      generationSeed: null,
    });
    for (const generationSeed of [
      "0",
      "-9223372036854775808",
      "9223372036854775807",
    ])
      expect(
        parseScenarioInput({ ...input, generationSeed }).generationSeed,
      ).toBe(generationSeed);
  });
  it("serializes ids, nullable BIGINT seed, fixed draft status and UTC dates", () => {
    const row = {
      ...input,
      id: BigInt("9007199254740995"),
      depotId: BigInt("9007199254740993"),
      generationSeed: -BigInt("9007199254740993"),
      status: "draft",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    expect(serializeScenario(row)).toEqual({
      ...input,
      id: "9007199254740995",
      status: "draft",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(
      serializeScenario({ ...row, generationSeed: null }).generationSeed,
    ).toBeNull();
    expect(() => serializeScenario({ ...row, status: "frozen" })).toThrow();
    expect(() => serializeScenario({ ...row, customerCount: -1 })).toThrow();
  });
  it("accepts bounded cursor pagination and rejects duplicate or unknown query keys", () => {
    expect(
      parseScenarioQuery(
        new URLSearchParams("after=9007199254740993&limit=100"),
      ),
    ).toEqual({ after: BigInt("9007199254740993"), limit: 100 });
    for (const query of [
      "limit=101",
      "limit=0",
      "limit=1&limit=2",
      "after=01",
      "status=frozen",
    ])
      expect(() => parseScenarioQuery(new URLSearchParams(query))).toThrow();
  });
});
