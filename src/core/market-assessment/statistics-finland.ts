import { normalizeMunicipalityName } from "../rent-data/area-resolver.ts";
import type { AssessmentEvidence, OfficialAreaSignals } from "./model.ts";

export const STATFIN_POPULATION_DATASET_ID = "11ra";
export const STATFIN_TRANSACTIONS_DATASET_ID = "13mx";
export const STATFIN_POPULATION_API_URL = `https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/vaerak/${STATFIN_POPULATION_DATASET_ID}.px`;
export const STATFIN_TRANSACTIONS_API_URL = `https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/ashi/${STATFIN_TRANSACTIONS_DATASET_ID}.px`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type PxVariable = { code: string; text: string; values: string[]; valueTexts: string[]; time?: boolean };
type PxMetadata = { title?: string; variables?: PxVariable[] };
type CacheEntry = { expiresAt: number; value: OfficialAreaSignals };
const cache = new Map<string, CacheEntry>();

async function statFinRequest(fetcher: typeof fetch, url: string, init: RequestInit = {}): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(5_000) });
      if (response.ok || (response.status < 500 && response.status !== 429)) return response;
      lastError = new Error(`StatFin vastasi tilakoodilla ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError instanceof Error ? lastError : new Error("StatFin-pyyntö epäonnistui");
}

function variable(metadata: PxMetadata, pattern: RegExp): PxVariable {
  const match = metadata.variables?.find((item) => pattern.test(item.text));
  if (!match?.values.length || match.values.length !== match.valueTexts.length) throw new Error(`StatFin-muuttuja puuttuu: ${pattern.source}`);
  return match;
}

function latestPeriod(time: PxVariable): string {
  const period = [...time.values].sort((a, b) => b.localeCompare(a))[0];
  if (!period) throw new Error("StatFin-havaintojakso puuttuu");
  return period;
}

function municipalityCode(area: PxVariable, municipality: string): { code: string; label: string } {
  const normalized = normalizeMunicipalityName(municipality);
  const index = area.valueTexts.findIndex((label) => normalizeMunicipalityName(label.replace(/^KU\d+\s+/, "")) === normalized);
  if (index < 0) throw new Error("Kuntaa ei löytynyt StatFin-taulusta");
  return { code: area.values[index]!, label: area.valueTexts[index]!.replace(/^KU\d+\s+/, "") };
}

async function metadata(fetcher: typeof fetch, url: string): Promise<PxMetadata> {
  const response = await statFinRequest(fetcher, url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`StatFin-metatietojen haku epäonnistui (${response.status})`);
  return response.json() as Promise<PxMetadata>;
}

async function value(fetcher: typeof fetch, url: string, query: unknown[]): Promise<number | undefined> {
  const response = await statFinRequest(fetcher, url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, response: { format: "json-stat2" } }) });
  if (!response.ok) throw new Error(`StatFin-kysely epäonnistui (${response.status})`);
  const data = await response.json() as { value?: Array<number | null> };
  const result = data.value?.[0];
  return typeof result === "number" && Number.isFinite(result) ? result : undefined;
}

const selection = (code: string, selected: string) => ({ code, selection: { filter: "item", values: [selected] } });

function evidence(datasetId: string, datasetName: string, period: string, area: string, fetchedAt: string): AssessmentEvidence {
  return { publisher: "Tilastokeskus / StatFin", datasetId, datasetName, period, area, areaLevel: "municipality", license: "CC BY 4.0", fetchedAt };
}

async function populationSignal(municipality: string, fetcher: typeof fetch, fetchedAt: string): Promise<Pick<OfficialAreaSignals, "populationChangePercent" | "populationEvidence">> {
  const table = await metadata(fetcher, STATFIN_POPULATION_API_URL);
  if (!table.title?.includes("Tunnuslukuja väestöstä")) throw new Error("Väärä StatFin-väestötaulu");
  const area = variable(table, /^Alue$/i); const content = variable(table, /^Tiedot$/i); const time = variable(table, /^Vuosi$/i);
  const place = municipalityCode(area, municipality);
  const metricIndex = content.valueTexts.findIndex((label) => /^Väkiluvun muutos, %$/i.test(label));
  if (metricIndex < 0) throw new Error("Väkiluvun muutosprosentti puuttuu");
  const period = latestPeriod(time);
  const result = await value(fetcher, STATFIN_POPULATION_API_URL, [selection(area.code, place.code), selection(content.code, content.values[metricIndex]!), selection(time.code, period)]);
  return result === undefined ? {} : { populationChangePercent: result, populationEvidence: evidence(STATFIN_POPULATION_DATASET_ID, table.title, period, place.label, fetchedAt) };
}

function buildingTypeCode(variableValue: PxVariable, buildingType?: string): string {
  const normalized = buildingType?.toLocaleLowerCase("fi-FI") ?? "";
  const pattern = /rivi|town|terrace/.test(normalized) ? /Rivitalot/i : /kerros|apartment/.test(normalized) ? /Kerrostalot/i : /Talotyypit yhteensä/i;
  const index = variableValue.valueTexts.findIndex((label) => pattern.test(label));
  if (index < 0) throw new Error("Talotyyppiluokka puuttuu");
  return variableValue.values[index]!;
}

async function transactionSignal(municipality: string, buildingType: string | undefined, fetcher: typeof fetch, fetchedAt: string): Promise<Pick<OfficialAreaSignals, "realisedTransactions" | "transactionEvidence">> {
  const table = await metadata(fetcher, STATFIN_TRANSACTIONS_API_URL);
  if (!table.title?.includes("kauppojen lukumäärät kunnittain")) throw new Error("Väärä StatFin-kauppataulu");
  const time = variable(table, /^Vuosi$/i); const area = variable(table, /^Kunta$/i); const type = variable(table, /^Talotyyppi$/i); const content = variable(table, /^Tiedot$/i);
  const place = municipalityCode(area, municipality);
  const metricIndex = content.valueTexts.findIndex((label) => /Kauppojen lukumäärä.*vuodesta 2020 alkaen/i.test(label));
  if (metricIndex < 0) throw new Error("Ajantasainen kauppamäärämuuttuja puuttuu");
  const period = latestPeriod(time);
  const result = await value(fetcher, STATFIN_TRANSACTIONS_API_URL, [selection(time.code, period), selection(area.code, place.code), selection(type.code, buildingTypeCode(type, buildingType)), selection(content.code, content.values[metricIndex]!) ]);
  return result === undefined ? {} : { realisedTransactions: result, transactionEvidence: evidence(STATFIN_TRANSACTIONS_DATASET_ID, table.title, period, place.label, fetchedAt) };
}

export async function fetchStatisticsFinlandMarketEvidence({ municipality, buildingType, fetcher = fetch, now = Date.now() }: { municipality?: string | null; buildingType?: string; fetcher?: typeof fetch; now?: number }): Promise<OfficialAreaSignals> {
  if (!municipality?.trim()) return {};
  const key = `${normalizeMunicipalityName(municipality)}:${buildingType ?? ""}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return structuredClone(cached.value);
  const fetchedAt = new Date(now).toISOString();
  const [population, transactions] = await Promise.allSettled([populationSignal(municipality, fetcher, fetchedAt), transactionSignal(municipality, buildingType, fetcher, fetchedAt)]);
  const result: OfficialAreaSignals = {
    ...(population.status === "fulfilled" ? population.value : {}),
    ...(transactions.status === "fulfilled" ? transactions.value : {}),
  };
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, value: result });
  return structuredClone(result);
}

export function clearMarketEvidenceCache(): void { cache.clear(); }
