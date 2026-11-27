"use client";

import { useEffect, useRef, useState } from "react";
import { useBenchmarkRead } from "@/components/benchmark-cases/benchmark-client";
import { FrozenTime } from "@/components/benchmark-cases/benchmark-snapshot";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DistanceMatrixPage,
  DistanceMatrixSummary,
  StoredDistanceMatrix,
} from "@/lib/validation/distance-matrix";
import { isStoredMatrix, useMatrixGeneration } from "./distance-matrix-client";
import DistanceMatrixSnapshot from "./distance-matrix-snapshot";

const errorClass = "text-sm text-error-600 dark:text-error-400";
const mutedClass = "text-sm text-gray-600 dark:text-gray-400";
const cellClass = "p-3 whitespace-nowrap";

function isMatrixHistory(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (item: DistanceMatrixSummary | null) =>
        item?.provider === "osrm" &&
        typeof item.id === "string" &&
        typeof item.profile === "string" &&
        typeof item.generatedAt === "string" &&
        typeof item.matrixHash === "string" &&
        Number.isInteger(item.pointCount),
    )
  );
}

function MatrixHistory({
  items,
  select,
}: {
  items: DistanceMatrixSummary[];
  select: (id: string) => void;
}) {
  if (items.length === 0) return <p>Belum ada distance matrix.</p>;

  return (
    <div
      role="region"
      aria-label="Riwayat distance matrix"
      tabIndex={0}
      className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand-500"
    >
      <Table className="text-left text-sm">
        <caption className="sr-only">Riwayat distance matrix</caption>
        <TableHeader className="border-b border-gray-200 dark:border-gray-700">
          <TableRow>
            {["Snapshot", "Provider / profil", "Titik", "Waktu pembuatan", "SHA-256 matriks"].map(
              (column) => (
                <th key={column} scope="col" className={cellClass}>{column}</th>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className={cellClass}>
                <Button size="sm" variant="outline" onClick={() => select(item.id)}>
                  Lihat matriks #{item.id}
                </Button>
              </td>
              <td className={cellClass}>OSRM / {item.profile}</td>
              <td className={cellClass}>{item.pointCount}</td>
              <td className={cellClass}><FrozenTime value={item.generatedAt} /></td>
              <td className="min-w-40 p-3 break-all font-mono">{item.matrixHash}</td>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MatrixDetail({
  url,
  caseId,
  matrixId,
  inputHash,
  pointCount,
}: {
  url: string;
  caseId: string;
  matrixId: string;
  inputHash: string;
  pointCount: number;
}) {
  const { result, refresh } = useBenchmarkRead<{ data: StoredDistanceMatrix }>(
    url + "/" + encodeURIComponent(matrixId),
    isStoredMatrix,
  );
  if (!result) return <p role="status">Memuat detail matriks…</p>;
  const snapshot = "data" in result ? result.data.data : undefined;
  if (
    !snapshot ||
    snapshot.id !== matrixId ||
    snapshot.benchmarkCaseId !== caseId ||
    snapshot.inputHash !== inputHash ||
    snapshot.nodeOrder.length !== pointCount
  )
    return (
      <div className="space-y-3">
        <p role="alert" className={errorClass}>
          Detail matriks belum dapat dimuat.
        </p>
        <Button size="sm" variant="outline" onClick={refresh}>
          Muat ulang detail matriks
        </Button>
      </div>
    );
  return <DistanceMatrixSnapshot snapshot={snapshot} />;
}

export default function DistanceMatrixPanel({
  caseId,
  inputHash,
  pointCount,
}: {
  caseId: string;
  inputHash: string;
  pointCount: number;
}) {
  const url = "/api/benchmark-cases/" + encodeURIComponent(caseId) + "/distance-matrices";
  const [after, setAfter] = useState<string | null>(null);
  const [selection, setSelection] = useState<
    { id: string } | { snapshot: StoredDistanceMatrix }
  >();
  const detailRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selection) detailRegion.current?.focus();
  }, [selection]);

  const history = useBenchmarkRead<
    DistanceMatrixPage & { generationAvailable: boolean }
  >(url + (after ? "?" + new URLSearchParams({ after }) : ""), isMatrixHistory);
  const historyPage =
    history.result && "data" in history.result ? history.result.data : undefined;
  const page =
    typeof historyPage?.generationAvailable === "boolean" &&
    (historyPage.nextCursor === null || typeof historyPage.nextCursor === "string")
      ? historyPage
      : undefined;
  const generation = useMatrixGeneration({
    url,
    caseId,
    inputHash,
    pointCount,
    available: page?.generationAvailable === true,
    onSaved: (snapshot) => {
      setSelection({ snapshot });
      setAfter(null);
      history.refresh();
    },
  });

  return (
    <section
      aria-labelledby="distance-matrix-heading"
      className="min-w-0 space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700"
    >
      <h2 id="distance-matrix-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
        Distance matrix
      </h2>
      <p className={mutedClass}>
        Buat snapshot jarak jalan OSRM dari {pointCount} titik yang tersimpan
        di Benchmark Case ini.
      </p>
      {page?.generationAvailable === false && !generation.error && (
        <p role="status" className={mutedClass}>
          Pembuatan distance matrix dinonaktifkan.
        </p>
      )}
      {generation.pending && !generation.operation && (
        <p role="status" className={mutedClass}>
          Request pembuatan tersimpan. Periksa hasil sebelum membuat matriks baru.
        </p>
      )}
      {generation.invalidStorage && (
        <p role="alert" className={errorClass}>
          Identitas request tidak dapat dibaca dari penyimpanan browser.
        </p>
      )}
      {generation.error && (
        <p role="alert" className={errorClass}>{generation.error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!generation.canGenerate}
          onClick={() => void generation.generate()}
        >
          {generation.operation === "generate"
            ? "Membuat distance matrix…"
            : "Buat distance matrix"}
        </Button>
        {generation.pending && (
          <Button
            size="sm"
            variant="outline"
            disabled={!!generation.operation}
            onClick={() => void generation.recover()}
          >
            {generation.operation === "recover"
              ? "Memeriksa hasil…"
              : "Periksa hasil pembuatan"}
          </Button>
        )}
      </div>
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Riwayat distance matrix
        </h3>
        {!history.result && <p role="status">Memuat riwayat matriks…</p>}
        {history.result && !page && (
          <p role="alert" className={errorClass}>
            Riwayat distance matrix belum dapat dimuat.
          </p>
        )}
        {page && <MatrixHistory items={page.data} select={(id) => setSelection({ id })} />}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!history.result || !!generation.operation}
            onClick={() => {
              generation.clearFeedback();
              history.refresh();
            }}
          >
            Muat ulang riwayat matriks
          </Button>
          {after && (
            <Button size="sm" variant="outline" onClick={() => setAfter(null)}>
              Halaman pertama
            </Button>
          )}
          {page?.nextCursor && (
            <Button size="sm" variant="outline" onClick={() => setAfter(page.nextCursor)}>
              Matriks berikutnya
            </Button>
          )}
        </div>
      </div>
      {selection && (
        <div
          ref={detailRegion}
          tabIndex={-1}
          role="region"
          aria-label="Detail snapshot distance matrix"
          className="space-y-3 rounded-xl focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {"snapshot" in selection ? (
            <>
              <p role="status" className="text-sm text-success-700 dark:text-success-400">
                Distance matrix tersimpan.
              </p>
              <DistanceMatrixSnapshot snapshot={selection.snapshot} />
            </>
          ) : (
            <MatrixDetail
              key={selection.id}
              url={url}
              caseId={caseId}
              matrixId={selection.id}
              inputHash={inputHash}
              pointCount={pointCount}
            />
          )}
        </div>
      )}
    </section>
  );
}
