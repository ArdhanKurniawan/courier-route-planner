import "server-only";
import { z } from "zod";
import type { OrderUpdate } from "@/db/repositories/order-repository";
import type { DummyConnection } from "@/db/dummy-order-connection";
import { readActiveOperation } from "@/db/dummy-operation-ledger";
import { lockDummyScenario, signedIdParameter } from "@/db/dummy-order-queries";
import {
  DummyTransactionUnknown,
  mysqlErrorNumber,
  withDummyTransaction,
  type OpenDummyConnection,
} from "@/db/dummy-transaction";
import { HttpError } from "@/lib/http/request-security";
import { OrderError } from "@/lib/validation/order";

const scope = `scenario_id = ${signedIdParameter} AND id = ${signedIdParameter} AND source = 'dummy'`;

async function mutate(
  scenarioId: bigint,
  action: (connection: DummyConnection) => Promise<unknown>,
  open?: OpenDummyConnection,
) {
  try {
    return await withDummyTransaction(async (connection) => {
      await lockDummyScenario(connection, scenarioId.toString());
      if (await readActiveOperation(connection, scenarioId.toString(), true))
        throw new OrderError("DUMMY_OPERATION_PENDING");
      return z
        .object({ affectedRows: z.int().min(0).max(1) })
        .parse(await action(connection)).affectedRows;
    }, open);
  } catch (error) {
    if (error instanceof OrderError) throw error;
    if (error instanceof DummyTransactionUnknown)
      throw new OrderError("MUTATION_OUTCOME_UNKNOWN");
    if (error instanceof HttpError && error.status === 404)
      throw new OrderError("NOT_FOUND");
    const errno = mysqlErrorNumber(error);
    if (errno === 1062) throw new OrderError("ORDER_CODE_CONFLICT");
    if (errno === 3572 || errno === 1213 || errno === 1205)
      throw new OrderError("DUMMY_OPERATION_PENDING");
    throw new OrderError("UNAVAILABLE");
  }
}

export function guardedDummyOrderMutations(open?: OpenDummyConnection) {
  return {
    update: (scenarioId: bigint, id: bigint, input: OrderUpdate) =>
      mutate(
        scenarioId,
        (connection) =>
          connection.query(
            `UPDATE orders SET order_code = ?, customer_name = ?, address = ?, latitude = ?, longitude = ?, updated_at = ?
        WHERE ${scope}`,
            [
              input.orderCode,
              input.customerName,
              input.address,
              input.latitude,
              input.longitude,
              input.updatedAt.toISOString().replace("T", " ").slice(0, -1),
              scenarioId.toString(),
              id.toString(),
            ],
          ),
        open,
      ),
    remove: (scenarioId: bigint, id: bigint) =>
      mutate(
        scenarioId,
        (connection) =>
          connection.query(`DELETE FROM orders WHERE ${scope}`, [
            scenarioId.toString(),
            id.toString(),
          ]),
        open,
      ),
  };
}
