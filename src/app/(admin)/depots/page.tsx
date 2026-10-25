import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DepotManager from "@/components/depots/depot-manager";
import { requireAdmin } from "@/lib/security/admin";
import { HttpError } from "@/lib/http/request-security";

export const metadata: Metadata = { title: "Depot" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function DepotPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    return (
      <ComponentCard title="Depot">
        <p>
          {error instanceof HttpError && error.status === 403
            ? "Akses ditolak."
            : "Depot belum tersedia. Hubungi pemilik aplikasi."}
        </p>
      </ComponentCard>
    );
  }
  return (
    <>
      <PageBreadcrumb pageTitle="Depot" />
      <ComponentCard title="Pengelolaan Depot">
        <DepotManager />
      </ComponentCard>
    </>
  );
}
