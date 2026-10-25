import "server-only";
import {
  getIronSession,
  type CookieStore,
  type SessionOptions,
} from "iron-session";
import { z } from "zod";
import { AuthConfigurationError, type AuthConfig } from "@/config/auth";

const lifetimeMs = 43_200_000;
const sessionData = z.strictObject({
  subject: z.string(),
  environment: z.string(),
  credentialVersion: z.string(),
  issuedAt: z.number().int().safe(),
  expiresAt: z.number().int().safe(),
});
export class AdminAccessError extends Error {
  constructor(readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required." : "Access denied.");
    this.name = "AdminAccessError";
  }
}
function options(config: AuthConfig): SessionOptions {
  return {
    password: config.sessionSecret,
    cookieName: config.cookieName,
    ttl: 43200,
    cookieOptions: {
      httpOnly: true,
      secure: config.secure,
      sameSite: "strict",
      path: "/",
      maxAge: 43200,
    },
  };
}
export function validateAdminSession(
  input: unknown,
  config: AuthConfig,
  now = Date.now(),
): { subject: "single-admin" } {
  const parsed = sessionData.safeParse(input);
  if (!parsed.success) throw new AdminAccessError(401);
  const data = parsed.data;
  if (
    !Number.isSafeInteger(now) ||
    data.issuedAt < 0 ||
    data.issuedAt > now ||
    data.expiresAt <= now ||
    data.expiresAt <= data.issuedAt ||
    data.expiresAt - data.issuedAt > lifetimeMs
  )
    throw new AdminAccessError(401);
  if (
    data.subject !== "single-admin" ||
    data.environment !== config.environment ||
    data.credentialVersion !== config.credentialVersion
  )
    throw new AdminAccessError(403);
  return { subject: "single-admin" };
}
export async function startAdminSession(
  config: AuthConfig,
  cookies: CookieStore,
  now = Date.now(),
) {
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    !Number.isSafeInteger(now + lifetimeMs)
  )
    throw new AuthConfigurationError();
  const session = await getIronSession<z.infer<typeof sessionData>>(
    cookies,
    options(config),
  );
  for (const key of Object.keys(session)) Reflect.deleteProperty(session, key);
  Object.assign(session, {
    subject: "single-admin",
    environment: config.environment,
    credentialVersion: config.credentialVersion,
    issuedAt: now,
    expiresAt: now + lifetimeMs,
  });
  await session.save();
}
export async function readAdminSession(
  config: AuthConfig,
  cookies: CookieStore,
  now = Date.now(),
) {
  const session = await getIronSession<z.infer<typeof sessionData>>(
    cookies,
    options(config),
  );
  return validateAdminSession({ ...session }, config, now);
}
export async function clearAdminSession(
  config: AuthConfig,
  cookies: CookieStore,
) {
  const session = await getIronSession(cookies, options(config));
  session.destroy();
}
