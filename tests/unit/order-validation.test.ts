import { describe, expect, it } from "vitest";
import {
  orderInput,
  orderRowFixture,
  orderDtoFixture,
} from "../fixtures/order";
import {
  parseOrderInput as parse,
  serializeOrder as serialize,
} from "@/lib/validation/order";
describe("Order validation", () => {
  it("canonicalizes uppercase, trims text and normalizes empty address", () => {
    expect(
      parse({
        ...orderInput,
        orderCode: "  café-ß  ",
        customerName: " Customer ",
        address: " ",
      }),
    ).toEqual({
      ...orderInput,
      orderCode: "CAFÉ-SS",
      customerName: "Customer",
      address: null,
    });
  });
  it("counts normalized Unicode characters and rejects uppercase expansion past 64", () => {
    expect(parse({ ...orderInput, orderCode: "😀".repeat(64) })).toMatchObject({
      orderCode: "😀".repeat(64),
    });
    expect(() => parse({ ...orderInput, orderCode: "ß".repeat(33) })).toThrow();
  });
  it.each(["", " ".repeat(3), "x".repeat(65), "qa\u0000x", "\ud800"])(
    "rejects invalid order code %j",
    (orderCode) => {
      expect(() => parse({ ...orderInput, orderCode })).toThrow();
    },
  );
  it.each([
    { latitude: -90, longitude: -180 },
    { latitude: 90, longitude: 180 },
    { latitude: 0, longitude: 0 },
  ])("accepts coordinate boundary %j", (coordinates) => {
    expect(parse({ ...orderInput, ...coordinates })).toMatchObject(coordinates);
  });
  it.each([
    { latitude: NaN },
    { latitude: Infinity },
    { latitude: -90.001 },
    { latitude: 90.001 },
    { longitude: -180.001 },
    { longitude: 180.001 },
    { longitude: "0" },
    { customerName: " " },
    { address: "a".repeat(2001) },
  ])("rejects invalid field %j", (patch) => {
    expect(() => parse({ ...orderInput, ...patch })).toThrow();
  });
  it.each([
    "id",
    "scenarioId",
    "source",
    "createdAt",
    "updatedAt",
    "customerCount",
  ])("rejects client-controlled %s", (key) => {
    expect(() => parse({ ...orderInput, [key]: "dummy" })).toThrow();
  });
  it("serializes bigint ids losslessly and preserves a dummy source", () => {
    expect(serialize(orderRowFixture)).toEqual(orderDtoFixture);
    expect(serialize({ ...orderRowFixture, source: "dummy" })).toMatchObject({
      source: "dummy",
    });
  });
  it.each([
    { id: 1 },
    { scenarioId: BigInt("0") },
    { source: "other" },
    { orderCode: "lower" },
    { latitude: Infinity },
  ])("rejects malformed persisted row %o", (patch) => {
    expect(() => serialize({ ...orderRowFixture, ...patch })).toThrow();
  });
});
