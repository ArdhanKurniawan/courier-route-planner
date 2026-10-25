import { cookies } from "next/headers";
import { parseAuthConfig } from "@/config/auth";
import { clearAdminSession } from "@/lib/security/admin-session";
import {
  assertSameOrigin,
  readJson,
  privateJson,
  errorResponse,
} from "@/lib/http/request-security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const config = parseAuthConfig(process.env);
    assertSameOrigin(request, config.origin);
    await readJson(request, 4096);
    await clearAdminSession(config, await cookies());
    return privateJson({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
