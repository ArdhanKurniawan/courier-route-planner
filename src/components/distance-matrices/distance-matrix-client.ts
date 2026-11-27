"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  BenchmarkResponseError,
  fetchBenchmark,
} from "@/components/benchmark-cases/benchmark-client";
import type { StoredDistanceMatrix } from "@/lib/validation/distance-matrix";

const pendingEvent = "crp:pending-distance-matrix-changed";
const uncertainMessage =
  "Hasil penyimpanan belum pasti. Periksa hasil pembuatan dengan request yang tersimpan.";
const rejectedMessages: Readonly<Record<string, string>> = {
  GENERATION_DISABLED: "Pembuatan distance matrix dinonaktifkan.",
  SNAP_INVALID: "Validasi snapping gagal. Periksa koordinat Benchmark Case.",
  UNREACHABLE: "Ada pasangan titik yang tidak dapat dirutekan oleh OSRM.",
  INVALID_MATRIX: "Distance matrix dari OSRM gagal divalidasi.",
  POINT_LIMIT: "Jumlah titik melebihi batas pembuatan distance matrix.",
  SOURCE_CHANGED: "Hash input berubah. Muat ulang Benchmark Case.",
  NOT_FOUND: "Benchmark Case tidak ditemukan.",
  INVALID_INPUT: "Identitas request pembuatan distance matrix tidak valid.",
  PROVIDER_UNAVAILABLE: "OSRM belum dapat dihubungi. Coba lagi secara manual.",
  PROVIDER_TIMEOUT: "Waktu tunggu OSRM habis. Coba lagi secara manual.",
  PROVIDER_UNSUPPORTED: "OSRM tidak menyediakan hasil jarak yang dibutuhkan.",
  FORBIDDEN: "Akses pembuatan distance matrix ditolak.",
  UNAUTHORIZED: "Sesi berakhir. Silakan login kembali.",
};

