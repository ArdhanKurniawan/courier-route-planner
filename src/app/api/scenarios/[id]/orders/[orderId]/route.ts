import { z } from "zod";
import { requireAdmin } from "@/lib/security/admin";
import {
  assertSameOrigin,
  readJson,
  privateJson,
} from "@/lib/http/request-security";
import {
  orderService,
  runOrderRequest,
  type OrderContext,
} from "@/lib/http/order-api";
import { parseOrderId, parseOrderInput } from "@/lib/validation/order";
export const runtime = "nodejs";
export async function GET(_request: Request, context: OrderContext) {
  return runOrderRequest(async () => {
    await requireAdmin();
    const params = await context.params,
      scenarioId = parseOrderId(params.id),
      orderId = parseOrderId(params.orderId);
    return privateJson({
      data: await orderService().getOrder(scenarioId, orderId),
    });
  });
}
export async function PUT(request: Request, context: OrderContext) {
  return runOrderRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const params = await context.params,
      scenarioId = parseOrderId(params.id),
      orderId = parseOrderId(params.orderId),
      input = parseOrderInput(await readJson(request, 16384));
    return privateJson({
      data: await orderService().updateOrder(scenarioId, orderId, input),
    });
  });
}
export async function DELETE(request: Request, context: OrderContext) {
  return runOrderRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const params = await context.params,
      scenarioId = parseOrderId(params.id),
      orderId = parseOrderId(params.orderId);
    z.strictObject({}).parse(await readJson(request, 16384));
    await orderService().deleteOrder(scenarioId, orderId);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  });
}
