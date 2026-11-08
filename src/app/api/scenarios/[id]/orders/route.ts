import { requireAdmin } from "@/lib/security/admin";
import {
  assertSameOrigin,
  readJson,
  privateJson,
} from "@/lib/http/request-security";
import {
  orderService,
  orderQuery,
  runOrderRequest,
  type OrderContext,
} from "@/lib/http/order-api";
import { parseOrderId, parseOrderInput } from "@/lib/validation/order";
export const runtime = "nodejs";
export async function GET(request: Request, context: OrderContext) {
  return runOrderRequest(async () => {
    await requireAdmin();
    const scenarioId = parseOrderId((await context.params).id),
      query = orderQuery(request);
    return privateJson(await orderService().listOrders(scenarioId, query));
  });
}
export async function POST(request: Request, context: OrderContext) {
  return runOrderRequest(async () => {
    const config = await requireAdmin();
    assertSameOrigin(request, config.origin);
    const scenarioId = parseOrderId((await context.params).id),
      input = parseOrderInput(await readJson(request, 16384));
    return privateJson(
      { data: await orderService().createOrder(scenarioId, input) },
      201,
    );
  });
}
