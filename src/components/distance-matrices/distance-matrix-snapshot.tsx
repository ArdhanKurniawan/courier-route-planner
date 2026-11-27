import type { ReactNode } from "react";
import { FrozenTime } from "@/components/benchmark-cases/benchmark-snapshot";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StoredDistanceMatrix } from "@/lib/validation/distance-matrix";

const columnClass = "px-3 py-2 whitespace-nowrap";
const headerClass = "bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white";
const rowClass = "border-b border-gray-100 dark:border-gray-800";
const valueClass = "px-3 py-2 text-right tabular-nums";
const zeroPairPreviewLimit = 8;

function nodeLabel(node: StoredDistanceMatrix["nodeOrder"][number]) {
  return `${node.index} · ${node.kind === "depot" ? "Depot" : "Order"} #${node.id}`;
}

function MetadataList({ entries }: { entries: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      {entries.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-gray-600 dark:text-gray-400">{label}</dt>
          <dd className="mt-1 break-all font-medium text-gray-900 dark:text-white">
            {value ?? "Tidak tersedia"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ScrollableTable({
  label,
  children,
  bounded = false,
}: {
  label: string;
  children: ReactNode;
  bounded?: boolean;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={`overflow-auto rounded-lg border border-gray-200 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-700 ${bounded ? "max-h-96" : ""}`}
    >
      <Table className="border-separate border-spacing-0 text-left text-sm">
        <caption className="sr-only">{label}</caption>
        {children}
      </Table>
    </div>
  );
}

export default function DistanceMatrixSnapshot({
  snapshot,
}: {
  snapshot: StoredDistanceMatrix;
}) {
  const { nodeOrder, matrix, snapping, provenance, zeroPairs } = snapshot;
  const zeroPairCount = zeroPairs.length;
  const remainingZeroPairs = zeroPairCount - zeroPairPreviewLimit;
  const metadata: [string, ReactNode][] = [
    ["Provider", "OSRM"],
    ["Profil", snapshot.profile],
    ["Jumlah titik", nodeOrder.length],
    ["Waktu pembuatan", <FrozenTime key="time" value={provenance.generatedAt} />],
    ["SHA-256 input", <code key="input">{snapshot.inputHash}</code>],
    ["SHA-256 matriks", <code key="matrix">{snapshot.matrixHash}</code>],
  ];
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        Matriks #{snapshot.id}
      </h3>
      <MetadataList entries={metadata} />
      <details className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white">
          Provenance OSRM
        </summary>
        <MetadataList
          entries={[
            ["Endpoint OSRM", snapshot.endpoint],
            ["Versi API", provenance.apiVersion],
            ["Versi data", provenance.dataVersion],
            ["Versi software", provenance.softwareVersion],
            ["Ekstrak jaringan", provenance.networkExtract],
            ["Revisi kode", provenance.codeRevision],
          ]}
        />
      </details>
      <div className="space-y-1 text-sm">
        <p>Semua pasangan dapat dirutekan.</p>
        {snapshot.comparisonEligible ? (
          <p>ACO memenuhi syarat jarak. Semua pasangan antar titik memiliki jarak positif.</p>
        ) : (
          <>
            <p className="text-warning-700 dark:text-warning-400">
              ACO tidak memenuhi syarat jarak karena {zeroPairCount} pasangan antar
              titik memiliki jarak nol.
            </p>
            <ul className="list-disc space-y-1 pl-5" aria-label="Pasangan terarah berjarak nol">
              {zeroPairs.slice(0, zeroPairPreviewLimit).map(({ from, to }) => (
                <li key={`${from}:${to}`}>
                  Dari {nodeLabel(nodeOrder[from])} ke {nodeLabel(nodeOrder[to])}
                </li>
              ))}
            </ul>
            {remainingZeroPairs > 0 && (
              <p>{remainingZeroPairs} pasangan lainnya tercantum di tabel.</p>
            )}
          </>
        )}
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Jarak terarah (meter)</h4>
        <ScrollableTable label="Distance matrix terarah (meter)" bounded>
          <TableHeader>
            <TableRow>
              <th scope="col" className={`${columnClass} ${headerClass} sticky top-0 left-0 z-20`}>
                Titik asal dan tujuan
              </th>
              {nodeOrder.map((node) => (
                <th
                  key={node.index}
                  scope="col"
                  className={`${columnClass} ${headerClass} sticky top-0 z-10 text-right`}
                >
                  Ke {nodeLabel(node)}
                </th>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map((row, from) => (
              <TableRow key={from}>
                <th
                  scope="row"
                  className={`${columnClass} ${headerClass} ${rowClass} sticky left-0`}
                >
                  Dari {nodeLabel(nodeOrder[from])}
                </th>
                {row.map((distance, to) => (
                  <td key={to} className={`${valueClass} ${rowClass}`}>
                    {distance}
                  </td>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </ScrollableTable>
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Bukti snapping OSRM</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Radius snapping {snapshot.options.snapRadiusM} m. Koordinat berurutan
          latitude, longitude.
        </p>
        <ScrollableTable label="Bukti snapping OSRM">
          <TableHeader className={headerClass}>
            <TableRow>
              {[
                "Titik",
                "Koordinat awal",
                "Koordinat snap asal",
                "Deviasi asal (m)",
                "Koordinat snap tujuan",
                "Deviasi tujuan (m)",
              ].map((column) => (
                <th key={column} scope="col" className={columnClass}>
                  {column}
                </th>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {nodeOrder.map((node, index) => {
              const { source, destination } = snapping[index];
              return (
                <TableRow key={index} className={rowClass}>
                  <th scope="row" className={columnClass}>{nodeLabel(node)}</th>
                  <td className={columnClass}>{node.latitude}, {node.longitude}</td>
                  <td className={columnClass}>{source.latitude}, {source.longitude}</td>
                  <td className={valueClass}>{source.distanceM}</td>
                  <td className={columnClass}>{destination.latitude}, {destination.longitude}</td>
                  <td className={valueClass}>{destination.distanceM}</td>
                </TableRow>
              );
            })}
          </TableBody>
        </ScrollableTable>
      </div>
    </div>
  );
}
