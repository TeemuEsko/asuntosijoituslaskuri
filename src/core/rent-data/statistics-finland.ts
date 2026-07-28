import { resolveStatFinArea } from "./area-resolver.ts";
import { calculateEstimatedRent, normalizeRoomCategory } from "./rent-estimation.ts";
import type { RentBenchmark, RentEstimate, RentRoomCategory } from "./types.ts";

export const STATFIN_RENT_DATASET_ID = "15fa";
export const STATFIN_RENT_API_URL = `https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/asvu/${STATFIN_RENT_DATASET_ID}.px`;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { expires: number; estimate: RentEstimate }>();

type PxVariable = { code: string; text: string; values: string[]; valueTexts: string[]; time?: boolean };
type PxMetadata = { title?: string; variables?: PxVariable[] };
type JsonStat2 = { value?: Array<number | null>; source?: string; updated?: string; dimension?: Record<string, { category?: { unit?: Record<string, { base?: string }> } }> };

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
  const response = await fetcher(STATFIN_RENT_API_URL, { method: "POST", signal: AbortSignal.timeout(5_000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: [
    { code: variables.finance.code, selection: { filter: "item", values: [variables.nonSubsidised] } },
    { code: variables.room.code, selection: { filter: "item", values: [selectedRoomCode] } },
    { code: variables.area.code, selection: { filter: "item", values: [areaCode] } },
    { code: variables.time.code, selection: { filter: "item", values: [variables.latestPeriod] } },
    { code: variables.content.code, selection: { filter: "item", values: [variables.rentMetric, variables.sampleMetric] } },
  ], response: { format: "json-stat2" } }) });
  if (!response.ok) throw new Error(`StatFin-kysely epäonnistui (${response.status})`);
  const data = await response.json() as JsonStat2;
  const rent = data.value?.[0]; const sampleSize = data.value?.[1];
  if (typeof rent !== "number" || !Number.isFinite(rent) || rent <= 0) throw new Error("StatFin ei palauttanut neliövuokraa");
  return { rent, sampleSize: typeof sampleSize === "number" ? sampleSize : null };
}

export async function fetchStatisticsFinlandRentBenchmark({ municipality, roomDescription, areaSqm, fetcher = fetch, now = Date.now() }: { municipality?: string | null; roomDescription?: string | null; areaSqm?: number | null; fetcher?: typeof fetch; now?: number }): Promise<RentEstimate> {
  const category = normalizeRoomCategory(roomDescription, areaSqm);
  const cacheKey = `${municipality ?? ""}:${category}:${areaSqm ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > now) return structuredClone(cached.estimate);
  try {
    if (!(typeof areaSqm === "number" && areaSqm > 0)) throw new Error("Asuinpinta-ala puuttuu");
    const metadataResponse = await fetcher(STATFIN_RENT_API_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) });
    if (!metadataResponse.ok) throw new Error(`StatFin-metatietojen haku epäonnistui (${metadataResponse.status})`);
    const variables = validateStatFinMetadata(await metadataResponse.json() as PxMetadata);
    const area = resolveStatFinArea(municipality, variables.area.values, variables.area.valueTexts);
    if (!area) throw new Error("Kunnalle ei löytynyt hyväksyttyä StatFin-aluetta");
    const exactRoomCode = roomCode(category, variables.room);
    const allRoomsCode = roomCode("ALL", variables.room);
    let selectedRoomCode = exactRoomCode ?? allRoomsCode; let usedAllRooms = !exactRoomCode;
    if (!selectedRoomCode) throw new Error("Huonelukuluokkaa ei löytynyt StatFin-taulukosta");
    let result: { rent: number; sampleSize: number | null };
    try { result = await queryBenchmark(fetcher, variables, area.code, selectedRoomCode); }
    catch (error) { if (!usedAllRooms && allRoomsCode) { selectedRoomCode = allRoomsCode; usedAllRooms = true; result = await queryBenchmark(fetcher, variables, area.code, selectedRoomCode); } else throw error; }
    const calculated = calculateEstimatedRent(result.rent, areaSqm);
    const confidence = area.level === "municipality" && !usedAllRooms && (result.sampleSize ?? 20) >= 20 ? "medium" : "low";
    const benchmark: RentBenchmark = { rentPerSquareMeter: result.rent, source: area.level === "municipality" ? "statistics_finland" : "fallback", sourceName: "Tilastokeskus, asuntojen vuokrat", sourceArea: area.label, sourceAreaLevel: area.level, roomCategory: usedAllRooms ? "ALL" : category, referencePeriod: variables.latestPeriod, metricType: "average", housingFinanceType: "non_subsidised", confidence, sampleSize: result.sampleSize, rawSourceValue: result.rent, fetchedAt: new Date().toISOString(), datasetId: STATFIN_RENT_DATASET_ID, warning: area.warning ?? (usedAllRooms ? "Huonelukuluokan vertailua ei ollut saatavilla, joten arvio perustuu kaikkiin huonelukuihin." : null) };
    const estimate: RentEstimate = { ...benchmark, monthlyRent: calculated.rounded, exactEstimatedMonthlyRent: calculated.exact, userOverridden: false };
    cache.set(cacheKey, { expires: now + CACHE_TTL_MS, estimate });
    return structuredClone(estimate);
  } catch (error) {
    if (cached) return { ...structuredClone(cached.estimate), stale: true, confidence: "low", warning: "Tilastokeskuksen päivitys epäonnistui. Käytössä on aiemmin haettu suuntaa-antava arvio." };
    return { monthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false, datasetId: STATFIN_RENT_DATASET_ID, warning: error instanceof Error ? error.message : "Vuokra-arvion haku epäonnistui" };
  }
}

export function clearRentBenchmarkCache() { cache.clear(); }
