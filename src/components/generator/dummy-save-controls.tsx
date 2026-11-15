"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  dummyOperationView,
  type DummyOperationView,
  type DummyPreview,
  type DummySaveInput,
} from "@/lib/validation/dummy-preview";

const envelope = z.object({ data: dummyOperationView.nullable() });
const errorEnvelope = z.object({ error: z.object({ code: z.string() }) });
type State =
  | { status: "loading" | "unavailable" }
  | { status: "ready"; operation: DummyOperationView | null };

class OperationRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function requestOperation(
  scenarioId: string,
  options?:
    { method: "POST" | "PATCH"; body: unknown } | { signal: AbortSignal },
) {
  const write = options && "method" in options ? options : null;
  const response = await fetch(`/api/scenarios/${scenarioId}/dummy-orders`, {
    method: write?.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal: options && "signal" in options ? options.signal : undefined,
    ...(write
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(write.body),
        }
      : {}),
  });
  const payload: unknown = await response.json();
  if (!response.ok)
    throw new OperationRequestError(
      errorEnvelope.safeParse(payload).data?.error.code ?? "UNKNOWN",
    );
  const { data } = envelope.parse(payload);
  if ((write && !data) || (data && data.scenarioId !== scenarioId))
    throw new OperationRequestError("UNKNOWN");
  return data;
}

function active(operation: DummyOperationView | null) {
  return (
    operation !== null &&
    operation.status !== "confirmed" &&
    operation.status !== "rolled_back"
  );
}

const statusText: Record<DummyOperationView["status"], string> = {
  pending: "Operasi sedang berjalan atau hasilnya belum terverifikasi.",
  committed:
    "COMMIT Order dummy tercatat. Verifikasi dataset untuk membuka Scenario.",
  commit_unknown: "Hasil penyimpanan belum dapat dipastikan.",
  rollback_unknown: "Hasil rollback belum dapat dipastikan.",
  confirmed: "Dataset Order dummy telah diverifikasi.",
  rolled_back: "Rollback terverifikasi. Dataset sebelumnya tetap utuh.",
};
const messages: Record<string, string> = {
  STALE_PREVIEW: "Data Scenario berubah. Buat preview baru.",
  OPERATION_PENDING: "Scenario memiliki operasi yang belum terselesaikan.",
  BATCH_CONFLICT: "Scenario sedang digunakan. Periksa kembali status operasi.",
  RECONCILIATION_INCONCLUSIVE:
    "Dataset belum dapat diverifikasi. Scenario tetap diblokir.",
  COMMIT_UNKNOWN: "Hasil penyimpanan belum dapat dipastikan.",
  ROLLBACK_UNKNOWN: "Hasil rollback belum dapat dipastikan.",
};
const linkClass = "inline-flex min-h-11 items-center underline";

