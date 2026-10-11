import type { Metadata } from "next";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export const metadata: Metadata = { title: "About / Environment Info" };

export default function About() {
  return (
    <>
      <PageBreadcrumb pageTitle="About / Environment Info" />
      <ComponentCard
        title="Courier Route Planner"
        desc="Web Admin Route Optimization"
      >
        <dl className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <dt className="font-medium text-gray-800 dark:text-white/90">
              Tahap aplikasi
            </dt>
            <dd className="mt-1">
              UI Template Cleanup. Foundation belum selesai.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-800 dark:text-white/90">
              UI baseline
            </dt>
            <dd className="mt-1">
              TailAdmin Next.js Free (MIT), Next.js App Router, TypeScript,
              Tailwind CSS.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-800 dark:text-white/90">
              Fitur berikutnya
            </dt>
            <dd className="mt-1">
              Database, pengelolaan depot/order/scenario, peta, optimasi rute,
              benchmark, dan autentikasi belum diimplementasikan.
            </dd>
          </div>
        </dl>
      </ComponentCard>
    </>
  );
}
