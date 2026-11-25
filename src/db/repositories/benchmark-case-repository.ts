import "server-only";
import { isDeepStrictEqual } from "node:util";
import { DatabaseError } from "@tidbcloud/serverless";
import { sql, type SQL } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { z } from "zod";
import {
  BenchmarkCaseError,
  type BenchmarkCaseRepository,
} from "@/application/benchmark-cases/benchmark-case-service";
import { assertDepotEnvironment } from "@/config/depot-env";
import { getDatabase } from "@/db/client";
import {
  benchmarkCasePoints as points,
  benchmarkCases as cases,
  depots,
  dummyOrderOperations,
  orders,
  scenarios,
} from "@/db/schema";
import type { BenchmarkInputSnapshot } from "@/domain/benchmark-input";
import { depotId } from "@/lib/validation/depot";
import type { BenchmarkHistoryQuery } from "@/lib/validation/benchmark-case";
import {
  decodeBenchmarkHistory,
  decodeBenchmarkSource,
  decodeStoredBenchmarkCase,
  type BenchmarkCaseKey,
} from "./benchmark-case-rows";

type Database = ReturnType<typeof getDatabase>;
type Session = Pick<
  Awaited<ReturnType<Database["$client"]["begin"]>>,
  "execute"
>;
const dialect = new MySqlDialect();
const requestKey = z.uuid().refine((value) => value === value.toLowerCase());
const resultSchema = z.object({ rowsAffected: z.number().int() });
const headerInsertSchema = resultSchema.extend({ lastInsertId: depotId });
const transactionMode = z.tuple([z.object({ sql_mode: z.string() })]);
const pointBatchSize = 100;

function selectSource(scenarioId: string) {
  // LEFT JOIN from the requested key returns a sentinel for absence, while
  // the independent window count detects any truncated Order response.
  // Operational rows have no proven generator version. Preserve that unknown
  // as null even when a seed and distribution pattern are available.
  return sql`
    SELECT
      CASE WHEN ${scenarios.id} IS NULL THEN NULL ELSE JSON_OBJECT(
        'id', CAST(${scenarios.id} AS CHAR),
        'depotId', CAST(${scenarios.depotId} AS CHAR),
        'name', ${scenarios.name},
        'distributionPattern', ${scenarios.distributionPattern},
        'customerCount', ${scenarios.customerCount},
        'radiusMinM', ${scenarios.radiusMinM},
        'radiusMaxM', ${scenarios.radiusMaxM},
        'generationSeed', CAST(${scenarios.generationSeed} AS CHAR),
        'generatorVersion', NULL,
        'status', ${scenarios.status},
        'updatedAt', CAST(${scenarios.updatedAt} AS CHAR)
      ) END AS source_scenario,
      CASE WHEN ${depots.id} IS NULL THEN NULL ELSE JSON_OBJECT(
        'id', CAST(${depots.id} AS CHAR),
        'name', ${depots.name},
        'address', ${depots.address},
        'latitude', ${depots.latitude},
        'longitude', ${depots.longitude},
        'isActive', ${depots.isActive} <> 0,
        'updatedAt', CAST(${depots.updatedAt} AS CHAR)
      ) END AS source_depot,
      CASE WHEN ${orders.id} IS NULL THEN NULL ELSE JSON_OBJECT(
        'id', CAST(${orders.id} AS CHAR),
        'scenarioId', CAST(${orders.scenarioId} AS CHAR),
        'orderCode', ${orders.orderCode},
        'customerName', ${orders.customerName},
        'address', ${orders.address},
        'latitude', ${orders.latitude},
        'longitude', ${orders.longitude},
        'source', ${orders.source},
        'updatedAt', CAST(${orders.updatedAt} AS CHAR)
      ) END AS source_order,
      CAST(COUNT(${orders.id}) OVER () AS CHAR) AS actual_count,
      CAST(${dummyOrderOperations.activeScenarioId} AS CHAR) AS active_scenario_id
    FROM (SELECT CAST(${BigInt(scenarioId)} AS SIGNED) AS id) requested
    LEFT JOIN ${scenarios} ON ${scenarios.id} = requested.id
    LEFT JOIN ${depots} ON ${depots.id} = ${scenarios.depotId}
    LEFT JOIN ${orders} ON ${orders.scenarioId} = ${scenarios.id}
    LEFT JOIN ${dummyOrderOperations} ON ${dummyOrderOperations.activeScenarioId} = ${scenarios.id}
    ORDER BY ${orders.id}
  `;
}

