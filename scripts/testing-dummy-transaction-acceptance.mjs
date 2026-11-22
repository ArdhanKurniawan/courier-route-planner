import { setTimeout as delay } from "node:timers/promises";
import { isDeepStrictEqual } from "node:util";

const begin = "BEGIN PESSIMISTIC";
// mysql2's text protocol quotes strings. Compare and insert fixture IDs as BIGINT.
const signedId = "CAST(? AS SIGNED)";
const columns = [
  "CAST(id AS CHAR) AS id",
  "CAST(scenario_id AS CHAR) AS scenarioId",
  "order_code AS code",
  "source",
  "customer_name AS name",
  "address",
  "latitude",
  "longitude",
  "created_at AS createdAt",
  "updated_at AS updatedAt",
].join(", ");
const time = "2026-01-01 00:00:00.000";

export class Stopped extends Error {}
/** @param {unknown} condition @param {string} category */
export function check(condition, category) {
  if (!condition) throw new Stopped(category);
}

/** @param {string} runId */
export function fixturePlan(runId) {
  check(
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(
      runId,
    ),
    "INVALID_RUN_ID",
  );
  const tag = `phase2b-tx-${runId}`;
  const orders = [
    "OLD-1",
    "OLD-2",
    "MANUAL",
    "SENTINEL",
    "B-1",
    "B-2",
    "C-1",
    "C-2",
    "D-1",
    "D-2",
  ].map((label) => ({
    label,
    code: `${tag}-${label}`.toUpperCase(),
    source: label === "MANUAL" ? "manual" : "dummy",
  }));
  return {
    runId,
    depot: { name: `${tag}-depot` },
    scenarios: [{ name: `${tag}-subject` }, { name: `${tag}-sentinel` }],
    orders,
  };
}

async function preflight(connection, plan) {
  for (const [table, column, tags] of [
    ["depots", "name", [plan.depot.name]],
    ["scenarios", "name", plan.scenarios.map(({ name }) => name)],
    ["orders", "order_code", plan.orders.map(({ code }) => code)],
  ]) {
    // The identifier pairs above are fixed. Tags are always bound parameters.
    const rows = await connection.query(
      `SELECT id FROM ${table} WHERE ${column} IN (${tags.map(() => "?").join(", ")}) LIMIT 1`,
      tags,
    );
    check(Array.isArray(rows) && rows.length === 0, "FIXTURE_COLLISION");
  }
}

async function requireInPlaceUniqueness(connection) {
  const rows = await connection.query(
    "SELECT @@SESSION.tidb_constraint_check_in_place_pessimistic AS enabled",
  );
  check(
    Array.isArray(rows) &&
      rows.length === 1 &&
      [1, "1"].includes(rows[0]?.enabled),
    "INSERT_CONFLICT_CHECK_DEFERRED",
  );
}

async function insert(connection, sql, params) {
  const result = await connection.query(sql, params);
  check(result?.affectedRows === 1, "INSERT_COUNT_MISMATCH");
}

async function insertedId(connection, sql, params) {
  const rows = await connection.query(sql, params);
  check(
    Array.isArray(rows) &&
      rows.length === 1 &&
      typeof rows[0]?.id === "string" &&
      /^[1-9][0-9]{0,18}$/u.test(rows[0].id) &&
      BigInt(rows[0].id) <= 9223372036854775807n,
    "INSERT_IDENTITY_UNPROVEN",
  );
  return rows[0].id;
}

