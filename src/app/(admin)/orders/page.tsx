import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import OrderManager from "@/components/orders/order-manager";
import { requireAdmin } from "@/lib/security/admin";
import { HttpError } from "@/lib/http/request-security";
export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function OrderPage() {
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
  return (
    <>
      <PageBreadcrumb pageTitle="Orders" />
      <ComponentCard title="Pengelolaan Order">
        <OrderManager />
      </ComponentCard>
    </>
  );
}
