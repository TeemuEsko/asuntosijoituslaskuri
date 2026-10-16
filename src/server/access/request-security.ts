import { createHmac } from "node:crypto";

export function sameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (!origin) return process.env.NODE_ENV !== "production";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function requestFingerprint(request: Request, secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET_MISSING");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHmac("sha256", secret).update(address).digest("hex");
}

export function secureTokenMatches(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected || expected.length < 32) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && cryptoTimingSafe(left, right);
}

function cryptoTimingSafe(left: Buffer, right: Buffer): boolean {
  return createHmac("sha256", "admin-token-comparison").update(left).digest().equals(createHmac("sha256", "admin-token-comparison").update(right).digest());
}
