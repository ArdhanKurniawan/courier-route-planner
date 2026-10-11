import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="font-semibold text-brand-500">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-800 dark:text-white/90">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Alamat ini tidak tersedia di Courier Route Planner.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </main>
  );
}
