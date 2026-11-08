"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  parseOrderInput,
  type OrderDTO,
  type OrderInput,
} from "@/lib/validation/order";
type Props = {
  initial: OrderDTO | null;
  pending: boolean;
  blocked: boolean;
  onSave: (input: OrderInput) => Promise<boolean>;
  onCancel: () => void;
};
export default function OrderForm({
  initial,
  pending,
  blocked,
  onSave,
  onCancel,
}: Props) {
  const lock = useRef(false);
  const [code, setCode] = useState(initial?.orderCode ?? ""),
    [name, setName] = useState(initial?.customerName ?? ""),
    [address, setAddress] = useState(initial?.address ?? "");
  const [latitude, setLatitude] = useState(initial?.latitude.toString() ?? ""),
    [longitude, setLongitude] = useState(initial?.longitude.toString() ?? ""),
    [error, setError] = useState("");
  function reset() {
    setCode("");
    setName("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || pending || blocked) return;
    let input: OrderInput;
    try {
      input = parseOrderInput({
        orderCode: code,
        customerName: name,
        address: address || null,
        latitude: latitude.trim() === "" ? NaN : Number(latitude),
        longitude: longitude.trim() === "" ? NaN : Number(longitude),
      });
    } catch {
      setError("Periksa kode, nama pelanggan, alamat, latitude dan longitude.");
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
    <form aria-label="Form Order" onSubmit={submit} className="space-y-4">
      <h3 className="text-lg font-medium">
        {initial ? "Edit Order" : "Tambah Order"}
      </h3>
      <p className="text-sm">
        Sumber: {initial?.source ?? "manual"} (hanya baca)
      </p>
      <fieldset
        disabled={pending || blocked}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label htmlFor="order-code">Kode Order</label>
          <input
            id="order-code"
            required
            maxLength={128}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={field}
          />
          <p className="text-sm text-gray-500">
            Maksimal 64 karakter setelah uppercase; unik per Scenario, tanpa
            membedakan huruf besar/kecil dan aksen.
          </p>
        </div>
        <div>
          <label htmlFor="order-customer">Nama pelanggan</label>
          <input
            id="order-customer"
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="order-address">Alamat</label>
          <textarea
            id="order-address"
            maxLength={2000}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="order-latitude">Latitude</label>
          <input
            id="order-latitude"
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
          <label htmlFor="order-longitude">Longitude</label>
          <input
            id="order-longitude"
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
        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {initial ? "Simpan perubahan" : "Tambah Order"}
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
      {error ? (
        <p role="alert" className="text-error-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
