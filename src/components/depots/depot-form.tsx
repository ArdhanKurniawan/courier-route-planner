"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  parseDepotInput,
  type DepotDTO,
  type DepotInput,
} from "@/lib/validation/depot";
type Props = {
  initial: DepotDTO | null;
  pending: boolean;
  blocked: boolean;
  onSave: (input: DepotInput) => Promise<boolean>;
  onCancel: () => void;
};
export default function DepotForm({
  initial,
  pending,
  blocked,
  onSave,
  onCancel,
}: Props) {
  const lock = useRef(false);
  const [name, setName] = useState(initial?.name ?? ""),
    [address, setAddress] = useState(initial?.address ?? "");
  const [latitude, setLatitude] = useState(
      initial ? String(initial.latitude) : "",
    ),
    [longitude, setLongitude] = useState(
      initial ? String(initial.longitude) : "",
    );
  const [isActive, setActive] = useState(initial?.isActive ?? true),
    [error, setError] = useState("");
  function reset() {
    setName("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setActive(true);
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || pending || blocked) return;
    let input: DepotInput;
    try {
      input = parseDepotInput(
        {
          name,
          address,
          latitude: latitude.trim() === "" ? NaN : Number(latitude),
          longitude: longitude.trim() === "" ? NaN : Number(longitude),
          isActive,
        },
        !!initial,
      );
    } catch {
      setError(
        "Periksa nama, alamat, dan koordinat: latitude -90–90, longitude -180–180.",
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
    <form aria-label="Form depot" onSubmit={submit} className="space-y-4">
      <h3 className="text-lg font-medium">
        {initial ? "Edit depot" : "Tambah depot"}
      </h3>
      <fieldset
        disabled={pending || blocked}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="depot-name" className="mb-1 block text-sm">
            Nama
          </label>
          <input
            id="depot-name"
            name="name"
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="depot-address" className="mb-1 block text-sm">
            Alamat
          </label>
          <textarea
            id="depot-address"
            name="address"
            maxLength={2000}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="depot-latitude" className="mb-1 block text-sm">
            Latitude
          </label>
          <input
            id="depot-latitude"
            name="latitude"
            type="number"
            step="any"
            min="-90"
            max="90"
            required
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="depot-longitude" className="mb-1 block text-sm">
            Longitude
          </label>
          <input
            id="depot-longitude"
            name="longitude"
            type="number"
            step="any"
            min="-180"
            max="180"
            required
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className={field}
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setActive(e.target.checked)}
          />
          Aktif
        </label>
        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {initial ? "Simpan perubahan" : "Tambah depot"}
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
      {error && (
        <p role="alert" className="text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
    </form>
  );
}
