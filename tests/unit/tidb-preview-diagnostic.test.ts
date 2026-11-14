// @vitest-environment node
import { EventEmitter } from "node:events";
import { createHmac } from "node:crypto";
import { channel } from "node:diagnostics_channel";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/diagnostics/tidb-testing/route";
import { HttpError } from "@/lib/http/request-security";

const { requireAdmin, createConnection } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createConnection: vi.fn(),
}));
vi.mock("@/lib/security/admin", () => ({ requireAdmin }));
vi.mock("mysql2", () => ({ createConnection }));

const branch = "testing";
const origin = "https://preview.example.test";
const host = "testing-db.example.test";
const database = "courier_route_planner_testing";
const username = "fixture_application";
const principal = `${username}@%`;
const password = "synthetic-PRIVATE-password";
const url = `mysql://${username}:${password}@${host}:4000/${database}`;
const sha = "a".repeat(40);
const projectId = "prj_fixture";
const deploymentId = "dpl_fixtureApproved";
const permitKey = Buffer.alloc(32, 7).toString("base64url");
const approval = { projectId, host, port: 4000, username, principal };
const env = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_TARGET_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: branch,
  VERCEL_GIT_COMMIT_SHA: sha,
  VERCEL_PROJECT_ID: projectId,
  VERCEL_DEPLOYMENT_ID: deploymentId,
  APP_ENV: "testing",
  DATABASE_URL: url,
  TIDB_DIAGNOSTIC_APPROVAL: JSON.stringify(approval),
  TIDB_DIAGNOSTIC_PERMIT_KEY: permitKey,
};

const allowedQueries = [
  "SELECT DATABASE() AS database_name",
  "SELECT CURRENT_USER() AS principal",
  "SELECT 1 AS ok",
];

class TestSocket extends EventEmitter {
  encrypted = true;
  authorized = true;
  closed = false;
  getPeerCertificate = vi.fn(() => ({ subjectaltname: `DNS:${host}` }));
  close(hadError = false) {
    this.closed = true;
    this.emit("close", hadError);
  }
  destroy = vi.fn(() => this.close());
}

function simulateConnection() {
  const socket = new TestSocket();
  const client = {
    stream: socket,
    on: vi.fn(),
    connect: vi.fn((complete: (error?: Error) => void) => complete()),
    query: vi
      .fn()
      .mockResolvedValueOnce([[{ database_name: database }], []])
      .mockResolvedValueOnce([[{ principal }], []])
      .mockResolvedValueOnce([[{ ok: 1 }], []]),
    end: vi.fn(async () => socket.close()),
    promise() {
      return this;
    },
  };
  createConnection.mockReturnValue(client);
  return client;
}

function permit(
  id = deploymentId,
  expires = Math.floor(Date.now() / 1000) + 60,
) {
  const signature = createHmac("sha256", Buffer.from(permitKey, "base64url"))
    .update(
      JSON.stringify([
        "tidb-testing-diagnostic",
        projectId,
        sha,
        id,
        expires,
        approval.host,
        approval.port,
        approval.username,
        approval.principal,
      ]),
    )
    .digest("base64url");
  return `${expires}.${signature}`;
}

