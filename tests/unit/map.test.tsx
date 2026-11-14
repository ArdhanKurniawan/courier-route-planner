import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Map as LeafletMap } from "leaflet";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapManager from "@/components/map/map-manager";

const scenarioA = { id: "10", depotId: "100", name: "Scenario A" };
const scenarioB = { id: "20", depotId: "200", name: "Scenario B" };
const depotA = {
  id: "100",
  name: "Gudang A",
  address: "Alamat Depot A",
  latitude: -6.9,
  longitude: 110.4,
};
const depotB = {
  id: "200",
  name: "Gudang B",
  address: null,
  latitude: -6.8,
  longitude: 110.5,
};
const orderA = {
  id: "1000",
  scenarioId: "10",
  orderCode: "QA-A",
  customerName: "Pelanggan A",
  address: "Alamat Order A",
  latitude: -6.91,
  longitude: 110.41,
};
const orderB = {
  ...orderA,
  id: "2000",
  scenarioId: "20",
  orderCode: "QA-B",
  customerName: "Pelanggan B",
};
const scenarioList = "/api/scenarios?limit=100";
const ordersA = "/api/scenarios/10/orders?limit=100";
const ordersB = "/api/scenarios/20/orders?limit=100";

function page<T>(data: T[], nextCursor: string | null = null) {
  return { data, nextCursor };
}

