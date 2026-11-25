"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/ui/button/Button";
import type { BenchmarkHistoryPage } from "@/lib/validation/benchmark-case";
import { useBenchmarkRead } from "./benchmark-client";
import { FrozenTime } from "./benchmark-snapshot";

export default function BenchmarkCaseHistory() {
  const [after, setAfter] = useState<string | null>(null);
  const { result, refresh } = useBenchmarkRead<BenchmarkHistoryPage>(
    "/api/benchmark-cases" +
      (after ? "?after=" + encodeURIComponent(after) : ""),
    Array.isArray,
  );
  const page = result && "data" in result ? result.data : undefined;
  const next = page?.nextCursor;
  return (
    <>
      {!result && <p role="status">Memuat riwayat…</p>}
      {result && "error" in result && (
        <p role="alert" className="text-error-600 dark:text-error-400">
          Riwayat Benchmark Case belum dapat dimuat.
        </p>
      )}
      {page &&
        (page.data.length === 0 ? (
          <p>Belum ada Benchmark Case.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Riwayat Benchmark Case</caption>
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {[
                    "Scenario",
                    "Order aktual",
                    "Total points",
                    "Waktu freeze",
                    "SHA-256 input",
                  ].map((column) => (
                    <th key={column} scope="col" className="p-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.data.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="p-3">
                      <Link
                        className="font-medium text-brand-600 underline dark:text-brand-400"
                        href={"/benchmark-cases/" + item.id}
                      >
                        {item.scenarioName}
                      </Link>
                      <div className="mt-1 text-gray-600 dark:text-gray-400">
                        Case #{item.id} · Scenario #{item.scenarioId}
                      </div>
                    </td>
                    <td className="p-3 tabular-nums">
                      {item.actualOrderCount}
                    </td>
                    <td className="p-3 tabular-nums">{item.pointCount}</td>
                    <td className="p-3 whitespace-nowrap">
                      <FrozenTime value={item.frozenAt} />
                    </td>
                    <td className="min-w-40 p-3 break-all font-mono">
                      {item.inputHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!result}
          onClick={refresh}
        >
          Muat ulang riwayat
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!after || !result}
          onClick={() => setAfter(null)}
        >
          Halaman pertama
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!next}
          onClick={() => next && setAfter(next)}
        >
          Berikutnya
        </Button>
      </div>
    </>
  );
}
