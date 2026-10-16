import { NextResponse } from "next/server";

import { prepareListingAnalysis } from "@/core/analysis/prepare-listing-analysis";
import { acquireListing } from "@/core/listing-acquisition/acquire-listing";
import {
  parseListingText,
  type ListingParseResult,
} from "@/core/parser/listing-parser";
import { analyseListingImages } from "@/server/listing-images/analyse-listing-images";
import type {
  ListingImageAnalysisStatus,
  ListingImagePipelineResult,
} from "@/core/listing-images/types";
import { fetchStatisticsFinlandMarketEvidence } from "@/core/market-assessment/statistics-finland";
import { resolveMarketAssessments } from "@/core/market-assessment/model";

export const runtime = "nodejs";
export const maxDuration = 120;

type ImportRequest = {
  kind?: "url" | "text";
  value?: string;
  forceRefresh?: boolean;
};
const MAX_INPUT_LENGTH = 100_000;

export function clientSafeListingResult(result: ListingParseResult) {
  if (process.env.NODE_ENV === "development") return result;
  const publicResult: Partial<ListingParseResult> = { ...result };
  delete publicResult.diagnostics;
  if (!result.rentEstimate) return publicResult;
  const publicRentEstimate = { ...result.rentEstimate };
  delete publicRentEstimate.resolutionDiagnostics;
  return { ...publicResult, rentEstimate: publicRentEstimate };
}

export async function POST(request: Request) {
  let body: ImportRequest;
  try {
    body = (await request.json()) as ImportRequest;
  } catch {
    return NextResponse.json(
      { error: "Pyyntöä ei voitu lukea. Yritä uudelleen." },
      { status: 400 },
    );
  }

  const value = body.value?.trim() ?? "";
  if (!value)
    return NextResponse.json(
      { error: "Täytä puuttuvat pakolliset tiedot." },
      { status: 400 },
    );
  if (value.length > MAX_INPUT_LENGTH)
    return NextResponse.json(
      { error: "Syöte on liian pitkä. Lyhennä tekstiä ja yritä uudelleen." },
      { status: 413 },
    );

  if (body.kind === "text") {
    const parsed = parseListingText(value, "pasted_text");
    if (!parsed.findings.length && !parsed.renovations.length)
      return NextResponse.json(
        {
          code: "insufficient_content",
          error:
            "Tekstistä ei löytynyt tunnistettavaa kohdedataa. Liitä ilmoituksen koko tietosisältö tai täytä tiedot itse.",
        },
        { status: 422 },
      );
    const prepared = await prepareListingAnalysis(parsed);
    const result = { ...clientSafeListingResult(prepared), marketAssessments: resolveMarketAssessments({ statisticalRentAvailable: Boolean(prepared.rentEstimate?.benchmark) }) };
    return NextResponse.json(result);
  }
  if (body.kind !== "url")
    return NextResponse.json(
      { code: "invalid_input", error: "Valitse linkki tai ilmoitusteksti." },
      { status: 400 },
    );

  const acquisition = await acquireListing(value, {
    forceRefresh: body.forceRefresh,
    includeSourceDocument: true,
  });
  if (!acquisition.ok)
    return NextResponse.json(
      {
        code: acquisition.code,
        error: acquisition.error,
        diagnostics:
          process.env.NODE_ENV === "development"
            ? acquisition.diagnostics
            : undefined,
      },
      { status: acquisition.status },
    );
  const findingValue = (field: string) =>
    acquisition.result.findings.find(
      (item) =>
        item.field === field &&
        item.validationResult === "accepted" &&
        !item.conflicts.length,
    )?.normalizedValue;
  const areaSqm = findingValue("areaSqm");
  const roomDescription = findingValue("roomDescription");
  const expectedRooms =
    typeof roomDescription === "string"
      ? Number(roomDescription.match(/^\s*(\d+)/)?.[1]) || undefined
      : undefined;
  const listingCondition = findingValue("condition");
  const city = findingValue("city");
  const buildingType = findingValue("buildingType");
  const imageFallback: ListingImageAnalysisStatus = {
    status: "failed",
    source: "listing",
    detectedImageCount: 0,
    selectedImageCount: 0,
    analyzedImageCount: 0,
    analysableImageCount: 0,
    errorCodes: ["IMAGE_ANALYSIS_FAILED"],
    processedAt: new Date().toISOString(),
  };
  const imagePromise: Promise<ListingImagePipelineResult> =
    acquisition.sourceDocument
      ? analyseListingImages({
          html: acquisition.sourceDocument.html,
          pageUrl: acquisition.sourceDocument.finalUrl,
          source: acquisition.result.source as "etuovi" | "oikotie",
          areaSqm: typeof areaSqm === "number" ? areaSqm : undefined,
          expectedRooms,
          listingCondition:
            typeof listingCondition === "string" ? listingCondition : undefined,
          apiKey: process.env.OPENAI_API_KEY,
        }).catch(() => ({ status: imageFallback }))
      : Promise.resolve({
          status: {
            ...imageFallback,
            status: "unavailable" as const,
            errorCodes: ["LISTING_IMAGES_NOT_FOUND" as const],
          },
        });
  const [prepared, listingImages, officialMarketEvidence] = await Promise.all([
    prepareListingAnalysis(acquisition.result),
    imagePromise,
    fetchStatisticsFinlandMarketEvidence({ municipality: typeof city === "string" ? city : undefined, buildingType: typeof buildingType === "string" ? buildingType : undefined }).catch(() => ({})),
  ]);
  return NextResponse.json({
    ...clientSafeListingResult(prepared),
    listingImageAnalysis: listingImages.status,
    visualCondition: listingImages.visualCondition,
    marketAssessments: resolveMarketAssessments({
      city: typeof city === "string" ? city : undefined,
      buildingType: typeof buildingType === "string" ? buildingType : undefined,
      statisticalRentAvailable: Boolean(prepared.rentEstimate?.benchmark),
      rentEvidence: prepared.rentEstimate?.benchmark && prepared.rentEstimate.referencePeriod && prepared.rentEstimate.sourceArea ? {
        publisher: "Tilastokeskus / StatFin",
        datasetId: prepared.rentEstimate.datasetId ?? "15fa",
        datasetName: "Vuokraindeksi (2025=100) ja keskineliövuokrat, neljännesvuosittain",
        period: prepared.rentEstimate.referencePeriod,
        area: prepared.rentEstimate.sourceArea,
        areaLevel: prepared.rentEstimate.sourceAreaLevel ?? "region",
        license: "CC BY 4.0",
        fetchedAt: prepared.rentEstimate.fetchedAt ?? undefined,
      } : undefined,
      official: officialMarketEvidence,
    }),
  });
}
