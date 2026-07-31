import type { ListingParseResult } from "../parser/listing-parser.ts";
import { resolveMunicipalityName } from "./area-resolver.ts";
import { resolveEffectiveRent } from "./rent-estimation.ts";
import { classifyRentCandidateContext, parseStrictMonthlyRentCandidate } from "./rent-candidate-parser.ts";
import { fetchStatisticsFinlandRentBenchmark } from "./statistics-finland.ts";

export type RentEnrichmentOptions = { fetcher?: typeof fetch; logger?: Partial<Pick<Console, "error" | "info">> };

export async function addAutomaticRentEstimate(result: ListingParseResult, options: RentEnrichmentOptions = {}): Promise<ListingParseResult> {
  const acceptedFinding = (field: string) => result.findings.find((finding) => finding.field === field && finding.validationResult === "accepted" && !finding.conflicts.length);
  const accepted = (field: string) => acceptedFinding(field)?.normalizedValue;
  const listingRentFinding = acceptedFinding("currentRentMonthly");
  const listingRent = listingRentFinding?.normalizedValue; const areaSqm = accepted("areaSqm"); const roomDescription = accepted("roomDescription"); const city = accepted("city"); const district = accepted("district"); const postalCode = accepted("postalCode");
  const location = resolveMunicipalityName({ city: typeof city === "string" ? city : null, district: typeof district === "string" ? district : null });
  const benchmarkResult = await fetchStatisticsFinlandRentBenchmark({ municipality: location.municipality, postalCode: typeof postalCode === "string" ? postalCode : null, roomDescription: typeof roomDescription === "string" ? roomDescription : null, areaSqm: typeof areaSqm === "number" ? areaSqm : null, fetcher: options.fetcher });
  const benchmark = location.warning && benchmarkResult.effectiveMonthlyRent ? { ...benchmarkResult, warning: [location.warning, benchmarkResult.warning].filter(Boolean).join(" ") } : benchmarkResult;
  const rentContextText = `${listingRentFinding?.originalLabel ?? ""} ${listingRentFinding?.sourceExcerpt ?? ""}`;
  const rentContext = parseStrictMonthlyRentCandidate(rentContextText)?.context ?? classifyRentCandidateContext(rentContextText);
  const resolved = resolveEffectiveRent({
    leaseRent: rentContext === "lease" && typeof listingRent === "number" ? listingRent : null,
    listingRent: typeof listingRent === "number" ? listingRent : null,
    listingRentContext: rentContext,
    listingRentUnit: listingRentFinding?.unit === "€/kk" || listingRentFinding?.unit === "€/m²/kk" ? listingRentFinding.unit : "unknown",
    areaSqm: typeof areaSqm === "number" ? areaSqm : null,
    statisticsEstimate: benchmark,
  });
  const rentEstimate = resolved.estimate;
  const missingCriticalFields = rentEstimate.effectiveMonthlyRent !== null ? result.missingCriticalFields.filter((field) => field !== "Nykyinen vuokra") : result.missingCriticalFields;
  for (const issue of [...(rentEstimate.issues ?? []), ...(rentEstimate.source === "listing" ? benchmark.issues ?? [] : [])]) if (["EXTERNAL_API_ERROR", "INVALID_API_RESPONSE"].includes(issue.code)) (options.logger?.error ?? console.error)("[rent-resolution]", { phase: issue.stage, area: issue.area, roomCategory: issue.roomCategory, dataset: issue.datasetId, statusCode: issue.statusCode, errorCode: issue.code, message: issue.message });
  if (process.env.NODE_ENV === "development") (options.logger?.info ?? console.info)("[rent-resolution diagnostics]", rentEstimate.resolutionDiagnostics);
  if (process.env.NODE_ENV === "development") for (const warning of rentEstimate.validationWarnings ?? []) (options.logger?.info ?? console.info)("[rent-validation]", { id: warning.id, candidateValue: warning.candidateValue, expectedValue: warning.expectedValue, differencePercent: warning.differencePercent, source: warning.source, context: warning.context, reason: warning.reason, fallbackUsed: warning.fallbackUsed ?? null });
  return { ...result, rentEstimate, missingCriticalFields, diagnostics: { ...result.diagnostics, missingEssentialFields: missingCriticalFields }, warnings: rentEstimate.warning ? [...new Set([...result.warnings, rentEstimate.warning])] : result.warnings };
}
