// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "@/app/api/scenarios/[id]/dummy-orders/route";
import { requireAdmin } from "@/lib/security/admin";
import { HttpError } from "@/lib/http/request-security";
import {
  getActiveDummyOperation,
  reconcileDummyOperation,
  saveDummyOrders,
} from "@/db/dummy-order-writer";

vi.mock("@/lib/security/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/db/dummy-order-writer", () => ({
  saveDummyOrders: vi.fn(),
  getActiveDummyOperation: vi.fn(),
  reconcileDummyOperation: vi.fn(),
}));

const parameters = { count: 2, radiusMinM: 10, radiusMaxM: 100, seed: "32" };
const operationId = "00000000-0000-4000-8000-000000000001";
const body = {
  parameters,
  revision: "a".repeat(64),
  replaceCount: 0,
  operationId,
};
const committed = {
  scenarioId: "10",
  savedCount: 2,
  replacedCount: 0,
  operationId,
  status: "committed" as const,
};
const origin = "https://testing.invalid";

function post(input: unknown = body, from = origin, id = "10") {
  return POST(
    new Request(origin + "/api/scenarios/" + id + "/dummy-orders", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { origin: from, "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ origin } as Awaited<
    ReturnType<typeof requireAdmin>
  >);
  vi.mocked(saveDummyOrders).mockResolvedValue(committed);
});

it("validates the admin and Origin before opening the writer", async () => {
  vi.mocked(requireAdmin).mockRejectedValueOnce(
    new HttpError(401, "UNAUTHORIZED", "Denied"),
  );
  expect((await post()).status).toBe(401);
  expect((await post(body, "https://other.invalid")).status).toBe(403);
  expect(saveDummyOrders).not.toHaveBeenCalled();
});

it.each([
  { ...body, replaceCount: 2 },
  { ...body, orderIds: ["10"] },
  { ...body, revision: "bad" },
  { ...body, operationId: "bad" },
])(
  "rejects malformed input or unconfirmed replacement before writing",
  async (input) => {
    expect((await post(input)).status).toBe(400);
    expect(saveDummyOrders).not.toHaveBeenCalled();
  },
);

it("calls the Scenario-scoped writer with validated parameters and returns private JSON", async () => {
  const input = { ...body, replaceCount: 2, confirmReplace: true };
  const response = await post(input);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(saveDummyOrders).toHaveBeenCalledWith("10", input);
  expect(await response.json()).toEqual({
    data: committed,
  });
});

it.each([
  [409, "STALE_PREVIEW"],
  [409, "OPERATION_PENDING"],
  [503, "COMMIT_UNKNOWN"],
] as const)("preserves sanitized outcome %s %s", async (status, code) => {
  vi.mocked(saveDummyOrders).mockRejectedValueOnce(
    new HttpError(status, code, "Safe message."),
  );
  const response = await post();
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({
    error: { code, message: "Safe message." },
  });
});

it("serves private status and requires admin and same-origin to reconcile the scoped UUID", async () => {
  const url = origin + "/api/scenarios/10/dummy-orders";
  const context = { params: Promise.resolve({ id: "10" }) };
  const request = (from: string) =>
    new Request(url, {
      method: "PATCH",
      headers: { origin: from, "content-type": "application/json" },
      body: JSON.stringify({ operationId }),
    });
  vi.mocked(requireAdmin).mockRejectedValueOnce(
    new HttpError(401, "UNAUTHORIZED", "Denied"),
  );
  expect((await GET(new Request(url), context)).status).toBe(401);
  expect(getActiveDummyOperation).not.toHaveBeenCalled();
  vi.mocked(getActiveDummyOperation).mockResolvedValueOnce(committed);
  const status = await GET(new Request(url), context);
  expect(status.headers.get("cache-control")).toBe("private, no-store");
  expect(await status.json()).toEqual({ data: committed });
  expect((await PATCH(request("https://other.invalid"), context)).status).toBe(
    403,
  );
  expect(reconcileDummyOperation).not.toHaveBeenCalled();
  const proof = { ...committed, status: "confirmed" as const };
  vi.mocked(reconcileDummyOperation).mockResolvedValueOnce(proof);
  expect(await (await PATCH(request(origin), context)).json()).toEqual({
    data: proof,
  });
  expect(reconcileDummyOperation).toHaveBeenCalledWith("10", operationId);
});
