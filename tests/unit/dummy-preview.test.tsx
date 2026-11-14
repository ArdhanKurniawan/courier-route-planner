import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Map as LeafletMap } from "leaflet";
import { afterEach, expect, it, vi } from "vitest";
import DummyPreviewManager from "@/components/generator/dummy-preview-manager";

const scenario = {
  id: "10",
  depotId: "100",
  name: "Scenario A",
  status: "draft",
  distributionPattern: "random",
  customerCount: 2,
  radiusMinM: 10,
  radiusMaxM: 200,
  generationSeed: "-9223372036854775808",
};
const other = { ...scenario, id: "20", depotId: "200", name: "Scenario B" };
const listUrl = "/api/scenarios?limit=100";
const parameters = {
  count: 2,
  radiusMinM: 10,
  radiusMaxM: 200,
  seed: scenario.generationSeed,
};

function result(selected = scenario, seed = parameters.seed) {
  return Response.json({
    data: {
      scenario: selected,
      depot: {
        id: selected.depotId,
        name: "Gudang " + selected.id,
        latitude: 0,
        longitude: 179.9999,
        isActive: true,
      },
      version: "random-v1",
      parameters: { ...parameters, seed },
      points: [
        { latitude: 0.0001, longitude: -179.9998 },
        { latitude: 0.001, longitude: 179.9997 },
      ],
      revision: "a".repeat(64),
    },
  });
}

function mockRequests(
  post = vi.fn<(path: string, init: RequestInit) => Promise<Response>>(
    async (path) => result(path.includes("/20/") ? other : scenario),
  ),
) {
  const request = vi.fn(async (path: string, init: RequestInit) => {
    if (path === listUrl)
      return Response.json({
        data: [
          scenario,
          {
            ...scenario,
            id: "11",
            name: "Clustered",
            distributionPattern: "clustered",
          },
        ],
        nextCursor: "11",
      });
    if (path === listUrl + "&after=11")
      return Response.json({
        data: [
          other,
          { ...scenario, id: "21", name: "Frozen", status: "frozen" },
        ],
        nextCursor: null,
      });
    return post(path, init);
  });
  vi.stubGlobal("fetch", request);
  return { request, post };
}

async function choose(id = "10") {
  fireEvent.change(await screen.findByRole("combobox", { name: "Scenario" }), {
    target: { value: id },
  });
}

function generate() {
  fireEvent.click(screen.getByRole("button", { name: "Generate Preview" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("paginates eligible Scenarios and renders draft markers, coordinate fallback, and keyboard popup", async () => {
  let resize: (() => void) | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = observe;
      disconnect = disconnect;
      constructor(callback: () => void) {
        resize = callback;
      }
    },
  );
  const invalidate = vi.spyOn(LeafletMap.prototype, "invalidateSize");
  const fit = vi.spyOn(LeafletMap.prototype, "fitBounds");
  const remove = vi.spyOn(LeafletMap.prototype, "remove");
  const { request, post } = mockRequests();
  const { container } = render(<DummyPreviewManager />);
  await choose();
  expect(request).toHaveBeenCalledWith(
    listUrl + "&after=11",
    expect.anything(),
  );
  expect(screen.queryByRole("option", { name: "Clustered" })).toBeNull();
  expect(screen.queryByRole("option", { name: "Frozen" })).toBeNull();
  expect(screen.getByLabelText("Jumlah pelanggan")).toHaveValue(2);
  expect(screen.getByLabelText("Seed")).toHaveValue(parameters.seed);
  generate();
  const map = await screen.findByRole("region", {
    name: "Peta preview Depot dan titik dummy",
  });
  expect(post).toHaveBeenCalledWith(
    "/api/scenarios/10/dummy-orders/preview",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify(parameters),
      credentials: "same-origin",
    }),
  );
  expect(
    within(map).getByRole("button", { name: "Depot Gudang 10" }),
  ).toBeInTheDocument();
  const marker = within(map).getByRole("button", { name: "Titik preview 1" });
  expect(marker).toHaveClass("bg-violet-700");
  expect(
    within(map).getByRole("button", { name: "Titik preview 2" }),
  ).toBeInTheDocument();
  expect(fit.mock.calls[0]?.[0]).toMatchObject({
    _southWest: expect.objectContaining({ lng: expect.any(Number) }),
    _northEast: expect.objectContaining({ lng: expect.any(Number) }),
  });
  expect(fit.mock.calls[0]?.[0]).toHaveProperty(
    "_northEast.lng",
    expect.closeTo(180.0002, 5),
  );
  fireEvent.keyDown(marker, { key: "Enter" });
  const popup = container.querySelector<HTMLElement>(
    ".leaflet-popup-content > div",
  )!;
  expect(popup).toHaveFocus();
  expect(popup).toHaveTextContent("0.0001, -179.9998");
  expect(within(popup).queryByRole("link")).toBeNull();
  fireEvent.keyDown(popup, { key: "Escape" });
  expect(marker).toHaveFocus();
  await waitFor(() => expect(observe).toHaveBeenCalledWith(map));
  resize?.();
  expect(invalidate).toHaveBeenCalledWith({ debounceMoveend: true });
  await waitFor(() =>
    expect(container.querySelector("img.leaflet-tile")).not.toBeNull(),
  );
  fireEvent.error(container.querySelector("img.leaflet-tile")!);
  expect(
    await screen.findByText(/Daftar koordinat tetap tersedia/),
  ).toBeVisible();
  expect(
    within(
      screen.getByRole("list", { name: "Koordinat titik preview" }),
    ).getAllByRole("listitem"),
  ).toHaveLength(2);
  await choose("20");
  expect(map).not.toBeInTheDocument();
  expect(disconnect).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledOnce();
});

