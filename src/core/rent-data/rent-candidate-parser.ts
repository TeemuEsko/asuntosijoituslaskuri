export type RentCandidateContext = "lease" | "listing_explicit" | "ambiguous" | "separate_cost";

export type ParsedMonthlyRentCandidate = {
  monthlyRent: number;
  context: Exclude<RentCandidateContext, "ambiguous" | "separate_cost">;
  matchedText: string;
};

const amount = "([0-9][0-9\\s]*(?:[,.][0-9]{1,2})?)";
const monthlyUnit = "(?:€|euroa?|eur)\\s*(?:\\/\\s*kk|kuukaudessa)";
const separateCostContext = /(?:autokatospaikkavuokra|autopaikan\s+vuokra|autotallin\s+vuokra|autopistokepaikka|autopaikkamaksu|pysäköintimaksu|saunamaksu|vesimaksu|internetmaksu|laajakaistamaksu|sähköennakko|jätemaksu|tontin\s+vuokra|maanvuokra|käyttömaksu|(?:hoito|rahoitus|pääoma|tontti)vastike)/iu;

const patterns: ReadonlyArray<{ context: ParsedMonthlyRentCandidate["context"]; expression: RegExp; guardSeparateCost?: boolean }> = [
  { context: "lease", expression: new RegExp(`(?:vuokrasopimuksen\\s+mukainen\\s+vuokra|vuokrasopimusvuokra)\\s*:?\\s*${amount}\\s*${monthlyUnit}`, "giu") },
  { context: "listing_explicit", expression: new RegExp(`(?:nykyinen\\s+vuokra|kuukausivuokra)\\s*:?\\s*${amount}\\s*${monthlyUnit}`, "giu") },
  { context: "listing_explicit", expression: new RegExp(`vuokrattu\\s+(?:hintaan\\s+)?${amount}\\s*${monthlyUnit}`, "giu"), guardSeparateCost: true },
  { context: "listing_explicit", expression: new RegExp(`(?:^|[^\\p{L}])vuokra\\s*:?\\s*${amount}\\s*${monthlyUnit}`, "giu"), guardSeparateCost: true },
  { context: "listing_explicit", expression: new RegExp(`${amount}\\s+euron\\s+kuukausivuokra(?:an)?`, "giu"), guardSeparateCost: true },
];

function parseAmount(value: string): number | null {
  const normalized = value.replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function classifyRentCandidateContext(text: string): RentCandidateContext {
  if (separateCostContext.test(text)) return "separate_cost";
  if (/vuokrasopimuksen\s+mukainen\s+vuokra|vuokrasopimusvuokra/iu.test(text)) return "lease";
  if (/nykyinen\s+vuokra|kuukausivuokra|vuokrattu\s+(?:hintaan\s+)?\d|(?:^|[^\p{L}])vuokra\s*:?\s*\d|\d\s+euron\s+kuukausivuokra/iu.test(text)) return "listing_explicit";
  return "ambiguous";
}

export function parseStrictMonthlyRentCandidate(text: string): ParsedMonthlyRentCandidate | null {
  for (const { context, expression, guardSeparateCost } of patterns) {
    for (const match of text.matchAll(expression)) {
      if (!match[1]) continue;
      const matchIndex = match.index ?? 0;
      const precedingClause = text.slice(0, matchIndex).split(/[.;\n]/).at(-1) ?? "";
      const localContext = `${precedingClause.slice(-45)}${match[0]}`;
      if (guardSeparateCost && separateCostContext.test(localContext)) continue;
      const monthlyRent = parseAmount(match[1]);
      if (monthlyRent !== null) return { monthlyRent, context, matchedText: match[0].trim() };
    }
  }
  return null;
}

export function isExplicitMonthlyRentContext(text: string): boolean {
  return ["lease", "listing_explicit"].includes(classifyRentCandidateContext(text));
}
