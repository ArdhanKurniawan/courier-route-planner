import type { Metadata } from "next";
import BenchmarkAdminPage from "@/components/benchmark-cases/benchmark-admin-page";
import BenchmarkCaseDetail from "@/components/benchmark-cases/benchmark-case-detail";

export const metadata: Metadata = { title: "Detail Benchmark Case" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function BenchmarkCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <BenchmarkAdminPage title="Detail Benchmark Case">
      <BenchmarkCaseDetail caseId={(await params).id} />
    </BenchmarkAdminPage>
  );
}
