import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import MapManager from "@/components/map/map-manager";
import { HttpError } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";
import { depotId } from "@/lib/validation/depot";

export const metadata: Metadata = { title: "Map" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function MapPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    return (
      <ComponentCard title="Map">
        <p>
          {error instanceof HttpError && error.status === 403
            ? "Akses ditolak."
            : "Peta belum tersedia. Hubungi pemilik aplikasi."}
        </p>
      </ComponentCard>
    );
  }

  const scenario = depotId
    .optional()
    .safeParse((await searchParams)?.scenarioId);
  return (
    <>
      <PageBreadcrumb pageTitle="Map" />
      <ComponentCard
        title="Peta Scenario"
        desc="Lihat lokasi Depot dan Order pada Scenario terpilih."
      >
        {!scenario.success && <p role="alert">Tautan Scenario tidak valid.</p>}
        <MapManager
          key={scenario.data ?? ""}
          initialScenarioId={scenario.data}
        />
      </ComponentCard>
    </>
  );
}
