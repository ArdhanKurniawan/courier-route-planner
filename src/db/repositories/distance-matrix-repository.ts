import "server-only";
import { isDeepStrictEqual } from "node:util";
import { sql, type SQL } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { z } from "zod";
import {
  DistanceMatrixError,
  type DistanceMatrixRepository,
} from "@/application/distance-matrices/distance-matrix-service";
import { assertDepotEnvironment } from "@/config/depot-env";
import { getDatabase } from "@/db/client";
import { distanceMatrices as matrices } from "@/db/schema";
import { restoreDistanceMatrixSnapshot } from "@/domain/distance-matrix";
import { depotId } from "@/lib/validation/depot";
import type { DistanceMatrixQuery } from "@/lib/validation/distance-matrix";

type Database = ReturnType<typeof getDatabase>;
type MatrixKey = { id: string } | { requestId: string };
const dialect = new MySqlDialect();
const requestKey = z.uuid().refine((value) => value === value.toLowerCase());
const sha256 = z.string().regex(/^[a-f0-9]{64}$/u);
const count = z.number().int().min(0).max(2_147_483_647);
const querySchema = z.object({
  after: depotId.optional(),
  limit: z.number().int().min(1).max(100),
});
const insertAck = z.object({
  rowsAffected: z.literal(1),
  lastInsertId: depotId,
});
const sqlUtc = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/u)
  .transform((value) => {
    const [date, fraction = ""] = value.split(".");
    return date.replace(" ", "T") + "." + fraction.padEnd(3, "0") + "Z";
  })
  .pipe(z.iso.datetime({ precision: 3 }));
const summary = z.object({
  id: depotId,
  benchmarkCaseId: depotId,
  provider: z.literal("osrm"),
  profile: z.string().min(1).max(64),
  pointCount: count.min(2),
  inputHash: sha256,
  matrixHash: sha256,
  generatedAt: sqlUtc,
  zeroPairCount: count,
});
const detail = summary.extend({
  requestId: requestKey,
  version: z.unknown(),
  endpoint: z.unknown(),
  unit: z.unknown(),
  directed: z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .transform(Boolean),
  options: z.unknown(),
  nodeOrder: z.unknown(),
  matrix: z.unknown(),
  snapping: z.unknown(),
  provenance: z.unknown(),
});
const detailRows = z.tuple([z.object({ snapshot: z.string().nullable() })]);
const summaryRows = z
  .array(z.object({ summary: z.string().nullable() }))
  .min(1);

function selectDetail(benchmarkCaseId: string, key: MatrixKey) {
  const lookup =
    "id" in key
      ? sql`${matrices.id} = ${BigInt(depotId.parse(key.id))}`
      : sql`${matrices.requestId} = ${requestKey.parse(key.requestId)}`;
  return sql`
    SELECT CAST(CASE WHEN ${matrices.id} IS NULL THEN NULL ELSE JSON_OBJECT(
      'id', CAST(${matrices.id} AS CHAR),
      'benchmarkCaseId', CAST(${matrices.benchmarkCaseId} AS CHAR),
      'requestId', ${matrices.requestId},
      'provider', ${matrices.provider},
      'profile', ${matrices.profile},
      'pointCount', ${matrices.pointCount},
      'inputHash', ${matrices.inputHash},
      'matrixHash', ${matrices.matrixHash},
      'generatedAt', CAST(${matrices.generatedAt} AS CHAR),
      'zeroPairCount', ${matrices.zeroPairCount},
      'version', ${matrices.version},
      'endpoint', ${matrices.endpoint},
      'unit', ${matrices.unit},
      'directed', ${matrices.directed},
      'options', ${matrices.options},
      'nodeOrder', ${matrices.nodeOrder},
      'matrix', ${matrices.matrix},
      'snapping', ${matrices.snapping},
      'provenance', ${matrices.provenance}
    ) END AS CHAR) AS snapshot
    FROM (SELECT CAST(${BigInt(depotId.parse(benchmarkCaseId))} AS SIGNED) AS id) requested
    LEFT JOIN ${matrices} ON ${matrices.benchmarkCaseId} = requested.id AND ${lookup}
  `;
}

