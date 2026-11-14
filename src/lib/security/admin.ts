import "server-only";
import { cookies } from "next/headers";
import { parseAuthConfig } from "@/config/auth";
import { AdminAccessError, readAdminSession } from "./admin-session";
import { HttpError } from "@/lib/http/request-security";

export async function requireAdmin() {
  const config = parseAuthConfig(process.env);
  try {
    await readAdminSession(config, await cookies());
  } catch (error) {
    if (error instanceof AdminAccessError)
      throw new HttpError(
        error.status,
        error.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        error.message,
      );
    throw error;
  }
  return config;
}
