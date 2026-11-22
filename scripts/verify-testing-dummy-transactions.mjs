import { tracingChannel } from "node:diagnostics_channel";
import {
  closeSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { checkServerIdentity } from "node:tls";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { Stopped, check, fixturePlan, runAcceptance } from "./testing-dummy-transaction-acceptance.mjs";
import {
  parseTestingTransactionTarget,
  requireTestingTransactionRun,
  testingTransactionCommandLimit,
} from "./testing-dummy-transaction-target.mjs";

// Direct operator CLI. The default test suite imports only the offline modules.
const driverTracing = ["mysql2:connect", "mysql2:query"].map(tracingChannel);

async function bounded(operation, ms) {
  let timer;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Stopped("COMMAND_TIMEOUT")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function openConnection(config, count) {
  const { createConnection } = await import("mysql2");
  check(
    !driverTracing.some((channel) => channel.hasSubscribers),
    "INSTRUMENTATION_ENABLED",
  );
  const core = createConnection({
    ...config,
    ssl: { rejectUnauthorized: true, verifyIdentity: true },
    connectTimeout: 5000,
    debug: false,
    trace: false,
    dateStrings: true,
    timezone: "Z",
    flags: ["-LOCAL_FILES"],
    multipleStatements: false,
  });
  core.on("error", () => {});
  const client = core.promise();
  async function close(force = false) {
    const socket = core.stream;
    if (socket.closed) {
      check(force, "SOCKET_CLOSE_NOT_GRACEFUL");
      return;
    }
    let listener;
    const closed = new Promise((resolveClose) => {
      listener = resolveClose;
      socket.once("close", listener);
    });
    try {
      if (force) socket.destroy();
      else await bounded(() => client.end(), 1500);
      const hadError = await bounded(() => closed, 1500);
      check(force || !hadError, "SOCKET_CLOSE_NOT_GRACEFUL");
    } catch (error) {
      socket.destroy();
      await bounded(() => closed, 1500).catch(() => {});
      throw error;
    } finally {
      socket.off("close", listener);
    }
  }
  const command = async (operation) => {
    check(
      !driverTracing.some((channel) => channel.hasSubscribers),
      "INSTRUMENTATION_ENABLED",
    );
    count();
    return bounded(operation, 5000);
  };
  const query = async (sql, values = []) =>
    (await command(() => client.query(sql, values)))[0];
  try {
    await bounded(() => client.connect(), 5500);
    const socket = core.stream;
    check(
      socket.encrypted === true &&
        socket.authorized === true &&
        !checkServerIdentity(config.host, socket.getPeerCertificate(true)),
      "TLS_VERIFICATION_FAILED",
    );
    const rows = await query(
      "SELECT DATABASE() AS db, CURRENT_USER() AS principal, @@SESSION.autocommit AS autocommit, @@SESSION.foreign_key_checks AS foreignKeys",
    );
    check(
      rows.length === 1 &&
        rows[0]?.db === config.database &&
        rows[0]?.principal === `${config.user}@%` &&
        [1, "1"].includes(rows[0]?.autocommit) &&
        [1, "1"].includes(rows[0]?.foreignKeys),
      "SESSION_IDENTITY_UNVERIFIED",
    );
  } catch (error) {
    await close(true).catch(() => {});
    throw error;
  }
  return {
    query,
    close,
    pause: () => client.pause(),
    commit: () => command(() => client.commit()),
    rollback: () => command(() => client.rollback()),
  };
}

async function main(args) {
  const [mode, runId] = args;
  const plan = fixturePlan(runId);
  if (mode === "--plan" && args.length === 2) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  const { receiptPath, pin } = requireTestingTransactionRun(args, process.env, process.execArgv);
  const env = parseEnv(readFileSync(new URL("../.env.testing.local", import.meta.url), "utf8"));
  const config = parseTestingTransactionTarget(env, pin);
  const project = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
  const directory = realpathSync(dirname(receiptPath));
  const rel = relative(project, directory);
  check(
    rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel),
    "PRIVATE_RECEIPT_OUTSIDE_REPO_REQUIRED",
  );
  const receipt = join(directory, `phase2b-transactions-${runId}.jsonl`);
  check(
    resolve(receiptPath).toLowerCase() === resolve(receipt).toLowerCase(),
    "RECEIPT_PATH_MISMATCH",
  );
  const fd = openSync(receipt, "wx", 0o600);
  let commands = 0;
  const deadline = Date.now() + 120_000;
  try {
    const report = (event) => {
      writeFileSync(fd, JSON.stringify({ runId, ...event }) + "\n");
      fsyncSync(fd);
    };
    await runAcceptance(
      () => {
        check(Date.now() < deadline, "COMMAND_BUDGET_EXCEEDED");
        return openConnection(config, () => {
          check(
            ++commands <= testingTransactionCommandLimit && Date.now() < deadline,
            "COMMAND_BUDGET_EXCEEDED",
          );
        });
      },
      plan,
      report,
    );
    console.log(
      JSON.stringify({ status: "PASS", runId, commands, remaining: 0 }),
    );
  } finally {
    closeSync(fd);
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    const category =
      error instanceof Stopped ? error.message : "DATABASE_OR_LOCAL_FAILURE";
    const errno = error?.errno;
    console.log(
      JSON.stringify({
        status: "STOP",
        category,
        ...(typeof errno === "number" && Number.isInteger(errno)
          ? { sqlErrno: errno }
          : {}),
      }),
    );
    process.exitCode = 1;
  }
}
