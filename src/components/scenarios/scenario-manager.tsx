"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DepotDTO } from "@/lib/validation/depot";
import type { ScenarioDTO, ScenarioInput } from "@/lib/validation/scenario";
import ScenarioForm from "./scenario-form";

const uncertainMessage =
  "Status perubahan belum pasti. Muat ulang daftar sebelum mencoba lagi.";
const fieldNames = [
  "depotId",
  "name",
  "distributionPattern",
  "customerCount",
  "radiusMinM",
  "radiusMaxM",
  "generationSeed",
];
export default function ScenarioManager() {
  const router = useRouter(),
    lock = useRef(false),
    readBusy = useRef(true);
  const [rows, setRows] = useState<ScenarioDTO[]>([]),
    [next, setNext] = useState<string | null>(null),
    [after, setAfter] = useState<string>();
  const [depots, setDepots] = useState<DepotDTO[]>([]),
    [depotNext, setDepotNext] = useState<string | null>(null),
    [depotAfter, setDepotAfter] = useState<string>();
  const [revision, setRevision] = useState(0),
    [depotRevision, setDepotRevision] = useState(0);
  const [loading, setLoading] = useState(true),
    [depotLoading, setDepotLoading] = useState(true),
    [depotError, setDepotError] = useState(false);
  const [pending, setPending] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<ScenarioDTO | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const response = await fetch(
          "/api/scenarios" +
            (after ? "?after=" + encodeURIComponent(after) : ""),
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!active) return;
        if (response.status === 401) {
          setRows([]);
          router.replace("/login");
          throw new Error("Expired");
        }
        if (!response.ok) throw new Error("Unavailable");
        const result = await response.json();
        if (!active) return;
        if (
          !Array.isArray(result?.data) ||
          (result.nextCursor !== null && typeof result.nextCursor !== "string")
        )
          throw new Error("Invalid list");
        setRows(result.data);
        setNext(result.nextCursor);
        // A successful read ends the previous edit snapshot, including unknown writes.
        setSelected(null);
        setFieldErrors({});
        setUncertain(false);
      } catch {
        if (active)
          setError(
            "Daftar scenario belum dapat dimuat. Silakan coba muat ulang.",
          );
      } finally {
        if (active) {
          readBusy.current = false;
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [after, revision, router]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const response = await fetch(
          "/api/depots?limit=100" +
            (depotAfter ? "&after=" + encodeURIComponent(depotAfter) : ""),
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!active) return;
        if (response.status === 401) {
          router.replace("/login");
          throw new Error("Expired");
        }
        if (!response.ok) throw new Error("Unavailable");
        const result = await response.json();
        if (!active) return;
        if (
          !Array.isArray(result?.data) ||
          (result.nextCursor !== null && typeof result.nextCursor !== "string")
        )
          throw new Error("Invalid list");
        setDepots(result.data);
        setDepotNext(result.nextCursor);
        setDepotError(false);
      } catch {
        if (active) setDepotError(true);
      } finally {
        if (active) setDepotLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [depotAfter, depotRevision, router]);
  function refresh(cursor?: string) {
    readBusy.current = true;
    setLoading(true);
    setError("");
    setAfter(cursor);
    setRevision((value) => value + 1);
  }
  function refreshDepots(cursor?: string) {
    setDepotLoading(true);
    setDepotAfter(cursor);
    setDepotRevision((value) => value + 1);
  }
  async function mutate(
    method: "POST" | "PUT" | "DELETE",
    id?: string,
    input?: ScenarioInput,
  ) {
    if (lock.current || readBusy.current || loading || uncertain) return false;
    lock.current = true;
    setPending(true);
    setError("");
    setNotice("");
    setFieldErrors({});
    try {
      const response = await fetch(
        "/api/scenarios" + (id ? "/" + encodeURIComponent(id) : ""),
        {
          method,
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input ?? {}),
        },
      );
      if (response.status === 401) {
        setRows([]);
        router.replace("/login");
        setError("Sesi berakhir. Silakan login kembali.");
        return false;
      }
      if (!response.ok) {
        const payload = await response.json();
        if (payload?.error?.code === "MUTATION_OUTCOME_UNKNOWN") {
          setUncertain(true);
          setError(uncertainMessage);
        } else {
          if (response.status === 400 && payload?.error?.fieldErrors) {
            const fields: Record<string, string[]> = {};
            for (const key of fieldNames)
              if (Array.isArray(payload.error.fieldErrors[key]))
                fields[key] = ["INVALID_INPUT"];
            setFieldErrors(fields);
          }
          setError(
            response.status === 409
              ? payload?.error?.code === "INVALID_DEPOT"
                ? "Depot yang dipilih harus tersedia dan aktif."
                : "Scenario sedang direferensikan dan tidak dapat dihapus."
              : response.status === 404
                ? "Scenario tidak ditemukan. Muat ulang daftar."
                : "Perubahan belum dapat disimpan. Periksa data atau coba lagi nanti.",
          );
        }
        return false;
      }
      if (method === "DELETE") {
        if (response.status !== 204) throw new Error("Missing receipt");
      } else {
        const payload = await response.json();
        if (typeof payload?.data?.id !== "string")
          throw new Error("Missing receipt");
      }
      setSelected(null);
      setNotice("Perubahan scenario tersimpan.");
      refresh();
      return true;
    } catch {
      setUncertain(true);
      setError(uncertainMessage);
      return false;
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const action =
    "rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-700";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || loading}
          onClick={() => refresh(after)}
          className={action}
        >
          Muat ulang daftar
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="text-sm text-success-600 dark:text-success-400"
        >
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Memuat scenario…</p>
      ) : rows.length === 0 ? (
        <p>Belum ada scenario.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Daftar scenario</caption>
            <thead>
              <tr>
                {[
                  "ID",
                  "Nama",
                  "Depot ID",
                  "Pola",
                  "Pelanggan (konfigurasi)",
                  "Status",
                  "Tindakan",
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="border-b border-gray-200 p-3 dark:border-gray-700"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="p-3">{row.id}</td>
                  <td className="p-3">{row.name}</td>
                  <td className="p-3">{row.depotId}</td>
                  <td className="p-3">{row.distributionPattern}</td>
                  <td className="p-3">{row.customerCount}</td>
                  <td className="p-3">{row.status}</td>
                  <td className="flex gap-2 p-3">
                    <button
                      type="button"
                      aria-label={"Edit " + row.name}
                      disabled={pending || uncertain}
                      onClick={() => {
                        setSelected(row);
                        setError("");
                        setFieldErrors({});
                      }}
                      className={action}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={"Hapus " + row.name}
                      disabled={pending || uncertain}
                      onClick={() => {
                        if (window.confirm("Hapus scenario ini?"))
                          void mutate("DELETE", row.id);
                      }}
                      className={action}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading || pending || !after}
          onClick={() => refresh()}
          className={action}
        >
          Halaman pertama
        </button>
        <button
          type="button"
          disabled={loading || pending || !next}
          onClick={() => next && refresh(next)}
          className={action}
        >
          Berikutnya
        </button>
      </div>
      <div className="flex flex-wrap gap-3" aria-label="Paginasi pilihan depot">
        <button
          type="button"
          disabled={pending || depotLoading}
          onClick={() => refreshDepots(depotAfter)}
          className={action}
        >
          Muat ulang pilihan depot
        </button>
        <button
          type="button"
          disabled={pending || depotLoading || !depotAfter}
          onClick={() => refreshDepots()}
          className={action}
        >
          Depot halaman pertama
        </button>
        <button
          type="button"
          disabled={pending || depotLoading || !depotNext}
          onClick={() => depotNext && refreshDepots(depotNext)}
          className={action}
        >
          Depot berikutnya
        </button>
      </div>
      <ScenarioForm
        key={selected?.id ?? "new"}
        initial={selected}
        pending={pending}
        blocked={uncertain || loading}
        depots={depots}
        depotLoading={depotLoading}
        depotError={depotError}
        fieldErrors={fieldErrors}
        onCancel={() => {
          setSelected(null);
          setFieldErrors({});
        }}
        onSave={(input) =>
          mutate(selected ? "PUT" : "POST", selected?.id, input)
        }
      />
    </div>
  );
}
