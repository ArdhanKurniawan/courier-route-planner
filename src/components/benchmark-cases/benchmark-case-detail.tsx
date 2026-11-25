"use client";

import Link from "next/link";
import Button from "@/components/ui/button/Button";
import type { BenchmarkInputSnapshot } from "@/domain/benchmark-input";
import {
  BenchmarkResponseError,
  isSnapshot,
  useBenchmarkRead,
} from "./benchmark-client";
import BenchmarkSnapshot from "./benchmark-snapshot";

export default function BenchmarkCaseDetail({ caseId }: { caseId: string }) {
  const { result, refresh } = useBenchmarkRead<{
    data: BenchmarkInputSnapshot;
  }>("/api/benchmark-cases/" + encodeURIComponent(caseId), isSnapshot);
  return (
    <>
      <Link
        className="text-sm font-medium text-brand-600 underline dark:text-brand-400"
        href="/benchmark-cases"
      >
        Kembali ke riwayat
      </Link>
      {!result ? (
        <p role="status">Memuat Benchmark Case…</p>
      ) : "error" in result ? (
        <div className="space-y-3">
          <p role="alert" className="text-error-600 dark:text-error-400">
            {result.error instanceof BenchmarkResponseError &&
            result.error.status === 404
              ? "Benchmark Case tidak ditemukan."
              : "Benchmark Case belum dapat dimuat."}
          </p>
          <Button size="sm" variant="outline" onClick={refresh}>
            Muat ulang detail
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Data operasional tetap dapat diedit. Perubahan setelah freeze tidak
            mengubah snapshot ini. Scenario sumber yang masih direferensikan
            tidak dapat dihapus karena FK RESTRICT.
          </p>
          <BenchmarkSnapshot snapshot={result.data.data} />
        </>
      )}
    </>
  );
}
