import type { StructuredListingValue } from "../parser/listing-parser.ts";
import { normalizeHeatingType, type HeatingType } from "../domain/heating.ts";

export type LegacyParsedFields = {
  listingId?: string;
  debtFreePrice?: number;
  sellingPrice?: number;
  maintenanceFee?: number;
  financingFee?: number;
  debtShare?: number;
  hasDebtShare?: "yes" | "no";
  debtShareSource?: "label" | "price_difference";
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
  const text = cleanText(html); const fields: LegacyParsedFields = {};
  const assign = <K extends keyof LegacyParsedFields>(key: K, value: LegacyParsedFields[K] | null | undefined) => { if (value !== null && value !== undefined) fields[key] = value; };
  assign("listingId", parseListingId(text, url));
  assign("debtFreePrice", parseEuro(text, ["Velaton hinta", "Hinta"]));
  assign("sellingPrice", parseEuro(text, ["Myyntihinta"]));
  assign("maintenanceFee", parseEuro(text, ["Hoitovastike / kk", "Hoitovastike"]));
  assign("financingFee", parseEuro(text, ["Rahoitusvastike / kk", "Pääomavastike / kk", "Rahoitusvastike", "Pääomavastike"]));
  const debtLabels = ["Huoneistokohtainen velkaosuus", "Velkaosuus", "Yhtiölainaosuus", "Osuus yhtiön lainoista"];
  const directDebtShare = parseEuro(text, debtLabels);
  assign("debtShare", directDebtShare);
  if (directDebtShare !== null) fields.debtShareSource = "label";
  assign("rent", parseEuro(text, ["Nykyinen vuokra", "Vuokrattu", "Vuokra"]));
  assign("size", parseNumberAfter(text, ["Asuinpinta-ala", "Huoneistoala", "Pinta-ala", "Koko"]));
  assign("totalHousingCharge", parseEuro(text, ["Yhtiövastike yhteensä", "Vastikkeet yhteensä"]));
  assign("waterFee", parseEuro(text, ["Vesimaksu"])); assign("parkingFee", parseEuro(text, ["Autopaikkamaksu"])); assign("saunaFee", parseEuro(text, ["Saunamaksu"])); assign("wasteFee", parseEuro(text, ["Jätemaksu"]));
  assign("buildYear", parseYear(text)); assign("buildingType", detectBuildingType(text)); assign("heatingType", detectHeating(text)); assign("landType", detectLand(text));
  if (fields.debtShare === undefined && typeof fields.debtFreePrice === "number" && typeof fields.sellingPrice === "number") { const difference = fields.debtFreePrice - fields.sellingPrice; if (difference > 0 && difference <= fields.debtFreePrice) { fields.debtShare = difference; fields.debtShareSource = "price_difference"; } }
  const debtReference = /velkaosuus|yhtiölainaosuus|huoneistokohtainen velkaosuus|pääomavastike|rahoitusvastike/i.test(text);
  if ((fields.debtShare ?? 0) > 0 || (fields.financingFee ?? 0) > 0 || debtReference) fields.hasDebtShare = "yes";
  else if (fields.debtFreePrice !== undefined && fields.sellingPrice !== undefined && fields.debtFreePrice === fields.sellingPrice) fields.hasDebtShare = "no";
  return { text, fields };
}

const canonicalMap: { [K in keyof LegacyParsedFields]?: { field: StructuredListingValue["field"]; unit?: StructuredListingValue["unit"]; label: string; value?: (input: NonNullable<LegacyParsedFields[K]>) => number | string } } = {
  listingId: { field: "listingId", label: "Kohdenumero" }, debtFreePrice: { field: "debtFreePrice", unit: "€", label: "Velaton hinta" }, sellingPrice: { field: "salePrice", unit: "€", label: "Myyntihinta" }, maintenanceFee: { field: "maintenanceFeeMonthly", unit: "€/kk", label: "Hoitovastike" }, financingFee: { field: "financingFeeMonthly", unit: "€/kk", label: "Rahoitusvastike" }, debtShare: { field: "companyLoanShare", unit: "€", label: "Yhtiölainaosuus" }, rent: { field: "currentRentMonthly", unit: "€/kk", label: "Nykyinen vuokra" }, size: { field: "areaSqm", unit: "m²", label: "Pinta-ala" }, buildYear: { field: "constructionYear", unit: "vuosi", label: "Rakennusvuosi" }, buildingType: { field: "buildingType", label: "Talotyyppi" }, heatingType: { field: "heatingType", label: "Lämmitysmuoto" }, landType: { field: "landOwnership", label: "Tontin omistusmuoto", value: (input) => input === "own" ? "owned" : "leased" }, totalHousingCharge: { field: "totalHousingCharge", unit: "€/kk", label: "Yhtiövastike yhteensä" }, waterFee: { field: "waterFeeMonthly", unit: "€/kk", label: "Vesimaksu" }, parkingFee: { field: "parkingFeeMonthly", unit: "€/kk", label: "Autopaikkamaksu" }, saunaFee: { field: "saunaFeeMonthly", unit: "€/kk", label: "Saunamaksu" }, wasteFee: { field: "wasteFeeMonthly", unit: "€/kk", label: "Jätemaksu" },
};

export function mapLegacyFieldsToCanonical(fields: LegacyParsedFields): StructuredListingValue[] {
  const values: StructuredListingValue[] = [];
  for (const [key, raw] of Object.entries(fields) as Array<[keyof LegacyParsedFields, LegacyParsedFields[keyof LegacyParsedFields]]>) { const mapping = canonicalMap[key]; if (!mapping || raw === undefined) continue; const value = mapping.value ? mapping.value(raw as never) : raw; if (typeof value !== "number" && typeof value !== "string") continue; const derivedDebt = key === "debtShare" && fields.debtShareSource === "price_difference"; values.push({ field: mapping.field, value, unit: mapping.unit, label: mapping.label, excerpt: `Myynti-ilmoituksen HTML: ${mapping.label} ${String(raw)}`, sourcePath: `legacy.${key}`, matchQuality: derivedDebt ? "general" : "exact" }); }
  return values;
}

export const legacyEssentialFields = new Set<keyof LegacyParsedFields>(["size", "buildYear", "debtFreePrice", "sellingPrice", "maintenanceFee", "buildingType", "heatingType", "landType"]);
