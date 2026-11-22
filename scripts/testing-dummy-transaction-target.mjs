import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { isAbsolute } from "node:path";
import { parseDatabaseConfig } from "../src/config/db-env.ts";
import { check } from "./testing-dummy-transaction-acceptance.mjs";

const database = "courier_route_planner_testing";
// Includes the sixth observer read and the complete fixture cleanup readback.
export const testingTransactionCommandLimit = 101;
const pinPattern = /^[a-f0-9]{64}$/u;
const automatedEnvironments = [
  "CI", "GITHUB_ACTIONS", "VITEST", "NODE_TEST_CONTEXT",
  "VERCEL", "VERCEL_ENV", "VERCEL_TARGET_ENV",
];

/**
 * @param {string[]} args
 * @param {Record<string, string | undefined>} environment
 * @param {string[]} execArgv
 */
export function requireTestingTransactionRun(args, environment, execArgv) {
  const [mode, , receiptPath, approval] = args;
  check(
    mode === "--run" && args.length === 4 &&
      approval === "APPROVED-TESTING-TRANSACTIONS" && isAbsolute(receiptPath),
    "EXPLICIT_APPROVAL_REQUIRED",
  );
  check(
    automatedEnvironments.every((name) => environment[name] === undefined) &&
      (environment.APP_ENV === undefined || environment.APP_ENV === "testing") &&
      environment.NODE_ENV !== "test" &&
      environment.npm_lifecycle_event === undefined &&
      environment.NODE_TLS_REJECT_UNAUTHORIZED !== "0" &&
      !environment.NODE_OPTIONS && !environment.SSLKEYLOGFILE &&
      !execArgv.some((arg) => /^(?:-r|--(?:import|require|(?:experimental-)?loader|tls-keylog))(?:=|$)/u.test(arg)),
    "LOCAL_TESTING_OPERATOR_REQUIRED",
  );
  const pin = environment.TESTING_DUMMY_DB_TARGET_SHA256 ?? "";
  check(pinPattern.test(pin), "TESTING_TARGET_PIN_REQUIRED");
  return { receiptPath, pin };
}

/**
 * The operator supplies SHA-256(JSON.stringify([host, port, database, user]))
 * from the independently confirmed Testing target. The password is excluded.
 * @param {{APP_ENV?: string, DATABASE_URL?: string}} environment
 * @param {string} expectedPin
 */
export function parseTestingTransactionTarget(environment, expectedPin) {
  check(environment.APP_ENV === "testing", "TESTING_ENV_REQUIRED");
  check(pinPattern.test(expectedPin), "TESTING_TARGET_PIN_REQUIRED");
  const url = new URL(parseDatabaseConfig(environment.DATABASE_URL).url);
  const host = url.hostname;
  const user = decodeURIComponent(url.username);
  const port = 4000;
  check(
    /^[A-Za-z0-9]+\.testing_app$/u.test(user) &&
      url.port === String(port) && isIP(host) === 0 &&
      /^(?:[a-z0-9-]+\.)+tidbcloud\.com$/u.test(host) &&
      decodeURIComponent(url.pathname.slice(1)) === database,
    "TESTING_IDENTITY_REJECTED",
  );
  const observedPin = createHash("sha256")
    .update(JSON.stringify([host, port, database, user])).digest("hex");
  check(observedPin === expectedPin, "TESTING_IDENTITY_REJECTED");
  return { host, port, database, user, password: decodeURIComponent(url.password) };
}
