import "server-only";

import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { MatrixProviderId } from "@/domain/distance-matrix";
import type { MatrixProviderSelection } from "@/lib/validation/distance-matrix";

type Reservation = "allowed" | "limited" | "unavailable";

export type MatrixQuotaLimits = {
  requests: number;
  requestWindowSeconds: number;
  requestsPerSecond: number;
  requestsPerMinute?: number;
  requestsPerDay?: number;
  elements?: number;
  elementWindowSeconds?: number;
};

const reserveScript = `
local usageKey = KEYS[1]
local cooldownKey = KEYS[2]
if redis.call("EXISTS", cooldownKey) == 1 then
  return 0
end

local requests = tonumber(ARGV[1])
local requestWindowSeconds = tonumber(ARGV[2])
local requestsPerSecond = tonumber(ARGV[3])
local elementLimit = tonumber(ARGV[4])
local elementWindowSeconds = tonumber(ARGV[5])
local elements = tonumber(ARGV[6])
local reservationId = ARGV[7]
local requestsPerMinute = tonumber(ARGV[8])
local requestsPerDay = tonumber(ARGV[9])
local retentionSeconds = math.max(requestWindowSeconds, elementWindowSeconds, 1)
if requestsPerMinute > 0 then retentionSeconds = math.max(retentionSeconds, 60) end
if requestsPerDay > 0 then retentionSeconds = math.max(retentionSeconds, 86400) end

local time = redis.call("TIME")
local now = tonumber(time[1]) * 1000000 + tonumber(time[2])
local function cutoff(windowSeconds)
  return string.format("%.0f", now - windowSeconds * 1000000)
end
local function activeSince(windowSeconds)
  return "(" .. cutoff(windowSeconds)
end
local function requestCount(windowSeconds)
  return redis.call("ZCOUNT", usageKey, activeSince(windowSeconds), "+inf")
end

redis.call("ZREMRANGEBYSCORE", usageKey, "-inf", cutoff(retentionSeconds))
if requestCount(1) >= requestsPerSecond
  or requestCount(requestWindowSeconds) >= requests
  or (requestsPerMinute > 0 and requestCount(60) >= requestsPerMinute)
  or (requestsPerDay > 0 and requestCount(86400) >= requestsPerDay) then
  return 0
end

if elementLimit > 0 then
  local remaining = elementLimit - elements
  if remaining < 0 then return 0 end
  for _, entry in ipairs(redis.call("ZRANGEBYSCORE", usageKey, activeSince(elementWindowSeconds), "+inf")) do
    local used = tonumber(string.match(entry, "^(%d+):"))
    if not used then return redis.error_reply("Invalid quota entry") end
    if used > remaining then return 0 end
    remaining = remaining - used
  end
end

local entry = ARGV[6] .. ":" .. reservationId
if redis.call("ZADD", usageKey, "NX", string.format("%.0f", now), entry) ~= 1 then
  return redis.error_reply("Duplicate reservation")
end
-- Keep an extra millisecond because Redis key expiration uses millisecond precision.
redis.call("PEXPIRE", usageKey, string.format("%.0f", retentionSeconds * 1000 + 1))
return 1
`;

const cooldownScript = `
local remaining = redis.call("PTTL", KEYS[1])
if remaining == -1 then return redis.error_reply("Invalid cooldown key") end
if remaining < tonumber(ARGV[1]) then
  redis.call("SET", KEYS[1], "1", "PX", ARGV[1])
end
return 1
`;

const bindSelectionScript = `
if redis.call("SET", KEYS[1], ARGV[1], "NX") then return 1 end
if redis.call("GET", KEYS[1]) == ARGV[1] then return 1 end
return 0
`;

const redisTimeoutMs = 1_000;
const maxWindowSeconds = Math.floor(Number.MAX_SAFE_INTEGER / 1_000_000);

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function quotaKeys(provider: MatrixProviderId) {
  // Stable across all deployments sharing this Redis. Both keys use the same hash slot.
  const prefix = `crp:distance-matrix:{${provider}}`;
  return { usage: `${prefix}:usage`, cooldown: `${prefix}:cooldown` };
}

export function createDistanceMatrixQuota({
  url,
  token,
}: {
  url: string;
  token: string;
}) {
  async function execute(
    script: string,
    keys: string[],
    args: (number | string)[],
  ) {
    const deadline = performance.now() + redisTimeoutMs;
    const signal = AbortSignal.timeout(redisTimeoutMs);
    const redis = new Redis({
      url,
      token,
      retry: { retries: 0 },
      signal,
      enableAutoPipelining: false,
      automaticDeserialization: false,
    });
    const result = await redis.eval(script, keys, args);
    signal.throwIfAborted();
    if (performance.now() >= deadline)
      throw new Error("Redis quota deadline exceeded.");
    return result;
  }

  return {
    async bindSelection(
      caseId: string,
      requestId: string,
      selection: MatrixProviderSelection,
    ): Promise<"allowed" | "conflict" | "unavailable"> {
      // A failed or ambiguous dispatch must retain its binding. This key does
      // not use the provider cooldown or a rolling quota expiration.
      const key = `crp:distance-matrix:request:${caseId}:${requestId}`;
      const value = selection.mode === "research" ? "research:" + selection.provider : "operational";
      try {
        const result = await execute(bindSelectionScript, [key], [value]);
        if (result === 1) return "allowed";
        if (result === 0) return "conflict";
      } catch {
        // The binding might exist if the response was lost.
      }
      return "unavailable";
    },

    async reserve(
      provider: MatrixProviderId,
      limits: MatrixQuotaLimits,
      elements: number,
    ): Promise<Reservation> {
      const {
        requests,
        requestWindowSeconds,
        requestsPerSecond,
        requestsPerMinute,
        requestsPerDay,
        elements: elementLimit,
        elementWindowSeconds,
      } = limits;
      if (
        ![requests, requestWindowSeconds, requestsPerSecond, elements].every(
          isPositiveInteger,
        ) ||
        requestWindowSeconds > maxWindowSeconds ||
        (requestsPerMinute !== undefined &&
          !isPositiveInteger(requestsPerMinute)) ||
        (requestsPerDay !== undefined && !isPositiveInteger(requestsPerDay)) ||
        (elementLimit === undefined) !== (elementWindowSeconds === undefined) ||
        (elementLimit !== undefined && !isPositiveInteger(elementLimit)) ||
        (elementWindowSeconds !== undefined &&
          (!isPositiveInteger(elementWindowSeconds) ||
            elementWindowSeconds > maxWindowSeconds))
      )
        return "unavailable";

      const keys = quotaKeys(provider);
      try {
        const result = await execute(
          reserveScript,
          [keys.usage, keys.cooldown],
          [
            requests,
            requestWindowSeconds,
            requestsPerSecond,
            elementLimit ?? 0,
            elementWindowSeconds ?? 0,
            elements,
            randomUUID(),
            requestsPerMinute ?? 0,
            requestsPerDay ?? 0,
          ],
        );
        if (result === 1) return "allowed";
        if (result === 0) return "limited";
      } catch {
        // Redis may have committed the reservation before losing the response.
      }
      return "unavailable";
    },

    async cooldown(
      provider: MatrixProviderId,
      milliseconds: number,
    ): Promise<boolean> {
      if (!isPositiveInteger(milliseconds)) return false;
      try {
        return (
          (await execute(
            cooldownScript,
            [quotaKeys(provider).cooldown],
            [milliseconds],
          )) === 1
        );
      } catch {
        return false;
      }
    },
  };
}
