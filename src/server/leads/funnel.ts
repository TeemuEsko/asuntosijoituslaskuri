import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";
import { cookieValue } from "@/server/access/session";

export const FUNNEL_COOKIE_NAME = "asl_funnel";

export function funnelIdForRequest(request: Request): string {
  const value = cookieValue(request, FUNNEL_COOKIE_NAME);
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : randomUUID();
}

export function setFunnelCookie(response: NextResponse, funnelId: string): void {
  response.cookies.set(FUNNEL_COOKIE_NAME, funnelId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, priority: "low" });
}
