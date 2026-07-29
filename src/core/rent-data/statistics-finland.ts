import { resolveStatFinArea } from "./area-resolver.ts";
import { calculateEstimatedRent, normalizeRoomCategory } from "./rent-estimation.ts";
import type { RentBenchmark, RentEstimate, RentResolutionErrorCode, RentResolutionIssue, RentRoomCategory } from "./types.ts";

export const STATFIN_RENT_DATASET_ID = "15fa";
export const STATFIN_RENT_API_URL = `https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/asvu/${STATFIN_RENT_DATASET_ID}.px`;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { expires: number; estimate: RentEstimate }>();

type PxVariable = { code: string; text: string; values: string[]; valueTexts: string[]; time?: boolean };
type PxMetadata = { title?: string; variables?: PxVariable[] };
type JsonStat2 = { value?: Array<number | null>; source?: string; updated?: string; dimension?: Record<string, { category?: { unit?: Record<string, { base?: string }> } }> };

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

async function queryBenchmark(fetcher: typeof fetch, variables: ReturnType<typeof validateStatFinMetadata>, areaCode: string, selectedRoomCode: string): Promise<{ rent: number; sampleSize: number | null }> {
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
  const rent = data.value?.[0]; const sampleSize = data.value?.[1];
  if (typeof rent !== "number" || !Number.isFinite(rent) || rent <= 0) throw new RentResolutionError("DATA_NOT_AVAILABLE", "fetching_rent", "StatFin ei palauttanut neliövuokraa", response.status);
  return { rent, sampleSize: typeof sampleSize === "number" ? sampleSize : null };
}

export async function fetchStatisticsFinlandRentBenchmark({ municipality, roomDescription, areaSqm, fetcher = fetch, now = Date.now() }: { municipality?: string | null; roomDescription?: string | null; areaSqm?: number | null; fetcher?: typeof fetch; now?: number }): Promise<RentEstimate> {
  const category = normalizeRoomCategory(roomDescription, areaSqm);
  const cacheKey = `${municipality ?? ""}:${category}:${areaSqm ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) return structuredClone(cached.estimate);
  try {
    if (!(typeof areaSqm === "number" && areaSqm > 0)) throw new RentResolutionError("DATA_NOT_AVAILABLE", "selecting_fallback", "Asuinpinta-ala puuttuu");
    let metadataResponse: Response;
    try { metadataResponse = await fetcher(STATFIN_RENT_API_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) }); }
    catch (error) { throw new RentResolutionError("EXTERNAL_API_ERROR", "fetching_metadata", error instanceof Error ? error.message : "StatFin-metatietojen haku epäonnistui"); }
    if (!metadataResponse.ok) throw new RentResolutionError("EXTERNAL_API_ERROR", "fetching_metadata", `StatFin-metatietojen haku epäonnistui (${metadataResponse.status})`, metadataResponse.status);
    let variables: ReturnType<typeof validateStatFinMetadata>;
    try { variables = validateStatFinMetadata(await metadataResponse.json() as PxMetadata); }
    catch (error) { throw error instanceof RentResolutionError ? error : new RentResolutionError("INVALID_API_RESPONSE", "fetching_metadata", error instanceof Error ? error.message : "StatFin-metatieto ei vastannut odotettua rakennetta", metadataResponse.status); }
    const area = resolveStatFinArea(municipality, variables.area.values, variables.area.valueTexts);
    if (!area) throw new RentResolutionError("INVALID_LOCATION", "resolving_location", "Kunnalle ei löytynyt hyväksyttyä StatFin-aluetta");
    const exactRoomCode = roomCode(category, variables.room);
    const allRoomsCode = roomCode("ALL", variables.room);
    let selectedRoomCode = exactRoomCode ?? allRoomsCode; let usedAllRooms = !exactRoomCode;
    if (!selectedRoomCode) throw new RentResolutionError("INVALID_ROOM_CATEGORY", "resolving_room_category", "Huonelukuluokkaa tai hyväksyttyä kaikkien asuntojen fallbackia ei löytynyt StatFin-taulukosta");
    let result: { rent: number; sampleSize: number | null };
    try { result = await queryBenchmark(fetcher, variables, area.code, selectedRoomCode); }
    catch (error) { if (!usedAllRooms && allRoomsCode) { selectedRoomCode = allRoomsCode; usedAllRooms = true; result = await queryBenchmark(fetcher, variables, area.code, selectedRoomCode); } else throw error; }
    const calculated = calculateEstimatedRent(result.rent, areaSqm);
    const confidence = area.level === "municipality" && !usedAllRooms && (result.sampleSize ?? 20) >= 20 ? "medium" : "low";
    const benchmark: RentBenchmark = { rentPerSquareMeter: result.rent, source: area.level === "municipality" ? "statistics_finland" : "fallback", sourceName: "Tilastokeskus, asuntojen vuokrat", sourceArea: area.label, sourceAreaLevel: area.level, roomCategory: usedAllRooms ? "ALL" : category, referencePeriod: variables.latestPeriod, metricType: "average", housingFinanceType: "non_subsidised", confidence, sampleSize: result.sampleSize, rawSourceValue: result.rent, fetchedAt: new Date().toISOString(), datasetId: STATFIN_RENT_DATASET_ID, warning: area.warning ?? (usedAllRooms ? "Huonelukuluokan vertailua ei ollut saatavilla, joten arvio perustuu kaikkiin huonelukuihin." : null) };
    const estimate: RentEstimate = { ...benchmark, effectiveMonthlyRent: calculated.rounded, exactEstimatedMonthlyRent: calculated.exact, userOverridden: false, resolutionStatus: "resolved", attemptedSources: ["statistics_finland", ...(area.level === "municipality" && !usedAllRooms ? [] : ["fallback" as const])] };
    cache.set(cacheKey, { expires: now + CACHE_TTL_MS, estimate });
    return structuredClone(estimate);
  } catch (error) {
    const issue: RentResolutionIssue = { code: error instanceof RentResolutionError ? error.code : "INVALID_API_RESPONSE", stage: error instanceof RentResolutionError ? error.stage : "fetching_rent", message: error instanceof Error ? error.message : "Vuokra-arvion haku epäonnistui", area: municipality, roomCategory: category, datasetId: STATFIN_RENT_DATASET_ID, statusCode: error instanceof RentResolutionError ? error.statusCode ?? null : null };
    if (cached) return { ...structuredClone(cached.estimate), stale: true, confidence: "low", resolutionStatus: "resolved", attemptedSources: ["statistics_finland", "fallback"], issues: [issue], warning: "Tilastokeskuksen päivitys epäonnistui. Käytössä on aiemmin haettu suuntaa-antava arvio." };
    const issues: RentResolutionIssue[] = [issue, { code: "CACHE_MISS", stage: "reading_cache", message: "Vuokra-arvion välimuistissa ei ollut käyttökelpoista arvoa.", area: municipality, roomCategory: category, datasetId: STATFIN_RENT_DATASET_ID }, { code: "NO_ACCEPTABLE_FALLBACK", stage: "selecting_fallback", message: "Hyväksyttävää alue- tai huonelukufallbackia ei saatu.", area: municipality, roomCategory: category, datasetId: STATFIN_RENT_DATASET_ID }];
    return { effectiveMonthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false, resolutionStatus: "unavailable", attemptedSources: ["statistics_finland", "fallback"], issues, datasetId: STATFIN_RENT_DATASET_ID, warning: issue.message };
  }
}

export function clearRentBenchmarkCache() { cache.clear(); }
