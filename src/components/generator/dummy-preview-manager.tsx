"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { readPages } from "@/components/map/map-data";
import { randomCoordinateParameters } from "@/domain/generator/random-coordinate-generator";
import {
  dummyPreview,
  previewScenarioOption,
  type DummyPreview,
  type PreviewParameters,
  type PreviewScenarioOption,
} from "@/lib/validation/dummy-preview";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map"), {
  ssr: false,
  loading: () => <p role="status">Memuat peta...</p>,
});

const controlClass =
  "min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900 focus:outline-2 focus:outline-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";
const actionClass =
  "inline-flex min-h-11 items-center rounded-lg px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2";
const formFields = [
  { key: "count", label: "Jumlah pelanggan", range: "1–100", min: 1, max: 100 },
  {
    key: "radiusMinM",
    label: "Radius minimum (m)",
    range: "0–49.999",
    min: 0,
    max: 49_999,
  },
  {
    key: "radiusMaxM",
    label: "Radius maksimum (m)",
    range: "1–50.000",
    min: 1,
    max: 50_000,
  },
  { key: "seed", label: "Seed", range: "Bilangan bulat signed BIGINT" },
] as const;
type Field = keyof PreviewParameters;
type FormValues = Record<Field, string>;
type ScenarioList =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: PreviewScenarioOption[] };
type PreviewState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string; refreshScenarios?: boolean }
  | { status: "ready"; data: DummyPreview };

const messages: Record<string, string> = {
  INVALID_INPUT:
    "Parameter preview tidak valid. Periksa jumlah, radius, dan seed.",
  NOT_FOUND: "Scenario tidak ditemukan. Muat ulang daftar Scenario.",
  INELIGIBLE_SCENARIO: "Scenario harus berstatus draft dan berpola random.",
  INVALID_DEPOT: "Scenario memerlukan Depot aktif dengan koordinat yang valid.",
  GENERATION_EXHAUSTED:
    "Titik unik tidak mencukupi. Perluas radius atau kurangi jumlah pelanggan.",
  UNAUTHORIZED: "Sesi admin berakhir. Masuk kembali untuk membuat preview.",
  FORBIDDEN: "Permintaan preview ditolak.",
};
const errorEnvelope = z.object({ error: z.object({ code: z.string() }) });
const previewEnvelope = z.object({ data: dummyPreview });

async function requestPreview(
  scenario: PreviewScenarioOption,
  parameters: PreviewParameters,
  signal: AbortSignal,
) {
  const response = await fetch(
    `/api/scenarios/${scenario.id}/dummy-orders/preview`,
    {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parameters),
      signal,
    },
  );
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = errorEnvelope.safeParse(body);
    const code = parsed.data?.error.code;
    return {
      refreshScenarios: code === "NOT_FOUND" || code === "INELIGIBLE_SCENARIO",
      error:
        code && Object.hasOwn(messages, code)
          ? messages[code]
          : "Preview gagal dimuat.",
    };
  }
  const { data } = previewEnvelope.parse(body);
  if (
    data.scenario.id !== scenario.id ||
    formFields.some(({ key }) => data.parameters[key] !== parameters[key])
  )
    throw new Error("Unexpected preview");
  if (data.scenario.depotId !== scenario.depotId)
    return {
      error: "Depot Scenario berubah. Muat ulang daftar Scenario.",
      refreshScenarios: true,
    };
  return { data };
}

