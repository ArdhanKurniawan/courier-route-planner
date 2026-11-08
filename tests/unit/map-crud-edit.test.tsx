import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DepotPage from "@/app/(admin)/depots/page";
import MapPage from "@/app/(admin)/map/page";
import OrderPage from "@/app/(admin)/orders/page";
import { orderDtoFixture as order } from "../fixtures/order";
import { scenarioDtoFixture as scenario } from "../fixtures/scenario";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/security/admin", () => ({ requireAdmin: vi.fn() }));

const depot = {
  id: scenario.depotId,
  name: "Depot sintetis",
  address: null,
  latitude: -6.9,
  longitude: 110.4,
  isActive: true,
  createdAt: scenario.createdAt,
  updatedAt: scenario.updatedAt,
};
const scenarioPath = `/api/scenarios/${scenario.id}`;
const orderPath = `${scenarioPath}/orders/${order.id}`;
const depotPath = `/api/depots/${depot.id}`;
const empty = { data: [], nextCursor: null, totalCount: "0" };

function mockFetch(overrides: Record<string, unknown> = {}) {
  const records: Record<string, unknown> = {
    [depotPath]: { data: depot },
    [scenarioPath]: { data: scenario },
    [orderPath]: { data: order },
    "/api/depots": empty,
    "/api/scenarios?limit=100": empty,
    [`${scenarioPath}/orders`]: empty,
    ...overrides,
  };
  const network = vi.fn(async (path: string, init?: RequestInit) => {
    const record = records[path];
    const reply = typeof record === "function" ? record(init) : record;
    if (!Object.hasOwn(records, path)) throw Error("Unexpected API request");
    if (init?.method === "PUT") return Response.json(reply);
    return reply instanceof Response ? reply.clone() : Response.json(reply);
  });
  vi.stubGlobal("fetch", network);
  return network;
}

afterEach(() => {
  vi.unstubAllGlobals();
  router.replace.mockClear();
  window.history.replaceState(null, "", "/");
});

