import { z } from "zod";
import { depotId } from "@/lib/validation/depot";
import {
  mapPosition,
  mapRoadResponse,
  type MapRoadResult,
  type MapRoute,
} from "@/lib/validation/map-road-route";

const pageSize = 100;
const scenarioOption = z.object({ id: depotId, name: z.string().min(1) });
const scenarioDetail = scenarioOption.extend({ depotId });
const locationFields = {
  address: z.string().nullish(),
  latitude: z.unknown().optional(),
  longitude: z.unknown().optional(),
};
const depotDetail = z.object({
  id: depotId,
  name: z.string().min(1),
  ...locationFields,
});
const orderDetail = z.object({
  id: depotId,
  scenarioId: depotId,
  orderCode: z.string().min(1),
  customerName: z.string().min(1),
  ...locationFields,
});
export type ScenarioOption = z.infer<typeof scenarioOption>;
export type MapPosition = z.infer<typeof mapPosition>;
type MapLocation = { address: string | null; position: MapPosition | null };
export type ScenarioMapData = {
  scenarioId: string;
  depot: MapLocation & { id: string; name: string };
  orders: (MapLocation & {
    id: string;
    orderCode: string;
    customerName: string;
  })[];
};

function mapLocation({
  address,
  latitude,
  longitude,
}: {
  address?: string | null;
  latitude?: unknown;
  longitude?: unknown;
}): MapLocation {
  const parsed = mapPosition.safeParse([latitude, longitude]);
  return {
    address: address ?? null,
    position: parsed.success ? parsed.data : null,
  };
}

async function readJson(path: string, signal: AbortSignal): Promise<unknown> {
  signal.throwIfAborted();
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw Error("Map request failed");
  return response.json();
}

export async function readPages<T extends { id: string }>(
  path: string,
  row: z.ZodType<T>,
  signal: AbortSignal,
): Promise<T[]> {
  const envelope = z.object({
    data: z.array(row).max(pageSize),
    nextCursor: depotId.nullable(),
  });
  const rows: T[] = [];
  const ids = new Set<string>();
  let after: string | null = null;
  do {
    const query = new URLSearchParams({ limit: String(pageSize) });
    if (after) query.set("after", after);
    const { data, nextCursor } = envelope.parse(
      await readJson(`${path}?${query}`, signal),
    );
    for (const item of data) {
      if (ids.has(item.id)) throw Error("Duplicate paginated ID");
      ids.add(item.id);
      rows.push(item);
    }
    if (nextCursor !== null && nextCursor !== data.at(-1)?.id)
      throw Error("Invalid pagination cursor");
    after = nextCursor;
  } while (after !== null);
  return rows;
}

export function readScenarioOptions(
  signal: AbortSignal,
): Promise<ScenarioOption[]> {
  return readPages("/api/scenarios", scenarioOption, signal);
}

export async function readScenarioMap(
  id: string,
  signal: AbortSignal,
): Promise<ScenarioMapData> {
  const scenarioId = depotId.parse(id);
  const scenarioPath = `/api/scenarios/${scenarioId}`;
  const { data: scenario } = z
    .object({ data: scenarioDetail })
    .parse(await readJson(scenarioPath, signal));
  if (scenario.id !== scenarioId) throw Error("Unexpected Scenario");

  const [depotResponse, orders] = await Promise.all([
    readJson(`/api/depots/${scenario.depotId}`, signal),
    readPages(
      `${scenarioPath}/orders`,
      orderDetail.refine((order) => order.scenarioId === scenarioId),
      signal,
    ),
  ]);
  const { data: depot } = z.object({ data: depotDetail }).parse(depotResponse);
  if (depot.id !== scenario.depotId) throw Error("Unexpected Depot");

  return {
    scenarioId,
    depot: { id: depot.id, name: depot.name, ...mapLocation(depot) },
    orders: orders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      customerName: order.customerName,
      ...mapLocation(order),
    })),
  };
}

const roadErrorMessages: Record<string, string> = {
  OSRM_TIMEOUT: "OSRM melewati batas waktu.",
  OSRM_BUSY: "OSRM sedang sibuk. Coba lagi nanti.",
  SCENARIO_CHANGED: "Data Scenario berubah. Muat ulang data peta.",
  OSRM_SNAPSHOT_CHANGED: "Data Scenario berbeda dari snapshot OSRM yang disetujui. Gunakan Haversine atau hubungi pengelola.",
  OSRM_INVALID_POINTS: "Koordinat Depot atau Order tidak valid untuk OSRM.",
};

function isSameStop(
  stop: MapRoute["stops"][number],
  location: { id: string; position: MapPosition | null },
  label: string,
) {
  return stop.id === location.id &&
    stop.label === label &&
    stop.position[0] === location.position?.[0] &&
    stop.position[1] === location.position?.[1];
}

function matchesScenario(result: MapRoadResult, map: ScenarioMapData) {
  const stops = result.route.stops;
  const depotLabel = `Depot ${map.depot.name}`;
  if (
    result.scenarioId !== map.scenarioId || stops.length !== map.orders.length + 2 ||
    !isSameStop(stops[0], map.depot, depotLabel) ||
    !isSameStop(stops[stops.length - 1], map.depot, depotLabel)
  ) return false;

  const orders = new Map(map.orders.map((order) => [order.id, order]));
  for (const stop of stops.slice(1, -1)) {
    const order = orders.get(stop.id);
    if (!order || !isSameStop(stop, order, `${order.orderCode} — ${order.customerName}`))
      return false;
    orders.delete(stop.id);
  }
  return orders.size === 0;
}

export async function readMapRoadRoute(
  map: ScenarioMapData,
  signal: AbortSignal,
): Promise<MapRoadResult> {
  const response = await fetch(`/api/scenarios/${map.scenarioId}/road-route`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal,
  }).catch(() => { throw new Error("Jarak jalan OSRM belum tersedia."); });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = z.object({ error: z.object({ code: z.string() }) }).safeParse(body);
    const code = failure.data?.error.code ?? "";
    throw new Error(Object.hasOwn(roadErrorMessages, code)
      ? roadErrorMessages[code]
      : "Jarak jalan OSRM belum tersedia.");
  }
  const parsed = mapRoadResponse.safeParse(body);
  if (!parsed.success) throw new Error("Respons optimasi OSRM tidak valid.");
  if (!matchesScenario(parsed.data.data, map))
    throw new Error(roadErrorMessages.SCENARIO_CHANGED);
  return parsed.data.data;
}
