import "server-only";

import { z } from "zod";
import type { DistanceMatrix, Route } from "@/domain/nn-two-opt";
import { depotId } from "@/lib/validation/depot";

const longitude = z.number().finite().min(-180).max(180);
const latitude = z.number().finite().min(-90).max(90);
const position = z.tuple([longitude, latitude]);
const stop = z.object({ id: depotId, latitude, longitude });
const stops = z.object({ depot: stop, orders: z.array(stop).min(1) });
const waypoint = z.object({
  location: position,
  distance: z.number().finite().nonnegative().optional(),
});
const providerEnvelope = z.looseObject({
  code: z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/u).max(64),
  data_version: z.string().optional(),
});
const tableMetadata = z.object({
  sources: z.array(waypoint),
  destinations: z.array(waypoint),
});
const frozenTableNodes = z.array(stop.extend({
  index: z.number().int().nonnegative(),
  kind: z.enum(["depot", "order"]),
})).min(2);
const routeResponse = z.object({
  waypoints: z.array(waypoint),
  routes: z.array(z.object({
    legs: z.array(z.object({})),
    geometry: z.object({
      type: z.literal("LineString"),
      coordinates: z.array(position).min(2),
    }),
  })).length(1),
});

const tableOptions = Object.freeze({
  annotations: "distance",
  generate_hints: "false",
});
const routeOptions = {
  alternatives: "false",
  steps: "false",
  geometries: "geojson",
  overview: "full",
  generate_hints: "false",
};

type Service = "table" | "route";
type Failure =
  | "INVALID_INPUT"
  | "TIMEOUT"
  | "ABORTED"
  | "NETWORK"
  | "HTTP_ERROR"
  | "PROVIDER_ERROR"
  | "DISTANCE_UNSUPPORTED"
  | "UNREACHABLE"
  | "INVALID_RESPONSE"
  | "INVALID_MATRIX"
  | "INVALID_GEOMETRY"
  | "WAYPOINT_MISMATCH";

export class OsrmError extends Error {
  constructor(
    readonly code: Failure,
    readonly service: Service,
    readonly httpStatus?: number,
    readonly providerCode?: string,
    readonly retryAfterMs?: number,
  ) {
    super(`OSRM ${service} failed (${code})`);
    this.name = "OsrmError";
  }
}

function retryAfter(response: Response): number | undefined {
  const value = response.headers.get("Retry-After");
  if (!value) return undefined;
  const duration = /^\d+$/u.test(value)
    ? Number(value) * 1_000
    : Date.parse(value) - Date.now();
  return Number.isSafeInteger(duration) && duration >= 0 ? duration : undefined;
}

const hostedError = z.object({
  error: z.object({ code: z.enum(["table_size_exceeds_plan", "daily_limit_exceeded"]) }),
});

type Stop = Readonly<z.infer<typeof stop>>;
type OrderedNode = Stop & Readonly<{ kind: "depot" | "order" }>;
type Position = readonly [longitude: number, latitude: number];
type Waypoint = Readonly<{ location: Position; distance?: number }>;

export type OsrmTable = Readonly<{
  nodes: readonly OrderedNode[];
  matrix: DistanceMatrix;
  sources: readonly Waypoint[];
  destinations: readonly Waypoint[];
  unit: "meter";
  directed: true;
  baseUrl: string;
  profile: string;
  options: typeof tableOptions & { radiuses?: string };
  dataVersion: string | null;
}>;

export type OsrmRouteGeometry = Readonly<{
  geometry: { type: "LineString"; coordinates: readonly Position[] };
  waypoints: readonly Waypoint[];
  dataVersion: string | null;
}>;

type Options = {
  baseUrl: string;
  profile: string;
  timeoutMs?: number;
  userAgent?: string;
  fetcher?: typeof fetch;
  hostedTable?: boolean;
};

function orderedNodes(
  input: Readonly<{ depot: Stop; orders: readonly Stop[] }>,
): readonly OrderedNode[] {
  const parsed = stops.safeParse(input);
  if (!parsed.success) throw new OsrmError("INVALID_INPUT", "table");
  const { depot, orders } = parsed.data;
  if (new Set(orders.map(({ id }) => id)).size !== orders.length)
    throw new OsrmError("INVALID_INPUT", "table");

  // Canonical positive decimal IDs compare numerically by length, then by digit.
  orders.sort((a, b) => a.id.length - b.id.length || (a.id < b.id ? -1 : 1));
  return Object.freeze([
    Object.freeze({ ...depot, kind: "depot" as const }),
    ...orders.map((order) => Object.freeze({ ...order, kind: "order" as const })),
  ]);
}

