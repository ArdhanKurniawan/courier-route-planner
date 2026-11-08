export const orderDate = new Date("2026-01-01T00:00:00.000Z");
export const orderInput = {
  orderCode: "qa-001",
  customerName: "Synthetic customer",
  address: null,
  latitude: -6.9,
  longitude: 110.4,
};
export const orderRowFixture = {
  id: BigInt("9007199254740997"),
  scenarioId: BigInt("9007199254740995"),
  orderCode: "QA-001",
  customerName: "Synthetic customer",
  address: null,
  latitude: -6.9,
  longitude: 110.4,
  source: "manual" as const,
  createdAt: orderDate,
  updatedAt: orderDate,
};
export const orderDtoFixture = {
  ...orderRowFixture,
  id: "9007199254740997",
  scenarioId: "9007199254740995",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
export function orderWire() {
  return {
    types: [
      ["id", "BIGINT"],
      ["scenario_id", "BIGINT"],
      ["order_code", "VARCHAR"],
      ["customer_name", "VARCHAR"],
      ["address", "TEXT"],
      ["latitude", "VARCHAR"],
      ["longitude", "VARCHAR"],
      ["source", "VARCHAR"],
      ["created_at", "DATETIME"],
      ["updated_at", "DATETIME"],
    ].map(([name, type]) => ({ name, type })),
    rows: [
      [
        "9007199254740997",
        "9007199254740995",
        "QA-001",
        "Synthetic customer",
        null,
        "-6.9",
        "110.4",
        "manual",
        "2026-01-01 00:00:00.000",
        "2026-01-01 00:00:00.000",
      ],
    ],
  };
}
export const flag = (value: string) => ({
  types: [{ name: "has_reference", type: "VARCHAR" }],
  rows: [[value]],
});
export const countWire = (value = "1") => ({
  types: [{ name: "total", type: "VARCHAR" }],
  rows: [[value]],
});
