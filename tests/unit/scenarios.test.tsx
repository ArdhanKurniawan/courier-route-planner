import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ScenarioManager from "@/components/scenarios/scenario-manager";
import ScenarioForm from "@/components/scenarios/scenario-form";
import { scenarioDtoFixture as dto } from "../fixtures/scenario";
const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const depot = {
  id: "9007199254740993",
  name: "Synthetic Depot",
  address: null,
  latitude: 0,
  longitude: 0,
  isActive: true,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
};
let scenarios: unknown[],
  mutation: Response | Error,
  calls: { url: string; init?: RequestInit }[];
beforeEach(() => {
  scenarios = [dto];
  mutation = Response.json({ data: dto });
  calls = [];
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method && init.method !== "GET") {
        if (mutation instanceof Error) throw mutation;
        return mutation;
      }
      return Response.json(
        url.startsWith("/api/depots")
          ? { data: [depot], nextCursor: null }
          : { data: scenarios, nextCursor: null },
      );
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function loaded() {
  await screen.findByRole("button", { name: "Edit Synthetic Scenario" });
}
describe("Scenario admin UI", () => {
  it("loads a Scenario list and active Depot choices without mutation", async () => {
    render(<ScenarioManager />);
    await loaded();
    expect(
      screen.getByRole("table", { name: "Daftar scenario" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: "Synthetic Depot" }),
    ).toBeInTheDocument();
    expect(calls.every((c) => !c.init?.method || c.init.method === "GET")).toBe(
      true,
    );
  });
  it("shows the empty state without fabricated rows", async () => {
    scenarios = [];
    render(<ScenarioManager />);
    expect(await screen.findByText("Belum ada scenario.")).toBeInTheDocument();
  });
  it("shows loading, then a recoverable read failure without issuing a mutation", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("synthetic read failure"));
    render(<ScenarioManager />);
    expect(screen.getByText("Memuat scenario…")).toBeInTheDocument();
    await screen.findByText(
      "Daftar scenario belum dapat dimuat. Silakan coba muat ulang.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang daftar" }));
    await loaded();
    expect(calls.some((call) => call.init?.method)).toBe(false);
  });
  it("creates a draft configuration once despite repeated form submission", async () => {
    render(<ScenarioManager />);
    await loaded();
    fireEvent.change(screen.getByLabelText("Nama"), {
      target: { value: "New scenario" },
    });
    fireEvent.change(screen.getByLabelText("Depot"), {
      target: { value: depot.id },
    });
    const form = screen.getByRole("form", { name: "Form scenario" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    await screen.findByText("Perubahan scenario tersimpan.");
    const writes = calls.filter((call) => call.init?.method === "POST");
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0].init!.body as string)).toEqual({
      name: "New scenario",
      depotId: depot.id,
      distributionPattern: "random",
      customerCount: 0,
      radiusMinM: null,
      radiusMaxM: null,
      generationSeed: null,
    });
  });
  it("pages Scenario rows and Depot choices using separate lossless cursors", async () => {
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const response = await original(url, init);
      const body = await response.json();
      return Response.json({ ...body, nextCursor: dto.id });
    });
    render(<ScenarioManager />);
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));
    await waitFor(() =>
      expect(
        calls.some((call) => call.url === "/api/scenarios?after=" + dto.id),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "Depot berikutnya" }));
    await waitFor(() =>
      expect(
        calls.some(
          (call) => call.url === "/api/depots?limit=100&after=" + dto.id,
        ),
      ).toBe(true),
    );
    expect(calls.some((call) => call.init?.method)).toBe(false);
  });
  it("shows bounded server field errors without exposing provider details", async () => {
    mutation = Response.json(
      {
        error: {
          code: "INVALID_INPUT",
          fieldErrors: { name: ["synthetic provider detail"] },
        },
      },
      { status: 400 },
    );
    render(<ScenarioManager />);
    await loaded();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Synthetic Scenario" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    await screen.findByText("Data ditolak server. Periksa field: name.");
    expect(
      screen.queryByText("synthetic provider detail"),
    ).not.toBeInTheDocument();
    expect(calls.filter((call) => call.init?.method === "PUT")).toHaveLength(1);
  });
  it("keeps delete cancellation mutation-free and sends exactly one confirmed delete", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ScenarioManager />);
    await loaded();
    fireEvent.click(
      screen.getByRole("button", { name: "Hapus Synthetic Scenario" }),
    );
    expect(calls.filter((c) => c.init?.method === "DELETE")).toHaveLength(0);
    confirm.mockReturnValue(true);
    mutation = new Response(null, { status: 204 });
    fireEvent.click(
      screen.getByRole("button", { name: "Hapus Synthetic Scenario" }),
    );
    await screen.findByText("Perubahan scenario tersimpan.");
    expect(calls.filter((c) => c.init?.method === "DELETE")).toHaveLength(1);
  });
  it("edits an existing Scenario and preserves large seed/id strings in JSON", async () => {
    render(<ScenarioManager />);
    await loaded();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Synthetic Scenario" }),
    );
    fireEvent.change(screen.getByLabelText("Nama"), {
      target: { value: "Edited Scenario" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    await waitFor(() =>
      expect(calls.filter((c) => c.init?.method === "PUT")).toHaveLength(1),
    );
    const call = calls.find((c) => c.init?.method === "PUT")!;
    expect(call.url).toBe("/api/scenarios/9007199254740995");
    expect(JSON.parse(call.init!.body as string)).toMatchObject({
      name: "Edited Scenario",
      generationSeed: "-9007199254740993",
      depotId: "9007199254740993",
    });
    expect(JSON.parse(call.init!.body as string)).not.toHaveProperty("status");
  });
  it("locks all mutation controls after an uncertain write until an explicit successful reload", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mutation = new Error("synthetic network failure");
    render(<ScenarioManager />);
    await loaded();
    fireEvent.click(
      screen.getByRole("button", { name: "Hapus Synthetic Scenario" }),
    );
    await screen.findByText(
      "Status perubahan belum pasti. Muat ulang daftar sebelum mencoba lagi.",
    );
    expect(
      screen.getByRole("button", { name: "Hapus Synthetic Scenario" }),
    ).toBeDisabled();
    expect(calls.filter((c) => c.init?.method === "DELETE")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang daftar" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Hapus Synthetic Scenario" }),
      ).toBeEnabled(),
    );
    expect(calls.filter((c) => c.init?.method === "DELETE")).toHaveLength(1);
  });
  it("redirects expired list access to login and renders no protected data", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    render(<ScenarioManager />);
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/login"),
    );
    expect(
      screen.queryByRole("button", { name: "Edit Synthetic Scenario" }),
    ).not.toBeInTheDocument();
  });
  it("reopens fresh same-id data after an explicit list reload instead of submitting stale fields", async () => {
    render(<ScenarioManager />);
    await loaded();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Synthetic Scenario" }),
    );
    scenarios = [{ ...dto, name: "Fresh server name" }];
    fireEvent.click(screen.getByRole("button", { name: "Muat ulang daftar" }));
    await screen.findByRole("button", { name: "Edit Fresh server name" });
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Fresh server name" }),
    );
    expect(screen.getByLabelText("Nama")).toHaveValue("Fresh server name");
  });
  it("allows a stored inactive Depot reference to be retained, but excludes other inactive choices", async () => {
    render(
      <ScenarioForm
        initial={dto}
        pending={false}
        blocked={false}
        depots={[
          { ...depot, isActive: false },
          { ...depot, id: "2", name: "Other inactive", isActive: false },
        ]}
        depotLoading={false}
        depotError={false}
        fieldErrors={{}}
        onSave={vi.fn(async () => false)}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Depot")).toHaveValue("9007199254740993");
    expect(
      screen.queryByRole("option", { name: "Other inactive" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Simpan perubahan" }),
    ).toBeEnabled();
  });
  it("rejects invalid form configuration without invoking mutation", async () => {
    const save = vi.fn(async () => true);
    render(
      <ScenarioForm
        initial={dto}
        pending={false}
        blocked={false}
        depots={[depot]}
        depotLoading={false}
        depotError={false}
        fieldErrors={{}}
        onSave={save}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Radius minimum (m)"), {
      target: { value: "2000" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Form scenario" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
