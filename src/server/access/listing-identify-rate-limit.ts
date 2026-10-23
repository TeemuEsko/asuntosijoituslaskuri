import { randomBytes } from "node:crypto";

import { requestFingerprint } from "./request-security.ts";

const fallbackSecret = randomBytes(32).toString("hex");
const fallbackAttempts = new Map<string, number[]>();
const FALLBACK_LIMIT = 10;
const FALLBACK_WINDOW_MS = 15 * 60_000;
const MAX_FALLBACK_IDENTIFIERS = 10_000;

export type ListingIdentifyRateLimitResult = {
  allowed: boolean;
  persistent: boolean;
};

function fallbackAllows(identifierHash: string, now: number): boolean {
  if (fallbackAttempts.size >= MAX_FALLBACK_IDENTIFIERS) {
    for (const [key, attempts] of fallbackAttempts) {
      if (!attempts.some((timestamp) => timestamp > now - FALLBACK_WINDOW_MS)) fallbackAttempts.delete(key);
    }
    if (fallbackAttempts.size >= MAX_FALLBACK_IDENTIFIERS) fallbackAttempts.clear();
  }
  const recent = (fallbackAttempts.get(identifierHash) ?? []).filter(
    (timestamp) => timestamp > now - FALLBACK_WINDOW_MS,
  );
  if (recent.length >= FALLBACK_LIMIT) {
    fallbackAttempts.set(identifierHash, recent);
    return false;
  }
  fallbackAttempts.set(identifierHash, [...recent, now]);
  return true;
}

export function safeServerErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return "UNKNOWN_ERROR";
  if (/^[A-Z][A-Z0-9_]{2,80}$/.test(error.message)) return error.message;
  return error.name || "ERROR";
}

export async function allowListingIdentifyAttempt({
  request,
  secret,
  now = Date.now(),
}: {
  request: Request;
  secret?: string;
  now?: number;
}): Promise<ListingIdentifyRateLimitResult> {
  const identifierHash = requestFingerprint(request, secret && secret.length >= 32 ? secret : fallbackSecret);
  return { allowed: fallbackAllows(identifierHash, now), persistent: false };
}

export function clearListingIdentifyFallbackRateLimit(): void {
  fallbackAttempts.clear();
}
