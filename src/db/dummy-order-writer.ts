import "server-only";
import { buildDummyPreview } from "@/application/generator/dummy-dataset";
import { CoordinateGenerationError } from "@/domain/generator/random-coordinate-generator";
import {
  openDummyConnection,
  openDummyRecoveryConnection,
  type DummyConnection,
} from "@/db/dummy-order-connection";
import {
  lockDepotSql,
  lockDummyScenario,
  parseDummyOrders,
  parseLockedDepot,
  readDummyOrdersSql,
  signedIdParameter,
  type DummyOrderRow,
} from "@/db/dummy-order-queries";
import {
  dummyDatasetHash,
  dummyRequestHash,
  isActive,
  operationView,
  pendingOperation,
  proveDummyOperation,
  readActiveOperation,
  readOperation,
  recordCommittedOperation,
  readOperationVersion,
  recordUnknownOperation,
  requireAffected,
  reserveOperation,
  resolveOperation,
} from "@/db/dummy-operation-ledger";
import {
  DummyTransactionUnknown,
  mysqlErrorNumber,
  withDummyConnection,
  withDummyTransaction,
  type OpenDummyConnection,
} from "@/db/dummy-transaction";
import { HttpError } from "@/lib/http/request-security";
import type {
  DummyOperationView,
  DummyPreview,
  DummySaveInput,
} from "@/lib/validation/dummy-preview";

function operationError(error: unknown) {
  if (error instanceof HttpError) return error;
  if (error instanceof CoordinateGenerationError)
    return new HttpError(422, error.code, error.message);
  const errno = mysqlErrorNumber(error);
  if (errno === 1062)
    return new HttpError(
      409,
      "ORDER_CODE_CONFLICT",
      "An existing Order uses a generated code.",
    );
  if (errno === 3572 || errno === 1213 || errno === 1205)
    return new HttpError(
      409,
      "BATCH_CONFLICT",
      "Scenario data is busy. Refresh its operation status.",
    );
  return new HttpError(503, "SERVICE_UNAVAILABLE", "Service unavailable.");
}

const lockDummyOrdersSql = readDummyOrdersSql + " FOR UPDATE NOWAIT";

async function lockedOrders(connection: DummyConnection, scenarioId: string) {
  return parseDummyOrders(
    await connection.query(lockDummyOrdersSql, [scenarioId]),
    scenarioId,
  );
}

async function currentPreview(
  connection: DummyConnection,
  scenario: Awaited<ReturnType<typeof lockDummyScenario>>,
  input: DummySaveInput,
  operationVersion: string,
) {
  const depot = parseLockedDepot(
    await connection.query(lockDepotSql, [scenario.depotId]),
    scenario.depotId,
  );
  const orders = await lockedOrders(connection, scenario.id);
  const preview = buildDummyPreview(
    { scenario, depot, orders },
    input.parameters,
    operationVersion,
  );
  if (
    preview.revision !== input.revision ||
    orders.length !== input.replaceCount
  )
    throw new HttpError(
      409,
      "STALE_PREVIEW",
      "Scenario data changed. Create a new preview.",
    );
  if (orders.length > 0 && input.confirmReplace !== true)
    throw new HttpError(
      409,
      "CONFIRM_REPLACE",
      "Confirm replacement of the existing dummy Orders.",
    );
  return { preview, orders };
}

async function replaceBatch(
  writer: DummyConnection,
  preview: DummyPreview,
  orders: DummyOrderRow[],
  now: Date,
) {
  if (orders.length > 0) {
    const placeholders = orders.map(() => signedIdParameter).join(", ");
    requireAffected(
      await writer.query(
        `DELETE FROM orders WHERE scenario_id = ${signedIdParameter} AND source = 'dummy' AND id IN (${placeholders})`,
        [preview.scenario.id, ...orders.map(({ id }) => id)],
      ),
      orders.length,
    );
  }
  return insertBatch(writer, preview, now);
}