export default function DummySaveControls({
  scenarioId,
  preview,
  setBusy,
  invalidate,
}: {
  scenarioId: string;
  preview?: DummyPreview;
  setBusy: (value: boolean) => void;
  invalidate?: () => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [confirmedRevision, setConfirmedRevision] = useState<string | null>(
    null,
  );
  const inFlight = useRef(false);
  const identity = useRef<{ revision: string; id: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void requestOperation(scenarioId, { signal: controller.signal }).then(
      (operation) => {
        if (!controller.signal.aborted)
          setState({ status: "ready", operation });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: "unavailable" });
      },
    );
    return () => controller.abort();
  }, [scenarioId]);

  const operation = state.status === "ready" ? state.operation : null;
  const confirmed =
    preview !== undefined && confirmedRevision === preview.revision;

  async function refresh() {
    setState({ status: "loading" });
    try {
      setState({
        status: "ready",
        operation: await requestOperation(scenarioId),
      });
    } catch {
      setState({ status: "unavailable" });
    }
  }

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setWorking(true);
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      const code =
        error instanceof OperationRequestError ? error.code : "UNKNOWN";
      setNotice(
        Object.hasOwn(messages, code)
          ? messages[code]
          : "Hasil operasi belum dapat diverifikasi. Periksa status sebelum melanjutkan.",
      );
      await refresh();
    } finally {
      setBusy(false);
      setWorking(false);
      inFlight.current = false;
    }
  }

  function save(data: DummyPreview) {
    if (
      state.status !== "ready" ||
      active(operation) ||
      (data.dummyCount > 0 && !confirmed)
    )
      return;
    void run(async () => {
      if (identity.current?.revision !== data.revision)
        identity.current = { revision: data.revision, id: crypto.randomUUID() };
      const input: DummySaveInput = {
        operationId: identity.current.id,
        parameters: data.parameters,
        revision: data.revision,
        replaceCount: data.dummyCount,
        ...(data.dummyCount > 0 ? { confirmReplace: true } : {}),
      };
      try {
        const result = await requestOperation(scenarioId, {
          method: "POST",
          body: input,
        });
        if (
          !result ||
          result.operationId !== input.operationId ||
          result.replacedCount !== input.replaceCount ||
          ((result.status === "committed" || result.status === "confirmed") &&
            result.savedCount !== input.parameters.count)
        )
          throw new OperationRequestError("UNKNOWN");
        setState({ status: "ready", operation: result });
        if (!active(result)) identity.current = null;
      } finally {
        setConfirmedRevision(null);
        invalidate?.();
      }
    });
  }

  function reconcile(current: DummyOperationView) {
    void run(async () => {
      const result = await requestOperation(scenarioId, {
        method: "PATCH",
        body: { operationId: current.operationId },
      });
      if (
        !result ||
        result.operationId !== current.operationId ||
        active(result)
      )
        throw new OperationRequestError("UNKNOWN");
      identity.current = null;
      setConfirmedRevision(null);
      invalidate?.();
      setState({ status: "ready", operation: result });
    });
  }

  return (
    <section aria-label="Simpan dataset" className="space-y-2">
      {notice && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {notice}
        </p>
      )}
      {working && <p role="status">Memproses operasi…</p>}
      {state.status === "loading" && !working && (
        <p role="status">Memeriksa status penyimpanan…</p>
      )}
      {!invalidate && state.status === "ready" && !operation && (
        <p role="status">Tidak ada operasi dummy tertunda.</p>
      )}
      {(state.status === "unavailable" || active(operation)) && (
        <div className="flex flex-wrap gap-4">
          {state.status === "unavailable" && (
            <p role="status">Status penyimpanan tidak tersedia.</p>
          )}
          <button
            type="button"
            className={linkClass}
            disabled={working}
            onClick={() => void run(refresh)}
          >
            Perbarui status
          </button>
          {operation && (
            <button
              type="button"
              className={linkClass}
              disabled={working}
              onClick={() => reconcile(operation)}
            >
              Verifikasi hasil operasi
            </button>
          )}
        </div>
      )}
      {operation && (
        <>
          <p role="status">{statusText[operation.status]}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/orders" className={linkClass} prefetch={false}>
              Buka Orders
            </Link>
            <Link
              href={`/map?scenarioId=${scenarioId}`}
              className={linkClass}
              prefetch={false}
            >
              Buka Map
            </Link>
          </div>
        </>
      )}
      {preview && state.status === "ready" && !active(operation) && (
        <>
          {preview.dummyCount > 0 && (
            <>
              <p>{preview.dummyCount} Order dummy akan diganti.</p>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={working}
                  onChange={(event) =>
                    setConfirmedRevision(
                      event.currentTarget.checked ? preview.revision : null,
                    )
                  }
                />
                Ganti {preview.dummyCount} Order dummy
              </label>
            </>
          )}
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
            disabled={working || (preview.dummyCount > 0 && !confirmed)}
            onClick={() => save(preview)}
          >
            {preview.dummyCount > 0
              ? "Ganti Order Dummy"
              : "Simpan Order Dummy"}
          </button>
        </>
      )}
    </section>
  );
}