async function insertOrder(connection, scenarioId, order) {
  await insert(
    connection,
    `INSERT INTO orders (scenario_id, order_code, customer_name, address, latitude, longitude, source, created_at, updated_at) VALUES (${signedId}, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    [scenarioId, order.code, order.code, -6.2, 106.8, order.source, time, time],
  );
  const id = await insertedId(
    connection,
    `SELECT CAST(id AS CHAR) AS id FROM orders WHERE id = LAST_INSERT_ID() AND scenario_id = ${signedId} AND order_code = ? AND source = ? FOR UPDATE`,
    [scenarioId, order.code, order.source],
  );
  return { ...order, id, scenarioId };
}

async function buildFixtures(connection, plan, report) {
  await connection.query(begin);
  await insert(
    connection,
    "INSERT INTO depots (name, latitude, longitude, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
    [plan.depot.name, -6.2, 106.8, time, time],
  );
  const depot = {
    ...plan.depot,
    id: await insertedId(
      connection,
      "SELECT CAST(id AS CHAR) AS id FROM depots WHERE id = LAST_INSERT_ID() AND name = ? FOR UPDATE",
      [plan.depot.name],
    ),
  };
  const scenarios = [];
  for (const scenario of plan.scenarios) {
    await insert(
      connection,
      `INSERT INTO scenarios (depot_id, name, distribution_pattern, customer_count, status, created_at, updated_at) VALUES (${signedId}, ?, 'random', 2, 'draft', ?, ?)`,
      [depot.id, scenario.name, time, time],
    );
    const id = await insertedId(
      connection,
      `SELECT CAST(id AS CHAR) AS id FROM scenarios WHERE id = LAST_INSERT_ID() AND depot_id = ${signedId} AND name = ? FOR UPDATE`,
      [depot.id, scenario.name],
    );
    check(id !== "90001", "RESERVED_SCENARIO_ID");
    scenarios.push({ ...scenario, id, depotId: depot.id });
  }
  const orders = [];
  for (const order of plan.orders.slice(0, 4))
    orders.push(
      await insertOrder(
        connection,
        scenarios[order.label === "SENTINEL" ? 1 : 0].id,
        order,
      ),
    );
  report({ stage: "setup-before-commit", depot, scenarios, orders });
  await connection.commit();
  return { depot, scenarios, orders };
}

async function snapshot(connection, scenarios) {
  // Results for the two fixture Scenarios come from the same SQL snapshot.
  const rows = await connection.query(
    `SELECT ${columns} FROM orders WHERE scenario_id IN (${signedId}, ${signedId}) ORDER BY id LIMIT 5`,
    scenarios.map(({ id }) => id),
  );
  check(Array.isArray(rows) && rows.length <= 4, "UNEXPECTED_FIXTURE_ROWS");
  return rows;
}

async function lockOrders(connection, scenario) {
  const rows = await connection.query(
    `SELECT ${columns} FROM orders WHERE scenario_id = ${signedId} ORDER BY id LIMIT 5 FOR UPDATE`,
    [scenario.id],
  );
  check(Array.isArray(rows) && rows.length <= 4, "UNEXPECTED_FIXTURE_ROWS");
  return rows;
}

function expectedRows(rows, orders) {
  return (
    rows.length === orders.length &&
    orders.every((order) =>
      rows.some(
        (row) =>
          row.id === order.id &&
          row.scenarioId === order.scenarioId &&
          row.code === order.code &&
          row.source === order.source &&
          row.name === order.code &&
          row.address === null &&
          row.latitude === -6.2 &&
          row.longitude === 106.8 &&
          [time, time.slice(0, -4)].includes(row.createdAt) &&
          [time, time.slice(0, -4)].includes(row.updatedAt),
      ),
    )
  );
}

async function lockScenario(connection, scenario, nowait = false) {
  const rows = await connection.query(
    `SELECT CAST(id AS CHAR) AS id FROM scenarios WHERE id = ${signedId} AND depot_id = ${signedId} AND name = ? FOR UPDATE${nowait ? " NOWAIT" : ""}`,
    [scenario.id, scenario.depotId, scenario.name],
  );
  check(
    rows.length === 1 && rows[0]?.id === scenario.id,
    "SCENARIO_OWNERSHIP_MISMATCH",
  );
}

async function removeDummy(connection, scenarios, expected) {
  const scenario = scenarios[0];
  await lockScenario(connection, scenario);
  const current = await lockOrders(connection, scenario);
  check(
    isDeepStrictEqual(
      current,
      expected.filter(({ scenarioId }) => scenarioId === scenario.id),
    ),
    "STALE_FIXTURE_STATE",
  );
  const dummyRows = current.filter(
    ({ scenarioId, source }) =>
      scenarioId === scenario.id && source === "dummy",
  );
  check(dummyRows.length === 2, "UNEXPECTED_DUMMY_COUNT");
  const write = await connection.query(
    `DELETE FROM orders WHERE scenario_id = ${signedId} AND source = 'dummy' AND id IN (${signedId}, ${signedId})`,
    [scenario.id, ...dummyRows.map(({ id }) => id)],
  );
  check(write.affectedRows === 2, "DELETE_COUNT_MISMATCH");
}

async function expectSqlRejection(operation, errno, category) {
  try {
    await operation();
  } catch (error) {
    if (
      error?.errno === errno &&
      error?.fatal !== true &&
      typeof error?.sqlState === "string"
    )
      return;
    throw error;
  }
  throw new Stopped(category);
}

/** @param {{pause: () => void, commit: () => Promise<unknown>, close: (force: boolean) => Promise<unknown>}} writer @param {() => Promise<boolean>} observe */
export async function resolveCommitWithoutReply(writer, observe) {
  writer.pause();
  let settled = false;
  let proved = false;
  try {
    void writer.commit().then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    proved = await observe();
  } catch {
    // Any incomplete observation leaves the commit unknown.
  } finally {
    const observedBeforeClose = proved && !settled;
    await writer.close(true).catch(() => {
      proved = false;
    });
    proved = proved && observedBeforeClose;
  }
  check(proved, "COMMIT_UNKNOWN");
}

async function cleanup(connection, fixture, orders, expected) {
  await connection.query(begin);
  await lockScenario(connection, fixture.scenarios[0]);
  await lockScenario(connection, fixture.scenarios[1]);
  const depot = await connection.query(
    `SELECT CAST(id AS CHAR) AS id FROM depots WHERE id = ${signedId} AND name = ? FOR UPDATE`,
    [fixture.depot.id, fixture.depot.name],
  );
  check(
    depot.length === 1 && depot[0]?.id === fixture.depot.id,
    "CLEANUP_DEPOT_OWNERSHIP_MISMATCH",
  );
  const children = await connection.query(
    `SELECT CAST(id AS CHAR) AS id, name FROM scenarios WHERE depot_id = ${signedId} ORDER BY id LIMIT 3 FOR UPDATE`,
    [fixture.depot.id],
  );
  check(
    children.length === 2 &&
      fixture.scenarios.every(({ id, name }) =>
        children.some((row) => row.id === id && row.name === name),
      ),
    "UNEXPECTED_DEPOT_REFERENCES",
  );
  for (const scenario of fixture.scenarios)
    check(
      isDeepStrictEqual(
        await lockOrders(connection, scenario),
        expected.filter(({ scenarioId }) => scenarioId === scenario.id),
      ),
      "CLEANUP_OWNERSHIP_MISMATCH",
    );
  for (const order of orders) {
    const removed = await connection.query(
      `DELETE FROM orders WHERE id = ${signedId} AND scenario_id = ${signedId} AND order_code = ? AND source = ?`,
      [order.id, order.scenarioId, order.code, order.source],
    );
    check(removed.affectedRows === 1, "CLEANUP_ORDER_UNVERIFIED");
  }
  for (const scenario of fixture.scenarios) {
    const removed = await connection.query(
      `DELETE FROM scenarios WHERE id = ${signedId} AND depot_id = ${signedId} AND name = ?`,
      [scenario.id, scenario.depotId, scenario.name],
    );
    check(removed.affectedRows === 1, "CLEANUP_SCENARIO_UNVERIFIED");
  }
  const removed = await connection.query(
    `DELETE FROM depots WHERE id = ${signedId} AND name = ?`,
    [fixture.depot.id, fixture.depot.name],
  );
  check(removed.affectedRows === 1, "CLEANUP_DEPOT_UNVERIFIED");
  await connection.commit();
}

/** @param {() => Promise<{query: (sql: string, params?: string[]) => Promise<unknown>, close: (force?: boolean) => Promise<unknown>}>} open @param {ReturnType<typeof fixturePlan>} plan @param {(event: object) => void} report */
export async function runAcceptance(open, plan, report) {
  const connections = [];
  async function acquire() {
    const connection = await open();
    connections.push(connection);
    return connection;
  }
  let complete = false;
  try {
    const observer = await acquire();
    await preflight(observer, plan);
    const rollbackWriter = await acquire();
    await requireInPlaceUniqueness(rollbackWriter);
    report({ stage: "fixture-intent", plan });
    const initialWriter = await acquire();
    const fixture = await buildFixtures(initialWriter, plan, report);
    await initialWriter.close();
    const initial = await snapshot(observer, fixture.scenarios);
    check(expectedRows(initial, fixture.orders), "SETUP_READBACK_MISMATCH");
    report({ stage: "baseline", orders: initial });

    const subject = fixture.scenarios[0];
    const manual = fixture.orders.find(({ label }) => label === "MANUAL");
    const sentinel = fixture.orders.find(({ label }) => label === "SENTINEL");
    await rollbackWriter.query(begin);
    await removeDummy(rollbackWriter, fixture.scenarios, initial);
    await expectSqlRejection(
      () =>
        insertOrder(rollbackWriter, subject.id, { ...manual, source: "dummy" }),
      1062,
      "EXPECTED_INSERT_CONFLICT_MISSING",
    );
    check(
      isDeepStrictEqual(await snapshot(observer, fixture.scenarios), initial),
      "UNCOMMITTED_DELETE_VISIBLE",
    );
    await rollbackWriter.rollback();
    await rollbackWriter.close();
    check(
      isDeepStrictEqual(await snapshot(observer, fixture.scenarios), initial),
      "ROLLBACK_NOT_VERIFIED",
    );
    report({
      stage: "rollback-after-insert-conflict",
      sqlErrno: 1062,
      count: initial.length,
      orders: initial,
    });

    const owned = [...fixture.orders];
    let expected = initial;
    let currentOrders = fixture.orders;
    for (const stage of ["B", "C", "D"]) {
      const writer = await acquire();
      await writer.query(begin);
      await removeDummy(writer, fixture.scenarios, expected);
      if (stage === "C") {
        const contender = await acquire();
        await contender.query(begin);
        await expectSqlRejection(
          () => lockScenario(contender, subject, true),
          3572,
          "EXPECTED_LOCK_CONFLICT_MISSING",
        );
        await contender.rollback();
        await contender.close();
        report({ stage: "concurrent-writer-rejected", sqlErrno: 3572 });
      }

      const replacement = [];
      for (const order of plan.orders.filter(({ label }) =>
        label.startsWith(`${stage}-`),
      ))
        replacement.push(await insertOrder(writer, subject.id, order));
      currentOrders = [manual, sentinel, ...replacement];
      owned.push(...replacement);
      report({ stage: `before-commit-${stage}`, orders: replacement });
      check(
        isDeepStrictEqual(
          await snapshot(observer, fixture.scenarios),
          expected,
        ),
        "PARTIAL_REPLACEMENT_VISIBLE",
      );
      if (stage === "D") {
        // An old snapshot is inconclusive. Retry reads only and require both
        // attempt-specific IDs while the writer has not observed a reply.
        await resolveCommitWithoutReply(writer, async () => {
          for (let read = 0; read < 6; read++) {
            const rows = await snapshot(observer, fixture.scenarios);
            if (expectedRows(rows, currentOrders)) return true;
            if (!isDeepStrictEqual(rows, expected)) return false;
            await delay(250);
          }
          return false;
        });
        report({
          stage: "commit-reconciled",
          response: "unobserved",
          count: currentOrders.length,
        });
      } else {
        await writer.commit();
        await writer.close();
      }
      const next = await snapshot(observer, fixture.scenarios);
      check(expectedRows(next, currentOrders), "REPLACEMENT_READBACK_MISMATCH");
      const sentinels = (rows) =>
        rows.filter(({ id }) => id === manual.id || id === sentinel.id);
      check(
        isDeepStrictEqual(sentinels(next), sentinels(initial)),
        "SENTINEL_CHANGED",
      );
      expected = next;
      report({
        stage:
          stage === "D"
            ? "commit-confirmed-by-observer"
            : `commit-acknowledged-${stage}`,
        count: next.length,
        orders: next,
      });
    }

    const janitor = await acquire();
    await cleanup(janitor, fixture, currentOrders, expected);
    await janitor.close();
    await preflight(observer, plan);
    check(
      (await snapshot(observer, fixture.scenarios)).length === 0,
      "CLEANUP_READBACK_MISMATCH",
    );
    for (const [table, ids] of [
      ["depots", [fixture.depot.id]],
      ["scenarios", fixture.scenarios.map(({ id }) => id)],
      ["orders", owned.map(({ id }) => id)],
    ]) {
      const rows = await observer.query(
        `SELECT id FROM ${table} WHERE id IN (${ids.map(() => signedId).join(", ")}) LIMIT 1`,
        ids,
      );
      check(
        Array.isArray(rows) && rows.length === 0,
        "CLEANUP_ID_STILL_PRESENT",
      );
    }
    await observer.close();
    report({ stage: "cleanup-verified", remaining: 0 });
    complete = true;
  } catch (error) {
    const errno = error?.errno;
    try {
      report({
        stage: "stopped",
        category:
          error instanceof Stopped
            ? error.message
            : "DATABASE_OR_LOCAL_FAILURE",
        ...(typeof errno === "number" && Number.isInteger(errno)
          ? { sqlErrno: errno }
          : {}),
      });
    } catch {
      // Preserve the first failure if the local receipt can no longer be written.
    }
    throw error;
  } finally {
    if (!complete) {
      // Stop all DB commands on an ambiguous failure. Preserve the receipt for
      // independent reconciliation. Terminating sockets sends no SQL.
      await Promise.allSettled(
        connections.map((connection) => connection.close(true)),
      );
    }
  }
}
