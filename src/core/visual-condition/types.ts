export type VisualConditionSource = "user_upload" | "user_screenshot" | "listing_session" | "user_confirmed" | "user_observation" | "unknown";
export type VisualConditionConfidence = "high" | "medium" | "low" | "unknown";
export type VisualConditionRating = "excellent" | "good" | "fair" | "poor" | "very_poor" | "unknown";
export type RenovationScope = "none" | "minor" | "moderate" | "major" | "extensive" | "unknown";
export type VisualConditionStatus = "idle" | "analyzing" | "completed" | "partial" | "failed";
export type ObservationStatus = "proposed" | "accepted" | "edited" | "rejected" | "user_added";

export type VisualConditionRoom =
  | "living_room" | "bedroom" | "kitchen" | "bathroom" | "toilet" | "sauna"
  | "entry" | "utility_room" | "balcony" | "terrace" | "yard" | "facade"
  | "garage" | "basement" | "storage" | "technical_room" | "other" | "unknown";

export type ConditionArea =
  | "floor" | "wall" | "ceiling" | "cabinetry" | "countertop" | "appliance"
  | "fixture" | "electrical_fixture" | "window" | "door" | "wet_area" | "facade" | "balcony"
  | "roof" | "foundation" | "rainwater_system" | "yard" | "general" | "other";

export type VisualObservationType =
  | "wear" | "surface_damage" | "crack" | "discoloration" | "outdatedness"
  | "missing_finish" | "poor_workmanship" | "possible_moisture_indicator"
  | "positive_condition" | "unassessable" | "other";

export type VisualConditionErrorCode =
  | "NO_IMAGES" | "IMAGE_ACCESS_DENIED" | "UNSUPPORTED_FORMAT" | "IMAGE_TOO_LARGE"
  | "IMAGE_TOO_SMALL" | "IMAGE_ANALYSIS_FAILED" | "LOW_IMAGE_QUALITY"
  | "NO_ANALYSABLE_CONTENT" | "SAFETY_FILTERED" | "TIMEOUT";

export type ObservationSourceHistory = {
  source: "image_ai" | "user" | "document" | "listing";
  value: string;
  recordedAt: string;
};

export type VisualConditionObservation = {
  id: string;
  imageId?: string;
  room: VisualConditionRoom;
  area: ConditionArea;
  type: VisualObservationType;
  severity: "info" | "low" | "medium" | "high";
  summary: string;
  details: string;
  confidence: VisualConditionConfidence;
  requiresProfessionalInspection: boolean;
  source: "image_ai" | "user_confirmed" | "user_observation";
  status: ObservationStatus;
  userConfirmed: boolean;
  userEdited: boolean;
  createdAt: string;
  originalAiObservation?: string;
  sourceHistory: ObservationSourceHistory[];
};

export type VisualConditionImageAssessment = {
  imageId: string;
  fileName: string;
  room: VisualConditionRoom;
  visibleSurfaces: string[];
  imageQuality: VisualConditionConfidence;
  assessability: "good" | "limited" | "not_assessable";
  qualityReason: string;
  unassessableReason?: string;
  observationIds: string[];
};

export type VisualConditionSummary = {
  overallRating: VisualConditionRating;
  visualConditionScore: number | null;
  coverage: number;
  confidence: VisualConditionConfidence;
  assessedRooms: VisualConditionRoom[];
  unassessedAreas: string[];
  summary: string;
};

export type RenovationCostRange = {
  min: number;
  max: number;
  currency: "EUR";
  recommendedReserve: number;
  confidence: VisualConditionConfidence;
  assumptions: string[];
};

export type VisualConditionAnalysis = {
  id: string;
  source: VisualConditionSource;
  status: VisualConditionStatus;
  confirmationStatus: "pending" | "confirmed";
  apartmentVisualCondition: VisualConditionSummary;
  buildingVisualCondition: VisualConditionSummary;
  overallRating: VisualConditionRating;
  overallConfidence: VisualConditionConfidence;
  visualConditionScore: number | null;
  coverage: number;
  observations: VisualConditionObservation[];
  images: VisualConditionImageAssessment[];
  renovationScope: RenovationScope;
  renovationScopeSource: "calculation" | "user";
  estimatedRenovationCostRange: RenovationCostRange | null;
  renovationReserveSource: "calculation" | "user";
  imageCount: number;
  analyzedImageCount: number;
  analysableImageCount: number;
  failedImageCount: number;
  sourceDisclaimerAccepted: boolean;
  errorCodes: VisualConditionErrorCode[];
  generatedAt: string;
  listingConditionComparison?: { listingValue: string; status: "supports" | "conflict" | "not_comparable"; message: string };
};

export const UI_VISUAL_CONDITION_DISCLAIMER = "Havainnot perustuvat myynti-ilmoituksen tai käyttäjän lisäämiin valokuviin. Kuvista ei voida arvioida rakenteiden sisäistä kuntoa, kosteutta tai piileviä vaurioita. Arvio ei korvaa kuntotarkastusta.";
export const REPORT_VISUAL_CONDITION_DISCLAIMER = "Havainnot perustuvat valokuviin eivätkä korvaa paikan päällä tehtävää tarkastusta tai ammattilaisen kuntotutkimusta. Kuvista ei voida arvioida rakenteiden sisäistä kuntoa tai piileviä vaurioita.";
