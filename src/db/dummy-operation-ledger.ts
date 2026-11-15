import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { DummyConnection } from "@/db/dummy-order-connection";
import {
  signedIdParameter,
  type DummyOrderRow,
} from "@/db/dummy-order-queries";
import { HttpError } from "@/lib/http/request-security";
import { depotId } from "@/lib/validation/depot";
import {
  dummyOperationView,
  type DummyOperationView,
  type DummySaveInput,
} from "@/lib/validation/dummy-preview";

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const row = dummyOperationView.extend({
  operationVersion: depotId,
  activeScenarioId: depotId.nullable(),
  requestHash: hash,
  beforeHash: hash,
  afterHash: hash.nullable(),
});
type Operation = z.infer<typeof row>;
type UnknownStatus = "commit_unknown" | "rollback_unknown";
const columns = `operation_id AS operationId,
  CAST(operation_version AS CHAR) AS operationVersion,
  CAST(scenario_id AS CHAR) AS scenarioId, CAST(active_scenario_id AS CHAR) AS activeScenarioId,
  request_hash AS requestHash, before_hash AS beforeHash, after_hash AS afterHash,
  status, saved_count AS savedCount, replaced_count AS replacedCount`;
const select = `SELECT ${columns} FROM dummy_order_operations`;
const scope = `operation_id = ? AND scenario_id = ${signedIdParameter}`;
const activeScope = `${scope} AND active_scenario_id = ${signedIdParameter}`;

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function dummyDatasetHash(rows: DummyOrderRow[]) {
  return digest(
    rows.map((order) => [
      order.id,
      order.scenarioId,
      order.orderCode,
      order.customerName,
      order.address,
      order.latitude,
      order.longitude,
      order.createdAt,
      order.updatedAt,
      order.source,
    ]),
  );
}

export function dummyRequestHash(input: DummySaveInput) {
  const { count, radiusMinM, radiusMaxM, seed } = input.parameters;
  return digest([
    input.revision,
    count,
    radiusMinM,
    radiusMaxM,
    seed,
    input.replaceCount,
    input.confirmReplace === true,
  ]);
}

export function operationView(operation: Operation): DummyOperationView {
  const { operationId, scenarioId, status, savedCount, replacedCount } =
    operation;
  return { operationId, scenarioId, status, savedCount, replacedCount };
}

export function isActive(operation: Operation) {
  return operation.activeScenarioId !== null;
}

function parseOperation(
  raw: unknown,
  scenarioId: string,
  operationId?: string,
) {
  const [operation] = z.array(row).max(1).parse(raw);
  if (!operation) return null;
  const terminal =
    operation.status === "confirmed" || operation.status === "rolled_back";
  const committed =
    operation.status === "committed" || operation.status === "confirmed";
  if (
    operation.scenarioId !== scenarioId ||
    (operationId !== undefined && operation.operationId !== operationId) ||
    operation.activeScenarioId !== (terminal ? null : scenarioId) ||
    (committed
      ? !operation.afterHash || operation.savedCount < 1
      : operation.afterHash !== null || operation.savedCount !== 0)
  )
    throw new Error("Invalid dummy operation receipt.");
  return operation;
}

export async function readOperation(
  connection: DummyConnection,
  scenarioId: string,
  operationId: string,
  lock = false,
) {
  return parseOperation(
    await connection.query(
      `${select} WHERE ${scope}${lock ? " FOR UPDATE NOWAIT" : ""}`,
      [operationId, scenarioId],
    ),
    scenarioId,
    operationId,
  );
}

export async function readActiveOperation(
  connection: DummyConnection,
  scenarioId: string,
  lock = false,
) {
  const operation = parseOperation(
    await connection.query(
      `${select} WHERE active_scenario_id = ${signedIdParameter}${lock ? " FOR UPDATE NOWAIT" : ""}`,
      [scenarioId],
    ),
    scenarioId,
  );
  if (operation && !isActive(operation))
    throw new Error("Invalid active dummy operation.");
  return operation;
}

export function pendingOperation() {
  return new HttpError(
    409,
    "OPERATION_PENDING",
    "Resolve the existing dummy operation before changing its Orders.",
  );
}

export async function readOperationVersion(
  connection: DummyConnection,
  scenarioId: string,
) {
  const [latest] = z
    .array(z.object({ operationVersion: depotId }))
    .max(1)
    .parse(
      await connection.query(
        `SELECT CAST(operation_version AS CHAR) AS operationVersion FROM dummy_order_operations
        WHERE scenario_id = ${signedIdParameter} ORDER BY operation_version DESC LIMIT 1 FOR UPDATE NOWAIT`,
        [scenarioId],
      ),
    );
  return latest?.operationVersion ?? "0";
}

export function requireAffected(result: unknown, count: number) {
  if (
    z.object({ affectedRows: z.int().nonnegative() }).parse(result)
      .affectedRows !== count
  )
    throw new Error("Unexpected number of affected rows.");
}

export async function reserveOperation(
  connection: DummyConnection,
  scenarioId: string,
  input: DummySaveInput,
  beforeHash: string,
  operationVersion: string,
) {
  requireAffected(
    await connection.query(
      `INSERT INTO dummy_order_operations
      (operation_id, scenario_id, active_scenario_id, request_hash, before_hash, status, saved_count, replaced_count, operation_version)
      VALUES (?, ${signedIdParameter}, ${signedIdParameter}, ?, ?, 'pending', 0, ?, ${signedIdParameter})`,
      [
        input.operationId,
        scenarioId,
        scenarioId,
        dummyRequestHash(input),
        beforeHash,
        input.replaceCount,
        operationVersion,
      ],
    ),
    1,
  );
}

export async function recordCommittedOperation(
  connection: DummyConnection,
  scenarioId: string,
  operationId: string,
  rows: DummyOrderRow[],
) {
  requireAffected(
    await connection.query(
      `UPDATE dummy_order_operations SET status = 'committed', after_hash = ?, saved_count = ?
      WHERE ${activeScope} AND status = 'pending'`,
      [
        dummyDatasetHash(rows),
        rows.length,
        operationId,
        scenarioId,
        scenarioId,
      ],
    ),
    1,
  );
}

export function proveDummyOperation(
  operation: Pick<Operation, "status" | "beforeHash" | "afterHash">,
  observedHash: string,
) {
  if (operation.status === "committed")
    return operation.afterHash === observedHash ? "confirmed" : null;
  if (operation.status === "confirmed" || operation.status === "rolled_back")
    return operation.status;
  return operation.afterHash === null && operation.beforeHash === observedHash
    ? "rolled_back"
    : null;
}

export async function resolveOperation(
  connection: DummyConnection,
  operation: Operation,
  status: "confirmed" | "rolled_back",
) {
  const { operationId, scenarioId } = operation;
  requireAffected(
    await connection.query(
      `UPDATE dummy_order_operations SET status = ?, active_scenario_id = NULL
      WHERE ${activeScope} AND status = ?`,
      [status, operationId, scenarioId, scenarioId, operation.status],
    ),
    1,
  );
  return operationView({ ...operation, status });
}

export async function recordUnknownOperation(
  connection: DummyConnection,
  operation: Operation,
  status: UnknownStatus,
) {
  const { operationId, scenarioId } = operation;
  requireAffected(
    await connection.query(
      `UPDATE dummy_order_operations SET status = ? WHERE ${activeScope} AND status = 'pending'`,
      [status, operationId, scenarioId, scenarioId],
    ),
    1,
  );
}
