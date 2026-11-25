import type { Metadata } from "next";
import BenchmarkAdminPage from "@/components/benchmark-cases/benchmark-admin-page";
import FreezePanel from "@/components/benchmark-cases/freeze-panel";

export const metadata: Metadata = { title: "Preview Freeze" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function FreezePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <BenchmarkAdminPage
      title="Preview Freeze"
      description="Periksa Scenario, Depot, dan urutan node sebelum menyimpan snapshot."
    >
      <FreezePanel key={id} scenarioId={id} />
    </BenchmarkAdminPage>
  );
}
