import { z } from "zod";
import { depotId } from "@/lib/validation/depot";

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
const coordinates = z.tuple([
  z.number().min(-90).max(90),
  z.number().min(-180).max(180),
]);

export type ScenarioOption = z.infer<typeof scenarioOption>;
export type MapPosition = z.infer<typeof coordinates>;
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
  const parsed = coordinates.safeParse([latitude, longitude]);
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

async function readPages<T extends { id: string }>(
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
