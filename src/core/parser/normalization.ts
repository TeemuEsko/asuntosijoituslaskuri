const numberPattern = /-?\d[\d\s\u00a0]*(?:[,.]\d+)?/;

export function parseFinnishNumber(input: string): number | null {
  const match = input.match(numberPattern)?.[0];
  if (!match) return null;
  const normalized = match.replace(/[\s\u00a0]/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseMonthlyAmount(input: string): number | null {
  if (!/(?:€|euroa?|\be\b)\s*(?:\/\s*kk|kuukaudessa)|€\s*\/\s*m[²2]\s*\/\s*kk/i.test(input)) return null;
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

export type TimeStatus = "completed" | "planned" | "estimated" | "decided" | "proposed" | "unknown";

export function parseTimeExpression(input: string): { years: number[]; status: TimeStatus } {
  const years = [...input.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  const lower = input.toLocaleLowerCase("fi");
  const status: TimeStatus = /tehty|valmistui|uusittu/.test(lower) ? "completed" : /päätetty/.test(lower) ? "decided" : /suunnitteilla/.test(lower) ? "planned" : /arviolta|arvioitu/.test(lower) ? "estimated" : /ehdotettu/.test(lower) ? "proposed" : "unknown";
  return { years, status };
}