function selectStored(key: BenchmarkCaseKey) {
  const byRequest = "requestId" in key;
  const requested = byRequest
    ? sql`${requestKey.parse(key.requestId)}`
    : sql`CAST(${BigInt(depotId.parse(key.id))} AS SIGNED)`;
  const column = byRequest ? cases.requestId : cases.id;
  return sql`
    SELECT
      CASE WHEN ${cases.id} IS NULL THEN NULL ELSE JSON_OBJECT(
        'id', CAST(${cases.id} AS CHAR),
        'scenarioId', CAST(${cases.scenarioId} AS CHAR),
        'requestId', ${cases.requestId},
        'scenario', ${cases.scenarioSnapshot},
        'configuredCustomerCount', ${cases.configuredCustomerCount},
        'actualOrderCount', ${cases.actualOrderCount},
        'pointCount', ${cases.pointCount},
        'inputVersion', ${cases.inputVersion},
        'inputHash', ${cases.inputHash},
        'frozenAt', CAST(${cases.frozenAt} AS CHAR),
        'gitCommitSha', ${cases.gitCommitSha}
      ) END AS case_header,
      CASE WHEN ${points.id} IS NULL THEN NULL ELSE JSON_OBJECT(
        'caseId', CAST(${points.caseId} AS CHAR),
        'nodeIndex', ${points.nodeIndex},
        'kind', ${points.kind},
        'sourceId', CAST(${points.sourceId} AS CHAR),
        'name', ${points.name},
        'address', ${points.address},
        'latitude', ${points.latitude},
        'longitude', ${points.longitude},
        'orderCode', ${points.orderCode},
        'orderSource', ${points.orderSource},
        'depotActive', ${points.depotActive}
      ) END AS case_point
    FROM (SELECT ${requested} AS id) requested
    LEFT JOIN ${cases} ON ${column} = requested.id
    LEFT JOIN ${points} ON ${points.caseId} = ${cases.id}
    ORDER BY ${points.nodeIndex}
  `;
}

function selectHistory({ after, limit }: BenchmarkHistoryQuery) {
  const cursor =
    after === undefined ? sql`` : sql`WHERE ${cases.id} < ${BigInt(after)}`;
  return sql`
    SELECT CASE WHEN page.id IS NULL THEN NULL ELSE JSON_OBJECT(
      'id', CAST(page.id AS CHAR),
      'scenarioId', CAST(page.scenario_id AS CHAR),
      'scenarioName', JSON_UNQUOTE(JSON_EXTRACT(page.scenario_snapshot, '$.name')),
      'actualOrderCount', page.actual_order_count,
      'pointCount', page.point_count,
      'inputHash', page.input_hash,
      'frozenAt', CAST(page.frozen_at AS CHAR)
    ) END AS summary
    FROM (SELECT 1) anchor
    LEFT JOIN (
      SELECT id, scenario_id, scenario_snapshot, actual_order_count, point_count, input_hash, frozen_at
      FROM ${cases}
      ${cursor}
      ORDER BY id DESC
      LIMIT ${limit + 1}
    ) page ON 1 = 1
    ORDER BY page.id DESC
  `;
}

async function selectRows(session: Session, statement: SQL): Promise<unknown> {
  const query = dialect.sqlToQuery(statement);
  return session.execute(query.sql, query.params);
}

async function readSource(session: Session, scenarioId: string) {
  const result = await selectRows(session, selectSource(scenarioId));
  return decodeBenchmarkSource(result, scenarioId);
}
async function readStored(session: Session, key: BenchmarkCaseKey) {
  const result = await selectRows(session, selectStored(key));
  return decodeStoredBenchmarkCase(result, key);
}

class HeaderInsertError extends Error {
  constructor(cause: unknown) {
    super("Benchmark Case header insert failed", { cause });
  }
}

async function insertCase(
  db: Database,
  tx: Session,
  requestId: string,
  snapshot: BenchmarkInputSnapshot,
) {
  const frozenAt = snapshot.provenance.frozenAt;
  if (!frozenAt) throw new BenchmarkCaseError("SOURCE_INVALID");
  const header = db
    .insert(cases)
    .values({
      requestId,
      scenarioId: BigInt(snapshot.scenario.id),
      scenarioSnapshot: snapshot.scenario,
      configuredCustomerCount: snapshot.configuredCustomerCount,
      actualOrderCount: snapshot.actualOrderCount,
      pointCount: snapshot.pointCount,
      inputVersion: snapshot.version,
      inputHash: snapshot.inputHash,
      frozenAt: frozenAt.replace("T", " ").replace(/Z$/u, ""),
      gitCommitSha: snapshot.provenance.gitCommitSha ?? null,
    })
    .toSQL();

  const inserted = await tx
    .execute(header.sql, header.params, { fullResult: true })
    .catch((error: unknown) => {
      throw new HeaderInsertError(error);
    });
  const { rowsAffected, lastInsertId } = headerInsertSchema.parse(inserted);
  if (rowsAffected !== 1)
    throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");

  const caseId = BigInt(lastInsertId);
  for (let start = 0; start < snapshot.nodes.length; start += pointBatchSize) {
    const rows = snapshot.nodes
      .slice(start, start + pointBatchSize)
      .map((node) => ({
        caseId,
        nodeIndex: node.index,
        kind: node.kind,
        sourceId: BigInt(node.id),
        name: node.kind === "depot" ? node.name : node.customerName,
        address: node.address,
        latitude: node.latitude,
        longitude: node.longitude,
        orderCode: node.kind === "order" ? node.orderCode : null,
        orderSource: node.kind === "order" ? node.source : null,
        depotActive: node.kind === "depot" ? node.isActive : null,
      }));
    const insert = db.insert(points).values(rows).toSQL();
    const result = resultSchema.parse(
      await tx.execute(insert.sql, insert.params, { fullResult: true }),
    );
    if (result.rowsAffected !== rows.length) {
      throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");
    }
  }

  const saved = await readStored(tx, { requestId });
  if (
    !saved ||
    !isDeepStrictEqual(saved, {
      ...snapshot,
      provenance: { ...snapshot.provenance, benchmarkCaseId: lastInsertId },
    })
  )
    throw new BenchmarkCaseError("CORRUPT_BENCHMARK_CASE");
  return saved;
}

