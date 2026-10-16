import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/access/session";
import { setAccessCookie } from "@/server/access/http";
import { leadRepository } from "@/server/leads/postgres";
import type { LeadRepository } from "@/server/leads/repository";

export const runtime = "nodejs";
type Dependencies = { repository: LeadRepository; sessionSecret?: string; now?: number };

export async function handleSessionStatus(request: Request, dependencies: Dependencies): Promise<NextResponse> {
  const now = dependencies.now ?? Date.now();
  const session = sessionFromRequest(request, dependencies.sessionSecret);
  if (!session) return NextResponse.json({ accessGranted: false }, { status: 401 });
  try {
    if (!await dependencies.repository.touchLead(session.leadId)) return NextResponse.json({ accessGranted: false }, { status: 401 });
    const response = NextResponse.json({ accessGranted: true });
    if (session.expiresAt - Math.floor(now / 1000) < 7 * 24 * 60 * 60) setAccessCookie(response, session.leadId, dependencies.sessionSecret);
    return response;
  } catch {
    return NextResponse.json({ accessGranted: false, error: "Istuntoa ei voitu tarkistaa." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return handleSessionStatus(request, { repository: leadRepository, sessionSecret: process.env.SESSION_SECRET });
}