function selectHistory(benchmarkCaseId: string, query: DistanceMatrixQuery) {
  const { after, limit } = querySchema.parse(query);
  const cursor = after === undefined ? sql`` : sql`AND id < ${BigInt(after)}`;
  return sql`
    SELECT CAST(CASE WHEN page.id IS NULL THEN NULL ELSE JSON_OBJECT(
      'id', CAST(page.id AS CHAR),
      'benchmarkCaseId', CAST(page.benchmark_case_id AS CHAR),
      'provider', page.provider,
      'profile', page.profile,
      'pointCount', page.point_count,
      'inputHash', page.input_hash,
      'matrixHash', page.matrix_hash,
      'generatedAt', CAST(page.generated_at AS CHAR),
      'zeroPairCount', page.zero_pair_count
    ) END AS CHAR) AS summary
    FROM (SELECT 1) anchor
    LEFT JOIN (
      SELECT id, benchmark_case_id, provider, profile, point_count,
             input_hash, matrix_hash, generated_at, zero_pair_count
      FROM ${matrices}
      WHERE benchmark_case_id = ${BigInt(depotId.parse(benchmarkCaseId))} ${cursor}
      ORDER BY id DESC
      LIMIT ${limit + 1}
    ) page ON 1 = 1
    ORDER BY page.id DESC
  `;
}

function decodeDetail(raw: unknown, caseId: string, key: MatrixKey) {
  const [{ snapshot: encoded }] = detailRows.parse(raw);
  if (encoded === null) return null;
  const {
    id,
    benchmarkCaseId,
    requestId,
    matrixHash,
    generatedAt,
    pointCount,
    zeroPairCount,
    ...input
  } = detail.parse(JSON.parse(encoded));
  const snapshot = restoreDistanceMatrixSnapshot(input, matrixHash);
  if (
    benchmarkCaseId !== caseId ||
    ("id" in key ? id !== key.id : requestId !== key.requestId) ||
    snapshot.provenance.generatedAt !== generatedAt ||
    snapshot.nodeOrder.length !== pointCount ||
    snapshot.zeroPairs.length !== zeroPairCount
  ) {
    throw new DistanceMatrixError("CORRUPT_MATRIX");
  }
  return { ...snapshot, id, benchmarkCaseId, requestId };
}

function decodeHistory(
  raw: unknown,
  caseId: string,
  { after, limit }: DistanceMatrixQuery,
) {
  const rows = summaryRows.max(limit + 1).parse(raw);
  if (rows.length === 1 && rows[0].summary === null) {
    return { data: [], nextCursor: null };
  }
  let previous = after === undefined ? undefined : BigInt(after);
  const summaries = rows.map(({ summary: encoded }) => {
    const row = summary.parse(encoded === null ? null : JSON.parse(encoded));
    const id = BigInt(row.id);
    if (
      row.benchmarkCaseId !== caseId ||
      row.zeroPairCount > row.pointCount * (row.pointCount - 1) ||
      (previous !== undefined && id >= previous)
    ) {
      throw new DistanceMatrixError("CORRUPT_MATRIX");
    }
    previous = id;
    return row;
  });
  const data = summaries.slice(0, limit);
  return {
    data,
    nextCursor: summaries.length > limit ? data[data.length - 1].id : null,
  };
}

function defaultDatabase() {
  assertDepotEnvironment();
  return getDatabase();
}

// The pinned HTTP driver escapes bound strings with backslashes. Bind arbitrary
// UTF-8 as bytes so JSON and endpoint text survive either SQL escaping mode.
const utf8 = (value: string) =>
  sql`CONVERT(${Buffer.from(value, "utf8")} USING utf8mb4)`;