it("aborts edited parameters and ignores old responses even when fetch resolves them", async () => {
  let resolveOld!: (response: Response) => void;
  const post = vi
    .fn<(path: string, init: RequestInit) => Promise<Response>>(async () =>
      result(scenario, "1"),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
  mockRequests(post);
  render(<DummyPreviewManager />);
  await choose();
  generate();
  expect(screen.getByText("Menghasilkan preview...")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "1" } });
  expect(post.mock.calls[0][1].signal?.aborted).toBe(true);
  generate();
  expect(await screen.findByText("2 titik preview")).toBeVisible();
  await act(async () =>
    resolveOld(
      Response.json({ error: { code: "INVALID_DEPOT" } }, { status: 409 }),
    ),
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("2 titik preview")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "2" } });
  expect(screen.queryByText("2 titik preview")).toBeNull();
});

it("aborts a pending preview when Scenario changes and renders only the new response", async () => {
  let resolveOld!: (response: Response) => void;
  const post = vi
    .fn<(path: string, init: RequestInit) => Promise<Response>>(async () =>
      result(other),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
  mockRequests(post);
  render(<DummyPreviewManager />);
  await choose();
  generate();
  await choose("20");
  expect(post.mock.calls[0][1].signal?.aborted).toBe(true);
  generate();
  expect(
    await screen.findByRole("button", { name: "Depot Gudang 20" }),
  ).toBeVisible();
  await act(async () => resolveOld(result()));
  expect(screen.queryByRole("button", { name: "Depot Gudang 10" })).toBeNull();
});

it("handles loading, list failure, retry, and no eligible Scenario", async () => {
  let fail!: (response: Response) => void;
  const fetchMock = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          fail = resolve;
        }),
    )
    .mockResolvedValueOnce(Response.json({ data: [], nextCursor: null }));
  vi.stubGlobal("fetch", fetchMock);
  render(<DummyPreviewManager />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Memuat daftar Scenario",
  );
  await act(async () => fail(new Response(null, { status: 503 })));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Daftar Scenario gagal dimuat.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
  expect(
    await screen.findByText("Belum ada Scenario draft berpola random."),
  ).toBeVisible();
});

it("refreshes the cached Scenario after its Depot changes", async () => {
  const reassigned = { ...scenario, depotId: "200" };
  const request = vi
    .fn(async () => result(reassigned))
    .mockResolvedValueOnce(
      Response.json({ data: [scenario], nextCursor: null }),
    )
    .mockResolvedValueOnce(result(reassigned))
    .mockResolvedValueOnce(
      Response.json({ data: [reassigned], nextCursor: null }),
    );
  vi.stubGlobal("fetch", request);
  render(<DummyPreviewManager />);
  await choose();
  generate();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Depot Scenario berubah",
  );
  expect(screen.queryByText("2 titik preview")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Muat ulang daftar Scenario" }),
  );
  await screen.findByLabelText("Jumlah pelanggan");
  generate();
  expect(await screen.findByText("2 titik preview")).toBeVisible();
  expect(request.mock.calls).toHaveLength(4);
});

it("reports invalid input and exhaustion, then allows retry without rendering partial points", async () => {
  const post = vi
    .fn<(path: string, init: RequestInit) => Promise<Response>>(async () =>
      result(),
    )
    .mockResolvedValueOnce(
      Response.json(
        { error: { code: "GENERATION_EXHAUSTED" } },
        { status: 422 },
      ),
    );
  mockRequests(post);
  render(<DummyPreviewManager />);
  await choose();
  fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "01" } });
  generate();
  expect(screen.getByLabelText("Seed")).toHaveAttribute("aria-invalid", "true");
  expect(post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Seed"), {
    target: { value: parameters.seed },
  });
  generate();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Titik unik tidak mencukupi",
  );
  expect(
    screen.queryByRole("list", { name: "Koordinat titik preview" }),
  ).toBeNull();
  generate();
  expect(await screen.findByText("2 titik preview")).toBeVisible();
});
