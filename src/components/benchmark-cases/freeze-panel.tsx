"use client";

import Link from "next/link";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import type { BenchmarkInputSnapshot } from "@/domain/benchmark-input";
import {
  freezeRequest,
  type FreezeRequest,
} from "@/lib/validation/benchmark-case";
import { depotId } from "@/lib/validation/depot";
import {
  BenchmarkResponseError,
  fetchBenchmark,
  isSnapshot,
  useBenchmarkRead,
} from "./benchmark-client";
import BenchmarkSnapshot from "./benchmark-snapshot";

const storageEvent = "crp:pending-freeze-changed";
const pendingMessage =
  "Hasil freeze belum pasti. Periksa hasil dengan request yang sama.";
const rejectionMessages: Readonly<Record<string, string>> = {
  SOURCE_CHANGED:
    "Data Scenario berubah. Lakukan preview ulang sebelum konfirmasi.",
  SOURCE_INCOMPLETE:
    "Data Scenario belum terbaca lengkap. Lakukan preview ulang.",
  SOURCE_INVALID:
    "Scenario belum memenuhi syarat. Periksa Depot dan minimal satu Order.",
  DUMMY_OPERATION_PENDING:
    "Selesaikan operasi Dummy Generator yang masih aktif.",
  FREEZE_REQUEST_CONFLICT:
    "UUID sudah digunakan. Periksa riwayat Benchmark Case.",
  NOT_FOUND: "Scenario tidak ditemukan.",
  INVALID_INPUT: "Identitas request Freeze tidak valid.",
  UNAUTHORIZED: "Sesi berakhir. Silakan login kembali.",
  FORBIDDEN: "Akses Freeze ditolak.",
};

