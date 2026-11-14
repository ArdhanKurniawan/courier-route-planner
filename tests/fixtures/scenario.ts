export const scenarioInput = {
  depotId: "9007199254740993",
  name: "Synthetic Scenario",
  distributionPattern: "random" as const,
  customerCount: 25,
  radiusMinM: 0,
  radiusMaxM: 1000,
  generationSeed: "-9007199254740993",
};
export const scenarioDate = new Date("2026-01-01T00:00:00.000Z");
export const scenarioRowFixture = {
  ...scenarioInput,
  id: BigInt("9007199254740995"),
  depotId: BigInt("9007199254740993"),
  generationSeed: -BigInt("9007199254740993"),
  status: "draft" as const,
  createdAt: scenarioDate,
  updatedAt: scenarioDate,
};
export const scenarioDtoFixture = {
  ...scenarioInput,
  id: "9007199254740995",
  status: "draft" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
export function scenarioWire() {
  return {
    types: [
      ["id", "BIGINT"],
      ["depot_id", "BIGINT"],
      ["name", "VARCHAR"],
      ["distribution_pattern", "VARCHAR"],
      ["customer_count", "VARCHAR"],
      ["radius_min_m", "VARCHAR"],
      ["radius_max_m", "VARCHAR"],
      ["generation_seed", "BIGINT"],
      ["status", "VARCHAR"],
      ["created_at", "DATETIME"],
      ["updated_at", "DATETIME"],
    ].map(([name, type]) => ({ name, type })),
    rows: [
      [
        "9007199254740995",
        "9007199254740993",
        "Synthetic Scenario",
        "random",
        "25",
        "0",
        "1000",
        "-9007199254740993",
        "draft",
        "2026-01-01 00:00:00.000",
        "2026-01-01 00:00:00.000",
      ],
    ],
  };
}
