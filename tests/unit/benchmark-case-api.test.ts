// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as preview } from "@/app/api/scenarios/[id]/freeze-preview/route";
import { GET as list, POST as freeze } from "@/app/api/benchmark-cases/route";
import { GET as detail } from "@/app/api/benchmark-cases/[id]/route";
import { GET as recover } from "@/app/api/benchmark-cases/recovery/[requestId]/route";
import { BenchmarkCaseError } from "@/application/benchmark-cases/benchmark-case-service";
import { HttpError } from "@/lib/http/request-security";

const service = vi.hoisted(() => ({
  preview: vi.fn(),
  freeze: vi.fn(),
  recover: vi.fn(),
  detail: vi.fn(),
  list: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/lib/security/admin", () => ({ requireAdmin: service.admin }));
vi.mock("@/db/repositories/benchmark-case-repository", () => ({
  createBenchmarkCaseRepository: vi.fn(),
}));
vi.mock(
  "@/application/benchmark-cases/benchmark-case-service",
  async (load) => ({
    ...(await load<
      typeof import("@/application/benchmark-cases/benchmark-case-service")
    >()),
    createBenchmarkCaseService: () => service,
  }),
);

const id = "9007199254740995";
const requestId = "dcdfdb87-e66a-4a7b-9eeb-49eba5a61c00";
const expectedInputHash = "a".repeat(64);
const input = { scenarioId: id, requestId, expectedInputHash };
const origin = "http://localhost:3000";
const context = { params: Promise.resolve({ id }) };
const recoveryContext = { params: Promise.resolve({ requestId }) };
const cases = "/api/benchmark-cases";
const recoveryPath = `${cases}/recovery/${requestId}?scenarioId=${id}&expectedInputHash=${expectedInputHash}`;

function request(path = cases, init?: RequestInit) {
  return new Request(origin + path, init);
}

function confirm(body: unknown = input, headers?: HeadersInit) {
  return request(cases, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  service.admin.mockResolvedValue({ origin });
});

describe("Benchmark Case API routes", () => {
  it.each([401, 403])(
    "requires admin authorization on every handler (%i)",
    async (status) => {
      service.admin.mockRejectedValue(
        new HttpError(status, "DENIED", "Access denied."),
      );
      const responses = await Promise.all([
        preview(request(), context),
        freeze(confirm()),
        list(request()),
        detail(request(), context),
        recover(request(recoveryPath), recoveryContext),
      ]);
      expect(responses.map((response) => response.status)).toEqual(
        Array(5).fill(status),
      );
      for (const response of responses)
        expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(service.preview).not.toHaveBeenCalled();
      expect(service.freeze).not.toHaveBeenCalled();
      expect(service.list).not.toHaveBeenCalled();
      expect(service.detail).not.toHaveBeenCalled();
      expect(service.recover).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["origin", "http://untrusted.invalid"],
    ["host", "untrusted.invalid"],
    ["sec-fetch-site", "cross-site"],
  ])("rejects untrusted POST metadata (%s)", async (header, value) => {
    expect((await freeze(confirm(input, { [header]: value }))).status).toBe(
      403,
    );
    expect(service.freeze).not.toHaveBeenCalled();
  });

  it("uses separate preview and confirm with string IDs and private responses", async () => {
    const snapshot = { scenario: { id }, inputHash: expectedInputHash };
    service.preview.mockResolvedValue(snapshot);
    service.freeze.mockResolvedValue({
      ...snapshot,
      provenance: { benchmarkCaseId: id },
    });
    const prepared = await preview(request(), context);
    expect(prepared.status).toBe(200);
    expect(prepared.headers.get("cache-control")).toBe("private, no-store");
    expect(await prepared.json()).toEqual({ data: snapshot });
    expect(service.preview).toHaveBeenCalledExactlyOnceWith(id);
    expect(service.freeze).not.toHaveBeenCalled();
    const response = await freeze(confirm());
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(service.freeze).toHaveBeenCalledExactlyOnceWith(input);
    expect((await response.json()).data.provenance.benchmarkCaseId).toBe(id);
  });

  it.each([
    { ...input, scenarioId: Number(id) },
    { ...input, requestId: "invalid" },
    { ...input, expectedInputHash: "invalid" },
    { ...input, override: true },
  ])(
    "rejects malformed confirm input before calling the service",
    async (body) => {
      expect((await freeze(confirm(body))).status).toBe(400);
      expect(service.freeze).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["SOURCE_CHANGED", 409],
    ["FREEZE_REQUEST_CONFLICT", 409],
    ["COMMIT_UNKNOWN", 503],
    ["ROLLBACK_UNKNOWN", 503],
  ] as const)("preserves application outcome %s", async (code, status) => {
    service.freeze.mockRejectedValue(new BenchmarkCaseError(code, requestId));
    const response = await freeze(confirm());
    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
    expect(service.freeze).toHaveBeenCalledTimes(1);
    expect(service.recover).not.toHaveBeenCalled();
  });

  it("recovers only by the complete request identity and keeps null inconclusive", async () => {
    service.recover.mockResolvedValue(null);
    const response = await recover(request(recoveryPath), recoveryContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: null });
    expect(service.recover).toHaveBeenCalledExactlyOnceWith(input);
    expect(
      (await recover(request(recoveryPath + "&scenarioId=2"), recoveryContext))
        .status,
    ).toBe(400);
    expect(service.freeze).not.toHaveBeenCalled();
  });

  it("reads stored detail and bounded history independently of preview", async () => {
    const snapshot = { scenario: { id, name: "Frozen Scenario" } };
    service.detail.mockResolvedValue(snapshot);
    service.list.mockResolvedValue({ data: [{ id }], nextCursor: null });
    expect(await (await detail(request(), context)).json()).toEqual({
      data: snapshot,
    });
    expect(
      await (await list(request(cases + "?limit=1&after=" + id))).json(),
    ).toEqual({
      data: [{ id }],
      nextCursor: null,
    });
    expect(service.list).toHaveBeenCalledExactlyOnceWith({
      limit: 1,
      after: id,
    });
    expect((await list(request(cases + "?limit=101"))).status).toBe(400);
    expect(service.preview).not.toHaveBeenCalled();
  });

  it("sanitizes unexpected database errors", async () => {
    service.detail.mockRejectedValue(
      Error("Synthetic private database failure"),
    );
    const response = await detail(request(), context);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Synthetic private");
  });

  it("does not disclose mismatched recovery results", async () => {
    service.recover.mockRejectedValue(
      new BenchmarkCaseError("FREEZE_REQUEST_CONFLICT", requestId),
    );
    const response = await recover(request(recoveryPath), recoveryContext);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "FREEZE_REQUEST_CONFLICT",
        message: "Freeze request ID is already in use.",
      },
    });
    expect(service.freeze).not.toHaveBeenCalled();
  });
});
