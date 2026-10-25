"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DepotDTO, DepotInput } from "@/lib/validation/depot";
import DepotForm from "./depot-form";

const uncertainMessage =
  "Status perubahan belum pasti. Muat ulang daftar sebelum mencoba lagi.";
export default function DepotManager() {
  const router = useRouter(),
    lock = useRef(false),
    readBusy = useRef(true);
  const [rows, setRows] = useState<DepotDTO[]>([]),
    [next, setNext] = useState<string | null>(null),
    [after, setAfter] = useState<string>();
  const [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<DepotDTO | null>(null),
    [uncertain, setUncertain] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const response = await fetch(
          "/api/depots" + (after ? "?after=" + encodeURIComponent(after) : ""),
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!active) return;
        if (response.status === 401) {
          router.replace("/login");
          throw new Error("Expired session.");
        }
        if (!response.ok) throw new Error("List unavailable.");
        const result = await response.json();
        if (!active) return;
        if (
          !Array.isArray(result?.data) ||
          (result.nextCursor !== null && typeof result.nextCursor !== "string")
        )
          throw new Error("Invalid list.");
        setRows(result.data);
        setNext(result.nextCursor);
        setUncertain(false);
      } catch {
        if (active)
          setError("Daftar depot belum dapat dimuat. Silakan coba muat ulang.");
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
  function refresh(cursor?: string) {
    readBusy.current = true;
    setLoading(true);
    setError("");
    setAfter(cursor);
    setRevision((v) => v + 1);
  }
  async function mutate(
    method: "POST" | "PUT" | "DELETE",
    id?: string,
    input?: DepotInput,
  ) {
    if (lock.current || readBusy.current || loading || uncertain) return false;
    lock.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        "/api/depots" + (id ? "/" + encodeURIComponent(id) : ""),
        {
          method,
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input ?? {}),
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        setError("Sesi berakhir. Silakan login kembali.");
        return false;
      }
      if (!response.ok) {
        const payload = await response.json();
        if (payload?.error?.code === "MUTATION_OUTCOME_UNKNOWN") {
          setUncertain(true);
          setError(uncertainMessage);
        } else
          setError(
            response.status === 409
              ? "Depot sedang digunakan dan tidak dapat dihapus."
              : response.status === 404
                ? "Depot tidak ditemukan. Muat ulang daftar."
                : "Perubahan belum dapat disimpan. Periksa data atau coba lagi nanti.",
          );
        return false;
      }
      if (method !== "DELETE") {
        const payload = await response.json();
        if (typeof payload?.data?.id !== "string")
          throw new Error("Missing receipt.");
      }
      setSelected(null);
      setNotice("Perubahan depot tersimpan.");
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
  async function logout() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Logout unavailable.");
      router.replace("/login");
    } catch {
      setError("Belum dapat keluar. Silakan coba lagi.");
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
          disabled={pending}
          onClick={() => refresh(after)}
          className={action}
        >
          Muat ulang daftar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={logout}
          className={action}
        >
          Keluar
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
        <p role="status">Memuat depot…</p>
      ) : rows.length === 0 ? (
        <p>Belum ada depot.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Daftar depot</caption>
            <thead>
              <tr>
                {[
                  "ID",
                  "Nama",
                  "Alamat",
                  "Koordinat",
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
                  <td className="p-3">{row.address ?? "—"}</td>
                  <td className="p-3">
                    {row.latitude}, {row.longitude}
                  </td>
                  <td className="p-3">{row.isActive ? "Aktif" : "Nonaktif"}</td>
                  <td className="flex gap-2 p-3">
                    <button
                      type="button"
                      aria-label={"Edit " + row.name}
                      disabled={pending || uncertain}
                      onClick={() => {
                        setSelected(row);
                        setError("");
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
                        if (window.confirm("Hapus depot ini?"))
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
      <DepotForm
        key={selected?.id ?? "new"}
        initial={selected}
        pending={pending}
        blocked={uncertain || loading}
        onCancel={() => setSelected(null)}
        onSave={(input) =>
          mutate(selected ? "PUT" : "POST", selected?.id, input)
        }
      />
    </div>
  );
}
