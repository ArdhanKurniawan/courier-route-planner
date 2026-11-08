"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readScenarioMap,
  readScenarioOptions,
  type ScenarioMapData,
  type ScenarioOption,
} from "./map-data";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <p className="min-h-96 p-4 text-sm" role="status">
      Memuat peta...
    </p>
  ),
});

type Load<T> =
  { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
    >
      <p>{message}</p>
      <button
        type="button"
        className="mt-2 min-h-11 font-medium underline"
        onClick={retry}
      >
        Coba lagi
      </button>
    </div>
  );
}

function MapResults({ data }: { data: ScenarioMapData }) {
  const validOrders = data.orders.filter(
    (order) => order.position !== null,
  ).length;
  return (
    <>
      <ul
        aria-label="Ringkasan Order"
        className="flex flex-wrap gap-x-5 gap-y-2 border-y border-gray-200 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"
      >
        <li className="font-semibold">{data.orders.length} Order aktual</li>
        <li>{validOrders} koordinat valid</li>
        <li>{data.orders.length - validOrders} koordinat tidak valid</li>
      </ul>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="min-w-0 space-y-2">
          <div
            className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300"
            aria-label="Legenda marker"
          >
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block rounded-md bg-blue-700 px-2 text-white"
              >
                D
              </span>{" "}
              Depot
            </span>
            <span>
              <span
                aria-hidden="true"
                className="mr-1 inline-block rounded-full bg-teal-700 px-2 text-white"
              >
                O
              </span>{" "}
              Order
            </span>
          </div>
          {data.depot.position || validOrders > 0 ? (
            <LeafletMap data={data} />
          ) : (
            <p className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Tidak ada koordinat valid untuk ditampilkan pada peta.
            </p>
          )}
        </div>

        <aside
          aria-label="Daftar lokasi"
          className="min-w-0 rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <section className="border-b border-gray-200 p-4 dark:border-gray-800">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Depot
              </h3>
              <Link
                className="inline-flex min-h-11 items-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                href="/depots"
                prefetch={false}
              >
                Kelola Depot
              </Link>
            </div>
            <p className="break-words text-sm font-medium text-gray-800 dark:text-gray-200">
              {data.depot.name}
            </p>
            {data.depot.address && (
              <p className="break-words text-sm text-gray-600 dark:text-gray-400">
                {data.depot.address}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {data.depot.position?.join(", ") ??
                "Koordinat tidak valid atau tidak tersedia."}
            </p>
          </section>

          <section className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Order
              </h3>
              <Link
                className="inline-flex min-h-11 items-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                href="/orders"
                prefetch={false}
              >
                Kelola Order
              </Link>
            </div>
            {data.orders.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Belum ada Order pada Scenario ini.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-gray-200 overflow-y-auto dark:divide-gray-800">
                {data.orders.map((order) => (
                  <li key={order.id} className="break-words py-3 text-sm">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {order.orderCode}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {order.customerName}
                    </p>
                    {order.address && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {order.address}
                      </p>
                    )}
                    {!order.position && (
                      <p className="mt-1 text-amber-800 dark:text-amber-300">
                        Koordinat tidak valid atau tidak tersedia.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function SelectedScenarioMap({ scenarioId }: { scenarioId: string }) {
  const [map, setMap] = useState<Load<ScenarioMapData>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void readScenarioMap(scenarioId, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setMap({ status: "ready", data });
      },
      () => {
        if (controller.signal.aborted) return;
        controller.abort();
        setMap({ status: "error" });
      },
    );
    return () => controller.abort();
  }, [scenarioId, attempt]);

  if (map.status === "loading")
    return (
      <p role="status" className="text-sm">
        Memuat data peta...
      </p>
    );
  if (map.status === "error")
    return (
      <LoadError
        message="Data peta gagal dimuat."
        retry={() => {
          setMap({ status: "loading" });
          setAttempt((current) => current + 1);
        }}
      />
    );
  return <MapResults data={map.data} />;
}

export default function MapManager({
  initialScenarioId = "",
}: { initialScenarioId?: string } = {}) {
  const [scenarios, setScenarios] = useState<Load<ScenarioOption[]>>({
    status: "loading",
  });
  const [scenarioAttempt, setScenarioAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState(initialScenarioId);

  useEffect(() => {
    const controller = new AbortController();
    void readScenarioOptions(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setScenarios({ status: "ready", data });
      },
      () => {
        if (!controller.signal.aborted) setScenarios({ status: "error" });
      },
    );
    return () => controller.abort();
  }, [scenarioAttempt]);

  if (scenarios.status === "loading")
    return (
      <p role="status" className="text-sm">
        Memuat daftar Scenario...
      </p>
    );
  if (scenarios.status === "error")
    return (
      <LoadError
        message="Daftar Scenario gagal dimuat."
        retry={() => {
          setScenarios({ status: "loading" });
          setScenarioAttempt((attempt) => attempt + 1);
        }}
      />
    );
  if (scenarios.data.length === 0)
    return <p className="text-sm">Belum ada Scenario.</p>;
  const activeId = scenarios.data.some(({ id }) => id === selectedId)
    ? selectedId
    : "";

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <label
          htmlFor="map-scenario"
          className="mb-2 block text-sm font-medium text-gray-800 dark:text-gray-200"
        >
          Scenario
        </label>
        <select
          id="map-scenario"
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-2 focus:outline-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          value={activeId}
          onChange={(event) => {
            const id = event.currentTarget.value;
            setSelectedId(id);
            const url = new URL(window.location.href);
            if (id) url.searchParams.set("scenarioId", id);
            else url.searchParams.delete("scenarioId");
            window.history.replaceState(null, "", url);
          }}
        >
          <option value="">Pilih Scenario</option>
          {scenarios.data.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>

      {activeId ? (
        <SelectedScenarioMap key={activeId} scenarioId={activeId} />
      ) : selectedId ? (
        <p role="alert">Scenario pada tautan tidak ditemukan.</p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Pilih Scenario untuk melihat Depot dan Order.
        </p>
      )}
    </div>
  );
}
