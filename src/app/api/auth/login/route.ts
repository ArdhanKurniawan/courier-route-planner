import { cookies } from "next/headers";
import { parseAuthConfig } from "@/config/auth";
import {
  parseLoginInput,
  verifyAdminPassword,
} from "@/lib/security/admin-password";
import {
  createLoginRateLimiter,
  consumeLoginAttempt,
} from "@/lib/security/login-rate-limit";
import { startAdminSession } from "@/lib/security/admin-session";
import {
  HttpError,
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
    const raw = await readJson(request, 4096);
    let input: ReturnType<typeof parseLoginInput>;
    try {
      input = parseLoginInput(raw);
    } catch {
      throw new HttpError(400, "INVALID_INPUT", "Invalid login input.");
    }
    const allowance = await consumeLoginAttempt(createLoginRateLimiter(config));
    if (!allowance.allowed)
      return privateJson(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Login temporarily limited.",
          },
        },
        429,
        { "Retry-After": String(allowance.retryAfter) },
      );
    if (!(await verifyAdminPassword(input, config)))
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
    await startAdminSession(config, await cookies());
    return privateJson({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
