import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";
import { cookieValue } from "../access/session.ts";

export const FUNNEL_COOKIE_NAME = "asl_funnel";

export function funnelCookieHeader(funnelId: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${FUNNEL_COOKIE_NAME}=${encodeURIComponent(funnelId)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; SameSite=Lax; Priority=Low${secure}`;
}

export function funnelIdForRequest(request: Request): string {
  const value = cookieValue(request, FUNNEL_COOKIE_NAME);
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : randomUUID();
}

export function setFunnelCookie(response: NextResponse, funnelId: string): void {
  response.cookies.set(FUNNEL_COOKIE_NAME, funnelId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, priority: "low" });
}