function defaultDatabase() {
  assertDepotEnvironment();
  return getDatabase();
}

function publicError(error: unknown) {
  if (error instanceof BenchmarkCaseError) return error;
  return new BenchmarkCaseError("UNAVAILABLE");
}

export function createBenchmarkCaseRepository(
  acquire: () => Database = defaultDatabase,
): BenchmarkCaseRepository {
  async function findStored(key: BenchmarkCaseKey) {
    try {
      return await readStored(acquire().$client, key);
    } catch (error) {
      throw publicError(error);
    }
  }
  const findByRequestId = (requestId: string) => findStored({ requestId });

  return {
    async readSource(scenarioId) {
      try {
        return await readSource(acquire().$client, scenarioId);
      } catch (error) {
        throw publicError(error);
      }
    },
    findByRequestId,
    findById: (id) => findStored({ id }),
    async list(query) {
      try {
        return decodeBenchmarkHistory(
          await selectRows(acquire().$client, selectHistory(query)),
          query,
        );
      } catch (error) {
        throw publicError(error);
      }
    },
    async transact(rawRequestId, work) {
      const requestId = requestKey.parse(rawRequestId);
      let db: Database;
      let tx: Awaited<ReturnType<Database["$client"]["begin"]>>;
      try {
        db = acquire();
        tx = await db.$client.begin({ isolation: "REPEATABLE READ" });
      } catch (error) {
        throw publicError(error);
      }

      let result;
      try {
        const [mode] = transactionMode.parse(
          await tx.execute("SELECT @@SESSION.sql_mode AS sql_mode"),
        );
        // The native HTTP driver uses backslash escaping for bound strings.
        if (
          mode.sql_mode
            .split(",")
            .some(
              (value) => value.trim().toUpperCase() === "NO_BACKSLASH_ESCAPES",
            )
        ) {
          throw new BenchmarkCaseError("UNAVAILABLE");
        }
        result = await work({
          readSource: (id) => readSource(tx, id),
          insert: (key, snapshot) => {
            if (key !== requestId)
              throw new BenchmarkCaseError(
                "FREEZE_REQUEST_CONFLICT",
                requestId,
              );
            return insertCase(db, tx, requestId, snapshot);
          },
        });
      } catch (error) {
        const cause = error instanceof HeaderInsertError ? error.cause : error;
        // The pinned HTTP driver clears its session on a successful response
        // without TiDB-Session. A sessionless ROLLBACK could acknowledge an
        // unrelated transaction, so the original rollback remains unverified.
        if (
          cause instanceof DatabaseError &&
          cause.status === 500 &&
          cause.details === null &&
          cause.message === "empty session, please try again"
        ) {
          throw new BenchmarkCaseError("ROLLBACK_UNKNOWN", requestId);
        }
        try {
          await tx.rollback();
        } catch {
          throw new BenchmarkCaseError("ROLLBACK_UNKNOWN", requestId);
        }
        // A concurrent insert can win after the service's precheck. Only a
        // committed, validated row from an independent read proves conflict.
        if (error instanceof HeaderInsertError) {
          const committed = await findByRequestId(requestId).catch(() => null);
          if (committed)
            throw new BenchmarkCaseError("FREEZE_REQUEST_CONFLICT", requestId);
        }
        throw publicError(cause);
      }

      // Drizzle's HTTP transaction wrapper calls rollback even when COMMIT
      // itself throws. An unknown acknowledgement needs read-only recovery.
      try {
        await tx.commit();
      } catch {
        throw new BenchmarkCaseError("COMMIT_UNKNOWN", requestId);
      }
      return result;
    },
  };
}
