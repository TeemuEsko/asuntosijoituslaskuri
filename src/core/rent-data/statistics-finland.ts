import { resolveStatFinMunicipalityArea, resolveStatFinPostalArea, resolveStatFinRegionArea, type ResolvedStatFinArea } from "./area-resolver.ts";
import { calculateEstimatedRent, normalizeRoomCategory } from "./rent-estimation.ts";
import type { RentBenchmark, RentEstimate, RentResolutionAttempt, RentResolutionDiagnostics, RentResolutionErrorCode, RentResolutionIssue, RentRoomCategory } from "./types.ts";

export const STATFIN_RENT_DATASET_ID = "15fa";
export const STATFIN_RENT_API_URL = `https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/asvu/${STATFIN_RENT_DATASET_ID}.px`;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { expires: number; estimate: RentEstimate }>();

type PxVariable = { code: string; text: string; values: string[]; valueTexts: string[]; time?: boolean };
type PxMetadata = { title?: string; variables?: PxVariable[] };
type JsonStat2 = { value?: Array<number | null>; status?: Array<string | null> | Record<string, string> | string; source?: string; updated?: string; dimension?: Record<string, { category?: { unit?: Record<string, { base?: string }> } }> };

class RentResolutionError extends Error {
  readonly code: RentResolutionErrorCode;
  readonly stage: RentResolutionIssue["stage"];
  readonly statusCode?: number;
  constructor(code: RentResolutionErrorCode, stage: RentResolutionIssue["stage"], message: string, statusCode?: number) { super(message); this.code = code; this.stage = stage; this.statusCode = statusCode; }
}

function variable(metadata: PxMetadata, pattern: RegExp): PxVariable {
  const match = metadata.variables?.find((item) => pattern.test(item.text));
  if (!match?.values.length || match.values.length !== match.valueTexts.length) throw new Error(`StatFin-taulukosta puuttuu muuttuja: ${pattern.source}`);
  return match;
}

export function validateStatFinMetadata(metadata: PxMetadata) {
  if (!metadata.title?.includes("keskineliövuokra")) throw new Error("StatFin-taulukko ei ole hyväksytty neliövuokrataulu");
  const finance = variable(metadata, /rahoitusmuoto/i); const room = variable(metadata, /huoneluku/i); const area = variable(metadata, /^alue$/i); const time = variable(metadata, /vuosineljännes/i); const content = variable(metadata, /^tiedot$/i);
  const nonSubsidisedIndex = finance.valueTexts.findIndex((label) => /vapaarahoitteinen/i.test(label));
  const rentIndex = content.valueTexts.findIndex((label) => /keskineliövuokra \(eur\/m2\)$/i.test(label));
  const sampleIndex = content.valueTexts.findIndex((label) => /keskineliövuokralaskennan lukumäärä$/i.test(label));
  if (nonSubsidisedIndex < 0 || rentIndex < 0 || sampleIndex < 0) throw new Error("StatFin-taulukon rahoitusmuoto tai neliövuokramittari muuttui");
  const latestPeriod = [...time.values].sort((a, b) => b.localeCompare(a))[0];
  if (!latestPeriod) throw new Error("StatFin-taulukossa ei ole viitejaksoa");
  return { finance, room, area, time, content, nonSubsidised: finance.values[nonSubsidisedIndex]!, rentMetric: content.values[rentIndex]!, sampleMetric: content.values[sampleIndex]!, latestPeriod };
}

function roomCode(category: RentRoomCategory, room: PxVariable): string | null {
  const label = category === "ONE_ROOM" ? /yksiöt/i : category === "TWO_ROOMS" ? /kaksiot/i : category === "THREE_PLUS_ROOMS" ? /kolmiot\+/i : /^yhteensä$/i;
  const index = room.valueTexts.findIndex((value) => label.test(value));
  return index >= 0 ? room.values[index]! : null;
}

function suppressionValue(data: JsonStat2): string | null {
  if (Array.isArray(data.status)) return data.status[0] ?? null;
  if (typeof data.status === "string") return data.status;
  return data.status?.["0"] ?? null;
}

