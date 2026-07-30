import { aggregateVisualCondition, compareVisualConditionWithListing } from "../../core/visual-condition/analysis.ts";
import type { VisualConditionProvider } from "../../core/visual-condition/provider.ts";
import type { VisualConditionErrorCode, VisualConditionImageAssessment, VisualConditionObservation } from "../../core/visual-condition/types.ts";
import { extractListingImages } from "../../core/listing-images/extract-listing-images.ts";
import type { ListingImageErrorCode, ListingImagePipelineResult } from "../../core/listing-images/types.ts";
import type { ListingSourceType } from "../../core/parser/listing-parser.ts";
import { OpenAiVisualConditionProvider, VisualConditionProviderError } from "../visual-condition/openai-vision-provider.ts";
import { mapVisualImageResult } from "../visual-condition/map-result.ts";
import { fetchListingImage, ListingImageFetchError } from "./fetch-listing-image.ts";

const MAX_AUTOMATIC_IMAGES = 20;
const CONCURRENCY = 4;

function resultStatus(input: Omit<ListingImagePipelineResult["status"], "status">, status: ListingImagePipelineResult["status"]["status"]): ListingImagePipelineResult["status"] {
  return { ...input, status };
}

function listingError(error: unknown): ListingImageErrorCode {
  if (error instanceof ListingImageFetchError) return error.code;
  if (error instanceof VisualConditionProviderError && error.code === "TIMEOUT") return "IMAGE_ANALYSIS_TIMEOUT";
  return "IMAGE_ANALYSIS_FAILED";
}

function visualError(code: ListingImageErrorCode): VisualConditionErrorCode {
  const map: Record<ListingImageErrorCode, VisualConditionErrorCode> = {
    LISTING_IMAGES_NOT_FOUND: "NO_IMAGES",
    LISTING_IMAGE_ACCESS_DENIED: "IMAGE_ACCESS_DENIED",
    LISTING_IMAGE_FETCH_FAILED: "IMAGE_ANALYSIS_FAILED",
    UNSUPPORTED_IMAGE_FORMAT: "UNSUPPORTED_FORMAT",
    IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
    IMAGE_ANALYSIS_FAILED: "IMAGE_ANALYSIS_FAILED",
    NO_ANALYSABLE_LISTING_IMAGES: "NO_ANALYSABLE_CONTENT",
    IMAGE_ANALYSIS_TIMEOUT: "TIMEOUT",
  };
  return map[code];
}

export async function analyseListingImages(input: {
  html: string;
  pageUrl: string;
  source: Exclude<ListingSourceType, "pasted_text">;
  areaSqm?: number;
  expectedRooms?: number;
  listingCondition?: string;
  apiKey?: string;
  provider?: VisualConditionProvider;
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<Array<{ address: string }>>;
  now?: () => string;
}): Promise<ListingImagePipelineResult> {
  const processedAt = (input.now ?? (() => new Date().toISOString()))();
  const candidates = extractListingImages(input.html, input.pageUrl, MAX_AUTOMATIC_IMAGES);
  const base = { source: "listing" as const, detectedImageCount: candidates.length, selectedImageCount: candidates.length, analyzedImageCount: 0, analysableImageCount: 0, errorCodes: [] as ListingImageErrorCode[], processedAt };
  if (!candidates.length) return { status: resultStatus({ ...base, errorCodes: ["LISTING_IMAGES_NOT_FOUND"] }, "unavailable") };
  const provider = input.provider ?? (input.apiKey ? new OpenAiVisualConditionProvider({ apiKey: input.apiKey, model: process.env.VISUAL_CONDITION_MODEL, timeoutMs: 12_000 }) : null);
  if (!provider) return { status: resultStatus({ ...base, errorCodes: ["IMAGE_ANALYSIS_FAILED"] }, "failed") };
  const imageProvider: VisualConditionProvider = provider;

  const mappedResults: Array<{ image: VisualConditionImageAssessment; observations: VisualConditionObservation[] } | undefined> = new Array(candidates.length);
  const errors: ListingImageErrorCode[] = [];
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      const candidate = candidates[index];
      if (!candidate) return;
      try {
        const fetched = await fetchListingImage({ url: candidate.url, listingPageUrl: input.pageUrl, source: input.source, fetchImpl: input.fetchImpl, resolveHost: input.resolveHost });
        const ai = await imageProvider.analyzeImage({ bytes: fetched.bytes, mediaType: fetched.mediaType, fileName: `Ilmoituksen kuva ${candidate.index + 1}` });
        const mapped = mapVisualImageResult({ result: ai, fileName: `Ilmoituksen kuva ${candidate.index + 1}`, source: "listing", sourceIndex: candidate.index, now: input.now });
        mappedResults[index] = mapped;
        if (mapped.image.assessability === "not_assessable") errors.push("NO_ANALYSABLE_LISTING_IMAGES");
      } catch (error) { errors.push(listingError(error)); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, () => worker()));
  const completed = mappedResults.filter((item): item is { image: VisualConditionImageAssessment; observations: VisualConditionObservation[] } => Boolean(item));
  const images = completed.map((item) => item.image);
  const observations = completed.flatMap((item) => item.observations);
  const uniqueErrors = [...new Set(errors)];
  const analysableImageCount = images.filter((image) => image.assessability !== "not_assessable").length;
  if (!images.length || !analysableImageCount) {
    const errorCodes = uniqueErrors.length ? uniqueErrors : ["NO_ANALYSABLE_LISTING_IMAGES" as const];
    return { status: resultStatus({ ...base, analyzedImageCount: images.length, analysableImageCount, errorCodes }, "failed") };
  }
  const visualCondition = aggregateVisualCondition({ observations, images, imageCount: candidates.length, failedImageCount: candidates.length - images.length, areaSqm: input.areaSqm, expectedRooms: input.expectedRooms, source: "listing_session", sourceDisclaimerAccepted: true, confirmationStatus: "automatic", generatedAt: processedAt });
  visualCondition.errorCodes = uniqueErrors.map(visualError);
  visualCondition.listingConditionComparison = compareVisualConditionWithListing(input.listingCondition, visualCondition);
  const status = uniqueErrors.length || images.length < candidates.length || visualCondition.status === "partial" ? "partial" : "completed";
  return { status: resultStatus({ ...base, analyzedImageCount: images.length, analysableImageCount, errorCodes: uniqueErrors }, status), visualCondition: { ...visualCondition, status } };
}
