import type { VisualConditionAnalysis } from "../visual-condition/types.ts";

export type ListingImageExtractionSource =
  | "img_src"
  | "lazy_attribute"
  | "srcset"
  | "picture_source"
  | "json_ld"
  | "open_graph"
  | "hydration_json"
  | "internal_json"
  | "data_attribute";

export type ListingImageType =
  | "interior"
  | "exterior"
  | "floor_plan"
  | "map"
  | "document"
  | "logo"
  | "unknown";

/**
 * URL is intentionally present only in this transient server-side candidate.
 * It must never be copied into ImportedPropertyData, reports or sessionStorage.
 */
export type ListingImageCandidate = {
  url: string;
  source: "listing";
  extractionSource: ListingImageExtractionSource;
  index: number;
  type: ListingImageType;
  width?: number;
  height?: number;
  confidence: number;
};

export type ListingImageErrorCode =
  | "LISTING_IMAGES_NOT_FOUND"
  | "LISTING_IMAGE_ACCESS_DENIED"
  | "LISTING_IMAGE_FETCH_FAILED"
  | "UNSUPPORTED_IMAGE_FORMAT"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_ANALYSIS_FAILED"
  | "NO_ANALYSABLE_LISTING_IMAGES"
  | "IMAGE_ANALYSIS_TIMEOUT";

export type ListingImageAnalysisStatus = {
  status: "completed" | "partial" | "failed" | "unavailable";
  source: "listing";
  detectedImageCount: number;
  selectedImageCount: number;
  analyzedImageCount: number;
  analysableImageCount: number;
  errorCodes: ListingImageErrorCode[];
  processedAt: string;
};

export type ListingImagePipelineResult = {
  status: ListingImageAnalysisStatus;
  visualCondition?: VisualConditionAnalysis;
};
