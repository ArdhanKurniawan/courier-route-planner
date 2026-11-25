"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export class BenchmarkResponseError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super("Benchmark Case request failed.");
  }
}

export async function fetchBenchmark<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new BenchmarkResponseError(response.status, body?.error?.code);
  if (!body || !Object.hasOwn(body, "data"))
    throw new Error("Missing Benchmark Case response.");
  return body;
}

type ReadResult<T> = { data: T } | { error: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSnapshot(value: unknown) {
  return (
    isRecord(value) &&
    isRecord(value.scenario) &&
    isRecord(value.provenance) &&
    Array.isArray(value.nodes) &&
    value.nodes.length > 1 &&
    value.nodes.every(isRecord)
  );
}

export function useBenchmarkRead<T extends { data: unknown }>(
  url: string,
  accepts: (data: unknown) => boolean,
) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const key = url + "#" + revision;
  const [entry, setEntry] = useState<{ key: string; result: ReadResult<T> }>();
  useEffect(() => {
    const controller = new AbortController();
    fetchBenchmark<T>(url, { signal: controller.signal }).then(
      (data) => {
        if (controller.signal.aborted) return;
        setEntry({
          key,
          result: accepts(data.data)
            ? { data }
            : { error: new Error("Invalid Benchmark Case response.") },
        });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof BenchmarkResponseError && error.status === 401)
          router.replace("/login");
        setEntry({ key, result: { error } });
      },
    );
    return () => controller.abort();
  }, [accepts, key, router, url]);

  return {
    result: entry?.key === key ? entry.result : undefined,
    refresh: () => setRevision((value) => value + 1),
  };
}
