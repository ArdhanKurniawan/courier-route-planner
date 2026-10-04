import { z } from "zod";

export class DatabaseConfigError extends Error {
  constructor() {
    super("Invalid database configuration.");
    this.name = "DatabaseConfigError";
  }
}

// Validate before URL parsing: URL parsers can silently discard controls or
// normalize ambiguous authority/path input. Query options are not supported.
function validHostname(hostname: string) {
  if (hostname.length > 253) return false;
  const labels = hostname.split(".");
  if (labels.length === 4 && labels.every((label) => /^\d+$/u.test(label))) {
    return labels.every(
      (label) => /^(?:0|[1-9]\d{0,2})$/u.test(label) && Number(label) <= 255,
    );
  }
  return labels.every((label) =>
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/u.test(label),
  );
}

const databaseUrl = z.string().refine((raw) => {
  if (
    /\s|[\u0000-\u001f\u007f]/u.test(raw) ||
    !/^mysql:\/\/[^/:?#@]+:[^/?#@]+@[A-Za-z0-9.-]+(?::\d+)?\/[A-Za-z0-9_%.-]+$/u.test(
      raw,
    )
  )
    return false;
  try {
    const parsed = new URL(raw);
    const username = decodeURIComponent(parsed.username);
    const password = decodeURIComponent(parsed.password);
    const database = decodeURIComponent(parsed.pathname.slice(1));
    const port = parsed.port === "" ? 3306 : Number(parsed.port);
    return (
      parsed.protocol === "mysql:" &&
      !!username &&
      !!password &&
      !/[\s\u0000-\u001f\u007f]/u.test(username + password) &&
      validHostname(parsed.hostname) &&
      /^[A-Za-z0-9_-]+$/u.test(database) &&
      Number.isInteger(port) &&
      port > 0 &&
      port <= 65535
    );
  } catch {
    return false;
  }
});

export function parseDatabaseConfig(raw: unknown): { readonly url: string } {
  const result = databaseUrl.safeParse(raw);
  if (!result.success) throw new DatabaseConfigError();
  return { url: result.data };
}

export function getDevMigrationCredentials(
  rawAppEnv: unknown,
  rawUrl: unknown,
) {
  if (rawAppEnv !== "development") throw new DatabaseConfigError();
  const parsed = new URL(parseDatabaseConfig(rawUrl).url);
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (database !== "courier_route_planner_dev") throw new DatabaseConfigError();
  return {
    host: parsed.hostname,
    port: parsed.port === "" ? 3306 : Number(parsed.port),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: { rejectUnauthorized: true },
  };
}

export function getTestingMigrationCredentials(
  rawAppEnv: unknown,
  rawUrl: unknown,
) {
  if (rawAppEnv !== "testing") throw new DatabaseConfigError();
  const parsed = new URL(parseDatabaseConfig(rawUrl).url);
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (database !== "courier_route_planner_testing")
    throw new DatabaseConfigError();
  return {
    host: parsed.hostname,
    port: parsed.port === "" ? 3306 : Number(parsed.port),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    ssl: { rejectUnauthorized: true },
  };
}