function validateMatrix(raw: unknown, size: number): DistanceMatrix {
  if (!Array.isArray(raw) || raw.length !== size)
    throw new OsrmError("INVALID_MATRIX", "table");
  const rows: ReadonlyArray<number>[] = [];
  for (let from = 0; from < size; from++) {
    const row: unknown = raw[from];
    if (!Array.isArray(row) || row.length !== size)
      throw new OsrmError("INVALID_MATRIX", "table");
    const values: number[] = [];
    for (let to = 0; to < size; to++) {
      const distance: unknown = row[to];
      if (distance === null) throw new OsrmError("UNREACHABLE", "table");
      if (
        typeof distance !== "number" || !Number.isFinite(distance) ||
        distance < 0 || (from === to && distance !== 0)
      ) throw new OsrmError("INVALID_MATRIX", "table");
      values.push(distance === 0 ? 0 : distance);
    }
    rows.push(Object.freeze(values));
  }
  return Object.freeze(rows);
}

function freezeWaypoints(points: z.infer<typeof waypoint>[]): readonly Waypoint[] {
  return Object.freeze(points.map((point) =>
    Object.freeze({ ...point, location: Object.freeze(point.location) }),
  ));
}

function routeNodes(nodes: readonly OrderedNode[], route: Route): OrderedNode[] {
  if (route.length !== nodes.length + 1 || route[0] !== 0 || route.at(-1) !== 0)
    throw new OsrmError("INVALID_INPUT", "route");
  const visited = new Set<number>();
  for (const index of route.slice(1, -1)) {
    if (!Number.isInteger(index) || index < 1 || index >= nodes.length || visited.has(index))
      throw new OsrmError("INVALID_INPUT", "route");
    visited.add(index);
  }
  return route.map((index) => nodes[index]);
}

function samePosition(a: Position, b: Position): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function followsWaypoints(coordinates: readonly Position[], waypoints: readonly Waypoint[]) {
  let vertex = 0;
  for (const { location } of waypoints) {
    while (vertex < coordinates.length && !samePosition(coordinates[vertex], location)) {
      vertex++;
    }
    if (vertex === coordinates.length) return false;
    // Consecutive stops can snap to a shared vertex.
  }
  return true;
}

