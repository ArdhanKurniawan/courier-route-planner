import type { Metadata } from "next";
import Link from "next/link";
import ComponentCard from "@/components/common/ComponentCard";

export const metadata: Metadata = { title: "Dashboard" };

const projectStatus = [
  { title: "Depot", status: "Belum dikonfigurasi" },
  { title: "Active Scenario", status: "Belum tersedia" },
  { title: "Route Optimization", status: "Belum dijalankan" },
  { title: "Benchmark", status: "Belum tersedia" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Courier Route Planner
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Web Admin Route Optimization
        </p>
      </div>
      <ComponentCard
        title="Project Status"
        desc="Status kesiapan fitur. Aplikasi saat ini berupa shell UI; data operasional belum tersedia."
      >
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {projectStatus.map(({ title, status }) => (
            <div
              key={title}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <dt className="text-sm font-medium text-gray-800 dark:text-white/90">
                {title}
              </dt>
              <dd className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {status}
              </dd>
            </div>
          ))}
        </dl>
      </ComponentCard>
      <ComponentCard title="Tahap Pengembangan" desc="UI Template Cleanup">
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">
          Navigasi modul tersedia sebagai placeholder. Pengelolaan data, peta,
          optimasi rute, dan eksperimen penelitian belum diimplementasikan.
        </p>
        <Link
          href="/about"
          className="mt-4 inline-flex rounded-lg text-sm font-medium text-brand-500 hover:underline dark:text-brand-400"
        >
          Lihat informasi aplikasi
        </Link>
      </ComponentCard>
    </div>
  );
}
