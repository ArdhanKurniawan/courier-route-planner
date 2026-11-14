import { z } from "zod";

export class AuthConfigurationError extends Error {
  constructor() {
    super("Authentication unavailable.");
    this.name = "AuthConfigurationError";
  }
}
export type AuthConfig = {
  environment: "development" | "testing" | "production";
  origin: string;
  username: string;
  passwordHash: string;
  sessionSecret: string;
  credentialVersion: string;
  redisUrl: string;
  redisToken: string;
  cookieName: string;
  secure: boolean;
};
function validPhc(value: string) {
  const match =
    /^\$argon2id\$v=19\$m=19456,t=2,p=1\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/u.exec(
      value,
    );
  if (!match || value.length > 256) return false;
  const salt = Buffer.from(match[1], "base64"),
    digest = Buffer.from(match[2], "base64");
  return (
    salt.length >= 16 &&
    salt.length <= 32 &&
    digest.length === 32 &&
    salt.toString("base64").replace(/=+$/u, "") === match[1] &&
    digest.toString("base64").replace(/=+$/u, "") === match[2]
  );
}
const settings = z.object({
  APP_ENV: z.enum(["development", "testing", "production"]),
  AUTH_ORIGIN: z.string().max(2048),
  ADMIN_USERNAME: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/u),
  ADMIN_PASSWORD_HASH: z.string().refine(validPhc),
  AUTH_SESSION_SECRET: z.string().regex(/^[A-Za-z0-9_-]{43,256}$/u),
  AUTH_CREDENTIAL_VERSION: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/u),
  UPSTASH_REDIS_REST_URL: z.string().max(2048),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1)
    .max(2048)
    .regex(/^[!-~]+$/u),
});
export function parseAuthConfig(
  env: Record<string, string | undefined>,
): AuthConfig {
  const parsed = settings.safeParse(env);
  if (!parsed.success) throw new AuthConfigurationError();
  const s = parsed.data;
  try {
    const hosted = env.VERCEL === "1" || env.VERCEL_ENV !== undefined;
    const expected = hosted
      ? (
          { preview: "testing", production: "production" } as Record<
            string,
            string
          >
        )[env.VERCEL_ENV ?? ""]
      : "development";
    if (s.APP_ENV !== expected) throw new AuthConfigurationError();
    const origin = new URL(s.AUTH_ORIGIN),
      redis = new URL(s.UPSTASH_REDIS_REST_URL);
    if (
      origin.origin !== s.AUTH_ORIGIN ||
      origin.hostname.includes("*") ||
      origin.username ||
      origin.password ||
      redis.username ||
      redis.password ||
      redis.protocol !== "https:" ||
      redis.search ||
      redis.hash ||
      redis.pathname !== "/"
    )
      throw new AuthConfigurationError();
    const secure = origin.protocol === "https:";
    if (
      !secure &&
      !(
        s.APP_ENV === "development" &&
        !hosted &&
        origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname)
      )
    )
      throw new AuthConfigurationError();
    return {
      environment: s.APP_ENV,
      origin: s.AUTH_ORIGIN,
      username: s.ADMIN_USERNAME,
      passwordHash: s.ADMIN_PASSWORD_HASH,
      sessionSecret: s.AUTH_SESSION_SECRET,
      credentialVersion: s.AUTH_CREDENTIAL_VERSION,
      redisUrl: s.UPSTASH_REDIS_REST_URL,
      redisToken: s.UPSTASH_REDIS_REST_TOKEN,
      secure,
      cookieName: secure
        ? `__Host-crp-admin-${s.APP_ENV}`
        : "crp-admin-development",
    };
  } catch {
    throw new AuthConfigurationError();
  }
}
