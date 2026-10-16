import { NextResponse } from "next/server";
import { acquireListing } from "@/core/listing-acquisition/acquire-listing";
import { requestFingerprint, sameOriginMutation } from "@/server/access/request-security";
import { funnelIdForRequest, setFunnelCookie } from "@/server/leads/funnel";
import { leadRepository } from "@/server/leads/postgres";
import type { ListingFinding } from "@/core/parser/listing-parser";
import type { ListingPreview } from "@/core/leads/listing-preview";

export const runtime = "nodejs";
export const maxDuration = 60;

function previewFromFindings(findings: ListingFinding[]): ListingPreview {
  const preview: ListingPreview = {};
  if (!Array.isArray(findings)) return preview;
  for (const finding of findings) {
    if (!finding || typeof finding !== "object" || !("field" in finding) || !("normalizedValue" in finding)) continue;
    const field = String(finding.field) as keyof ListingPreview;
    if (!["address", "roomDescription", "areaSqm", "debtFreePrice", "buildingType"].includes(field)) continue;
    if ((finding as { validationResult?: string }).validationResult !== "accepted" || (finding as { conflicts?: unknown[] }).conflicts?.length) continue;
    preview[field] = finding.normalizedValue as never;
  }
  return preview;
}

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return NextResponse.json({ error: "Pyyntö estettiin turvallisuussyistä." }, { status: 403 });
  let body: { value?: string };
  try { body = await request.json() as { value?: string }; }
  catch { return NextResponse.json({ error: "Pyyntöä ei voitu lukea." }, { status: 400 }); }
  const value = body.value?.trim() ?? "";
  if (!value || value.length > 2_048) return NextResponse.json({ error: "Anna kelvollinen ilmoituslinkki." }, { status: 400 });
  try {
    const fingerprint = requestFingerprint(request, process.env.SESSION_SECRET);
    if (!await leadRepository.allowAttempt("listing_identify", fingerprint, 20, 15 * 60)) return NextResponse.json({ error: "Liian monta hakua. Odota hetki ja yritä uudelleen." }, { status: 429 });
    const acquisition = await acquireListing(value);
    if (!acquisition.ok) return NextResponse.json({ code: acquisition.code, error: acquisition.error }, { status: acquisition.status });
    const preview = previewFromFindings(acquisition.result.findings);
    const funnelId = funnelIdForRequest(request);
    await leadRepository.recordFunnelEvent("listing_identified", funnelId);
    const response = NextResponse.json({ preview });
    setFunnelCookie(response, funnelId);
    return response;
  } catch {
    return NextResponse.json({ error: "Kohteen tunnistaminen epäonnistui. Yritä uudelleen." }, { status: 503 });
  }
}
