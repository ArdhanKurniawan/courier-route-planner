import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import OrderManager, {
  OrderEditTarget,
} from "@/components/orders/order-manager";
import { requireAdmin } from "@/lib/security/admin";
import { HttpError } from "@/lib/http/request-security";
import { depotId } from "@/lib/validation/depot";
export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const editQuery = z.object({ edit: depotId, scenarioId: depotId });

export default async function OrderPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    return (
      <ComponentCard title="Orders">
        <p>
          {error instanceof HttpError && error.status === 403
            ? "Akses ditolak."
            : "Order belum tersedia. Hubungi pemilik aplikasi."}
        </p>
      </ComponentCard>
    );
  }
  const query = await searchParams;
  const edit =
    query?.edit === undefined && query?.scenarioId === undefined
      ? null
      : editQuery.safeParse(query);
  return (
    <>
      <PageBreadcrumb pageTitle="Orders" />
      <ComponentCard title="Pengelolaan Order">
        {edit?.success && (
          <Link
            className="mb-4 inline-flex min-h-11 items-center underline"
            href={`/map?scenarioId=${edit.data.scenarioId}`}
            prefetch={false}
          >
            Kembali ke Map
          </Link>
        )}
        {edit === null ? (
          <OrderManager />
        ) : edit.success ? (
          <OrderEditTarget
            scenarioId={edit.data.scenarioId}
            id={edit.data.edit}
          />
        ) : (
          <p role="alert">Tautan edit Order tidak valid.</p>
        )}
      </ComponentCard>
    </>
  );
}
