// @vitest-environment node
import { expect, it } from "vitest";
import { createOrderService } from "@/application/orders/order-service";
import { createDatabase } from "@/db/client";
import { createOrderRepository } from "@/db/repositories/order-repository";
import { OrderError } from "@/lib/validation/order";
import { createOrderReadDiagnostics } from "../fixtures/order-read-diagnostics";
import { orderRowFixture, orderWire } from "../fixtures/order";
import { fakeDatabaseUrl } from "../fixtures/tidb-http";

const privateValue = "synthetic-private-value";
const headers = { "TiDB-Session": privateValue };

function checkRead(reply: () => Promise<Response>) {
  const diagnostics = createOrderReadDiagnostics();
  const database = createDatabase(fakeDatabaseUrl, () =>
    diagnostics.observe(reply),
  );
  const orders = createOrderService(createOrderRepository(() => database));
  return diagnostics.expectNotFound(() =>
    orders.getOrder(orderRowFixture.scenarioId + BigInt("1"), orderRowFixture.id),
  );
}

it.each([{ rows: [] }, { rows: null }])(
  "accepts NOT_FOUND for explicit empty rows (%j)",
  async ({ rows }) => {
    await expect(
      checkRead(async () =>
        Response.json({ types: orderWire().types, rows }, { headers }),
      ),
    ).resolves.toBeUndefined();
  },
);

it("reports the unexpected application error with the available HTTP metadata", async () => {
  await expect(
    checkRead(async () => Response.json(orderWire(), { headers })),
  ).rejects.toThrow(
    /step=cross-scenario-order-read expected=NOT_FOUND actual=UNAVAILABLE origin=api httpStatus=200 hasTypes=true hasRows=true/,
  );
});

it.each([
  { body: { types: orderWire().types }, hasTypes: true, hasRows: false },
  {
    body: { types: orderWire().types, rows: privateValue },
    hasTypes: true,
    hasRows: true,
  },
  { body: { rows: [] }, hasTypes: false, hasRows: true },
])(
  "fails closed for an incomplete or malformed TiDB reply",
  async ({ body, hasTypes, hasRows }) => {
    await expect(
      checkRead(async () => Response.json(body, { headers })),
    ).rejects.toThrow(
      `actual=UNAVAILABLE origin=transport httpStatus=200 hasTypes=${hasTypes} hasRows=${hasRows}`,
    );
  },
);

it("reports HTTP rejection status without exposing the body, headers or error cause", async () => {
  const error = await checkRead(async () =>
    Response.json({ message: privateValue }, { status: 503, headers }),
  ).catch((error: unknown) => error);

  expect(error).toBeInstanceOf(Error);
  expect(String(error)).toContain(
    "actual=UNAVAILABLE origin=transport httpStatus=503 hasTypes=false hasRows=false",
  );
  expect(String(error)).not.toContain(privateValue);
  expect(error).not.toHaveProperty("cause");
});

it("reports a transport rejection without exposing the underlying message", async () => {
  const error = await checkRead(async () => {
    throw Error(privateValue);
  }).catch((error: unknown) => error);

  expect(String(error)).toContain("actual=UNAVAILABLE origin=transport httpStatus=unknown");
  expect(String(error)).not.toContain(privateValue);
});

it.each([
  { code: "NOT_FOUND" },
  Object.assign(new OrderError("UNAVAILABLE"), { code: privateValue }),
])("rejects untrusted error codes without printing them", async (error) => {
  const diagnostics = createOrderReadDiagnostics();
  const failure = await diagnostics.expectNotFound(async () => {
    throw error;
  }).catch((failure: unknown) => failure);

  expect(String(failure)).toContain("actual=unknown origin=api");
  expect(String(failure)).not.toContain(privateValue);
});

it("reports an unexpected resolution without exposing the result", async () => {
  const diagnostics = createOrderReadDiagnostics();
  const failure = await diagnostics
    .expectNotFound(async () => ({ customerName: privateValue }))
    .catch((failure: unknown) => failure);

  expect(String(failure)).toContain("actual=resolved origin=assertion");
  expect(String(failure)).not.toContain(privateValue);
});
