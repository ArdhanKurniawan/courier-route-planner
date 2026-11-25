import type { BenchmarkInputSnapshot } from "@/domain/benchmark-input";

export function FrozenTime({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {value.replace("T", " ").replace(/Z$/u, " UTC")}
    </time>
  );
}

export default function BenchmarkSnapshot({
  snapshot,
}: {
  snapshot: BenchmarkInputSnapshot;
}) {
  const { scenario, nodes, provenance } = snapshot;
  const mismatch =
    snapshot.configuredCustomerCount !== snapshot.actualOrderCount;
  const values = [
    ["Scenario", scenario.name],
    ["Depot", nodes[0].name],
    ["Pelanggan (konfigurasi)", snapshot.configuredCustomerCount],
    ["Order aktual", snapshot.actualOrderCount],
    ["Total points", snapshot.pointCount],
    ["Versi input", snapshot.version],
  ];
  return (
    <div className="space-y-5">
      <dl className="grid gap-4 rounded-xl border border-gray-200 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3 dark:border-gray-700">
        {values.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-gray-600 dark:text-gray-400">{label}</dt>
            <dd className="mt-1 break-words font-semibold text-gray-900 dark:text-white">
              {value}
            </dd>
          </div>
        ))}
        <div className="min-w-0 sm:col-span-2 lg:col-span-3">
          <dt className="text-gray-600 dark:text-gray-400">SHA-256 input</dt>
          <dd className="mt-1 break-all font-mono text-gray-900 dark:text-white">
            {snapshot.inputHash}
          </dd>
        </div>
      </dl>
      {mismatch && (
        <p className="rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-800 dark:bg-warning-500/15 dark:text-warning-300">
          Jumlah pelanggan konfigurasi berbeda dari jumlah Order aktual.
          Snapshot menggunakan seluruh Order aktual.
        </p>
      )}
      <details className="rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-700">
        <summary className="cursor-pointer font-semibold">
          Metadata dan provenance
        </summary>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt>Scenario ID</dt>
            <dd>{scenario.id}</dd>
          </div>
          <div>
            <dt>Depot ID</dt>
            <dd>{nodes[0].id}</dd>
          </div>
          <div>
            <dt>Pola distribusi</dt>
            <dd>{scenario.distributionPattern}</dd>
          </div>
          <div>
            <dt>Radius (m)</dt>
            <dd>
              {scenario.radiusMinM ?? "—"}–{scenario.radiusMaxM ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Seed</dt>
            <dd>{scenario.generationSeed ?? "—"}</dd>
          </div>
          <div>
            <dt>Versi generator</dt>
            <dd>{scenario.generatorVersion ?? "Tidak diketahui"}</dd>
          </div>
          {provenance.benchmarkCaseId && (
            <div>
              <dt>Benchmark Case ID</dt>
              <dd>{provenance.benchmarkCaseId}</dd>
            </div>
          )}
          {provenance.frozenAt && (
            <div>
              <dt>Waktu freeze</dt>
              <dd>
                <FrozenTime value={provenance.frozenAt} />
              </dd>
            </div>
          )}
          {provenance.gitCommitSha && (
            <div>
              <dt>Git commit</dt>
              <dd className="break-all font-mono">{provenance.gitCommitSha}</dd>
            </div>
          )}
        </dl>
      </details>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Urutan node snapshot</caption>
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr>
              {[
                "Indeks",
                "Jenis",
                "ID sumber",
                "Nama",
                "Latitude",
                "Longitude",
              ].map((column) => (
                <th key={column} scope="col" className="p-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr
                key={node.index}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <td className="p-3 tabular-nums">{node.index}</td>
                <td className="p-3">
                  {node.kind === "depot" ? "Depot" : "Order"}
                </td>
                <td className="p-3 whitespace-nowrap">{node.id}</td>
                <td className="p-3">
                  {node.kind === "depot" ? node.name : node.customerName}
                  {node.kind === "order" && (
                    <div className="mt-1 text-gray-600 dark:text-gray-400">
                      {node.orderCode}
                    </div>
                  )}
                </td>
                <td className="p-3 tabular-nums">{node.latitude}</td>
                <td className="p-3 tabular-nums">{node.longitude}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
