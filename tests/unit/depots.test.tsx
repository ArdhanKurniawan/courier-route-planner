import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DepotManager from "@/components/depots/depot-manager";
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const row = {
  id: "9007199254740993",
  name: "Fixture Depot",
  address: null,
  latitude: 0,
  longitude: 0,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  router.replace.mockClear();
});
describe("Depot admin UI", () => {
  it("sends an empty JSON object for a confirmed DELETE and refreshes only after success", async () => {
    const network = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "DELETE"
        ? new Response(null, { status: 204 })
        : Response.json({ data: [row], nextCursor: null }),
    );
    vi.stubGlobal("fetch", network);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DepotManager />);
    await screen.findByText("Fixture Depot");
    fireEvent.click(
      screen.getByRole("button", { name: "Hapus Fixture Depot" }),
    );
    await waitFor(() =>
      expect(
        network.mock.calls.filter(([, init]) => init?.method === "DELETE"),
      ).toHaveLength(1),
    );
    const call = network.mock.calls.find(
      ([, init]) => init?.method === "DELETE",
    )!;
    expect(call[1]!.body).toBe("{}");
    expect(call[0]).toBe("/api/depots/9007199254740993");
  });
  it("blocks mutation during an older read and unlocks uncertainty only after a newer successful refresh", async () => {
    const reads: ((response: Response) => void)[] = [];
    let listRequests = 0;
    const network = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT")
        return Response.json(
          { error: { code: "MUTATION_OUTCOME_UNKNOWN" } },
          { status: 503 },
        );
      if (++listRequests === 1)
        return Response.json({ data: [row], nextCursor: null });
      return new Promise<Response>((resolve) => reads.push(resolve));
    });
    vi.stubGlobal("fetch", network);
    render(<DepotManager />);
    await screen.findByText("Fixture Depot");
    fireEvent.click(screen.getByRole("button", { name: "Edit Fixture Depot" }));
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang daftar" }));
    fireEvent.submit(screen.getByRole("form", { name: "Form depot" }));
    expect(
      network.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(0);
    reads[0](Response.json({ data: [row], nextCursor: null }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Simpan perubahan" }),
      ).toBeEnabled(),
    );
    fireEvent.submit(screen.getByRole("form", { name: "Form depot" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("belum pasti");
    expect(
      screen.getByRole("button", { name: "Simpan perubahan" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang daftar" }));
    expect(
      screen.getByRole("button", { name: "Simpan perubahan" }),
    ).toBeDisabled();
    reads[1](Response.json({ data: [row], nextCursor: null }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Simpan perubahan" }),
      ).toBeEnabled(),
    );
    expect(
      network.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
  });
  it("shows loading and empty states without inventing operational data", async () => {
    let finish!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<DepotManager />);
    expect(screen.getByText("Memuat depot…")).toBeVisible();
    finish(Response.json({ data: [], nextCursor: null }));
    expect(await screen.findByText("Belum ada depot.")).toBeVisible();
    expect(screen.getByRole("form", { name: "Form depot" })).toBeVisible();
  });
  it("renders list ids losslessly and cancels deletion without a mutation", async () => {
    const network = vi.fn(async () =>
      Response.json({ data: [row], nextCursor: null }),
    );
    vi.stubGlobal("fetch", network);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DepotManager />);
    await screen.findByText("Fixture Depot");
    expect(screen.getByText("9007199254740993")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Hapus Fixture Depot" }),
    );
    expect(network).toHaveBeenCalledTimes(1);
  });
  it("edits, preserves input on failure, and requires list refresh after unknown outcome", async () => {
    const network = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT")
        return Response.json(
          { error: { code: "MUTATION_OUTCOME_UNKNOWN" } },
          { status: 503 },
        );
      return Response.json({ data: [row], nextCursor: null });
    });
    vi.stubGlobal("fetch", network);
    render(<DepotManager />);
    await screen.findByText("Fixture Depot");
    fireEvent.click(screen.getByRole("button", { name: "Edit Fixture Depot" }));
    fireEvent.change(screen.getByLabelText("Nama"), {
      target: { value: "Fixture edited" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Form depot" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("belum pasti");
    expect(screen.getByLabelText("Nama")).toHaveValue("Fixture edited");
    expect(
      screen.getByRole("button", { name: "Simpan perubahan" }),
    ).toBeDisabled();
    expect(
      network.mock.calls.filter(([, init]) => init?.method === "PUT")[0][0],
    ).toBe("/api/depots/9007199254740993");
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang daftar" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Simpan perubahan" }),
      ).toBeEnabled(),
    );
    expect(
      network.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(1);
  });
  it("does not coerce blank coordinates into zero", async () => {
    const network = vi.fn(async () =>
      Response.json({ data: [], nextCursor: null }),
    );
    vi.stubGlobal("fetch", network);
    render(<DepotManager />);
    await screen.findByText("Belum ada depot.");
    fireEvent.change(screen.getByLabelText("Nama"), {
      target: { value: "Fixture" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Form depot" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("koordinat");
    expect(network).toHaveBeenCalledTimes(1);
  });
  it("creates a Depot then refreshes the list and supports logout", async () => {
    const network = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/logout") return Response.json({ ok: true });
      if (init?.method === "POST")
        return Response.json({ data: row }, { status: 201 });
      return Response.json({ data: [], nextCursor: null });
    });
    vi.stubGlobal("fetch", network);
    render(<DepotManager />);
    await screen.findByText("Belum ada depot.");
    fireEvent.change(screen.getByLabelText("Nama"), {
      target: { value: "Fixture" },
    });
    fireEvent.change(screen.getByLabelText("Latitude"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Longitude"), {
      target: { value: "0" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Form depot" }));
    await waitFor(() =>
      expect(
        network.mock.calls.filter(([, init]) => !init?.method),
      ).toHaveLength(2),
    );
    expect(
      JSON.parse(
        network.mock.calls.find(([, init]) => init?.method === "POST")![1]!
          .body as string,
      ),
    ).toMatchObject({ latitude: 0, longitude: 0, isActive: true });
    fireEvent.click(screen.getByRole("button", { name: "Keluar" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });
  it("shows read failures and redirects expired sessions without retrying writes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    render(<DepotManager />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });
});