function PreviewResults({ data }: { data: DummyPreview }) {
  return (
    <section aria-label="Hasil preview" className="space-y-4">
      <p role="status">
        <strong>{data.points.length} titik preview</strong> · {data.version}
      </p>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="min-w-0">
          <LeafletMap preview={data} />
        </div>
        <div className="min-w-0 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="font-semibold">Depot dan koordinat</h3>
          <p className="mt-2 break-words text-sm">
            <strong>{data.depot.name}</strong> · {data.depot.latitude},{" "}
            {data.depot.longitude}
          </p>
          <ol
            aria-label="Koordinat titik preview"
            className="mt-3 grid gap-2 text-sm"
          >
            {data.points.map(({ latitude, longitude }, index) => (
              <li key={latitude + "," + longitude}>
                Titik {index + 1} · {latitude}, {longitude}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function PreviewForm({
  scenario,
  reloadScenarios,
}: {
  scenario: PreviewScenarioOption;
  reloadScenarios: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() => ({
    count: String(scenario.customerCount),
    radiusMinM: scenario.radiusMinM?.toString() ?? "",
    radiusMaxM: scenario.radiusMaxM?.toString() ?? "",
    seed: scenario.generationSeed ?? "",
  }));
  const [state, setState] = useState<PreviewState>({ status: "idle" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  function change(key: Field, value: string) {
    pending.current?.abort();
    pending.current = null;
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors({});
    setState({ status: "idle" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const integer = (value: string) =>
      /^\d+$/u.test(value) ? Number(value) : NaN;
    const parsed = randomCoordinateParameters.safeParse({
      count: integer(values.count),
      radiusMinM: integer(values.radiusMinM),
      radiusMaxM: integer(values.radiusMaxM),
      seed: values.seed,
    });
    if (!parsed.success) {
      const issues = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        count: issues.count ? "Masukkan bilangan bulat 1–100." : undefined,
        radiusMinM: issues.radiusMinM
          ? "Masukkan bilangan bulat 0–49.999."
          : undefined,
        radiusMaxM: issues.radiusMaxM
          ? "Masukkan bilangan bulat lebih besar dari radius minimum, paling banyak 50.000."
          : undefined,
        seed: issues.seed
          ? "Masukkan bilangan bulat antara −9223372036854775808 dan 9223372036854775807."
          : undefined,
      });
      setState({
        status: "error",
        message: "Periksa parameter yang ditandai.",
      });
      return;
    }
    setErrors({});
    const request = new AbortController();
    pending.current = request;
    setState({ status: "loading" });
    try {
      const result = await requestPreview(
        scenario,
        parsed.data,
        request.signal,
      );
      if (request.signal.aborted) return;
      setState(
        result.data
          ? { status: "ready", data: result.data }
          : {
              status: "error",
              message: result.error,
              refreshScenarios: result.refreshScenarios,
            },
      );
    } catch {
      if (!request.signal.aborted)
        setState({
          status: "error",
          message: "Preview gagal dimuat. Coba lagi.",
        });
    } finally {
      if (pending.current === request) pending.current = null;
    }
  }

  return (
    <div className="space-y-4">
      <form
        aria-label="Parameter preview"
        noValidate
        onSubmit={submit}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {formFields.map(({ key, label, range, ...bounds }) => (
            <div key={key} className="min-w-0">
              <label
                htmlFor={`preview-${key}`}
                className="mb-1 block text-sm font-medium"
              >
                {label}
              </label>
              <input
                id={`preview-${key}`}
                className={controlClass}
                type={key === "seed" ? "text" : "number"}
                maxLength={key === "seed" ? 20 : undefined}
                step={key === "seed" ? undefined : 1}
                {...bounds}
                required
                value={values[key]}
                onChange={(event) => change(key, event.currentTarget.value)}
                aria-invalid={Boolean(errors[key])}
                aria-describedby={`preview-${key}-hint`}
              />
              <p
                id={`preview-${key}-hint`}
                className={
                  errors[key]
                    ? "mt-1 text-sm text-red-700 dark:text-red-300"
                    : "mt-1 text-sm text-gray-600 dark:text-gray-300"
                }
              >
                {errors[key] ?? range}
              </p>
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={state.status === "loading"}
          className={`${actionClass} bg-brand-600 text-white disabled:opacity-60`}
        >
          Generate Preview
        </button>
      </form>
      {state.status === "loading" && (
        <p role="status">Menghasilkan preview...</p>
      )}
      {state.status === "error" && (
        <div>
          <p role="alert" className="text-red-700 dark:text-red-300">
            {state.message}
          </p>
          {state.refreshScenarios && (
            <button
              type="button"
              className={`${actionClass} underline`}
              onClick={reloadScenarios}
            >
              Muat ulang daftar Scenario
            </button>
          )}
        </div>
      )}
      {state.status === "ready" && <PreviewResults data={state.data} />}
    </div>
  );
}

export default function DummyPreviewManager() {
  const [list, setList] = useState<ScenarioList>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    const request = new AbortController();
    void readPages(
      "/api/scenarios",
      previewScenarioOption,
      request.signal,
    ).then(
      (data) => {
        if (!request.signal.aborted) setList({ status: "ready", data });
      },
      () => {
        if (!request.signal.aborted) setList({ status: "error" });
      },
    );
    return () => request.abort();
  }, [attempt]);

  function reloadScenarios() {
    setList({ status: "loading" });
    setAttempt((previous) => previous + 1);
  }

  if (list.status === "loading")
    return <p role="status">Memuat daftar Scenario...</p>;
  if (list.status === "error")
    return (
      <div role="alert">
        <p>Daftar Scenario gagal dimuat.</p>
        <button
          type="button"
          className={`${actionClass} underline`}
          onClick={reloadScenarios}
        >
          Coba lagi
        </button>
      </div>
    );
  const eligible = list.data.filter(
    ({ distributionPattern, status }) =>
      distributionPattern === "random" && status === "draft",
  );
  if (eligible.length === 0)
    return <p>Belum ada Scenario draft berpola random.</p>;
  const scenario = eligible.find(({ id }) => id === selected);

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <label
          htmlFor="preview-scenario"
          className="mb-1 block text-sm font-medium"
        >
          Scenario
        </label>
        <select
          id="preview-scenario"
          className={controlClass}
          value={scenario?.id ?? ""}
          onChange={(event) => setSelected(event.currentTarget.value)}
        >
          <option value="">Pilih Scenario</option>
          {eligible.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {scenario && (
        <PreviewForm
          key={scenario.id}
          scenario={scenario}
          reloadScenarios={reloadScenarios}
        />
      )}
    </div>
  );
}