export function createDistanceMatrixRepository(
  acquire: () => Database = defaultDatabase,
): DistanceMatrixRepository {
  async function read<T>(statement: () => SQL, decode: (rows: unknown) => T) {
    let rows: unknown;
    try {
      const { sql: query, params } = dialect.sqlToQuery(statement());
      rows = await acquire().$client.execute(query, params);
    } catch {
      throw new DistanceMatrixError("UNAVAILABLE");
    }
    try {
      return decode(rows);
    } catch {
      throw new DistanceMatrixError("CORRUPT_MATRIX");
    }
  }

  function find(benchmarkCaseId: string, key: MatrixKey) {
    return read(
      () => selectDetail(benchmarkCaseId, key),
      (rows) => decodeDetail(rows, benchmarkCaseId, key),
    );
  }

  return {
    findById: (benchmarkCaseId, id) => find(benchmarkCaseId, { id }),
    findByRequestId: (benchmarkCaseId, requestId) =>
      find(benchmarkCaseId, { requestId }),
    list: (benchmarkCaseId, query) =>
      read(
        () => selectHistory(benchmarkCaseId, query),
        (rows) => decodeHistory(rows, benchmarkCaseId, query),
      ),
    async append({ benchmarkCaseId: caseId, requestId: key, snapshot }) {
      const benchmarkCaseId = depotId.parse(caseId);
      const requestId = requestKey.parse(key);
      let verified;
      try {
        const { matrixHash, zeroPairs, comparisonEligible, ...input } =
          snapshot;
        verified = restoreDistanceMatrixSnapshot(input, matrixHash);
        if (
          verified.comparisonEligible !== comparisonEligible ||
          !isDeepStrictEqual(verified.zeroPairs, zeroPairs)
        ) {
          throw new DistanceMatrixError("CORRUPT_MATRIX");
        }
      } catch {
        throw new DistanceMatrixError("CORRUPT_MATRIX");
      }

      let db: Database;
      try {
        db = acquire();
      } catch {
        throw new DistanceMatrixError("UNAVAILABLE");
      }
      const insert = db
        .insert(matrices)
        .values({
          benchmarkCaseId: BigInt(benchmarkCaseId),
          requestId,
          version: verified.version,
          provider: verified.provider,
          profile: utf8(verified.profile),
          endpoint: utf8(verified.endpoint),
          unit: verified.unit,
          directed: verified.directed,
          inputHash: verified.inputHash,
          matrixHash: verified.matrixHash,
          pointCount: verified.nodeOrder.length,
          zeroPairCount: verified.zeroPairs.length,
          generatedAt: verified.provenance.generatedAt
            .replace("T", " ")
            .slice(0, -1),
          options: utf8(JSON.stringify(verified.options)),
          nodeOrder: utf8(JSON.stringify(verified.nodeOrder)),
          matrix: utf8(JSON.stringify(verified.matrix)),
          snapping: utf8(JSON.stringify(verified.snapping)),
          provenance: utf8(JSON.stringify(verified.provenance)),
        })
        .toSQL();
      const ack = await db.$client
        .execute(insert.sql, insert.params, { fullResult: true })
        .then((result) => insertAck.parse(result))
        .catch(() => null);

      // Read the persisted row through a fresh connection. If the INSERT
      // acknowledgement was lost, the same key may identify a concurrent winner.
      const stored = await find(benchmarkCaseId, { requestId }).catch(
        (error) => {
          if (
            ack &&
            error instanceof DistanceMatrixError &&
            error.code === "CORRUPT_MATRIX"
          )
            throw error;
          throw new DistanceMatrixError("STORE_UNKNOWN");
        },
      );
      if (!stored || (!ack && stored.inputHash !== verified.inputHash)) {
        throw new DistanceMatrixError("STORE_UNKNOWN");
      }
      if (
        ack &&
        !isDeepStrictEqual(stored, {
          ...verified,
          id: ack.lastInsertId,
          benchmarkCaseId,
          requestId,
        })
      ) {
        throw new DistanceMatrixError("CORRUPT_MATRIX");
      }
      return stored;
    },
  };
}
