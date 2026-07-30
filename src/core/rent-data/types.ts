export type RentValueSource = "lease" | "listing" | "statistics_finland" | "market_data" | "user" | "fallback" | "unknown";
export type RentConfidence = "high" | "medium" | "low" | "unknown";
export type RentMetricType = "median" | "average" | "asking_rent" | "actual_rent" | "unknown";
export type RentAreaLevel = "postal_code" | "municipality" | "sub_region" | "region" | "comparison_area" | "unknown";
export type RentRoomCategory = "ONE_ROOM" | "TWO_ROOMS" | "THREE_PLUS_ROOMS" | "ALL" | "UNKNOWN";
export type RentResolutionStatus = "pending" | "resolved" | "unavailable";
export type RentResolutionErrorCode = "DATA_NOT_AVAILABLE" | "INVALID_LOCATION" | "INVALID_ROOM_CATEGORY" | "EXTERNAL_API_ERROR" | "INVALID_API_RESPONSE" | "CACHE_MISS" | "NO_ACCEPTABLE_FALLBACK";

export type RentResolutionIssue = {
  code: RentResolutionErrorCode;
  stage: "resolving_location" | "resolving_room_category" | "fetching_metadata" | "fetching_rent" | "reading_cache" | "selecting_fallback";
  message: string;
  area?: string | null;
  roomCategory?: RentRoomCategory | null;
  datasetId?: string | null;
  statusCode?: number | null;
};

export type RentResolutionAttempt = {
  datasetId: string;
  level: RentAreaLevel;
  area: string;
  areaCode?: string | null;
  roomCategory: RentRoomCategory;
  roomCode?: string | null;
  referencePeriod?: string | null;
  result: "success" | "missing_or_suppressed" | "not_available_in_dataset" | "http_error";
  httpStatus?: number | null;
  rawValue?: number | null;
  sampleSize?: number | null;
  suppressionValue?: string | null;
  rejectionReason?: string | null;
};

export type RentResolutionDiagnostics = {
  municipality: string | null;
  postalCode: string | null;
  roomConfiguration: string | null;
  normalizedRoomCategory: RentRoomCategory;
  livingArea: number | null;
  attempts: RentResolutionAttempt[];
  effectiveMonthlyRent: number | null;
};

export type RentEstimate = {
  /** Kaikkien laskelmien ja puuttuvien tietojen tarkistuksen käyttämä canonical arvo. */
  effectiveMonthlyRent: number | null;
  exactEstimatedMonthlyRent?: number | null;
  rentPerSquareMeter?: number | null;
  source: RentValueSource;
  sourceName?: string | null;
  sourceArea?: string | null;
  sourceAreaLevel?: RentAreaLevel;
  postalCode?: string | null;
  livingArea?: number | null;
  roomCategory?: RentRoomCategory | null;
  referencePeriod?: string | null;
  metricType?: RentMetricType;
  housingFinanceType?: "non_subsidised" | "subsidised" | "unknown";
  confidence: RentConfidence;
  sampleSize?: number | null;
  rawSourceValue?: number | null;
  userOverridden: boolean;
  previousAutomaticEstimate?: number | null;
  fetchedAt?: string | null;
  datasetId?: string | null;
  stale?: boolean;
  warning?: string | null;
  benchmark?: RentEstimate | null;
  resolutionStatus?: RentResolutionStatus;
  attemptedSources?: RentValueSource[];
  issues?: RentResolutionIssue[];
  resolutionDiagnostics?: RentResolutionDiagnostics;
};

export type RentBenchmark = Omit<RentEstimate, "effectiveMonthlyRent" | "exactEstimatedMonthlyRent" | "userOverridden"> & { rentPerSquareMeter: number };

export type EffectiveRent = { effectiveRent: number | null; estimate: RentEstimate; automaticEstimate: RentEstimate | null; warning?: string };
