"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  parseOrderId,
  type OrderDTO,
  type OrderInput,
} from "@/lib/validation/order";
import type { ScenarioDTO } from "@/lib/validation/scenario";
import OrderForm from "./order-form";

const button =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-700";
const uncertainMessage =
  "Status perubahan belum pasti. Muat ulang daftar sebelum mencoba lagi.";
export default function OrderManager() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioDTO[]>([]),
    [selected, setSelected] = useState<ScenarioDTO | null>(null);
  const [after, setAfter] = useState<string>(),
    [next, setNext] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          "/api/scenarios?limit=100" +
            (after ? "&after=" + encodeURIComponent(after) : ""),
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!active) return;
        if (response.status === 401) {
          setScenarios([]);
          setSelected(null);
          router.replace("/login");
          throw Error();
        }
        if (!response.ok) throw Error();
        const result = await response.json();
        if (!active) return;
        if (
          !Array.isArray(result.data) ||
          (result.nextCursor !== null &&
            typeof result.nextCursor !== "string") ||
          !result.data.every(
            (row: ScenarioDTO) =>
              typeof row.id === "string" &&
              typeof row.name === "string" &&
              Number.isSafeInteger(row.customerCount),
          )
        )
          throw Error();
        setScenarios(result.data);
        setSelected((previous) =>
          previous
            ? (result.data.find((row: ScenarioDTO) => row.id === previous.id) ??
              previous)
            : null,
        );
        setNext(result.nextCursor);
        setError(false);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [after, revision, router]);
  function page(cursor?: string) {
    if (busy || loading) return;
    setLoading(true);
    setAfter(cursor);
    setRevision((n) => n + 1);
  }
  const retained = selected && !scenarios.some((s) => s.id === selected.id);
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label htmlFor="order-scenario" className="block">
          Scenario
        </label>
        <select
          id="order-scenario"
          disabled={busy || loading || error}
          value={selected?.id ?? ""}
          onChange={(e) =>
            setSelected(scenarios.find((s) => s.id === e.target.value) ?? null)
          }
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700"
        >
          <option value="">Pilih Scenario</option>
          {retained ? (
            <option value={selected.id}>{selected.name}</option>
          ) : null}
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {loading ? <p role="status">Memuat pilihan Scenario…</p> : null}
        {error ? (
          <p role="alert">Pilihan Scenario belum dapat dimuat.</p>
        ) : null}
        {!loading && !error && scenarios.length === 0 ? (
          <p>Belum ada Scenario. Buat Scenario terlebih dahulu.</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            className={button}
            disabled={busy || loading}
            onClick={() => page()}
          >
            Scenario halaman pertama
          </button>
          <button
            className={button}
            disabled={busy || loading || !next}
            onClick={() => page(next!)}
          >
            Scenario berikutnya
          </button>
          <button
            className={button}
            disabled={busy || loading}
            onClick={() => page(after)}
          >
            Muat ulang Scenario
          </button>
        </div>
      </div>
      {selected ? (
        <OrdersForScenario
          key={selected.id}
          scenario={selected}
          onBusy={setBusy}
        />
      ) : (
        <p>Pilih Scenario untuk mengelola Order.</p>
      )}
    </div>
  );
}
function OrdersForScenario({
  scenario,
  onBusy,
}: {
  scenario: ScenarioDTO;
  onBusy: (busy: boolean) => void;
}) {
  const router = useRouter(),
    lock = useRef(false),
    reading = useRef(true);
  const [rows, setRows] = useState<OrderDTO[]>([]),
    [selected, setSelected] = useState<OrderDTO | null>(null);
  const [after, setAfter] = useState<string>(),
    [next, setNext] = useState<string | null>(null),
    [revision, setRevision] = useState(0),
    [total, setTotal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [failed, setFailed] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const base = "/api/scenarios/" + encodeURIComponent(scenario.id) + "/orders";
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          base + (after ? "?after=" + encodeURIComponent(after) : ""),
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
          throw Error();
        }
        if (!response.ok) throw Error();
        const result = await response.json();
        if (!active) return;
        if (
          !Array.isArray(result.data) ||
          (result.nextCursor !== null &&
            typeof result.nextCursor !== "string") ||
          typeof result.totalCount !== "string" ||
          !/^(?:0|[1-9]\d*)$/u.test(result.totalCount) ||
          !result.data.every(
            (row: OrderDTO) =>
              typeof row.id === "string" &&
              row.scenarioId === scenario.id &&
              ["manual", "dummy"].includes(row.source),
          )
        )
          throw Error();
        setRows(result.data);
        setNext(result.nextCursor);
        setTotal(result.totalCount);
        setSelected(null);
        setUncertain(false);
        setFailed(false);
      } catch {
        if (active) {
          setRows([]);
          setTotal(null);
          setSelected(null);
          setFailed(true);
          setError("Daftar Order belum dapat dimuat. Silakan muat ulang.");
        }
      } finally {
        if (active) {
          reading.current = false;
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [base, after, revision, scenario.id, router]);
  function refresh(cursor?: string) {
    if (lock.current) return;
    reading.current = true;
    setLoading(true);
    setError("");
    setAfter(cursor);
    setRevision((n) => n + 1);
  }
  async function mutate(
    method: "POST" | "PUT" | "DELETE",
    id?: string,
    input?: OrderInput,
  ) {
    if (lock.current || reading.current || loading || failed || uncertain)
      return false;
    lock.current = true;
    setPending(true);
    onBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        base + (id ? "/" + encodeURIComponent(id) : ""),
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
        const definitive = (
          [
            [400, "INVALID_INPUT"],
            [403, "FORBIDDEN"],
            [404, "NOT_FOUND"],
            [409, "ORDER_CODE_CONFLICT"],
            [413, "PAYLOAD_TOO_LARGE"],
            [415, "UNSUPPORTED_MEDIA_TYPE"],
            [503, "UNAVAILABLE"],
          ] as const
        ).some(
          ([status, code]) =>
            response.status === status && payload?.error?.code === code,
        );
        // A gateway/unknown JSON response is not a definitive no-write receipt.
        if (!definitive) {
          setUncertain(true);
          setError(uncertainMessage);
        } else
          setError(
            response.status === 409
              ? "Kode Order sudah digunakan pada Scenario ini."
              : response.status === 400
                ? "Data ditolak server. Periksa kode, nama dan koordinat."
                : response.status === 404
                  ? "Order atau Scenario tidak ditemukan. Muat ulang daftar."
                  : "Perubahan belum dapat disimpan.",
          );
        return false;
      }
      if (method === "DELETE") {
        if (response.status !== 204) throw Error();
      } else {
        if (response.status !== (method === "POST" ? 201 : 200)) throw Error();
        const payload = await response.json();
        parseOrderId(payload?.data?.id);
        if (
          payload.data.scenarioId !== scenario.id ||
          (id && payload.data.id !== id)
        )
          throw Error();
      }
      setSelected(null);
      setNotice("Perubahan Order tersimpan.");
      // Unlock only the read trigger; the mutation lock is held until finally.
      reading.current = true;
      setLoading(true);
      setAfter(undefined);
      setRevision((n) => n + 1);
      return true;
    } catch {
      setUncertain(true);
      setError(uncertainMessage);
      return false;
    } finally {
      lock.current = false;
      setPending(false);
      onBusy(false);
    }
  }
  const blocked = loading || pending || uncertain || failed;
  return (
    <section className="space-y-4" aria-label="Order pada Scenario">
      <p>Jumlah pelanggan konfigurasi: {scenario.customerCount}</p>
      <p>Jumlah Order aktual: {total ?? "belum tersedia"}</p>
      <p className="text-sm text-gray-500">
        Jumlah konfigurasi bukan kuota dan tidak diubah oleh CRUD Order.
      </p>
      <button
        className={button}
        disabled={pending || loading}
        onClick={() => refresh(after)}
      >
        Muat ulang Order
      </button>
      {error ? (
        <p role="alert" className="text-error-600">
          {error}
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {loading ? (
        <p role="status">Memuat Order…</p>
      ) : rows.length === 0 ? (
        <p>Belum ada Order pada Scenario ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table aria-label="Daftar Order" className="w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  "Kode",
                  "Pelanggan",
                  "Alamat",
                  "Latitude",
                  "Longitude",
                  "Sumber",
                  "Tindakan",
                ].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="p-2">{row.orderCode}</td>
                  <td className="p-2">{row.customerName}</td>
                  <td className="p-2">{row.address ?? "—"}</td>
                  <td className="p-2">{row.latitude}</td>
                  <td className="p-2">{row.longitude}</td>
                  <td className="p-2">{row.source}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button
                        className={button}
                        disabled={blocked}
                        aria-label={"Edit " + row.orderCode}
                        onClick={() => setSelected(row)}
                      >
                        Edit
                      </button>
                      <button
                        className={button}
                        disabled={blocked}
                        aria-label={"Hapus " + row.orderCode}
                        onClick={() => {
                          if (
                            window.confirm("Hapus Order " + row.orderCode + "?")
                          )
                            void mutate("DELETE", row.id);
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-3">
        <button
          className={button}
          disabled={blocked || !after}
          onClick={() => refresh()}
        >
          Order halaman pertama
        </button>
        <button
          className={button}
          disabled={blocked || !next}
          onClick={() => refresh(next!)}
        >
          Order berikutnya
        </button>
      </div>
      <OrderForm
        key={selected?.id ?? "new"}
        initial={selected}
        pending={pending}
        blocked={loading || uncertain || failed}
        onSave={(input) =>
          mutate(selected ? "PUT" : "POST", selected?.id, input)
        }
        onCancel={() => setSelected(null)}
      />
    </section>
  );
}
