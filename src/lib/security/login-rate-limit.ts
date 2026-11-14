import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { AuthConfigurationError, type AuthConfig } from "@/config/auth";

export type LoginLimiter = { limit: (identifier: string) => Promise<unknown> };
const resultSchema = z.object({
  success: z.boolean(),
  limit: z.literal(5),
  remaining: z.number().int().min(0).max(5),
  reset: z.number().int().safe().positive(),
  reason: z.enum(["timeout", "cacheBlock", "denyList"]).optional(),
});
export function createLoginRateLimiter(config: AuthConfig): LoginLimiter {
  const redis = new Redis({
    url: config.redisUrl,
    token: config.redisToken,
    retry: { retries: 0 },
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, "15 m"),
    prefix: `crp:login:${config.environment}`,
    analytics: false,
    ephemeralCache: false,
    timeout: 1000,
    enableProtection: false,
  });
}
export async function consumeLoginAttempt(
  limiter: LoginLimiter,
  now = Date.now(),
): Promise<{ allowed: boolean; retryAfter: number }> {
  try {
    const parsed = resultSchema.safeParse(await limiter.limit("single-admin"));
    if (
      !parsed.success ||
      parsed.data.reason === "timeout" ||
      (parsed.data.success && parsed.data.reason !== undefined)
    )
      throw new AuthConfigurationError();
    const result = parsed.data;
    return result.success
      ? { allowed: true, retryAfter: 0 }
      : {
          allowed: false,
          retryAfter: Math.max(
            1,
            Math.min(900, Math.ceil((result.reset - now) / 1000)),
          ),
        };
  } catch {
    throw new AuthConfigurationError();
  }
}
