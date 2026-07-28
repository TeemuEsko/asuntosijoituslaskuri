import type { ListingParseResult } from "../parser/listing-parser.ts";
import { resolveEffectiveRent } from "./rent-estimation.ts";
import { fetchStatisticsFinlandRentBenchmark } from "./statistics-finland.ts";

export async function addAutomaticRentEstimate(result: ListingParseResult): Promise<ListingParseResult> {
  const accepted = (field: string) => result.findings.find((finding) => finding.field === field && finding.validationResult === "accepted" && !finding.conflicts.length)?.normalizedValue;
  const listingRent = accepted("currentRentMonthly"); const areaSqm = accepted("areaSqm"); const roomDescription = accepted("roomDescription"); const city = accepted("city");
  const benchmark = await fetchStatisticsFinlandRentBenchmark({ municipality: typeof city === "string" ? city : null, roomDescription: typeof roomDescription === "string" ? roomDescription : null, areaSqm: typeof areaSqm === "number" ? areaSqm : null });
  const resolved = resolveEffectiveRent({ listingRent: typeof listingRent === "number" ? listingRent : null, statisticsEstimate: benchmark });
  const rentEstimate = resolved.estimate.source === "listing" ? { ...resolved.estimate, benchmark } : resolved.estimate;
  const missingCriticalFields = rentEstimate.monthlyRent ? result.missingCriticalFields.filter((field) => field !== "Nykyinen vuokra") : result.missingCriticalFields;
  return { ...result, rentEstimate, missingCriticalFields, diagnostics: { ...result.diagnostics, missingEssentialFields: missingCriticalFields }, warnings: rentEstimate.warning ? [...new Set([...result.warnings, rentEstimate.warning])] : result.warnings };
}
