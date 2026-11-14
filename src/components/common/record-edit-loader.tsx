"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

class EditSessionExpired extends Error {}

export async function readEditRecord(path: string, signal: AbortSignal) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (response.status === 401) throw new EditSessionExpired();
  if (!response.ok) throw Error("Record unavailable");
  const body = await response.json();
  return body?.data as unknown;
}

export default function RecordEditLoader<T>({
  label,
  load,
  children,
}: {
  label: string;
  load: (signal: AbortSignal) => Promise<T>;
  children: (record: T) => ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<{ record: T } | { failed: true } | null>(
    null,
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).then(
      (record) => {
        if (!controller.signal.aborted) setState({ record });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        controller.abort();
        if (error instanceof EditSessionExpired) router.replace("/login");
        setState({ failed: true });
      },
    );
    return () => controller.abort();
  }, [load, router]);

  if (!state) return <p role="status">Memuat {label} untuk diedit…</p>;
  if ("failed" in state)
    return <p role="alert">{label} tidak dapat dibuka untuk diedit.</p>;
  return children(state.record);
}
