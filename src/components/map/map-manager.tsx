"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { localMapDemoId, osrmOrderLimit, type MapRouteMode } from "@/lib/validation/map-road-route";
import {
  readMapRoadRoute,
  readScenarioMap,
  readScenarioOptions,
  type ScenarioMapData,
  type ScenarioOption,
} from "./map-data";
import { mapRouteFailure, type MapRouteOutcome } from "./map-route";
import { MapRoutePanel, type MapRouteState } from "./map-route-panel";

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

function MapResults({
  data,
  reload,
  osrmEnabled,
}: { data: ScenarioMapData; reload: () => void; osrmEnabled: boolean }) {
  const [route, setRoute] = useState<MapRouteState>({ status: "idle" });
  const [routeMode, setRouteMode] = useState<MapRouteMode>("haversine");
  const isDemo = data.scenarioId === localMapDemoId;
  const mode = osrmEnabled ? routeMode : "haversine";
  const active = useRef<{ cancel?: () => void } | null>(null);
  const visitOrder = route.status === "ready"
    ? route.route.stops.slice(1, -1).map(({ id }) => id)
    : undefined;
  const routePositions = route.status === "ready"
    ? mode === "osrm"
      ? route.roadPositions ?? undefined
      : route.route.stops.map(({ position }) => position)
    : undefined;

  const cancelOptimization = useCallback(() => {
    const job = active.current;
    active.current = null;
    job?.cancel?.();
  }, []);
  useEffect(() => cancelOptimization, [cancelOptimization]);

  function chooseMode(next: MapRouteMode) {
    cancelOptimization();
    setRouteMode(next);
    setRoute({ status: "idle" });
  }

  function optimize() {
    if (active.current || data.orders.length === 0) return;
    if (mode === "osrm") {
      if (data.orders.length > osrmOrderLimit) return;
      if (!data.depot.position || data.orders.some((order) => !order.position)) {
        setRoute({ status: "error", message: "Koordinat Depot atau Order tidak valid untuk OSRM." });
        return;
      }
    }
    const job: { cancel?: () => void } = {};
    active.current = job;
    setRoute({ status: "loading" });

    function finish(outcome: MapRouteState) {
      if (active.current !== job) return;
      cancelOptimization();
      setRoute(outcome);
    }

    if (mode === "osrm") {
      const controller = new AbortController();
      job.cancel = () => controller.abort();
      void readMapRoadRoute(data, controller.signal).then(
        (result) => finish({ status: "ready", route: result.route, roadPositions: result.positions }),
        (error: Error) => finish({ status: "error", message: error.message }),
      );
      return;
    }

    const failure: MapRouteOutcome = {
      status: "error",
      message: mapRouteFailure,
    };
    try {
      // Turbopack bootstraps this worker with importScripts.
      const worker = new Worker(
        new URL("./map-route-worker.ts", import.meta.url),
      );
      job.cancel = () => worker.terminate();
      worker.onmessage = (event: MessageEvent<MapRouteOutcome>) =>
        finish(event.data);
      worker.onerror = () => finish(failure);
      worker.onmessageerror = () => finish(failure);
      worker.postMessage(data);
    } catch {
      finish(failure);
    }
  }

  const validOrders = data.orders.filter(
    (order) => order.position !== null,
  ).length;
  return (
    <>
      <ul
        aria-label="Ringkasan Order"
        className="flex flex-wrap gap-x-5 gap-y-2 border-y border-gray-200 py-3 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"
      >
        <li className="font-semibold">{data.orders.length} Order {isDemo ? "sintetis" : "aktual"}</li>
        <li>{validOrders} koordinat valid</li>
        <li>{data.orders.length - validOrders} koordinat tidak valid</li>
      </ul>

      <MapRoutePanel
        state={route}
        orderCount={data.orders.length}
        mode={mode}
        onModeChange={osrmEnabled ? chooseMode : undefined}
        optimize={optimize}
        reload={reload}
      />

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
                {visitOrder ? "1" : "O"}
              </span>{" "}
              {visitOrder ? "Urutan kunjungan Order" : "Order"}
            </span>
            {routePositions && (
              <span>
                <span aria-hidden="true" className="mr-1 inline-block w-5 align-middle border-t-2 border-dashed border-violet-600 dark:border-violet-400" />{" "}
                {mode === "osrm" ? "Rute jalan OSRM" : "Rute demo"}
              </span>
            )}
          </div>
          {data.depot.position || validOrders > 0 ? (
            <LeafletMap data={data} routePositions={routePositions} visitOrder={visitOrder} />
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
              {!isDemo && <Link
                className="inline-flex min-h-11 items-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                href="/depots"
                prefetch={false}
              >
                Kelola Depot
              </Link>}
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
              {!isDemo && <Link
                className="inline-flex min-h-11 items-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                href="/orders"
                prefetch={false}
              >
                Kelola Order
              </Link>}
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

function SelectedScenarioMap({
  scenarioId,
  osrmEnabled,
}: { scenarioId: string; osrmEnabled: boolean }) {
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

  function reload() {
    setMap({ status: "loading" });
    setAttempt((current) => current + 1);
  }

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
        retry={reload}
      />
    );
  return <MapResults data={map.data} reload={reload} osrmEnabled={osrmEnabled} />;
}

export default function MapManager({
  initialScenarioId = "",
  osrmEnabled = false,
  testingOsrmScenarioIds,
  demoScenario,
}: {
  initialScenarioId?: string;
  osrmEnabled?: boolean;
  testingOsrmScenarioIds?: readonly string[];
  demoScenario?: ScenarioMapData;
} = {}) {
  const [scenarioAttempt, setScenarioAttempt] = useState<number | null>(() =>
    demoScenario && (!initialScenarioId || initialScenarioId === localMapDemoId) ? null : 0,
  );
  const [scenarios, setScenarios] = useState<Load<ScenarioOption[]> | { status: "idle" }>({
    status: scenarioAttempt === null ? "idle" : "loading",
  });
  const [selectedId, setSelectedId] = useState(initialScenarioId);
  const [demoAttempt, setDemoAttempt] = useState(0);

  useEffect(() => {
    if (scenarioAttempt === null) return;
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

  function loadDatabaseScenarios() {
    setScenarios({ status: "loading" });
    setScenarioAttempt((attempt) => (attempt ?? -1) + 1);
  }

  const databaseOptions = scenarios.status === "ready" ? scenarios.data : [];
  const loadingScenarios = (
    <p role="status" className="text-sm">Memuat daftar Scenario...</p>
  );
  const scenarioListError = (
    <LoadError message="Daftar Scenario gagal dimuat." retry={loadDatabaseScenarios} />
  );
  if (!demoScenario) {
    if (scenarios.status === "loading") return loadingScenarios;
    if (scenarios.status === "error") return scenarioListError;
    if (databaseOptions.length === 0) return <p className="text-sm">Belum ada Scenario.</p>;
  }
  const demoSelected = demoScenario && selectedId === localMapDemoId;
  const activeId = demoSelected || databaseOptions.some(({ id }) => id === selectedId)
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
          {demoScenario && (
            <option value={localMapDemoId}>
              {testingOsrmScenarioIds ? "Scenario Demo Testing" : "Scenario Demo Lokal"}
            </option>
          )}
          {databaseOptions.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </div>

      {scenarios.status === "idle" && (
        <button type="button" className="min-h-11 text-sm font-medium underline" onClick={loadDatabaseScenarios}>
          Muat daftar Scenario database
        </button>
      )}
      {scenarios.status === "loading" && loadingScenarios}
      {scenarios.status === "error" && scenarioListError}

      {demoSelected ? (
        <MapResults
          key={demoAttempt}
          data={demoScenario}
          reload={() => setDemoAttempt((attempt) => attempt + 1)}
          osrmEnabled={osrmEnabled}
        />
      ) : activeId ? (
        <SelectedScenarioMap
          key={activeId}
          scenarioId={activeId}
          osrmEnabled={osrmEnabled && (testingOsrmScenarioIds?.includes(activeId) ?? true)}
        />
      ) : selectedId && scenarios.status === "ready" ? (
        <p role="alert">Scenario pada tautan tidak ditemukan.</p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Pilih Scenario untuk melihat Depot dan Order.
        </p>
      )}
    </div>
  );
}