async function queryBenchmark(fetcher: typeof fetch, variables: ReturnType<typeof validateStatFinMetadata>, areaCode: string, selectedRoomCode: string): Promise<{ rent: number | null; sampleSize: number | null; httpStatus: number; suppressionValue: string | null }> {
  let response: Response;
  try {
    response = await fetcher(STATFIN_RENT_API_URL, { method: "POST", signal: AbortSignal.timeout(5_000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: [
      { code: variables.finance.code, selection: { filter: "item", values: [variables.nonSubsidised] } },
      { code: variables.room.code, selection: { filter: "item", values: [selectedRoomCode] } },
      { code: variables.area.code, selection: { filter: "item", values: [areaCode] } },
      { code: variables.time.code, selection: { filter: "item", values: [variables.latestPeriod] } },
      { code: variables.content.code, selection: { filter: "item", values: [variables.rentMetric, variables.sampleMetric] } },
    ], response: { format: "json-stat2" } }) });
  } catch (error) {
    throw new RentResolutionError("EXTERNAL_API_ERROR", "fetching_rent", error instanceof Error ? error.message : "StatFin-kysely epäonnistui");
  }
  if (!response.ok) throw new RentResolutionError("EXTERNAL_API_ERROR", "fetching_rent", `StatFin-kysely epäonnistui (${response.status})`, response.status);
  let data: JsonStat2;
  try { data = await response.json() as JsonStat2; }
  catch { throw new RentResolutionError("INVALID_API_RESPONSE", "fetching_rent", "StatFin palautti virheellisen JSON-vastauksen", response.status); }
  const rawRent = data.value?.[0]; const sampleSize = data.value?.[1];
  const rent = typeof rawRent === "number" && Number.isFinite(rawRent) && rawRent > 0 ? rawRent : null;
  return { rent, sampleSize: typeof sampleSize === "number" ? sampleSize : null, httpStatus: response.status, suppressionValue: suppressionValue(data) };
}

function areaRoomPlans(postalArea: ResolvedStatFinArea | null, municipalityArea: ResolvedStatFinArea | null, regionArea: ResolvedStatFinArea | null, exactRoomCode: string | null, allRoomsCode: string | null, category: RentRoomCategory): Array<{ area: ResolvedStatFinArea; roomCode: string; roomCategory: RentRoomCategory }> {
  const plans: Array<{ area: ResolvedStatFinArea; roomCode: string; roomCategory: RentRoomCategory }> = [];
  if (postalArea && exactRoomCode) plans.push({ area: postalArea, roomCode: exactRoomCode, roomCategory: category });
  for (const area of [municipalityArea, regionArea]) {
    if (!area) continue;
    if (exactRoomCode) plans.push({ area, roomCode: exactRoomCode, roomCategory: category });
    if (allRoomsCode && allRoomsCode !== exactRoomCode) plans.push({ area, roomCode: allRoomsCode, roomCategory: "ALL" });
  }
  return plans;
}