async function insertBatch(
  writer: DummyConnection,
  preview: DummyPreview,
  now: Date,
) {
  const scenarioId = preview.scenario.id;
  const timestamp = now.toISOString().replace("T", " ").slice(0, -1);
  const intended = preview.points.map(({ latitude, longitude }, index) => ({
    orderCode: `DUMMY-${preview.revision.slice(0, 32).toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
    customerName: `Dummy ${index + 1}`,
    latitude,
    longitude,
  }));
  const placeholders = intended
    .map(() => `(${signedIdParameter}, ?, ?, NULL, ?, ?, 'dummy', ?, ?)`)
    .join(", ");
  requireAffected(
    await writer.query(
      `INSERT INTO orders (scenario_id, order_code, customer_name, address, latitude, longitude, source, created_at, updated_at) VALUES ${placeholders}`,
      intended.flatMap(({ orderCode, customerName, latitude, longitude }) => [
        scenarioId,
        orderCode,
        customerName,
        latitude,
        longitude,
        timestamp,
        timestamp,
      ]),
    ),
    intended.length,
  );
  const rows = parseDummyOrders(
    await writer.query(lockDummyOrdersSql, [scenarioId]),
    scenarioId,
  );
  if (
    rows.length !== intended.length ||
    intended.some(
      (order) =>
        !rows.some(
          (row) =>
            row.orderCode === order.orderCode &&
            row.customerName === order.customerName &&
            row.address === null &&
            Number(row.latitude) === order.latitude &&
            Number(row.longitude) === order.longitude &&
            row.createdAt === timestamp + "000" &&
            row.updatedAt === row.createdAt,
        ),
    )
  )
    throw new Error("Inserted dummy Orders could not be verified.");
  return rows;
}

export async function getActiveDummyOperation(
  scenarioId: string,
  open = openDummyRecoveryConnection,
) {
  try {
    return await withDummyConnection(open, async (connection) => {
      const active = await readActiveOperation(connection, scenarioId);
      return active ? operationView(active) : null;
    });
  } catch (error) {
    throw operationError(error);
  }
}

function missingOperation() {
  return new HttpError(
    404,
    "OPERATION_NOT_FOUND",
    "Dummy operation not found.",
  );
}

export async function reconcileDummyOperation(
  scenarioId: string,
  operationId: string,
  open = openDummyRecoveryConnection,
) {
  try {
    return await withDummyTransaction(async (connection) => {
      await lockDummyScenario(connection, scenarioId);
      const operation = await readOperation(
        connection,
        scenarioId,
        operationId,
        true,
      );
      if (!operation) throw missingOperation();
      if (!isActive(operation)) return operationView(operation);
      const observed = await lockedOrders(connection, scenarioId);
      const expectedCount =
        operation.status === "committed"
          ? operation.savedCount
          : operation.replacedCount;
      const proven =
        observed.length === expectedCount
          ? proveDummyOperation(operation, dummyDatasetHash(observed))
          : null;
      if (!proven)
        throw new HttpError(
          409,
          "RECONCILIATION_INCONCLUSIVE",
          "The dataset could not be verified. The Scenario remains blocked.",
        );
      // The same Scenario lock prevents a late writer from acting after a rollback is proven.
      return resolveOperation(connection, operation, proven);
    }, open);
  } catch (error) {
    throw operationError(error);
  }
}

async function handleUncertainBatch(
  scenarioId: string,
  operationId: string,
  error: DummyTransactionUnknown,
  open: OpenDummyConnection,
) {
  let proven: DummyOperationView | null;
  try {
    proven = await withDummyTransaction(async (observer) => {
      await lockDummyScenario(observer, scenarioId);
      const operation = await readOperation(
        observer,
        scenarioId,
        operationId,
        true,
      );
      if (!operation) throw missingOperation();
      if (!isActive(operation)) return operationView(operation);
      if (operation.status === "committed") {
        const observed = await lockedOrders(observer, scenarioId);
        return observed.length === operation.savedCount &&
          proveDummyOperation(operation, dummyDatasetHash(observed)) ===
            "confirmed"
          ? operationView(operation)
          : null;
      }
      if (operation.status === "pending")
        await recordUnknownOperation(
          observer,
          operation,
          error.phase === "commit" ? "commit_unknown" : "rollback_unknown",
        );
      return null;
    }, open);
  } catch {
    // A failed observation leaves the durable reservation in place.
    throw error;
  }
  if (!proven) throw error;
  return proven;
}

async function reserve(
  scenarioId: string,
  input: DummySaveInput,
  open: OpenDummyConnection,
) {
  return withDummyTransaction(async (connection) => {
    const scenario = await lockDummyScenario(connection, scenarioId);
    const previous = await readOperation(
      connection,
      scenarioId,
      input.operationId,
      true,
    );
    if (previous) {
      if (previous.requestHash !== dummyRequestHash(input))
        throw new HttpError(
          409,
          "OPERATION_ID_CONFLICT",
          "The operation ID belongs to a different request.",
        );
      return operationView(previous);
    }
    if (await readActiveOperation(connection, scenarioId, true))
      throw pendingOperation();
    const version = await readOperationVersion(connection, scenarioId);
    const { orders } = await currentPreview(
      connection,
      scenario,
      input,
      version,
    );
    await reserveOperation(
      connection,
      scenarioId,
      input,
      dummyDatasetHash(orders),
      (BigInt(version) + BigInt(1)).toString(),
    );
    return null;
  }, open);
}

async function applyReservedBatch(
  scenarioId: string,
  input: DummySaveInput,
  open: OpenDummyConnection,
  now: Date,
) {
  return withDummyTransaction(
    async (connection): Promise<DummyOperationView> => {
      const scenario = await lockDummyScenario(connection, scenarioId);
      const operation = await readOperation(
        connection,
        scenarioId,
        input.operationId,
        true,
      );
      if (!operation || operation.requestHash !== dummyRequestHash(input))
        throw missingOperation();
      // Reconciliation may have resolved a reservation before this invocation obtained the lock.
      if (operation.status !== "pending") return operationView(operation);
      const { preview, orders } = await currentPreview(
        connection,
        scenario,
        input,
        (BigInt(operation.operationVersion) - BigInt(1)).toString(),
      );
      if (operation.beforeHash !== dummyDatasetHash(orders))
        throw new HttpError(
          409,
          "STALE_PREVIEW",
          "The reserved dataset changed.",
        );
      const batch = await replaceBatch(connection, preview, orders, now);
      await recordCommittedOperation(
        connection,
        scenarioId,
        input.operationId,
        batch,
      );
      return operationView({
        ...operation,
        status: "committed",
        savedCount: batch.length,
      });
    },
    open,
  );
}

export async function saveDummyOrders(
  scenarioId: string,
  input: DummySaveInput,
  open = openDummyConnection,
  now = new Date(),
): Promise<DummyOperationView> {
  try {
    const previous = await reserve(scenarioId, input, open);
    if (previous) return previous;
  } catch (error) {
    if (mysqlErrorNumber(error) === 1062) throw pendingOperation();
    throw operationError(error);
  }

  try {
    return await applyReservedBatch(scenarioId, input, open, now);
  } catch (error) {
    if (error instanceof DummyTransactionUnknown)
      return handleUncertainBatch(scenarioId, input.operationId, error, open);
    // Even an acknowledged abort is released only after independent, locked readback.
    try {
      await reconcileDummyOperation(scenarioId, input.operationId, open);
    } catch {
      // The existing reservation remains authoritative if proof cannot be obtained.
    }
    throw operationError(error);
  }
}
