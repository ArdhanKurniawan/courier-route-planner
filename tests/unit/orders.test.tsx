import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { scenarioDtoFixture as scenario } from "../fixtures/scenario";
import { orderDtoFixture as dto } from "../fixtures/order";
import OrderManager from "@/components/orders/order-manager";
const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
let rows: unknown[],
  mutation: Response | Error,
  calls: { url: string; init?: RequestInit }[],
  ordersNext: string | null,
  scenariosNext: string | null;
let configured: number;
const sid = scenario.id,
  base = "/api/scenarios/" + sid + "/orders";
beforeEach(() => {
  rows = [dto];
  mutation = Response.json({ data: dto });
  calls = [];
  ordersNext = null;
  scenariosNext = null;
  configured = 25;
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method && init.method !== "GET") {
        if (mutation instanceof Error) throw mutation;
        return mutation.clone();
      }
      return Response.json(
        url.startsWith("/api/scenarios?")
          ? {
              data: [
                { ...scenario, customerCount: configured },
                {
                  ...scenario,
                  id: "2",
                  name: "Other Scenario",
                  customerCount: 0,
                },
              ],
              nextCursor: scenariosNext,
            }
          : { data: rows, nextCursor: ordersNext, totalCount: "77" },
      );
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function view() {
  render(<OrderManager />);
}
async function choose() {
  await screen.findByRole("option", { name: "Synthetic Scenario" });
  fireEvent.change(screen.getByLabelText("Scenario"), {
    target: { value: sid },
  });
  await screen.findByRole("button", { name: "Edit QA-001" });
}
function fill() {
  fireEvent.change(screen.getByLabelText("Kode Order"), {
    target: { value: "new-01" },
  });
  fireEvent.change(screen.getByLabelText("Nama pelanggan"), {
    target: { value: "New customer" },
  });
  fireEvent.change(screen.getByLabelText("Latitude"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("Longitude"), {
    target: { value: "0" },
  });
}
describe("Order admin UI", () => {
  it("waits for a Scenario selection and displays configured and actual counts separately", async () => {
    view();
    await screen.findByRole("option", { name: "Synthetic Scenario" });
    expect(calls.some((c) => c.url.endsWith("/orders"))).toBe(false);
    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: sid },
    });
    await screen.findByRole("button", { name: "Edit QA-001" });
    expect(
      screen.getByText("Jumlah pelanggan konfigurasi: 25"),
    ).toBeInTheDocument();
    expect(screen.getByText("Jumlah Order aktual: 77")).toBeInTheDocument();
    expect(calls.every((c) => !c.init?.method)).toBe(true);
  });
  it("shows empty orders without fabricating records", async () => {
    rows = [];
    view();
    await screen.findByRole("option", { name: "Synthetic Scenario" });
    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: sid },
    });
    expect(
      await screen.findByText("Belum ada Order pada Scenario ini."),
    ).toBeInTheDocument();
  });
  it("creates one normalized manual Order despite double submission", async () => {
    mutation = Response.json({ data: dto }, { status: 201 });
    view();
    await choose();
    fill();
    const form = screen.getByRole("form", { name: "Form Order" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    await screen.findByText("Perubahan Order tersimpan.");
    const writes = calls.filter((c) => c.init?.method === "POST");
    expect(writes).toHaveLength(1);
    expect(writes[0].url).toBe(base);
    expect(JSON.parse(writes[0].init!.body as string)).toEqual({
      orderCode: "NEW-01",
      customerName: "New customer",
      address: null,
      latitude: 0,
      longitude: 0,
    });
  });
  it("edits a dummy Order without sending source or scenarioId", async () => {
    rows = [{ ...dto, source: "dummy" }];
    mutation = Response.json({ data: { ...dto, source: "dummy" } });
    view();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "Edit QA-001" }));
    expect(screen.getByText("Sumber: dummy (hanya baca)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    await screen.findByText("Perubahan Order tersimpan.");
    const write = calls.find((c) => c.init?.method === "PUT")!;
    expect(write.url).toBe(base + "/" + dto.id);
    expect(JSON.parse(write.init!.body as string)).not.toHaveProperty("source");
    expect(JSON.parse(write.init!.body as string)).not.toHaveProperty(
      "scenarioId",
    );
  });
  it("does not submit invalid coordinates", async () => {
    view();
    await choose();
    fill();
    fireEvent.change(screen.getByLabelText("Latitude"), {
      target: { value: "91" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Form Order" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(calls.some((c) => c.init?.method)).toBe(false);
  });
  it("keeps delete cancellation mutation-free and sends one confirmed DELETE", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    view();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "Hapus QA-001" }));
    expect(calls.some((c) => c.init?.method === "DELETE")).toBe(false);
    confirm.mockReturnValue(true);
    mutation = new Response(null, { status: 204 });
    fireEvent.click(screen.getByRole("button", { name: "Hapus QA-001" }));
    await screen.findByText("Perubahan Order tersimpan.");
    expect(calls.filter((c) => c.init?.method === "DELETE")).toHaveLength(1);
  });
  it("pages Orders within the selected Scenario without modifying records", async () => {
    ordersNext = dto.id;
    view();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "Order berikutnya" }));
    await waitFor(() =>
      expect(calls.some((c) => c.url === base + "?after=" + dto.id)).toBe(true),
    );
  });
  it("locks writes after an ambiguous mutation until an explicit successful read", async () => {
    mutation = new Error("synthetic network");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    view();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "Hapus QA-001" }));
    await screen.findByText(
      "Status perubahan belum pasti. Muat ulang daftar sebelum mencoba lagi.",
    );
    expect(screen.getByRole("button", { name: "Hapus QA-001" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang Order" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Hapus QA-001" }),
      ).toBeEnabled(),
    );
    expect(calls.filter((c) => c.init?.method === "DELETE")).toHaveLength(1);
  });
  it("clears a stale edit snapshot on reload and when changing Scenario", async () => {
    view();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "Edit QA-001" }));
    rows = [{ ...dto, customerName: "Fresh customer" }];
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang Order" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Simpan perubahan" }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit QA-001" }));
    expect(screen.getByLabelText("Nama pelanggan")).toHaveValue(
      "Fresh customer",
    );
    rows = [];
    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: "2" },
    });
    await screen.findByText("Belum ada Order pada Scenario ini.");
    expect(screen.getByLabelText("Nama pelanggan")).toHaveValue("");
  });
  it("redirects expired Scenario access and displays no protected records", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    view();
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/login"),
    );
    expect(
      screen.queryByRole("table", { name: "Daftar Order" }),
    ).not.toBeInTheDocument();
  });
  it("shows a bounded duplicate error without printing provider details", async () => {
    mutation = Response.json(
      {
        error: {
          code: "ORDER_CODE_CONFLICT",
          message: "synthetic private SQL",
        },
      },
      { status: 409 },
    );
    view();
    await choose();
    fill();
    fireEvent.submit(screen.getByRole("form", { name: "Form Order" }));
    await screen.findByText("Kode Order sudah digunakan pada Scenario ini.");
    expect(screen.queryByText("synthetic private SQL")).not.toBeInTheDocument();
  });
  it.each([
    [502, { error: { code: "GATEWAY_FAILURE" } }],
    [504, {}],
    [500, { error: { code: "UNAVAILABLE" } }],
  ] as const)(
    "locks writes for an unrecognized JSON error with HTTP %i",
    async (status, body) => {
      mutation = Response.json(body, { status });
      vi.spyOn(window, "confirm").mockReturnValue(true);
      view();
      await choose();
      fireEvent.click(screen.getByRole("button", { name: "Hapus QA-001" }));
      await screen.findByText(
        "Status perubahan belum pasti. Muat ulang daftar sebelum mencoba lagi.",
      );
      expect(
        screen.getByRole("button", { name: "Hapus QA-001" }),
      ).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Muat ulang Order" }));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Hapus QA-001" }),
        ).toBeEnabled(),
      );
      expect(
        calls.filter((call) => call.init?.method === "DELETE"),
      ).toHaveLength(1);
    },
  );
  it("keeps a definitive pre-write UNAVAILABLE/503 rejection recoverable without retry", async () => {
    mutation = Response.json(
      { error: { code: "UNAVAILABLE" } },
      { status: 503 },
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    view();
    await choose();
    fireEvent.click(screen.getByRole("button", { name: "Hapus QA-001" }));
    await screen.findByText("Perubahan belum dapat disimpan.");
    expect(screen.getByRole("button", { name: "Hapus QA-001" })).toBeEnabled();
    expect(calls.filter((call) => call.init?.method === "DELETE")).toHaveLength(
      1,
    );
  });
  it("refreshes the selected Scenario configuration without changing actual Order count", async () => {
    view();
    await choose();
    configured = 6;
    fireEvent.click(
      screen.getByRole("button", { name: "Muat ulang Scenario" }),
    );
    await screen.findByText("Jumlah pelanggan konfigurasi: 6");
    expect(screen.getByText("Jumlah Order aktual: 77")).toBeInTheDocument();
    expect(calls.some((call) => call.init?.method)).toBe(false);
  });
});
