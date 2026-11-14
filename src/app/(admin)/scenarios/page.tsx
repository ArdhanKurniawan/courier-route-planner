import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ScenarioManager from "@/components/scenarios/scenario-manager";
import { requireAdmin } from "@/lib/security/admin";
import { HttpError } from "@/lib/http/request-security";

export const metadata: Metadata = { title: "Scenario" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function ScenarioPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    return (
      <ComponentCard title="Scenario">
        <p>
          {error instanceof HttpError && error.status === 403
            ? "Akses ditolak."
            : "Scenario belum tersedia. Hubungi pemilik aplikasi."}
        </p>
      </ComponentCard>
    );
  }
  return (
    <>
      <PageBreadcrumb pageTitle="Scenario" />
      <ComponentCard title="Pengelolaan Scenario">
        <ScenarioManager />
      </ComponentCard>
    </>
  );
}
