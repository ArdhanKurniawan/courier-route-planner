"use client";
import { useRef, useState, type FormEvent } from "react";
import type { DepotDTO } from "@/lib/validation/depot";
import {
  distributionPatterns,
  parseScenarioInput,
  type ScenarioDTO,
  type ScenarioInput,
} from "@/lib/validation/scenario";

type Props = {
  initial: ScenarioDTO | null;
  pending: boolean;
  blocked: boolean;
  depots: DepotDTO[];
  depotLoading: boolean;
  depotError: boolean;
  fieldErrors: Record<string, string[]>;
  onSave: (input: ScenarioInput) => Promise<boolean>;
  onCancel: () => void;
};
export default function ScenarioForm({
  initial,
  pending,
  blocked,
  depots,
  depotLoading,
  depotError,
  fieldErrors,
  onSave,
  onCancel,
}: Props) {
  const lock = useRef(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [depotId, setDepotId] = useState(initial?.depotId ?? "");
  const [pattern, setPattern] = useState(
    initial?.distributionPattern ?? "random",
  );
  const [count, setCount] = useState(String(initial?.customerCount ?? 0));
  const [minimum, setMinimum] = useState(initial?.radiusMinM?.toString() ?? "");
  const [maximum, setMaximum] = useState(initial?.radiusMaxM?.toString() ?? "");
  const [seed, setSeed] = useState(initial?.generationSeed ?? "");
  const [error, setError] = useState("");
  const choices = depots.filter(
    (depot) => depot.isActive || depot.id === initial?.depotId,
  );
  const retained = depotId && !choices.some((depot) => depot.id === depotId);
  function reset() {
    setName("");
    setDepotId("");
    setPattern("random");
    setCount("0");
    setMinimum("");
    setMaximum("");
    setSeed("");
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || pending || blocked || depotLoading || depotError)
      return;
    let input: ScenarioInput;
    try {
      input = parseScenarioInput({
        name,
        depotId,
        distributionPattern: pattern,
        customerCount: count.trim() === "" ? NaN : Number(count),
        radiusMinM: minimum.trim() === "" ? null : Number(minimum),
        radiusMaxM: maximum.trim() === "" ? null : Number(maximum),
        generationSeed: seed.trim() === "" ? null : seed.trim(),
      });
    } catch {
      setError(
        "Periksa depot, nama, pola, jumlah pelanggan, radius minimum/maksimum, dan seed.",
      );
      return;
    }
    lock.current = true;
    setError("");
    try {
      if (await onSave(input)) reset();
    } finally {
      lock.current = false;
    }
  }
  const field =
    "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700";
  return (
    <form aria-label="Form scenario" onSubmit={submit} className="space-y-4">
      <h3 className="text-lg font-medium">
        {initial ? "Edit scenario" : "Tambah scenario"}
      </h3>
      <p className="text-sm">
        Status: draft (hanya baca). Jumlah pelanggan adalah konfigurasi, bukan
        jumlah Order aktual.
      </p>
      <fieldset
        disabled={pending || blocked || depotLoading || depotError}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="scenario-name" className="mb-1 block text-sm">
            Nama
          </label>
          <input
            id="scenario-name"
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="scenario-depot" className="mb-1 block text-sm">
            Depot
          </label>
          <select
            id="scenario-depot"
            required
            value={depotId}
            onChange={(e) => setDepotId(e.target.value)}
            className={field}
          >
            <option value="">Pilih depot aktif</option>
            {retained && (
              <option value={depotId}>Depot {depotId} (dipertahankan)</option>
            )}
            {choices.map((depot) => (
              <option key={depot.id} value={depot.id}>
                {depot.name}
                {depot.isActive ? "" : " (nonaktif, referensi tersimpan)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="scenario-pattern" className="mb-1 block text-sm">
            Pola distribusi
          </label>
          <select
            id="scenario-pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value as typeof pattern)}
            className={field}
          >
            {distributionPatterns.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="scenario-count" className="mb-1 block text-sm">
            Jumlah pelanggan (konfigurasi)
          </label>
          <input
            id="scenario-count"
            type="number"
            min="0"
            max="2147483647"
            step="1"
            required
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="scenario-minimum" className="mb-1 block text-sm">
            Radius minimum (m)
          </label>
          <input
            id="scenario-minimum"
            type="number"
            min="0"
            max="2147483647"
            step="1"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="scenario-maximum" className="mb-1 block text-sm">
            Radius maksimum (m)
          </label>
          <input
            id="scenario-maximum"
            type="number"
            min="0"
            max="2147483647"
            step="1"
            value={maximum}
            onChange={(e) => setMaximum(e.target.value)}
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="scenario-seed" className="mb-1 block text-sm">
            Seed (opsional, bilangan bulat)
          </label>
          <input
            id="scenario-seed"
            type="text"
            inputMode="numeric"
            maxLength={20}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className={field}
          />
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {initial ? "Simpan perubahan" : "Tambah scenario"}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              onCancel();
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
          >
            Batalkan
          </button>
        </div>
      </fieldset>
      {depotLoading && <p role="status">Memuat pilihan depot…</p>}
      {depotError && (
        <p role="alert">
          Pilihan depot belum dapat dimuat. Muat ulang pilihan depot.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
      {Object.keys(fieldErrors).length > 0 && (
        <p role="alert">
          Data ditolak server. Periksa field:{" "}
          {Object.keys(fieldErrors).join(", ")}.
        </p>
      )}
    </form>
  );
}
