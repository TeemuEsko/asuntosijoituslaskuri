export type RentValueSource = "lease" | "listing" | "statistics_finland" | "market_data" | "user" | "fallback" | "unknown";
export type RentConfidence = "high" | "medium" | "low" | "unknown";
export type RentMetricType = "median" | "average" | "asking_rent" | "actual_rent" | "unknown";
export type RentAreaLevel = "postal_code" | "municipality" | "sub_region" | "region" | "comparison_area" | "unknown";
export type RentRoomCategory = "ONE_ROOM" | "TWO_ROOMS" | "THREE_PLUS_ROOMS" | "ALL" | "UNKNOWN";

export type RentEstimate = {
  monthlyRent: number | null;
  exactEstimatedMonthlyRent?: number | null;
  rentPerSquareMeter?: number | null;
  source: RentValueSource;
  sourceName?: string | null;
  sourceArea?: string | null;
  sourceAreaLevel?: RentAreaLevel;
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
};

export type RentBenchmark = Omit<RentEstimate, "monthlyRent" | "exactEstimatedMonthlyRent" | "userOverridden"> & { rentPerSquareMeter: number };

export type EffectiveRent = { effectiveRent: number | null; estimate: RentEstimate; automaticEstimate: RentEstimate | null; warning?: string };