function listenPending(listener: () => void) {
  window.addEventListener(storageEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(storageEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function parsePending(raw: string | null | undefined, scenarioId: string) {
  if (!raw) return null;
  try {
    const parsed = freezeRequest.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.scenarioId === scenarioId
      ? parsed.data
      : null;
  } catch {
    return null;
  }
}

function confirmedCaseId(
  snapshot: BenchmarkInputSnapshot | null,
  request: FreezeRequest,
) {
  const id = depotId.safeParse(snapshot?.provenance?.benchmarkCaseId);
  if (
    !id.success ||
    snapshot?.scenario?.id !== request.scenarioId ||
    snapshot.inputHash !== request.expectedInputHash ||
    !snapshot.provenance.frozenAt
  )
    throw new Error("Unexpected freeze receipt.");
  return id.data;
}

export default function FreezePanel({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const key = "crp:pending-freeze:" + scenarioId;
  const readPending = useCallback(() => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return "";
    }
  }, [key]);
  const raw = useSyncExternalStore(listenPending, readPending, () => undefined);
  const pending = parsePending(raw, scenarioId);
  const setPending = (request: FreezeRequest | null) => {
    if (request) window.sessionStorage.setItem(key, JSON.stringify(request));
    else window.sessionStorage.removeItem(key);
    window.dispatchEvent(new Event(storageEvent));
  };

  const preview = useBenchmarkRead<{ data: BenchmarkInputSnapshot }>(
    "/api/scenarios/" + encodeURIComponent(scenarioId) + "/freeze-preview",
    isSnapshot,
  );
  const snapshot =
    preview.result && "data" in preview.result
      ? preview.result.data.data
      : undefined;
  const lock = useRef(false);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [operation, setOperation] = useState<"freeze" | "recover" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPreview, setRequiresPreview] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  function finish(
    receipt: BenchmarkInputSnapshot | null,
    request: FreezeRequest,
  ) {
    const id = confirmedCaseId(receipt, request);
    // Preserve the request if a new page instance needs to recover the receipt.
    if (!mounted.current) return;
    setPending(null);
    setSaved(id);
  }

  async function confirmFreeze() {
    if (
      !snapshot ||
      lock.current ||
      readPending() !== null ||
      requiresPreview ||
      saved
    )
      return;
    if (
      !window.confirm(
        `Simpan snapshot immutable untuk Scenario ${snapshot.scenario.name}?`,
      )
    )
      return;
    lock.current = true;
    setOperation("freeze");
    setError(null);
    try {
      let request: FreezeRequest;
      try {
        request = freezeRequest.parse({
          scenarioId,
          requestId: crypto.randomUUID(),
          expectedInputHash: snapshot.inputHash,
        });
        setPending(request);
      } catch {
        setError(
          "Identitas untuk pemulihan tidak dapat disimpan. Freeze belum dikirim.",
        );
        return;
      }
      try {
        const { data } = await fetchBenchmark<{ data: BenchmarkInputSnapshot }>(
          "/api/benchmark-cases",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          },
        );
        finish(data, request);
      } catch (failure) {
        if (!mounted.current) return;
        if (failure instanceof BenchmarkResponseError && failure.status === 401)
          router.replace("/login");
        const code =
          failure instanceof BenchmarkResponseError ? failure.code : undefined;
        if (
          failure instanceof BenchmarkResponseError &&
          failure.status >= 400 &&
          failure.status < 500 &&
          code &&
          Object.hasOwn(rejectionMessages, code)
        ) {
          setPending(null);
          setRequiresPreview(true);
          setError(rejectionMessages[code]);
        } else {
          setError(pendingMessage);
        }
      }
    } catch {
      setError(pendingMessage);
    } finally {
      setOperation(null);
      lock.current = false;
    }
  }

  async function recoverFreeze() {
    const request = parsePending(readPending(), scenarioId);
    if (!request || lock.current) return;
    lock.current = true;
    setOperation("recover");
    setError(null);
    try {
      const query = new URLSearchParams({
        scenarioId: request.scenarioId,
        expectedInputHash: request.expectedInputHash,
      });
      const { data } = await fetchBenchmark<{
        data: BenchmarkInputSnapshot | null;
      }>(`/api/benchmark-cases/recovery/${request.requestId}?${query}`);
      if (data === null)
        setError(
          "Belum ada hasil terverifikasi. Hasil kosong belum membuktikan rollback.",
        );
      else finish(data, request);
    } catch (failure) {
      if (!mounted.current) return;
      if (failure instanceof BenchmarkResponseError && failure.status === 401)
        router.replace("/login");
      setError(
        "Hasil belum dapat diverifikasi. Identitas request tetap tersimpan.",
      );
    } finally {
      setOperation(null);
      lock.current = false;
    }
  }

  const previewError =
    preview.result && "error" in preview.result ? preview.result.error : null;
  return (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Freeze menyimpan snapshot untuk penelitian. Scenario operasional tetap
        dapat diedit.
      </p>
      {!preview.result && <p role="status">Memuat preview…</p>}
      {previewError && !error && (
        <p role="alert" className="text-error-600 dark:text-error-400">
          {previewError instanceof BenchmarkResponseError &&
          previewError.code &&
          Object.hasOwn(rejectionMessages, previewError.code)
            ? rejectionMessages[previewError.code]
            : "Preview Freeze belum dapat dimuat."}
        </p>
      )}
      {snapshot && <BenchmarkSnapshot snapshot={snapshot} />}
      {raw !== undefined && raw !== null && !pending && (
        <p role="alert">
          Penyimpanan pemulihan tidak tersedia atau rusak. Freeze belum dapat
          dimulai.
        </p>
      )}
      {pending && (
        <p role="status" className="text-sm text-gray-700 dark:text-gray-300">
          Request freeze tersimpan untuk pemulihan. Gunakan “Periksa hasil
          freeze” sebelum mencoba lagi.
        </p>
      )}
      {error && (
        <p role="alert" className="text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-success-700 dark:text-success-400">
          Benchmark Case tersimpan.{" "}
          <Link
            className="font-medium underline"
            href={"/benchmark-cases/" + saved}
          >
            Lihat Benchmark Case
          </Link>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={!preview.result || !!operation}
          onClick={() => {
            setRequiresPreview(false);
            setError(null);
            preview.refresh();
          }}
        >
          Muat ulang preview
        </Button>
        {snapshot && (
          <Button
            size="sm"
            disabled={raw !== null || requiresPreview || !!saved || !!operation}
            onClick={() => void confirmFreeze()}
          >
            {operation === "freeze"
              ? "Menyimpan snapshot…"
              : "Konfirmasi Freeze"}
          </Button>
        )}
        {pending && (
          <Button
            size="sm"
            variant="outline"
            disabled={!!operation}
            onClick={() => void recoverFreeze()}
          >
            {operation === "recover"
              ? "Memeriksa hasil…"
              : "Periksa hasil freeze"}
          </Button>
        )}
        <Link
          className="text-sm font-medium text-brand-600 underline dark:text-brand-400"
          href="/benchmark-cases"
        >
          Riwayat Benchmark Case
        </Link>
      </div>
    </>
  );
}
