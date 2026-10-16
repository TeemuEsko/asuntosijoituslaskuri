import { NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, accessCookieOptions, createAccessSessionToken } from "./session";

export function unauthorizedResponse() {
  return NextResponse.json({ code: "ACCESS_REQUIRED", error: "Anna yhteystietosi avataksesi analyysin." }, { status: 401 });
}

export function setAccessCookie(response: NextResponse, leadId: string, secret = process.env.SESSION_SECRET): void {
  response.cookies.set(ACCESS_COOKIE_NAME, createAccessSessionToken(leadId, secret), accessCookieOptions);
}
