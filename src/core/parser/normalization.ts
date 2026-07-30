const numberPattern = /-?\d[\d\s\u00a0]*(?:[,.]\d+)?/;

export function parseFinnishNumber(input: string): number | null {
  const match = input.match(numberPattern)?.[0];
  if (!match) return null;
  const compact = match.replace(/[\s\u00a0]/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : /^-?\d{1,3}(?:\.\d{3})+$/.test(compact)
      ? compact.replace(/\./g, "")
      : compact;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseMonthlyAmount(input: string): number | null {
  if (/(?:€|euroa?)\s*\/\s*m[²2]\s*\/\s*kk/i.test(input)) return null;
  if (!/(?:€|euroa?|\be\b)\s*(?:\/\s*kk|kuukaudessa)/i.test(input)) return null;
  return parseFinnishNumber(input);
}

export function parseSquareMeterRate(input: string): number | null {
  return /(?:€|euroa?)\s*\/\s*m[²2]\s*\/\s*kk/i.test(input) ? parseFinnishNumber(input) : null;
}

export function parseArea(input: string): number | null {
  return /(?:m[²2]|neliö(?:tä|metriä)?)/i.test(input) ? parseFinnishNumber(input) : null;
}

export function formatFinnishNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("fi-FI", { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);
}

export function formatEuro(value: number): string {
  return `${formatFinnishNumber(value)} €`;
}

export function formatMonthlyEuro(value: number): string {
  return `${formatFinnishNumber(value)} €/kk`;
}

export function formatArea(value: number): string {
  return `${formatFinnishNumber(value)} m²`;
}

export function parseFloor(input: string): string | null {
  if (/katutaso/i.test(input)) return "Katutaso";
  const fraction = input.match(/\b(\d+)\s*\/\s*(\d+)\s*(?:krs|kerros)?\b/i);
  if (fraction) return `${fraction[1]} / ${fraction[2]}`;
  const single = input.match(/\b(\d+)\.\s*(?:krs|kerros)|\b(?:kerros)\s*(\d+)\b/i);
  return single ? single[1] ?? single[2] ?? null : null;
}

export function parseRoomConfiguration(input: string): string | null {
  const compact = input.replace(/\s+/g, " ").trim();
  const short = compact.match(/\b([1-9]\d?\s*h(?:\s*(?:\+|,)\s*(?:kk|khh|alk|oh|mh|kt|k|s)){1,6})/i)?.[1];
  if (short) return short.replace(/\s*,\s*/g, " + ").replace(/\s*\+\s*/g, " + ").toLocaleLowerCase("fi");
  const words = compact.match(/\b([1-9]\d?)\s+huonetta\s+ja\s+keittiö/i);
  if (words) return `${words[1]}h + k`;
  const roomCount = compact.match(/\b([1-9]\d?)\s+huonetta\b/i);
  return roomCount ? `${roomCount[1]}h` : null;
}

export function parseBuildingType(input: string): string | null {
  const value = input.toLocaleLowerCase("fi");
  const types: ReadonlyArray<[RegExp, string]> = [[/puutalo[- ]?osake/, "wooden_apartment"], [/kerrostalo/, "apartment"], [/rivitalo/, "terraced"], [/luhtitalo/, "loft"], [/paritalo/, "semi_detached"], [/erillistalo/, "detached_unit"], [/omakotitalo/, "detached_house"]];
  return types.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

export type TimeStatus = "completed" | "ongoing" | "decided" | "planned" | "estimated" | "proposed" | "under_investigation" | "investigated" | "preparing" | "not_done" | "not_implemented" | "unknown";

export function parseTimeExpression(input: string): { years: number[]; status: TimeStatus } {
  const years = [...input.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  const lower = input.toLocaleLowerCase("fi");
  const status: TimeStatus = /ei\s+(?:ole\s+)?tehty|ei tehty/.test(lower) ? "not_done" : /ei vielä toteutettu|ei toteutettu/.test(lower) ? "not_implemented" : /ei tiedossa|ei mainintaa|ei(?:\s+ole)?\s+suunnitteilla|ei(?:\s+ole)?\s+päätetty/.test(lower) ? "unknown" : /kuntotutkimus|kuntoarvio|kuvaus|kartoitus|julkisivututkimus/.test(lower) && /tehty|toteutettu|valmistunut/.test(lower) ? "investigated" : /hankesuunnittelu|korjaussuunnitelma|kilpailutus|valmistelussa/.test(lower) ? "preparing" : /tutkitaan|tutkittavana/.test(lower) ? "under_investigation" : /käynnissä|aloitettu/.test(lower) ? "ongoing" : /päätetty(?:\s+toteuttaa)?/.test(lower) ? "decided" : /suunnitteilla|suunniteltu/.test(lower) ? "planned" : /arviolta|arvioitu/.test(lower) ? "estimated" : /ehdotettu|harkitaan|alustavasti|mahdollisesti/.test(lower) ? "proposed" : /tehty|valmistui|valmistunut|uusittu|saneerattu|remontoitu|korjattu|kunnostettu|pinnoitettu|sukitettu|vaihdettu|peruskorjattu|toteutettu/.test(lower) ? "completed" : "unknown";
  return { years, status };
}
