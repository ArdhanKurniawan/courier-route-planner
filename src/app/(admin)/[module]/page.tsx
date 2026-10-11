import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { plannedModules } from "@/config/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return plannedModules.map((item) => ({ module: item.href.slice(1) }));
}

function findModule(slug: string) {
  return plannedModules.find((item) => item.href === `/${slug}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}): Promise<Metadata> {
  const item = findModule((await params).module);
  return { title: item?.title ?? "Halaman tidak ditemukan" };
}

export default async function ModulePlaceholder({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const item = findModule((await params).module);
  if (!item) notFound();

  return (
    <>
      <PageBreadcrumb pageTitle={item.title} />
      <ComponentCard title="Belum diimplementasikan">
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">
          Modul {item.title} masih dalam rencana pengembangan. Halaman ini
          menyediakan tempat navigasi; belum tersedia fungsi atau data untuk
          modul ini.
        </p>
      </ComponentCard>
    </>
  );
}
