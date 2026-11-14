import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import AdminLoginForm from "@/components/auth/admin-login-form";
import {
  AuthConfigurationError,
  parseAuthConfig,
  type AuthConfig,
} from "@/config/auth";
import {
  AdminAccessError,
  readAdminSession,
} from "@/lib/security/admin-session";

export const metadata: Metadata = { title: "Login Administrator" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function hasAdminSession(config: AuthConfig) {
  const cookieStore = await cookies();
  try {
    await readAdminSession(config, cookieStore);
    return true;
  } catch (error) {
    if (error instanceof AdminAccessError) return false;
    throw error;
  }
}

export default async function LoginPage() {
  let config: AuthConfig | undefined;
  try {
    config = parseAuthConfig(process.env);
  } catch (error) {
    if (!(error instanceof AuthConfigurationError)) throw error;
  }

  if (config && (await hasAdminSession(config))) redirect("/");

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-gray-800 dark:text-white/90">
      <h1 className="mb-6 text-2xl font-semibold">Courier Route Planner</h1>
      <ComponentCard title="Masuk Administrator">
        {config ? (
          <AdminLoginForm />
        ) : (
          <p>Login belum tersedia. Hubungi pemilik aplikasi.</p>
        )}
      </ComponentCard>
    </main>
  );
}
