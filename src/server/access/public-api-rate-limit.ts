import { randomBytes } from "node:crypto";

import { requestFingerprint } from "./request-security.ts";

const fallbackSecret = randomBytes(32).toString("hex");
const attemptsByScope = new Map<string, Map<string, number[]>>();
const MAX_IDENTIFIERS_PER_SCOPE = 10_000;

export function allowPublicApiAttempt({
  request,
  scope,
  limit,
  windowMs,
  now = Date.now(),
}: {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
  now?: number;
}): boolean {
  const identifier = requestFingerprint(request, fallbackSecret);
  const attempts = attemptsByScope.get(scope) ?? new Map<string, number[]>();
  attemptsByScope.set(scope, attempts);

  if (attempts.size >= MAX_IDENTIFIERS_PER_SCOPE && !attempts.has(identifier)) {
    for (const [key, timestamps] of attempts) {
      if (!timestamps.some((timestamp) => timestamp > now - windowMs)) {
        attempts.delete(key);
      }
    }
    if (attempts.size >= MAX_IDENTIFIERS_PER_SCOPE) return false;
  }

  const recent = (attempts.get(identifier) ?? []).filter(
    (timestamp) => timestamp > now - windowMs,
  );
  if (recent.length >= limit) {
    attempts.set(identifier, recent);
    return false;
  }
  attempts.set(identifier, [...recent, now]);
  return true;
}

export function clearPublicApiRateLimits(): void {
  attemptsByScope.clear();
}
