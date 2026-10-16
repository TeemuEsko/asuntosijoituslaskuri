import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ACCESS_SESSION_MAX_AGE_SECONDS } from "../../core/leads/model.ts";

export const ACCESS_COOKIE_NAME = "asl_access";

export type AccessSession = { leadId: string; issuedAt: number; expiresAt: number; nonce: string };

function signingInput(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function validSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= 32;
}

export function createAccessSessionToken(leadId: string, secret: string | undefined, now = Date.now()): string {
  if (!validSecret(secret)) throw new Error("SESSION_SECRET_MISSING");
  const issuedAt = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({ leadId, issuedAt, expiresAt: issuedAt + ACCESS_SESSION_MAX_AGE_SECONDS, nonce: randomUUID() } satisfies AccessSession)).toString("base64url");
  return `${payload}.${signingInput(payload, secret)}`;
}

export function verifyAccessSessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): AccessSession | null {
  if (!token || !validSecret(secret)) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = signingInput(payload, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AccessSession;
    if (!session.leadId || !session.nonce || !Number.isInteger(session.issuedAt) || !Number.isInteger(session.expiresAt)) return null;
    if (session.expiresAt <= Math.floor(now / 1000) || session.issuedAt > Math.floor(now / 1000) + 60) return null;
    return session;
  } catch {
    return null;
  }
}

export function cookieValue(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

export function sessionFromRequest(request: Request, secret = process.env.SESSION_SECRET): AccessSession | null {
  return verifyAccessSessionToken(cookieValue(request, ACCESS_COOKIE_NAME), secret);
}

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ACCESS_SESSION_MAX_AGE_SECONDS,
  priority: "high" as const,
};
