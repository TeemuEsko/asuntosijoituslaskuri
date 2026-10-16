import { NextResponse } from "next/server";
import { sessionFromRequest } from "@/server/access/session";
import { leadRepository } from "@/server/leads/postgres";
import type { LeadRepository } from "@/server/leads/repository";

export const runtime = "nodejs";

export async function handleReportAccess(request: Request, repository: LeadRepository, secret?: string) {
  const session = sessionFromRequest(request, secret);
  if (!session) return NextResponse.json({ error: "Istunto vaaditaan." }, { status: 401 });
  try {
    return await repository.touchLead(session.leadId)
      ? new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ error: "Istunto ei ole voimassa." }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Käyttöoikeutta ei voitu tarkistaa." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return handleReportAccess(request, leadRepository, process.env.SESSION_SECRET);
}
