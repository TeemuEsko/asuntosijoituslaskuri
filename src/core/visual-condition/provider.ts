import type { ConditionArea, VisualConditionConfidence, VisualConditionRoom, VisualObservationType } from "./types";

export type VisualImageAiObservation = {
  area: ConditionArea;
  type: VisualObservationType;
  severity: "info" | "low" | "medium" | "high";
  summary: string;
  details: string;
  confidence: VisualConditionConfidence;
  requiresProfessionalInspection: boolean;
};

export type VisualImageAiResult = {
  room: VisualConditionRoom;
  visibleSurfaces: string[];
  imageQuality: VisualConditionConfidence;
  assessability: "good" | "limited" | "not_assessable";
  qualityReason: string;
  unassessableReason: string;
  observations: VisualImageAiObservation[];
};

export type VisualImageInput = { bytes: Uint8Array; mediaType: "image/jpeg" | "image/png" | "image/webp"; fileName: string };
export interface VisualConditionProvider { analyzeImage(input: VisualImageInput): Promise<VisualImageAiResult>; }
