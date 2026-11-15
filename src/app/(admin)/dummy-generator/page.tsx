import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DummyPreviewManager from "@/components/generator/dummy-preview-manager";
import { getDummyGeneratorMode } from "@/config/dummy-generator-mode";
import { HttpError } from "@/lib/http/request-security";
import { requireAdmin } from "@/lib/security/admin";

export const metadata: Metadata = { title: "Dummy Generator" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DummyGeneratorPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    return (
      <ComponentCard title="Dummy Generator">
        <p>
          {error instanceof HttpError && error.status === 403
            ? "Akses ditolak."
            : "Dummy Generator belum tersedia. Hubungi pemilik aplikasi."}
        </p>
      </ComponentCard>
    );
  }

  const mode = getDummyGeneratorMode();
  if (mode === "disabled")
    return (
      <ComponentCard title="Dummy Generator">
        <p>Dummy Generator belum diaktifkan.</p>
      </ComponentCard>
    );

  const allowPreview = mode === "enabled";
  return (
    <>
      <PageBreadcrumb pageTitle="Dummy Generator" />
      <ComponentCard
        title={allowPreview ? "Preview titik dummy" : "Verifikasi operasi dummy"}
        desc={
          allowPreview
            ? "Buat pratinjau koordinat pelanggan untuk Scenario draft berpola random."
            : "Periksa status dan verifikasi hasil operasi yang tertunda."
        }
      >
        <DummyPreviewManager allowPreview={allowPreview} />
      </ComponentCard>
    </>
  );
}
