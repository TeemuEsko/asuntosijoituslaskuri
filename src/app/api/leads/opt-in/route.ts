import { NextResponse } from "next/server";
import { CONSENT_SOURCE, CONSENT_TEXT_VERSION, validateOptIn, type OptInInput } from "@/core/leads/model";
import { sameOriginMutation, requestFingerprint } from "@/server/access/request-security";
import { setAccessCookie } from "@/server/access/http";
import { funnelIdForRequest, setFunnelCookie } from "@/server/leads/funnel";
import { leadRepository } from "@/server/leads/postgres";
import type { LeadRepository } from "@/server/leads/repository";

export const runtime = "nodejs";

type Dependencies = { repository: LeadRepository; sessionSecret?: string; now?: () => Date };

export async function handleOptIn(request: Request, dependencies: Dependencies): Promise<NextResponse> {
  if (!sameOriginMutation(request)) return NextResponse.json({ error: "Pyyntö estettiin turvallisuussyistä." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 4_096) return NextResponse.json({ error: "Syöte on liian pitkä." }, { status: 413 });
  let input: OptInInput;
  try { input = (await request.json()) as OptInInput; }
  catch { return NextResponse.json({ error: "Pyyntöä ei voitu lukea." }, { status: 400 }); }
  const validation = validateOptIn(input);
  if (!validation.ok) return NextResponse.json({ error: validation.message, field: validation.field }, { status: 400 });

  try {
    const fingerprint = requestFingerprint(request, dependencies.sessionSecret);
    if (!await dependencies.repository.allowAttempt("optin", fingerprint, 10, 15 * 60)) return NextResponse.json({ error: "Liian monta yritystä. Odota hetki ja yritä uudelleen." }, { status: 429 });
    const now = dependencies.now?.() ?? new Date();
    const lead = await dependencies.repository.upsertLead(validation.value, { textVersion: CONSENT_TEXT_VERSION, source: CONSENT_SOURCE, timestamp: now });
    const funnelId = funnelIdForRequest(request);
    await dependencies.repository.recordFunnelEvent("optin_completed", funnelId, lead.id);
    if (validation.value.marketingConsent) await dependencies.repository.recordFunnelEvent("marketing_consent_granted", funnelId, lead.id);
    const response = NextResponse.json({ ok: true, accessGranted: true });
    setAccessCookie(response, lead.id, dependencies.sessionSecret);
    setFunnelCookie(response, funnelId);
    return response;
  } catch {
    return NextResponse.json({ error: "Tietojen tallentaminen epäonnistui. Yritä hetken kuluttua uudelleen." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  return handleOptIn(request, { repository: leadRepository, sessionSecret: process.env.SESSION_SECRET });
}