function listenPending(listener: () => void) {
  window.addEventListener(pendingEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(pendingEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function readInitialPending() {
  return undefined;
}

function isRequestId(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(value)
  );
}

export function isStoredMatrix(value: unknown): value is StoredDistanceMatrix {
  const matrix = value as StoredDistanceMatrix | null;
  return (
    matrix?.version === "distance-matrix/v1" &&
    matrix.provider === "osrm" &&
    matrix.unit === "meter" &&
    matrix.directed === true &&
    typeof matrix.id === "string" &&
    typeof matrix.profile === "string" &&
    typeof matrix.inputHash === "string" &&
    typeof matrix.matrixHash === "string" &&
    typeof matrix.provenance?.generatedAt === "string" &&
    typeof matrix.options?.snapRadiusM === "number" &&
    Array.isArray(matrix.nodeOrder) &&
    matrix.nodeOrder.length > 1 &&
    matrix.nodeOrder.every(
      (node, index) =>
        node?.index === index &&
        (node.kind === "depot" || node.kind === "order") &&
        typeof node.id === "string" &&
        Number.isFinite(node.latitude) &&
        Number.isFinite(node.longitude),
    ) &&
    Array.isArray(matrix.matrix) &&
    matrix.matrix.length === matrix.nodeOrder.length &&
    matrix.matrix.every(
      (row, from) =>
        Array.isArray(row) &&
        row.length === matrix.nodeOrder.length &&
        row[from] === 0 &&
        row.every((distance) => Number.isFinite(distance) && distance >= 0),
    ) &&
    Array.isArray(matrix.snapping) &&
    matrix.snapping.length === matrix.nodeOrder.length &&
    matrix.snapping.every(
      (evidence) =>
        Number.isFinite(evidence?.source?.distanceM) &&
        Number.isFinite(evidence?.destination?.distanceM),
    ) &&
    Array.isArray(matrix.zeroPairs) &&
    matrix.zeroPairs.every(
      (pair) =>
        pair &&
        Number.isInteger(pair.from) &&
        Number.isInteger(pair.to) &&
        pair.from !== pair.to &&
        matrix.nodeOrder[pair.from] &&
        matrix.nodeOrder[pair.to],
    ) &&
    typeof matrix.comparisonEligible === "boolean"
  );
}

type GenerationOptions = {
  url: string;
  caseId: string;
  inputHash: string;
  pointCount: number;
  available: boolean;
  onSaved: (snapshot: StoredDistanceMatrix) => void;
};

export function useMatrixGeneration({
  url,
  caseId,
  inputHash,
  pointCount,
  available,
  onSaved,
}: GenerationOptions) {
  const router = useRouter();
  const storageKey = "crp:pending-distance-matrix:" + caseId + ":" + inputHash;
  const readPending = useCallback(() => {
    try {
      return window.sessionStorage.getItem(storageKey);
    } catch {
      return "";
    }
  }, [storageKey]);
  const rawPending = useSyncExternalStore(
    listenPending,
    readPending,
    readInitialPending,
  );
  const pending = isRequestId(rawPending);
  const locked = useRef(false);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [operation, setOperation] = useState<"generate" | "recover" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationDisabled, setGenerationDisabled] = useState(false);
  const disabled = !available || generationDisabled;

  function writePending(requestId: string | null) {
    if (requestId) window.sessionStorage.setItem(storageKey, requestId);
    else window.sessionStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(pendingEvent));
  }

  function acceptReceipt(receipt: unknown, requestId: string) {
    if (
      !isStoredMatrix(receipt) ||
      receipt.requestId !== requestId ||
      receipt.benchmarkCaseId !== caseId ||
      receipt.inputHash !== inputHash ||
      receipt.nodeOrder.length !== pointCount
    )
      throw new Error("Unexpected distance matrix receipt.");
    // Leave the request recoverable after the user navigates away.
    if (!mounted.current) return;
    writePending(null);
    onSaved(receipt);
  }

  async function generate() {
    if (disabled || locked.current || readPending() !== null) return;
    if (
      !window.confirm(
        `Buat snapshot distance matrix OSRM untuk ${pointCount} titik pada Benchmark Case #${caseId}?`,
      )
    )
      return;

    locked.current = true;
    setOperation("generate");
    setError(null);
    try {
      let requestId: string;
      try {
        requestId = crypto.randomUUID();
        writePending(requestId);
      } catch {
        setError("Penyimpanan browser tidak tersedia. Request belum dikirim.");
        return;
      }
      const { data } = await fetchBenchmark<{ data: unknown }>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, expectedInputHash: inputHash }),
      });
      acceptReceipt(data, requestId);
    } catch (failure) {
      if (!mounted.current) return;
      if (
        failure instanceof BenchmarkResponseError &&
        failure.code &&
        Object.hasOwn(rejectedMessages, failure.code)
      ) {
        if (failure.status === 401) router.replace("/login");
        if (failure.code === "GENERATION_DISABLED") setGenerationDisabled(true);
        try {
          writePending(null);
          setError(rejectedMessages[failure.code]);
        } catch {
          setError(uncertainMessage);
        }
      } else {
        setError(uncertainMessage);
      }
    } finally {
      if (mounted.current) setOperation(null);
      locked.current = false;
    }
  }

  async function recover() {
    const requestId = readPending();
    if (!isRequestId(requestId) || locked.current) return;
    locked.current = true;
    setOperation("recover");
    setError(null);
    try {
      const { data } = await fetchBenchmark<{ data: unknown }>(
        url + "?" + new URLSearchParams({ requestId }),
      );
      if (data === null) {
        if (mounted.current)
          setError("Belum ada hasil terverifikasi. Identitas request tetap tersimpan.");
      } else {
        acceptReceipt(data, requestId);
      }
    } catch (failure) {
      if (!mounted.current) return;
      if (failure instanceof BenchmarkResponseError && failure.status === 401)
        router.replace("/login");
      setError("Hasil belum dapat diperiksa. Identitas request tetap tersimpan.");
    } finally {
      if (mounted.current) setOperation(null);
      locked.current = false;
    }
  }

  return {
    operation,
    pending,
    error,
    clearFeedback: () => {
      setGenerationDisabled(false);
      setError(null);
    },
    canGenerate: !disabled && !operation && rawPending === null,
    invalidStorage: rawPending != null && !pending,
    generate,
    recover,
  };
}