function mockReads(replies: Record<string, unknown> = {}) {
  const responses: Record<string, unknown> = {
    [scenarioList]: page([scenarioA, scenarioB]),
    "/api/scenarios/10": { data: scenarioA },
    "/api/scenarios/20": { data: scenarioB },
    "/api/depots/100": { data: depotA },
    "/api/depots/200": { data: depotB },
    [ordersA]: page([orderA]),
    [ordersB]: page([orderB]),
    ...replies,
  };
  const fetchMock = vi.fn(async (path: string, init: RequestInit) => {
    expect(init.credentials).toBe("same-origin");
    if (!Object.hasOwn(responses, path))
      throw Error("Unexpected synthetic request");
    const reply = await responses[path];
    return reply instanceof Response ? reply : Response.json(reply);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function selectScenario(name: string, id: string) {
  await screen.findByRole("option", { name });
  fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
    target: { value: id },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin Map", () => {
  it("moves keyboard focus to the Edit action and back to the marker", async () => {
    mockReads();
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    const depot = await screen.findByRole("button", { name: "Depot Gudang A" });
    depot.focus();
    fireEvent.keyDown(depot, { key: "Enter" });
    const edit = await screen.findByRole("link", { name: "Edit Depot" });
    expect(edit).toHaveFocus();
    fireEvent.keyDown(edit, { key: "Escape" });
    expect(depot).toHaveFocus();
    await waitFor(() => expect(edit).not.toBeInTheDocument());
  });

  it.each(["unmount", "Scenario switch"])(
    "resizes Leaflet when the content width changes and releases the observer on %s",
    async (disposal) => {
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
      mockReads();
      const { unmount } = render(<MapManager />);
      await selectScenario("Scenario A", "10");
      const map = await screen.findByRole("region", {
        name: "Peta Depot dan Order",
      });
      await waitFor(() => expect(observe).toHaveBeenCalledWith(map));
      expect(resize).toBeDefined();
      resize?.();
      expect(invalidate).toHaveBeenCalledWith({ debounceMoveend: true });

      if (disposal === "Scenario switch") {
        await selectScenario("Scenario B", "20");
        await waitFor(() => expect(observe).toHaveBeenCalledTimes(2));
        const replacement = screen.getByRole("region", {
          name: "Peta Depot dan Order",
        });
        expect(replacement).not.toBe(map);
        expect(observe).toHaveBeenLastCalledWith(replacement);
      } else {
        unmount();
      }
      expect(disconnect).toHaveBeenCalledOnce();
    },
  );

  it("loads all Scenario choices and all selected Order pages, then shows scoped markers and popup details", async () => {
    const second = {
      ...orderA,
      id: "1001",
      orderCode: "QA-A2",
      customerName: "Pelanggan A2",
    };
    const fetchMock = mockReads({
      [scenarioList]: page([scenarioB], "20"),
      [scenarioList + "&after=20"]: page([
        { ...scenarioA, id: "30", name: "Scenario A halaman dua" },
      ]),
      "/api/scenarios/30": { data: { ...scenarioA, id: "30" } },
      "/api/scenarios/30/orders?limit=100": page(
        [{ ...orderA, scenarioId: "30" }],
        "1000",
      ),
      "/api/scenarios/30/orders?limit=100&after=1000": page([
        { ...second, scenarioId: "30" },
      ]),
    });
    const { container } = render(<MapManager />);
    await screen.findByRole("option", { name: "Scenario A halaman dua" });
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      scenarioList,
      scenarioList + "&after=20",
    ]);

    await selectScenario("Scenario A halaman dua", "30");
    expect(
      await screen.findByRole("button", { name: "Depot Gudang A" }),
    ).toBeInTheDocument();
    const marker = await screen.findByRole("button", { name: "Order QA-A" });
    expect(
      await screen.findByRole("button", { name: "Order QA-A2" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 Order aktual")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kelola Depot" })).toHaveAttribute(
      "href",
      "/depots",
    );
    expect(screen.getByRole("link", { name: "Kelola Order" })).toHaveAttribute(
      "href",
      "/orders",
    );
    expect(screen.getByRole("link", { name: "OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );

    fireEvent.click(marker);
    await waitFor(() => {
      const popup = container.querySelector<HTMLElement>(
        ".leaflet-popup-content",
      );
      expect(popup).not.toBeNull();
      expect(within(popup!).getByText("Alamat Order A")).toBeInTheDocument();
      expect(within(popup!).getByText("Pelanggan A")).toBeInTheDocument();
      expect(
        within(popup!).getByRole("link", { name: "Edit Order" }),
      ).toHaveAttribute("href", "/orders?scenarioId=30&edit=1000");
    });
    fireEvent.click(screen.getByRole("button", { name: "Depot Gudang A" }));
    expect(
      await screen.findByRole("link", { name: "Edit Depot" }),
    ).toHaveAttribute("href", "/depots?scenarioId=30&edit=100");
  });

  it("shows an empty Scenario with its Depot and counts invalid coordinates without plotting them", async () => {
    mockReads({
      [ordersA]: page([]),
      [ordersB]: page([
        { ...orderB, latitude: 91 },
        { ...orderB, id: "2001", orderCode: "QA-B2", longitude: undefined },
      ]),
    });
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    expect(
      await screen.findByText("Belum ada Order pada Scenario ini."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Depot Gudang A" }),
    ).toBeInTheDocument();

    await selectScenario("Scenario B", "20");
    expect(await screen.findByText("2 Order aktual")).toBeInTheDocument();
    expect(screen.getByText("0 koordinat valid")).toBeInTheDocument();
    expect(screen.getByText("2 koordinat tidak valid")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Depot Gudang B" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Order QA-B/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Depot Gudang A" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("QA-B2")).toBeInTheDocument();
  });

  it("aborts an old request and ignores its result when a new Scenario is selected", async () => {
    let finish!: (response: unknown) => void;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const fetchMock = mockReads({ [ordersA]: pending });
    render(<MapManager />);
    await selectScenario("Scenario A", "10");
    expect(screen.getByText("Memuat data peta...")).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([path]) => path === ordersA)).toBe(
        true,
      ),
    );
    const oldCall = fetchMock.mock.calls.find(([path]) => path === ordersA);

    await selectScenario("Scenario B", "20");
    expect(
      await screen.findByRole("button", { name: "Order QA-B" }),
    ).toBeInTheDocument();
    expect(oldCall?.[1].signal?.aborted).toBe(true);
    await act(async () => {
      finish(page([orderA]));
    });
    expect(
      screen.getByRole("button", { name: "Order QA-B" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("QA-A")).not.toBeInTheDocument();
  });

  it.each([
    page([orderB]),
    page([orderA], "1000"),
    Response.json({ error: { code: "UNAVAILABLE" } }, { status: 503 }),
  ])(
    "fails closed for foreign Orders or a failed page without showing a partial list",
    async (response) => {
      mockReads({
        [ordersA]: response,
        [ordersA + "&after=1000"]: Response.json({}, { status: 503 }),
      });
      render(<MapManager />);
      await selectScenario("Scenario A", "10");
      expect(
        await screen.findByText("Data peta gagal dimuat."),
      ).toBeInTheDocument();
      expect(screen.queryByText("QA-A")).not.toBeInTheDocument();
      expect(screen.queryByText("QA-B")).not.toBeInTheDocument();
    },
  );

  it("keeps the text list and attribution available when a tile fails", async () => {
    mockReads();
    const { container } = render(<MapManager />);
    await selectScenario("Scenario A", "10");
    await screen.findByRole("button", { name: "Order QA-A" });
    const tile = container.querySelector("img.leaflet-tile");
    expect(tile).toHaveAttribute(
      "src",
      expect.stringContaining("https://tile.openstreetmap.org/"),
    );
    fireEvent.error(tile!);
    expect(
      await screen.findByText(/tile peta gagal dimuat/),
    ).toBeInTheDocument();
    expect(screen.getByText("QA-A")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "OpenStreetMap" }),
    ).toBeInTheDocument();
  });
});
