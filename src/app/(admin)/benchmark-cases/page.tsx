import type { Metadata } from "next";
import BenchmarkAdminPage from "@/components/benchmark-cases/benchmark-admin-page";
import BenchmarkCaseHistory from "@/components/benchmark-cases/benchmark-case-history";

export const metadata: Metadata = { title: "Riwayat Benchmark Case" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function BenchmarkHistoryPage() {
  return (
    <BenchmarkAdminPage
      title="Riwayat Benchmark Case"
      description="Buka snapshot Scenario yang telah disimpan untuk penelitian."
    >
      <BenchmarkCaseHistory />
    </BenchmarkAdminPage>
  );
}
