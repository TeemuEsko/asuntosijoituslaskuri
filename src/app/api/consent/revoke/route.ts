import { NextResponse } from "next/server";
import { sameOriginMutation } from "@/server/access/request-security";
import { sessionFromRequest } from "@/server/access/session";
import { leadRepository } from "@/server/leads/postgres";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return NextResponse.json({ error: "Pyyntö estettiin." }, { status: 403 });
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Istunto vaaditaan." }, { status: 401 });
  try {
    const revoked = await leadRepository.revokeMarketingConsent(session.leadId, "self_service_session", new Date());
    return revoked ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Tietoa ei löytynyt." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Suostumuksen peruuttaminen epäonnistui." }, { status: 503 });
  }
}
