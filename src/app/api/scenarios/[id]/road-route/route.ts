import { ZodError } from "zod";
import { localMapDemo } from "@/application/local-map-demo";
import { buildMapRoadRoute, RoadRouteBusyError } from "@/application/map-road-route";
import { isLocalMapScenarioEnabled, isLocalOsrmDemoEnabled, isTestingOsrmEnabled } from "@/config/osrm-map-demo";
import { OsrmError } from "@/infrastructure/osrm-client";
import { depotService } from "@/lib/http/depot-api";
import { orderService } from "@/lib/http/order-api";
import { scenarioService } from "@/lib/http/scenario-api";
import { assertSameOrigin, errorResponse, HttpError, privateJson } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";
import { reserveTestingOsrm } from "@/lib/security/testing-osrm-quota";
import { DepotError } from "@/lib/validation/depot";
import { localMapDemoId, osrmOrderLimit } from "@/lib/validation/map-road-route";
import { OrderError } from "@/lib/validation/order";
import { parseScenarioId, ScenarioError } from "@/lib/validation/scenario";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    assertSameOrigin(request, admin.origin);
    const localAccess = admin.environment === "development" && isLocalOsrmDemoEnabled();
    const testingAccess = admin.environment === "testing" && isTestingOsrmEnabled();
    if (!localAccess && !testingAccess)
      throw new HttpError(404, "OSRM_DISABLED", "OSRM demo unavailable.");
    const expectedOrigin = new URL(admin.origin);
    // Next dev can use its bind hostname in Request.url instead of the Host header.
    if (
      request.headers.get("host")?.toLowerCase() !== expectedOrigin.host ||
      new URL(request.url).protocol !== expectedOrigin.protocol
    )
      throw new HttpError(403, "FORBIDDEN", "Request origin denied.");

    const { id: requestedId } = await context.params;
    if (testingAccess && requestedId !== localMapDemoId)
      throw new HttpError(404, "OSRM_DISABLED", "OSRM demo unavailable.");
    if (requestedId === localMapDemoId) {
      if (!testingAccess && !isLocalMapScenarioEnabled())
        throw new HttpError(404, "OSRM_DISABLED", "OSRM demo unavailable.");
      if (localMapDemo.orders.length > osrmOrderLimit)
        throw new HttpError(422, "OSRM_TOO_MANY_ORDERS", "Too many Orders.");
      const fetcher = testingAccess ? await reserveTestingOsrm(admin, request.signal) : undefined;
      return privateJson({
        data: await buildMapRoadRoute(
          localMapDemoId, localMapDemo.depot, localMapDemo.orders, request.signal, fetcher,
        ),
      });
    }

    const id = parseScenarioId(requestedId);
    const scenarioId = id.toString();
    const scenario = await scenarioService().getScenario(id);
    if (scenario.id !== scenarioId)
      throw new HttpError(409, "SCENARIO_CHANGED", "Scenario data changed.");
    const page = await orderService().listOrders(id, { limit: osrmOrderLimit });
    const total = BigInt(page.totalCount);
    if (page.nextCursor !== null || total > BigInt(osrmOrderLimit))
      throw new HttpError(422, "OSRM_TOO_MANY_ORDERS", "Too many Orders.");
    if (total === BigInt(0) && page.data.length === 0)
      throw new HttpError(422, "OSRM_NO_ORDERS", "Scenario has no Orders.");
    if (
      total !== BigInt(page.data.length) ||
      page.data.some((order) => order.scenarioId !== scenarioId)
    ) throw new HttpError(409, "SCENARIO_CHANGED", "Scenario data changed.");

    const depot = await depotService().getDepot(BigInt(scenario.depotId));
    if (depot.id !== scenario.depotId)
      throw new HttpError(409, "SCENARIO_CHANGED", "Scenario Depot changed.");
    return privateJson({
      data: await buildMapRoadRoute(scenarioId, depot, page.data, request.signal),
    });
  } catch (error) {
    if (error instanceof ZodError)
      return errorResponse(new HttpError(400, "INVALID_INPUT", "Invalid Scenario ID."));
    if (error instanceof RoadRouteBusyError)
      return errorResponse(new HttpError(429, "OSRM_BUSY", "OSRM demo is busy."));
    if (error instanceof OsrmError) {
      if (error.code === "INVALID_INPUT")
        return errorResponse(new HttpError(422, "OSRM_INVALID_POINTS", "Invalid route points."));
      if (error.code === "TIMEOUT")
        return errorResponse(new HttpError(504, "OSRM_TIMEOUT", "OSRM timed out."));
      if (error.httpStatus === 429)
        return errorResponse(new HttpError(429, "OSRM_BUSY", "OSRM limit reached."));
      return errorResponse(new HttpError(502, "OSRM_UNAVAILABLE", "OSRM route unavailable."));
    }
    if (
      (error instanceof ScenarioError || error instanceof DepotError || error instanceof OrderError) &&
      error.code === "NOT_FOUND"
    ) return errorResponse(new HttpError(404, "NOT_FOUND", "Scenario or Depot unavailable."));
    return errorResponse(error);
  }
}
