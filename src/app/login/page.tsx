import type { Metadata } from "next";
import ComponentCard from "@/components/common/ComponentCard";
import AdminLoginForm from "@/components/auth/admin-login-form";
import { parseAuthConfig } from "@/config/auth";

export const metadata: Metadata = { title: "Login Administrator" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default function LoginPage() {
  let ready = true;
  try {
    parseAuthConfig(process.env);
  } catch {
    ready = false;
  }
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-gray-800 dark:text-white/90">
      <h1 className="mb-6 text-2xl font-semibold">Courier Route Planner</h1>
      <ComponentCard title="Masuk Administrator">
        {ready ? (
          <AdminLoginForm />
        ) : (
          <p>Login belum tersedia. Hubungi pemilik aplikasi.</p>
        )}
      </ComponentCard>
    </main>
  );
}