export async function fetchStatisticsFinlandRentBenchmark({ municipality, postalCode, roomDescription, areaSqm, fetcher = fetch, now = Date.now() }: { municipality?: string | null; postalCode?: string | null; roomDescription?: string | null; areaSqm?: number | null; fetcher?: typeof fetch; now?: number }): Promise<RentEstimate> {
  const category = normalizeRoomCategory(roomDescription, areaSqm);
  const cacheKey = `${municipality ?? ""}:${postalCode ?? ""}:${category}:${areaSqm ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) return structuredClone(cached.estimate);
  const diagnostics: RentResolutionDiagnostics = { municipality: municipality ?? null, postalCode: postalCode ?? null, roomConfiguration: roomDescription ?? null, normalizedRoomCategory: category, livingArea: areaSqm ?? null, attempts: [], effectiveMonthlyRent: null };
  try {
    if (!(typeof areaSqm === "number" && areaSqm > 0)) throw new RentResolutionError("DATA_NOT_AVAILABLE", "selecting_fallback", "Asuinpinta-ala puuttuu");
    let metadataResponse: Response;
    try { metadataResponse = await fetcher(STATFIN_RENT_API_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) }); }
    catch (error) { throw new RentResolutionError("EXTERNAL_API_ERROR", "fetching_metadata", error instanceof Error ? error.message : "StatFin-metatietojen haku epäonnistui"); }
    if (!metadataResponse.ok) throw new RentResolutionError("EXTERNAL_API_ERROR", "fetching_metadata", `StatFin-metatietojen haku epäonnistui (${metadataResponse.status})`, metadataResponse.status);
    let variables: ReturnType<typeof validateStatFinMetadata>;
    try { variables = validateStatFinMetadata(await metadataResponse.json() as PxMetadata); }
    catch (error) { throw error instanceof RentResolutionError ? error : new RentResolutionError("INVALID_API_RESPONSE", "fetching_metadata", error instanceof Error ? error.message : "StatFin-metatieto ei vastannut odotettua rakennetta", metadataResponse.status); }
    const postalArea = resolveStatFinPostalArea(postalCode, variables.area.values, variables.area.valueTexts);
    if (postalCode && !postalArea) diagnostics.attempts.push({ datasetId: STATFIN_RENT_DATASET_ID, level: "postal_code", area: postalCode, areaCode: null, roomCategory: category, roomCode: null, referencePeriod: variables.latestPeriod, result: "not_available_in_dataset", rejectionReason: "StatFin-taulukossa ei ole postinumeroa vastaavaa julkaistua alueluokkaa." });
    const municipalityArea = resolveStatFinMunicipalityArea(municipality, variables.area.values, variables.area.valueTexts);
    const regionArea = resolveStatFinRegionArea(municipality, variables.area.values, variables.area.valueTexts);
    if (!postalArea && !municipalityArea && !regionArea) throw new RentResolutionError("INVALID_LOCATION", "resolving_location", "Kunnalle ei löytynyt hyväksyttyä StatFin-aluetta");
    const exactRoomCode = roomCode(category, variables.room);
    const allRoomsCode = roomCode("ALL", variables.room);
    const plans = areaRoomPlans(postalArea, municipalityArea, regionArea, exactRoomCode, allRoomsCode, category);
    if (!plans.length) throw new RentResolutionError("INVALID_ROOM_CATEGORY", "resolving_room_category", "Huonelukuluokkaa tai hyväksyttyä kaikkien asuntojen fallbackia ei löytynyt StatFin-taulukosta");
    let selected: { area: ResolvedStatFinArea; roomCategory: RentRoomCategory; result: { rent: number; sampleSize: number | null; httpStatus: number; suppressionValue: string | null } } | null = null;
    for (const plan of plans) {
      try {
        const result = await queryBenchmark(fetcher, variables, plan.area.code, plan.roomCode);
        const attempt: RentResolutionAttempt = { datasetId: STATFIN_RENT_DATASET_ID, level: plan.area.level, area: plan.area.label, areaCode: plan.area.code, roomCategory: plan.roomCategory, roomCode: plan.roomCode, referencePeriod: variables.latestPeriod, result: result.rent ? "success" : "missing_or_suppressed", httpStatus: result.httpStatus, rawValue: result.rent, sampleSize: result.sampleSize, suppressionValue: result.suppressionValue, rejectionReason: result.rent ? null : result.suppressionValue ? `StatFin-solun tila: ${result.suppressionValue}` : "Neliövuokra puuttui tai oli salattu." };
        diagnostics.attempts.push(attempt);
        if (result.rent) { selected = { area: plan.area, roomCategory: plan.roomCategory, result: { ...result, rent: result.rent } }; break; }
      } catch (error) {
        diagnostics.attempts.push({ datasetId: STATFIN_RENT_DATASET_ID, level: plan.area.level, area: plan.area.label, areaCode: plan.area.code, roomCategory: plan.roomCategory, roomCode: plan.roomCode, referencePeriod: variables.latestPeriod, result: "http_error", httpStatus: error instanceof RentResolutionError ? error.statusCode ?? null : null, rejectionReason: error instanceof Error ? error.message : "StatFin-kysely epäonnistui" });
        throw error;
      }
    }
    if (!selected) throw new RentResolutionError("DATA_NOT_AVAILABLE", "selecting_fallback", "StatFin ei palauttanut neliövuokraa hyväksytyillä fallbackeilla");
    const { area, roomCategory: selectedRoomCategory, result } = selected;
    const usedAllRooms = selectedRoomCategory === "ALL";
    const calculated = calculateEstimatedRent(result.rent, areaSqm);
    const confidence = ["postal_code", "municipality"].includes(area.level) && !usedAllRooms && (result.sampleSize ?? 20) >= 20 ? "medium" : "low";
    diagnostics.effectiveMonthlyRent = calculated.rounded;
    const primaryLocationResult = ["postal_code", "municipality"].includes(area.level) && !usedAllRooms;
    const benchmark: RentBenchmark = { rentPerSquareMeter: result.rent, source: ["postal_code", "municipality"].includes(area.level) ? "statistics_finland" : "fallback", sourceName: "Tilastokeskus, asuntojen vuokrat", sourceArea: area.label, sourceAreaLevel: area.level, postalCode: postalCode ?? null, livingArea: areaSqm, roomCategory: selectedRoomCategory, referencePeriod: variables.latestPeriod, metricType: "average", housingFinanceType: "non_subsidised", confidence, sampleSize: result.sampleSize, rawSourceValue: result.rent, fetchedAt: new Date().toISOString(), datasetId: STATFIN_RENT_DATASET_ID, warning: area.warning ?? (usedAllRooms ? "Huonelukuluokan vertailua ei ollut saatavilla, joten arvio perustuu kaikkiin huonelukuihin." : null), resolutionDiagnostics: diagnostics };
    const estimate: RentEstimate = { ...benchmark, effectiveMonthlyRent: calculated.rounded, automaticMonthlyRentEstimate: calculated.rounded, listingMonthlyRent: null, exactEstimatedMonthlyRent: calculated.exact, benchmarkRentPerSquareMeter: result.rent, userOverridden: false, resolutionStatus: "resolved", validationStatus: "valid", validationWarnings: [], attemptedSources: ["statistics_finland", ...(!primaryLocationResult || diagnostics.attempts.some((attempt) => attempt.result !== "success") ? ["fallback" as const] : [])] };
    cache.set(cacheKey, { expires: now + CACHE_TTL_MS, estimate });
    return structuredClone(estimate);
  } catch (error) {
    const issue: RentResolutionIssue = { code: error instanceof RentResolutionError ? error.code : "INVALID_API_RESPONSE", stage: error instanceof RentResolutionError ? error.stage : "fetching_rent", message: error instanceof Error ? error.message : "Vuokra-arvion haku epäonnistui", area: municipality, roomCategory: category, datasetId: STATFIN_RENT_DATASET_ID, statusCode: error instanceof RentResolutionError ? error.statusCode ?? null : null };
    if (cached) return { ...structuredClone(cached.estimate), stale: true, confidence: "low", resolutionStatus: "resolved", attemptedSources: ["statistics_finland", "fallback"], issues: [issue], warning: "Tilastokeskuksen päivitys epäonnistui. Käytössä on aiemmin haettu suuntaa-antava arvio.", resolutionDiagnostics: diagnostics };
    const issues: RentResolutionIssue[] = [issue, { code: "CACHE_MISS", stage: "reading_cache", message: "Vuokra-arvion välimuistissa ei ollut käyttökelpoista arvoa.", area: municipality, roomCategory: category, datasetId: STATFIN_RENT_DATASET_ID }, { code: "NO_ACCEPTABLE_FALLBACK", stage: "selecting_fallback", message: "Hyväksyttävää alue- tai huonelukufallbackia ei saatu.", area: municipality, roomCategory: category, datasetId: STATFIN_RENT_DATASET_ID }];
    return { effectiveMonthlyRent: null, automaticMonthlyRentEstimate: null, listingMonthlyRent: null, benchmarkRentPerSquareMeter: null, source: "unknown", confidence: "unknown", userOverridden: false, resolutionStatus: "unavailable", validationStatus: "unknown", validationWarnings: [], attemptedSources: ["statistics_finland", "fallback"], issues, datasetId: STATFIN_RENT_DATASET_ID, warning: issue.message, postalCode: postalCode ?? null, livingArea: areaSqm ?? null, resolutionDiagnostics: diagnostics };
  }
}

export function clearRentBenchmarkCache() { cache.clear(); }