function request(
  requestOrigin: string | null = origin,
  requestUrl = origin,
  token: string | null = permit(),
) {
  const headers = new Headers();
  if (requestOrigin) headers.set("origin", requestOrigin);
  if (token) headers.set("x-tidb-diagnostic-permit", token);
  return POST(
    new Request(`${requestUrl}/api/diagnostics/tidb-testing`, {
      method: "POST",
      headers,
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.stubEnv("NODE_TLS_REJECT_UNAUTHORIZED", undefined);
  requireAdmin.mockResolvedValue({ origin });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("temporary Testing TCP/TLS diagnostic", () => {
  it.each([
    ["VERCEL", undefined],
    ["VERCEL_ENV", "production"],
    ["VERCEL_TARGET_ENV", "production"],
    ["APP_ENV", "production"],
    ["VERCEL_GIT_COMMIT_REF", undefined],
    ["VERCEL_GIT_COMMIT_REF", "feature/gate-2-phase-2b-save-regenerate"],
    ["VERCEL_GIT_COMMIT_REF", "main"],
    ["VERCEL_GIT_COMMIT_SHA", undefined],
    ["VERCEL_GIT_COMMIT_SHA", "invalid"],
    ["VERCEL_PROJECT_ID", "prj_other"],
    ["VERCEL_DEPLOYMENT_ID", undefined],
    ["TIDB_DIAGNOSTIC_APPROVAL", "invalid"],
    ["TIDB_DIAGNOSTIC_PERMIT_KEY", "invalid"],
  ])(
    "returns 404 before accessing auth or DB when %s is ineligible",
    async (key, value) => {
      vi.stubEnv(key, value);
      expect((await request()).status).toBe(404);
      expect(requireAdmin).not.toHaveBeenCalled();
      expect(createConnection).not.toHaveBeenCalled();
    },
  );

  it("requires a valid admin session before accessing the database", async () => {
    requireAdmin.mockRejectedValue(
      new HttpError(401, "UNAUTHORIZED", "Authentication required."),
    );
    expect((await request()).status).toBe(401);
    expect(createConnection).not.toHaveBeenCalled();
  });

  it.each([null, "https://other.example.test"])(
    "rejects Origin %s",
    async (badOrigin) => {
      expect((await request(badOrigin)).status).toBe(403);
      expect(createConnection).not.toHaveBeenCalled();
    },
  );

  it("rejects a request URL outside the authenticated admin origin", async () => {
    expect((await request(origin, "https://other.example.test")).status).toBe(
      403,
    );
    expect(createConnection).not.toHaveBeenCalled();
  });

  it("rejects the approved permit on a different deployment of the same commit", async () => {
    vi.stubEnv("VERCEL_DEPLOYMENT_ID", "dpl_fixtureOther");
    expect((await request()).status).toBe(404);
    expect(createConnection).not.toHaveBeenCalled();
  });

  it("rejects a permit signed for a different commit", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "b".repeat(40));
    expect((await request()).status).toBe(404);
    expect(createConnection).not.toHaveBeenCalled();
  });

  it("rejects the permit if the approved principal was changed", async () => {
    vi.stubEnv(
      "TIDB_DIAGNOSTIC_APPROVAL",
      JSON.stringify({ ...approval, principal: "fixture_migrator@%" }),
    );
    expect((await request()).status).toBe(404);
    expect(createConnection).not.toHaveBeenCalled();
  });

  it.each([null, "malformed", "expired", "far-future"])(
    "rejects the %s permit without connecting",
    async (fault) => {
      const now = Math.floor(Date.now() / 1000);
      const token =
        fault === "expired"
          ? permit(deploymentId, now - 1)
          : fault === "far-future"
            ? permit(deploymentId, now + 901)
            : fault;
      expect((await request(origin, origin, token)).status).toBe(404);
      expect(createConnection).not.toHaveBeenCalled();
    },
  );

  it.each([
    url.replace(host, "production.example.test"),
    url.replace(":4000", ":3306"),
    url.replace(database, "courier_route_planner_production"),
    url.replace(username, "fixture_migrator"),
    `${url}?ssl=false`,
    undefined,
  ])(
    "rejects an unapproved or missing database binding before connect",
    async (badUrl) => {
      vi.stubEnv("DATABASE_URL", badUrl);
      const response = await request();
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: { code: "TARGET_REJECTED" },
      });
      expect(createConnection).not.toHaveBeenCalled();
    },
  );

  it("rejects a TLS verification override before opening a socket", async () => {
    vi.stubEnv("NODE_TLS_REJECT_UNAUTHORIZED", "0");
    expect((await request()).status).toBe(503);
    expect(createConnection).not.toHaveBeenCalled();
  });

  it("does not open a connection when mysql2 connection metadata would reach an instrumentation subscriber", async () => {
    const instrumentation = channel("tracing:mysql2:connect:start");
    const observer = vi.fn();
    instrumentation.subscribe(observer);
    try {
      expect(await (await request()).json()).toMatchObject({
        error: { code: "INSTRUMENTATION_ENABLED" },
      });
      expect(createConnection).not.toHaveBeenCalled();
      expect(observer).not.toHaveBeenCalled();
    } finally {
      instrumentation.unsubscribe(observer);
    }
  });

  it("validates TLS and identity, then executes only the three sequential reads on one socket", async () => {
    const client = simulateConnection();
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ data: { status: "ok" } });
    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        host,
        port: 4000,
        user: username,
        database,
        ssl: { rejectUnauthorized: true, verifyIdentity: true },
        multipleStatements: false,
      }),
    );
    expect(client.query.mock.calls.map(([query]) => query)).toEqual(
      allowedQueries,
    );
    expect(client.end).toHaveBeenCalledTimes(1);
    expect(client.stream.closed).toBe(true);
  });

  it.each(["untrusted-chain", "hostname-mismatch", "handshake-failure"])(
    "fails TLS with %s before any query",
    async (fault) => {
      const client = simulateConnection();
      if (fault === "untrusted-chain") client.stream.authorized = false;
      if (fault === "hostname-mismatch")
        client.stream.getPeerCertificate.mockReturnValue({
          subjectaltname: "DNS:elsewhere.invalid",
        });
      if (fault === "handshake-failure")
        client.connect.mockImplementation((done) =>
          done(
            Object.assign(new Error(password), { code: "HANDSHAKE_SSL_ERROR" }),
          ),
        );
      const response = await request();
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: { code: "TLS_FAILED" },
      });
      expect(client.query).not.toHaveBeenCalled();
      expect(client.stream.destroy).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["database_name", "principal"])(
    "stops on a mismatched %s before SELECT 1",
    async (field) => {
      const client = simulateConnection();
      client.query.mockReset();
      if (field === "principal")
        client.query.mockResolvedValueOnce([[{ database_name: database }], []]);
      client.query.mockResolvedValueOnce([[{ [field]: "wrong" }], []]);
      const response = await request();
      expect(await response.json()).toMatchObject({
        error: { code: "IDENTITY_MISMATCH" },
      });
      expect(client.query).toHaveBeenCalledTimes(
        field === "database_name" ? 1 : 2,
      );
      expect(client.stream.closed).toBe(true);
    },
  );

  it("sanitizes query errors and emits no credential information in the response or logs", async () => {
    const client = simulateConnection();
    const log = vi.spyOn(console, "log");
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    client.query.mockReset().mockRejectedValue(new Error(url));
    const response = await request();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.text();
    expect(body).toContain("QUERY_FAILED");
    for (const value of [url, host, username, password])
      expect(body).not.toContain(value);
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(client.stream.destroy).toHaveBeenCalledTimes(1);
  });

  it("bounds a stalled handshake and destroys the socket once without retry", async () => {
    vi.useFakeTimers();
    const client = simulateConnection();
    client.connect.mockImplementation(() => {});
    const response = request();
    await vi.runAllTimersAsync();
    expect(await (await response).json()).toMatchObject({
      error: { code: "CONNECTION_TIMEOUT" },
    });
    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(client.query).not.toHaveBeenCalled();
    expect(client.stream.destroy).toHaveBeenCalledTimes(1);
  });

  it("does not proceed to a later query when the earlier read times out", async () => {
    vi.useFakeTimers();
    const client = simulateConnection();
    client.query.mockReset().mockImplementation(() => new Promise(() => {}));
    const response = request();
    await vi.runAllTimersAsync();
    expect(await (await response).json()).toMatchObject({
      error: { code: "QUERY_TIMEOUT" },
    });
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.stream.destroy).toHaveBeenCalledTimes(1);
  });

  it("fails when graceful shutdown never closes the socket and forces cleanup", async () => {
    vi.useFakeTimers();
    const client = simulateConnection();
    client.end.mockResolvedValue(undefined);
    const response = request();
    await vi.runAllTimersAsync();
    expect(await (await response).json()).toMatchObject({
      error: { code: "CLOSE_FAILED" },
    });
    expect(client.stream.destroy).toHaveBeenCalledTimes(1);
    expect(client.stream.closed).toBe(true);
  });

  it("does not report success when the socket closed with an error", async () => {
    const client = simulateConnection();
    client.end.mockImplementation(async () => client.stream.close(true));
    expect(await (await request()).json()).toMatchObject({
      error: { code: "CLOSE_FAILED" },
    });
  });

  it("does not report success when the socket closed before graceful shutdown", async () => {
    const client = simulateConnection();
    client.query
      .mockReset()
      .mockResolvedValueOnce([[{ database_name: database }], []])
      .mockResolvedValueOnce([[{ principal }], []])
      .mockImplementationOnce(async () => {
        client.stream.close();
        return [[{ ok: 1 }], []];
      });
    expect(await (await request()).json()).toMatchObject({
      error: { code: "CLOSE_FAILED" },
    });
    expect(client.end).not.toHaveBeenCalled();
  });
});