export function createOsrmClient({
  baseUrl,
  profile,
  timeoutMs = 5_000,
  userAgent,
  fetcher = fetch,
  hostedTable = false,
}: Options) {
  const base = URL.parse(baseUrl);
  if (
    !base || !["http:", "https:"].includes(base.protocol) ||
    base.username || base.password || base.search || base.hash ||
    !/^[a-z0-9][a-z0-9_-]*$/iu.test(profile) ||
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647
  ) throw new Error("Invalid OSRM client configuration");
  const providerBase = base.href;
  const basePath = base.pathname.replace(/\/+$/u, "");
  const headers = new Headers({ Accept: "application/json" });
  if (userAgent) headers.set("User-Agent", userAgent);

  async function request(
    service: Service,
    nodes: readonly Stop[],
    options: Record<string, string>,
    callerSignal?: AbortSignal,
  ) {
    if (callerSignal?.aborted) throw new OsrmError("ABORTED", service);
    const url = new URL(providerBase);
    const coordinates = nodes.map((node) => `${node.longitude},${node.latitude}`);
    url.pathname = `${basePath}/${service}/v1/${profile}/${coordinates.join(";")}`;
    url.search = new URLSearchParams(options).toString();
    const timeout = new AbortController();
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeout.signal]) : timeout.signal;
    const timer = setTimeout(() => timeout.abort(), timeoutMs);
    const hosted = hostedTable && service === "table";
    let response: Response | undefined;
    try {
      response = await fetcher(url, {
        method: "GET", cache: "no-store", redirect: hosted ? "manual" : "error", signal, headers,
      });
      if (hosted && (
        [401, 402, 403, 404, 405].includes(response.status) ||
        (response.status >= 300 && response.status < 400)
      )) {
        // Hosted gateways can return HTML, JSON with sensitive details, or
        // even an empty body. The transport status is authoritative here.
        void response.body?.cancel().catch(() => {});
        throw new OsrmError("HTTP_ERROR", service, response.status, undefined, retryAfter(response));
      }
      const raw: unknown = await response.json();
      signal.throwIfAborted();
      const parsed = providerEnvelope.safeParse(raw);
      if (hosted && [400, 429].includes(response.status)) {
        const hosted = hostedError.safeParse(raw);
        if (hosted.success && response.status === 400 && hosted.data.error.code === "table_size_exceeds_plan")
          throw new OsrmError("PROVIDER_ERROR", service, 400, "TooBig");
        if (hosted.success && response.status === 429 && hosted.data.error.code === "daily_limit_exceeded")
          throw new OsrmError("HTTP_ERROR", service, 429, "daily_limit_exceeded", retryAfter(response));
      }
      // Provider error codes like NoRoute are returned with a non-2xx status.
      if (parsed.success && parsed.data.code !== "Ok") {
        const code = parsed.data.code;
        if (["NoRoute", "NoTable", "NoSegment"].includes(code))
          throw new OsrmError("UNREACHABLE", service, response.status, code);
        if (service === "table" && code === "NotImplemented")
          throw new OsrmError("DISTANCE_UNSUPPORTED", service, response.status, code);
        throw new OsrmError("PROVIDER_ERROR", service, response.status, code, retryAfter(response));
      }
      if (!response.ok) throw new OsrmError("HTTP_ERROR", service, response.status, undefined, retryAfter(response));
      if (!parsed.success) throw new OsrmError("INVALID_RESPONSE", service, response.status);
      return parsed.data;
    } catch (error) {
      if (hosted && response && !response.ok && signal.aborted)
        throw new OsrmError("HTTP_ERROR", service, response.status, undefined, retryAfter(response));
      if (signal.aborted)
        throw new OsrmError(timeout.signal.aborted ? "TIMEOUT" : "ABORTED", service);
      if (error instanceof OsrmError) throw error;
      if (!response) throw new OsrmError("NETWORK", service);
      throw new OsrmError(response.ok ? "INVALID_RESPONSE" : "HTTP_ERROR", service, response.status, undefined, retryAfter(response));
    } finally {
      clearTimeout(timer);
    }
  }

  async function getTable(
    nodes: readonly OrderedNode[],
    options: OsrmTable["options"],
    signal?: AbortSignal,
  ): Promise<OsrmTable> {
    const payload = await request("table", nodes, options, signal);
    if (payload.distances === undefined)
      throw new OsrmError("DISTANCE_UNSUPPORTED", "table");
    const fallback = payload.fallback_speed_cells;
    if (fallback !== undefined && (!Array.isArray(fallback) || fallback.length !== 0))
      throw new OsrmError("INVALID_MATRIX", "table");

    const matrix = validateMatrix(payload.distances, nodes.length);
    const metadata = tableMetadata.safeParse(payload);
    if (
      !metadata.success || metadata.data.sources.length !== nodes.length ||
      metadata.data.destinations.length !== nodes.length
    ) throw new OsrmError("INVALID_RESPONSE", "table");
    return Object.freeze({
      nodes,
      matrix,
      sources: freezeWaypoints(metadata.data.sources),
      destinations: freezeWaypoints(metadata.data.destinations),
      unit: "meter",
      directed: true,
      baseUrl: providerBase,
      profile,
      options,
      dataVersion: payload.data_version || null,
    });
  }

  return {
    async getDistanceTable(
      input: Readonly<{ depot: Stop; orders: readonly Stop[] }>,
      signal?: AbortSignal,
    ) {
      return getTable(orderedNodes(input), tableOptions, signal);
    },

    async getOrderedDistanceTable(
      input: readonly (OrderedNode & { index: number })[],
      snapRadiusM: number,
      signal?: AbortSignal,
    ) {
      const parsed = frozenTableNodes.safeParse(input);
      if (
        !parsed.success || !Number.isFinite(snapRadiusM) || snapRadiusM <= 0 ||
        parsed.data.some(({ index, kind }, position) =>
          index !== position || kind !== (position === 0 ? "depot" : "order")) ||
        new Set(parsed.data.slice(1).map(({ id }) => id)).size !== parsed.data.length - 1
      ) throw new OsrmError("INVALID_INPUT", "table");
      // The benchmark snapshot already defines the only valid row/column order.
      const nodes = Object.freeze(parsed.data.map(({ id, kind, latitude, longitude }) =>
        Object.freeze({ id, kind, latitude, longitude })));
      const radiuses = nodes.map(() => String(snapRadiusM)).join(";");
      return getTable(nodes, Object.freeze({ ...tableOptions, radiuses }), signal);
    },

    async getRouteGeometry(
      table: OsrmTable,
      route: Route,
      signal?: AbortSignal,
    ): Promise<OsrmRouteGeometry> {
      if (table.baseUrl !== providerBase || table.profile !== profile)
        throw new OsrmError("INVALID_INPUT", "route");
      const indices = [...route];
      const nodes = routeNodes(table.nodes, indices);
      const payload = await request("route", nodes, routeOptions, signal);
      const parsed = routeResponse.safeParse(payload);
      if (!parsed.success) throw new OsrmError("INVALID_GEOMETRY", "route");
      const { waypoints, routes: [{ geometry, legs }] } = parsed.data;
      if (waypoints.length !== indices.length)
        throw new OsrmError("WAYPOINT_MISMATCH", "route");
      for (const [index, point] of waypoints.entries()) {
        const originalIndex = indices[index];
        if (
          !samePosition(point.location, table.sources[originalIndex].location) &&
          !samePosition(point.location, table.destinations[originalIndex].location)
        ) throw new OsrmError("WAYPOINT_MISMATCH", "route");
      }
      const { coordinates } = geometry;
      if (
        legs.length !== indices.length - 1 ||
        !samePosition(coordinates[0], waypoints[0].location) ||
        !samePosition(coordinates[coordinates.length - 1], waypoints[waypoints.length - 1].location) ||
        !followsWaypoints(coordinates, waypoints)
      ) throw new OsrmError("INVALID_GEOMETRY", "route");
      return {
        geometry,
        waypoints: freezeWaypoints(waypoints),
        dataVersion: payload.data_version || null,
      };
    },
  };
}
