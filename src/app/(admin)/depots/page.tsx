import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import DepotManager, {
  DepotEditTarget,
} from "@/components/depots/depot-manager";
import { requireAdmin } from "@/lib/security/admin";
import { HttpError } from "@/lib/http/request-security";
import { depotId } from "@/lib/validation/depot";

export const metadata: Metadata = { title: "Depot" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const editQuery = z.object({ edit: depotId, scenarioId: depotId.optional() });

export default async function DepotPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
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
  const query = await searchParams;
  const edit = query?.edit === undefined ? null : editQuery.safeParse(query);
  return (
    <>
      <PageBreadcrumb pageTitle="Depot" />
      <ComponentCard title="Pengelolaan Depot">
        {edit?.success && edit.data.scenarioId && (
          <Link
            className="mb-4 inline-flex min-h-11 items-center underline"
            href={`/map?scenarioId=${edit.data.scenarioId}`}
            prefetch={false}
          >
            Kembali ke Map
          </Link>
        )}
        {edit === null ? (
          <DepotManager />
        ) : edit.success ? (
          <DepotEditTarget id={edit.data.edit} />
        ) : (
          <p role="alert">Tautan edit Depot tidak valid.</p>
        )}
      </ComponentCard>
    </>
  );
}
