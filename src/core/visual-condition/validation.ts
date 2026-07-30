import type { VisualConditionErrorCode } from "./types";

export const VISUAL_IMAGE_LIMITS = { maxCount: 20, maxBytesPerImage: 10 * 1024 * 1024, maxBytesPerRequest: 40 * 1024 * 1024, minWidth: 320, minHeight: 240, maxLongEdge: 1600 } as const;
export const SUPPORTED_VISUAL_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type VisualImageMetadata = { type: string; size: number; width?: number; height?: number };

export function validateVisualImage(metadata: VisualImageMetadata): VisualConditionErrorCode | null {
  if (!SUPPORTED_VISUAL_IMAGE_TYPES.includes(metadata.type as (typeof SUPPORTED_VISUAL_IMAGE_TYPES)[number])) return "UNSUPPORTED_FORMAT";
  if (metadata.size > VISUAL_IMAGE_LIMITS.maxBytesPerImage) return "IMAGE_TOO_LARGE";
  if (metadata.width !== undefined && metadata.height !== undefined && (metadata.width < VISUAL_IMAGE_LIMITS.minWidth || metadata.height < VISUAL_IMAGE_LIMITS.minHeight)) return "IMAGE_TOO_SMALL";
  return null;
}

export function validateVisualImageBatch(images: VisualImageMetadata[]): VisualConditionErrorCode | null {
  if (!images.length) return "NO_IMAGES";
  if (images.length > VISUAL_IMAGE_LIMITS.maxCount) return "IMAGE_TOO_LARGE";
  if (images.reduce((sum, image) => sum + image.size, 0) > VISUAL_IMAGE_LIMITS.maxBytesPerRequest) return "IMAGE_TOO_LARGE";
  return images.map(validateVisualImage).find(Boolean) ?? null;
}

