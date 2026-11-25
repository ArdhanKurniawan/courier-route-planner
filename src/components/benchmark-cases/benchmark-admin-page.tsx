import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { HttpError } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";

export default async function BenchmarkAdminPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    return (
      <ComponentCard title={title}>
        <p role="alert">
          {error instanceof HttpError && error.status === 403
            ? "Akses ditolak."
            : "Benchmark Case belum tersedia. Hubungi pemilik aplikasi."}
        </p>
      </ComponentCard>
    );
  }
  return (
    <>
      <PageBreadcrumb pageTitle={title} />
      <ComponentCard title={title} desc={description}>
        {children}
      </ComponentCard>
    </>
  );
}
