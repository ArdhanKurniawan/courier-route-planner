import {
  osrmOrderLimit,
  type MapRoadResult,
  type MapRouteMode,
} from "@/lib/validation/map-road-route";
import type { MapRouteOutcome } from "./map-route";

export type MapRouteState =
  | (MapRouteOutcome & { roadPositions?: MapRoadResult["positions"] })
  | { status: "idle" | "loading" };

const meters = new Intl.NumberFormat("id-ID", {
  style: "unit",
  unit: "meter",
  maximumFractionDigits: 1,
});
const kilometers = new Intl.NumberFormat("id-ID", {
  style: "unit",
  unit: "kilometer",
  maximumFractionDigits: 3,
});

function formatDistance(distanceM: number) {
  return distanceM < 1000
    ? meters.format(distanceM)
    : kilometers.format(distanceM / 1000);
}

export function MapRoutePanel({
  state,
  orderCount,
  mode,
  onModeChange,
  optimize,
  reload,
}: {
  state: MapRouteState;
  orderCount: number;
  mode: MapRouteMode;
  onModeChange?: (mode: MapRouteMode) => void;
  optimize: () => void;
  reload: () => void;
}) {
  const loading = state.status === "loading";
  const route = state.status === "ready" ? state.route : null;
  const tooManyOrders = mode === "osrm" && orderCount > osrmOrderLimit;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex flex-wrap items-center gap-2">
        {onModeChange && (
          <>
            <label htmlFor="map-route-mode" className="text-sm font-medium">
              Mode jarak
            </label>
            <select
              id="map-route-mode"
              value={mode}
              onChange={(event) => onModeChange(event.currentTarget.value === "osrm" ? "osrm" : "haversine")}
              className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-2 focus:outline-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="haversine">Garis Lurus (Haversine)</option>
              <option value="osrm">Jarak Jalan (OSRM)</option>
            </select>
          </>
        )}
        <button
          type="button"
          disabled={orderCount === 0 || tooManyOrders || loading}
          onClick={optimize}
          className="min-h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50"
        >
          Optimasi Rute (NN + 2-Opt)
        </button>
        <button
          type="button"
          onClick={reload}
          className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Muat ulang data peta
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {mode === "osrm"
          ? "Jarak jaringan jalan (OSRM). Saat optimasi dijalankan, koordinat Depot dan Order dikirim ke server publik FOSSGIS."
          : "Estimasi garis lurus (Haversine) untuk demo. Benchmark formal menggunakan matriks jaringan jalan."}
      </p>
      {mode === "osrm" && (
        <p className="text-xs text-gray-600 dark:text-gray-300">
          <a href="https://routing.openstreetmap.de/about.html" className="underline">OSRM/FOSSGIS</a>
          {" · "}
          <a href="https://www.openstreetmap.org/copyright" className="underline">© OpenStreetMap contributors</a>
          {" · "}
          <a href="https://www.openstreetmap.org/fixthemap" className="underline">Perbaiki peta</a>
        </p>
      )}
      {orderCount === 0 && <p className="text-sm">Tambahkan Order untuk menghitung rute.</p>}
      {tooManyOrders && (
        <p className="text-sm">Demo OSRM mendukung maksimal {osrmOrderLimit} Order per Scenario.</p>
      )}
      {loading && <p role="status" className="text-sm">Menghitung rute...</p>}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-800 dark:text-red-200">
          {state.message}
        </p>
      )}
      {mode === "osrm" && state.status === "ready" && state.roadPositions === null && (
        <p role="status" className="text-sm text-amber-800 dark:text-amber-300">
          Geometri rute jalan belum tersedia. Jarak dan urutan kunjungan tetap tersedia.
        </p>
      )}
      {route && (
        <div className="grid gap-4 border-t border-gray-200 pt-3 lg:grid-cols-2 dark:border-gray-800">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            {([
              ["Jarak NN awal", route.nnInitialDistanceM],
              ["Jarak Hybrid", route.totalDistanceM],
              ["Selisih jarak", route.savingsM],
            ] as const).map(([label, distance]) => (
              <div key={label}>
                <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
                <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatDistance(distance)}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="text-sm font-semibold">Urutan kunjungan</h3>
            <ol
              aria-label="Urutan kunjungan"
              tabIndex={0}
              className="mt-1 max-h-48 list-decimal space-y-1 overflow-y-auto pl-6 text-sm text-gray-700 focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-gray-300"
            >
              {route.stops.map((stop, index) => (
                <li key={`${index}-${stop.id}`} className="break-words">
                  {index === route.stops.length - 1 ? "Kembali ke " : ""}
                  {stop.label}
                  {index > 0 && (
                    <span className="ml-2 whitespace-nowrap tabular-nums text-gray-600 dark:text-gray-400">
                      <span aria-hidden="true">· </span>
                      <span className="sr-only">Jarak dari pemberhentian sebelumnya </span>
                      {formatDistance(route.legDistancesM[index - 1])}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
