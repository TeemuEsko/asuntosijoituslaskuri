import type { StructuredListingValue } from "../parser/listing-parser.ts";
import { parseFinnishNumber } from "../parser/normalization.ts";
import { normalizeHeatingType, type HeatingType } from "../domain/heating.ts";
import { parseStrictMonthlyRentCandidate } from "../rent-data/rent-candidate-parser.ts";
import { extractNamedPairs } from "./html-extraction.ts";

export type LegacyParsedFields = {
  listingId?: string;
  debtFreePrice?: number;
  sellingPrice?: number;
  maintenanceFee?: number;
  financingFee?: number;
  debtShare?: number;
  rent?: number;
  size?: number;
  buildYear?: number;
  buildingType?: "terraced" | "semi_detached" | "loft" | "apartment";
  heatingType?: HeatingType;
  landType?: "own" | "leased";
  totalHousingCharge?: number;
  waterFee?: number;
  parkingFee?: number;
  saunaFee?: number;
  wasteFee?: number;
};

export function cleanText(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&euro;|&#8364;/gi, "€").replace(/&auml;/gi, "ä").replace(/&ouml;/gi, "ö").replace(/&aring;/gi, "å").replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Aring;/g, "Å").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export function parseEuro(text: string, labels: readonly string[]): number | null {
  for (const label of labels) {
    const match = text.match(new RegExp(`${escapeRegExp(label)}[^0-9]{0,40}([0-9][0-9\\s.,]*)\\s*€`, "i"));
    if (match?.[1]) { const value = Number(match[1].replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")); if (Number.isFinite(value)) return value; }
  }
  return null;
}

function normalizedFeeLabel(value: string): string {
  return value.toLocaleLowerCase("fi").replace(/\s+/g, " ").replace(/\s*:\s*$/, "").trim();
}

function monthlyEuroValue(valueText: string, periodDeclaredByLabel = false): number | null {
  if (/(?:€|euroa?)\s*\/\s*m[²2](?:\s*\/\s*kk)?/i.test(valueText)) return null;
  if (/\b(?:vuodessa|vuosittain|vuosi)\b/i.test(valueText)) return null;
  const explicitMonthly = /(?:€|euroa?|\be\b)\s*(?:\/\s*kk|kuukaudessa)/i.test(valueText);
  if (!explicitMonthly && !(periodDeclaredByLabel && /(?:€|euroa?|\be\b)/i.test(valueText))) return null;
  return parseFinnishNumber(valueText);
}

/** Poimii kuukausisummaa vain nimetystä label-value-parista tai selvästä €/kk-osumasta. */
export function parseMonthlyEuro(text: string, namedPairs: readonly string[], labels: readonly string[]): number | null {
  const normalizedLabels = labels.map(normalizedFeeLabel);
  for (const pair of namedPairs) {
    const separator = pair.indexOf(":");
    if (separator < 0) continue;
    const label = normalizedFeeLabel(pair.slice(0, separator));
    if (!normalizedLabels.includes(label)) continue;
    const value = monthlyEuroValue(pair.slice(separator + 1), /(?:\/\s*kk|kuukaudessa)/i.test(label));
    if (value !== null) return value;
  }
  for (const label of labels) {
    const matches = text.matchAll(new RegExp(`${escapeRegExp(label)}[^0-9]{0,40}([0-9][0-9\\s.,]*)\\s*(?:€|euroa?|e)\\s*\\/\\s*kk`, "gi"));
    for (const match of matches) {
      const value = parseFinnishNumber(match[1] ?? "");
      if (value !== null) return value;
    }
  }
  return null;
}

export function parseNumberAfter(text: string, labels: readonly string[]): number | null {
  for (const label of labels) { const match = text.match(new RegExp(`${escapeRegExp(label)}[^0-9]{0,40}([0-9]+(?:[,.][0-9]+)?)`, "i")); if (match?.[1]) return Number(match[1].replace(",", ".")); }
  return null;
}

export function parseYear(text: string): number | null {
  for (const pattern of [/(?:\bvuosi\b|\brakennusvuosi\b|\bvalmistumisvuosi\b|\bvalmistunut\b|\brakennettu\b)[^\d]{0,30}((?:19|20)\d{2})/i, /(?:\bvuosi\b|\brakennusvuosi\b|\bvalmistumisvuosi\b)[\s:.-]{0,10}((?:19|20)\d{2})/i]) { const match = text.match(pattern); if (match?.[1]) return Number(match[1]); }
  return null;
}

export function parseListingId(text: string, url: string): string | null { return url.match(/\/kohde\/(\d+)/i)?.[1] ?? text.match(/(?:kohdenumero|kohde\s*nro|kohde-id)[^\d]{0,20}(\d{5,})/i)?.[1] ?? null; }
export function detectBuildingType(text: string): LegacyParsedFields["buildingType"] { const value = text.toLocaleLowerCase("fi"); if (value.includes("rivitalo")) return "terraced"; if (value.includes("paritalo")) return "semi_detached"; if (value.includes("luhtitalo")) return "loft"; if (value.includes("kerrostalo")) return "apartment"; return undefined; }
export function detectHeating(text: string): LegacyParsedFields["heatingType"] { return normalizeHeatingType(text) ?? undefined; }
export function detectLand(text: string): LegacyParsedFields["landType"] { const value = text.toLocaleLowerCase("fi"); if (value.includes("oma tontti")) return "own"; if (value.includes("vuokratontti")) return "leased"; return undefined; }

export function parseLegacyListingHtml(html: string, url = ""): { text: string; fields: LegacyParsedFields } {
  const text = cleanText(html); const namedPairs = extractNamedPairs(html); const fields: LegacyParsedFields = {};
  const assign = <K extends keyof LegacyParsedFields>(key: K, value: LegacyParsedFields[K] | null | undefined) => { if (value !== null && value !== undefined) fields[key] = value; };
  assign("listingId", parseListingId(text, url));
  assign("debtFreePrice", parseEuro(text, ["Velaton hinta", "Hinta"]));
  assign("sellingPrice", parseEuro(text, ["Myyntihinta"]));
  assign("maintenanceFee", parseMonthlyEuro(text, namedPairs, ["Hoitovastike / kk", "Hoitovastike"]));
  assign("financingFee", parseMonthlyEuro(text, namedPairs, ["Rahoitusvastike / kk", "Pääomavastike / kk", "Rahoitusvastike", "Pääomavastike"]));
  const debtLabels = ["Huoneistokohtainen velkaosuus", "Velkaosuus", "Yhtiölainaosuus", "Osuus yhtiön lainoista"];
  const directDebtShare = parseEuro(text, debtLabels);
  assign("debtShare", directDebtShare);
  assign("rent", parseStrictMonthlyRentCandidate(text)?.monthlyRent);
  assign("size", parseNumberAfter(text, ["Asuinpinta-ala", "Huoneistoala", "Pinta-ala", "Koko"]));
  assign("totalHousingCharge", parseMonthlyEuro(text, namedPairs, ["Yhtiövastike yhteensä", "Vastikkeet yhteensä"]));
  assign("waterFee", parseMonthlyEuro(text, namedPairs, ["Vesimaksu"])); assign("parkingFee", parseMonthlyEuro(text, namedPairs, ["Autopaikkamaksu"])); assign("saunaFee", parseMonthlyEuro(text, namedPairs, ["Saunamaksu"])); assign("wasteFee", parseMonthlyEuro(text, namedPairs, ["Jätemaksu"]));
  assign("buildYear", parseYear(text)); assign("buildingType", detectBuildingType(text)); assign("heatingType", detectHeating(text)); assign("landType", detectLand(text));
  return { text, fields };
}

const canonicalMap: { [K in keyof LegacyParsedFields]?: { field: StructuredListingValue["field"]; unit?: StructuredListingValue["unit"]; label: string; value?: (input: NonNullable<LegacyParsedFields[K]>) => number | string } } = {
  listingId: { field: "listingId", label: "Kohdenumero" }, debtFreePrice: { field: "debtFreePrice", unit: "€", label: "Velaton hinta" }, sellingPrice: { field: "salePrice", unit: "€", label: "Myyntihinta" }, maintenanceFee: { field: "maintenanceFeeMonthly", unit: "€/kk", label: "Hoitovastike" }, financingFee: { field: "financingFeeMonthly", unit: "€/kk", label: "Rahoitusvastike" }, debtShare: { field: "companyLoanShare", unit: "€", label: "Yhtiölainaosuus" }, rent: { field: "currentRentMonthly", unit: "€/kk", label: "Nykyinen vuokra" }, size: { field: "areaSqm", unit: "m²", label: "Pinta-ala" }, buildYear: { field: "constructionYear", unit: "vuosi", label: "Rakennusvuosi" }, buildingType: { field: "buildingType", label: "Talotyyppi" }, heatingType: { field: "heatingType", label: "Lämmitysmuoto" }, landType: { field: "landOwnership", label: "Tontin omistusmuoto", value: (input) => input === "own" ? "owned" : "leased" }, totalHousingCharge: { field: "totalHousingCharge", unit: "€/kk", label: "Yhtiövastike yhteensä" }, waterFee: { field: "waterFeeMonthly", unit: "€/kk", label: "Vesimaksu" }, parkingFee: { field: "parkingFeeMonthly", unit: "€/kk", label: "Autopaikkamaksu" }, saunaFee: { field: "saunaFeeMonthly", unit: "€/kk", label: "Saunamaksu" }, wasteFee: { field: "wasteFeeMonthly", unit: "€/kk", label: "Jätemaksu" },
};

export function mapLegacyFieldsToCanonical(fields: LegacyParsedFields): StructuredListingValue[] {
  const values: StructuredListingValue[] = [];
  for (const [key, raw] of Object.entries(fields) as Array<[keyof LegacyParsedFields, LegacyParsedFields[keyof LegacyParsedFields]]>) { const mapping = canonicalMap[key]; if (!mapping || raw === undefined) continue; const value = mapping.value ? mapping.value(raw as never) : raw; if (typeof value !== "number" && typeof value !== "string") continue; values.push({ field: mapping.field, value, unit: mapping.unit, label: mapping.label, excerpt: `Myynti-ilmoituksen HTML: ${mapping.label} ${String(raw)}`, sourcePath: `legacy.${key}`, matchQuality: "exact" }); }
  return values;
}

export const legacyEssentialFields = new Set<keyof LegacyParsedFields>(["size", "buildYear", "debtFreePrice", "sellingPrice", "maintenanceFee", "buildingType", "heatingType", "landType"]);
