import type { MapRouteOutcome } from "./map-route";

export type MapRouteState = MapRouteOutcome | { status: "idle" | "loading" };

const meters = new Intl.NumberFormat("id-ID", {
  style: "unit",
  unit: "meter",
  maximumFractionDigits: 1,
});

export function MapRoutePanel({
  state,
  hasOrders,
  optimize,
  reload,
}: {
  state: MapRouteState;
  hasOrders: boolean;
  optimize: () => void;
  reload: () => void;
}) {
  const loading = state.status === "loading";
  const route = state.status === "ready" ? state.route : null;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!hasOrders || loading}
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
        Estimasi garis lurus (Haversine) untuk demo. Benchmark formal
        menggunakan matriks jaringan jalan.
      </p>
      {!hasOrders && <p className="text-sm">Tambahkan Order untuk menghitung rute.</p>}
      {loading && <p role="status" className="text-sm">Menghitung rute...</p>}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-800 dark:text-red-200">
          {state.message}
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
                  {meters.format(distance)}
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
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
