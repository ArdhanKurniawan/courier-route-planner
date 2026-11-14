"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter(),
    lock = useRef(false);
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    const submitted = password;
    setPassword("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: submitted }),
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Username atau password tidak sesuai."
            : response.status === 429
              ? "Terlalu banyak percobaan. Tunggu sebelum mencoba lagi."
              : "Login belum tersedia. Hubungi pemilik aplikasi.",
        );
        return;
      }
      const result = await response.json();
      if (result?.ok !== true) throw new Error("Invalid login response.");
      router.replace("/depots");
    } catch {
      setError(
        "Login belum dapat dipastikan. Muat ulang halaman sebelum mencoba lagi.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  const field =
    "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-700";
  return (
    <form aria-label="Login admin" onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="admin-username" className="mb-2 block text-sm">
          Username
        </label>
        <input
          id="admin-username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          maxLength={64}
          disabled={pending}
          className={field}
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-2 block text-sm">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={pending}
          className={field}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        Masuk
      </button>
    </form>
  );
}