it("retains the exact Order after a failed list read and retry", async () => {
  let listAttempts = 0;
  mockFetch({
    [`${scenarioPath}/orders`]: () =>
      ++listAttempts === 1 ? new Response(null, { status: 503 }) : empty,
  });
  render(
    await OrderPage({
      searchParams: Promise.resolve({
        edit: order.id,
        scenarioId: scenario.id,
      }),
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Daftar Order");
  expect(
    screen.queryByRole("button", { name: "Tambah Order" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Muat ulang Order" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Simpan perubahan" }),
    ).toBeEnabled(),
  );
  expect(screen.getByLabelText("Kode Order")).toHaveValue(order.orderCode);
});

it("treats a Depot update acknowledgement for a different record as uncertain", async () => {
  mockFetch({
    [depotPath]: (init?: RequestInit) => ({
      data: init?.method === "PUT" ? { ...depot, id: "7" } : depot,
    }),
  });
  render(
    await DepotPage({ searchParams: Promise.resolve({ edit: depot.id }) }),
  );
  const save = await screen.findByRole("button", { name: "Simpan perubahan" });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.click(save);
  expect(await screen.findByRole("alert")).toHaveTextContent("belum pasti");
  expect(save).toBeDisabled();
});

it("redirects to login if the detail read finds an expired session", async () => {
  mockFetch({ [depotPath]: new Response(null, { status: 401 }) });
  render(
    await DepotPage({ searchParams: Promise.resolve({ edit: depot.id }) }),
  );
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});

it("opens and updates the exact Depot outside the current list page", async () => {
  const network = mockFetch();
  render(
    await DepotPage({
      searchParams: Promise.resolve({
        edit: depot.id,
        scenarioId: scenario.id,
      }),
    }),
  );
  const form = await screen.findByRole("form", { name: "Form depot" });
  expect(within(form).getByLabelText("Nama")).toHaveValue(depot.name);
  expect(screen.getByRole("link", { name: "Kembali ke Map" })).toHaveAttribute(
    "href",
    `/map?scenarioId=${scenario.id}`,
  );
  fireEvent.change(within(form).getByLabelText("Latitude"), {
    target: { value: "-7" },
  });
  fireEvent.click(
    await within(form).findByRole("button", { name: "Simpan perubahan" }),
  );
  expect(
    await screen.findByText("Perubahan depot tersimpan."),
  ).toBeInTheDocument();
  const writes = network.mock.calls.filter(
    ([, init]) => init?.method === "PUT",
  );
  expect(writes).toHaveLength(1);
  expect(writes[0][0]).toBe(depotPath);
  expect(JSON.parse(writes[0][1]!.body as string).latitude).toBe(-7);
});

it("opens and updates the exact Order under its Scenario even outside both list pages", async () => {
  const network = mockFetch();
  render(
    await OrderPage({
      searchParams: Promise.resolve({
        edit: order.id,
        scenarioId: scenario.id,
      }),
    }),
  );
  const form = await screen.findByRole("form", { name: "Form Order" });
  expect(within(form).getByLabelText("Kode Order")).toHaveValue(
    order.orderCode,
  );
  expect(screen.getByRole("combobox", { name: "Scenario" })).toHaveValue(
    scenario.id,
  );
  fireEvent.change(within(form).getByLabelText("Longitude"), {
    target: { value: "110.5" },
  });
  fireEvent.click(
    await within(form).findByRole("button", { name: "Simpan perubahan" }),
  );
  expect(
    await screen.findByText("Perubahan Order tersimpan."),
  ).toBeInTheDocument();
  const writes = network.mock.calls.filter(
    ([, init]) => init?.method === "PUT",
  );
  expect(writes).toHaveLength(1);
  expect(writes[0][0]).toBe(orderPath);
  expect(JSON.parse(writes[0][1]!.body as string).longitude).toBe(110.5);
});

it("rejects duplicate or malformed IDs before reading record data", async () => {
  const network = mockFetch();
  const depotPage = await DepotPage({
    searchParams: Promise.resolve({ edit: [depot.id, depot.id] }),
  });
  const orderPage = await OrderPage({
    searchParams: Promise.resolve({ edit: order.id, scenarioId: "../2" }),
  });
  render(
    <>
      {depotPage}
      {orderPage}
    </>,
  );
  expect(screen.getAllByRole("alert")).toHaveLength(2);
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(network).not.toHaveBeenCalled();
});

it.each([
  new Response(null, { status: 404 }),
  new Response(null, { status: 403 }),
  { data: { ...order, scenarioId: "2" } },
])(
  "fails closed when the Order is unavailable or belongs to another Scenario",
  async (reply) => {
    mockFetch({ [orderPath]: reply });
    render(
      await OrderPage({
        searchParams: Promise.resolve({
          edit: order.id,
          scenarioId: scenario.id,
        }),
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Order.*tidak dapat/i,
    );
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  },
);

it("loads the Scenario from the Map URL and replaces that choice on selection", async () => {
  const mapOrder = { ...order, latitude: -6.97, longitude: 110.56 };
  const network = mockFetch({
    "/api/scenarios?limit=100": { data: [scenario], nextCursor: null },
    [`${scenarioPath}/orders?limit=100`]: { ...empty, data: [mapOrder] },
  });
  window.history.replaceState(null, "", `/map?scenarioId=${scenario.id}`);
  render(
    await MapPage({
      searchParams: Promise.resolve({ scenarioId: scenario.id }),
    }),
  );
  expect(await screen.findByText("1 Order aktual")).toBeInTheDocument();
  fireEvent.click(
    await screen.findByRole("button", { name: `Order ${order.orderCode}` }),
  );
  expect(await screen.findByText("-6.97, 110.56")).toBeInTheDocument();
  expect(network.mock.calls.map(([path]) => path)).toContain(
    `${scenarioPath}/orders?limit=100`,
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Scenario" }), {
    target: { value: "" },
  });
  expect(window.location.search).toBe("");
  expect(screen.queryByText("1 Order aktual")).not.toBeInTheDocument();
});
