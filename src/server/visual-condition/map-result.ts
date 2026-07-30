import { randomUUID } from "node:crypto";
import { sanitizeVisualObservationText } from "../../core/visual-condition/analysis.ts";
import type { VisualImageAiResult } from "../../core/visual-condition/provider.ts";
import type { VisualConditionImageAssessment, VisualConditionObservation } from "../../core/visual-condition/types.ts";

export function mapVisualImageResult(input: {
  result: VisualImageAiResult;
  imageId?: string;
  fileName: string;
  source?: "listing" | "user";
  sourceIndex?: number;
  idFactory?: () => string;
  now?: () => string;
}): { image: VisualConditionImageAssessment; observations: VisualConditionObservation[] } {
  const idFactory = input.idFactory ?? randomUUID;
  const imageId = input.imageId ?? idFactory();
  const createdAt = (input.now ?? (() => new Date().toISOString()))();
  const observations: VisualConditionObservation[] = input.result.observations.map((item) => {
    const details = sanitizeVisualObservationText(item.details, item.type);
    const summary = sanitizeVisualObservationText(item.summary, item.type);
    return { id: idFactory(), imageId, room: input.result.room, area: item.area, type: item.type, severity: item.severity, summary, details, confidence: item.confidence, requiresProfessionalInspection: item.requiresProfessionalInspection || item.type === "possible_moisture_indicator", source: "image_ai", status: "proposed", userConfirmed: false, userEdited: false, createdAt, originalAiObservation: item.details, sourceHistory: [{ source: "image_ai", value: item.details, recordedAt: createdAt }] };
  });
  return {
    observations,
    image: { imageId, fileName: input.fileName, source: input.source ?? "user", sourceIndex: input.sourceIndex, analyzedAt: createdAt, confidence: input.result.imageQuality, room: input.result.room, visibleSurfaces: input.result.visibleSurfaces, imageQuality: input.result.imageQuality, assessability: input.result.assessability, qualityReason: input.result.qualityReason, unassessableReason: input.result.unassessableReason || undefined, observationIds: observations.map((item) => item.id) },
  };
}
