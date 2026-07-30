import { NextResponse } from "next/server";

import { prepareListingAnalysis } from "@/core/analysis/prepare-listing-analysis";
import { acquireListing } from "@/core/listing-acquisition/acquire-listing";
import { parseListingText } from "@/core/parser/listing-parser";
import { analyseListingImages } from "@/server/listing-images/analyse-listing-images";
import type { ListingImageAnalysisStatus, ListingImagePipelineResult } from "@/core/listing-images/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type ImportRequest = { kind?: "url" | "text"; value?: string; forceRefresh?: boolean };
const MAX_INPUT_LENGTH = 100_000;

export async function POST(request: Request) {
  let body: ImportRequest;
  try { body = (await request.json()) as ImportRequest; }
  catch { return NextResponse.json({ error: "Pyyntöä ei voitu lukea. Yritä uudelleen." }, { status: 400 }); }

  const value = body.value?.trim() ?? "";
  if (!value) return NextResponse.json({ error: "Täytä puuttuvat pakolliset tiedot." }, { status: 400 });
  if (value.length > MAX_INPUT_LENGTH) return NextResponse.json({ error: "Syöte on liian pitkä. Lyhennä tekstiä ja yritä uudelleen." }, { status: 413 });

  if (body.kind === "text") {
    const parsed = parseListingText(value, "pasted_text");
    if (!parsed.findings.length && !parsed.renovations.length) return NextResponse.json({ code: "insufficient_content", error: "Tekstistä ei löytynyt tunnistettavaa kohdedataa. Liitä ilmoituksen koko tietosisältö tai täytä tiedot itse." }, { status: 422 });
    return NextResponse.json(await prepareListingAnalysis(parsed));
  }
  if (body.kind !== "url") return NextResponse.json({ code: "invalid_input", error: "Valitse linkki tai ilmoitusteksti." }, { status: 400 });

  const acquisition = await acquireListing(value, { forceRefresh: body.forceRefresh, includeSourceDocument: true });
  if (!acquisition.ok) return NextResponse.json({ code: acquisition.code, error: acquisition.error, diagnostics: process.env.NODE_ENV === "development" ? acquisition.diagnostics : undefined }, { status: acquisition.status });
  const findingValue = (field: string) => acquisition.result.findings.find((item) => item.field === field && item.validationResult === "accepted" && !item.conflicts.length)?.normalizedValue;
  const areaSqm = findingValue("areaSqm");
  const roomDescription = findingValue("roomDescription");
  const expectedRooms = typeof roomDescription === "string" ? Number(roomDescription.match(/^\s*(\d+)/)?.[1]) || undefined : undefined;
  const listingCondition = findingValue("condition");
  const imageFallback: ListingImageAnalysisStatus = { status: "failed", source: "listing", detectedImageCount: 0, selectedImageCount: 0, analyzedImageCount: 0, analysableImageCount: 0, errorCodes: ["IMAGE_ANALYSIS_FAILED"], processedAt: new Date().toISOString() };
  const imagePromise: Promise<ListingImagePipelineResult> = acquisition.sourceDocument
    ? analyseListingImages({ html: acquisition.sourceDocument.html, pageUrl: acquisition.sourceDocument.finalUrl, source: acquisition.result.source as "etuovi" | "oikotie", areaSqm: typeof areaSqm === "number" ? areaSqm : undefined, expectedRooms, listingCondition: typeof listingCondition === "string" ? listingCondition : undefined, apiKey: process.env.OPENAI_API_KEY }).catch(() => ({ status: imageFallback }))
    : Promise.resolve({ status: { ...imageFallback, status: "unavailable" as const, errorCodes: ["LISTING_IMAGES_NOT_FOUND" as const] } });
  const [prepared, listingImages] = await Promise.all([prepareListingAnalysis(acquisition.result), imagePromise]);
  return NextResponse.json({ ...prepared, listingImageAnalysis: listingImages.status, visualCondition: listingImages.visualCondition });
}
