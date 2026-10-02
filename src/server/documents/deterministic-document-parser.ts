import type { DocumentExcerpt, DocumentRawExtraction, DocumentType } from "../../core/documents/types.ts";
import type { RepairDocumentKind } from "../../core/rules/repair-history.ts";

type ExcerptRule = {
  labels: readonly RegExp[];
  valid: (value: string) => boolean;
  reject?: (value: string) => boolean;
};

const monthlyAmount = /(?:\d[\d .\u00a0]*)(?:,\d{1,2})?\s*(?:€|eur(?:oa)?|e)\s*(?:\/\s*)?(?:kk|kuukausi|kuukaudessa)(?=\s|$)/iu;
const euroAmount = /(?:\d[\d .\u00a0]*)(?:,\d{1,2})?\s*(?:€|eur(?:oa)?|e)(?=\s|$)/iu;
const area = /(?:\d{1,4})(?:,\d{1,2})?\s*m(?:²|2)(?=\s|$)/iu;
const year = /\b(?:18|19|20)\d{2}\b/u;
const room = /\b(?:[1-9]\d?\s*h\b|\d+\s*huon)/iu;
const monthlyFeeValue = (value: string) =>
  !/\b(?:vuodessa|vuosittain|vuosi)\b/i.test(value) &&
  (monthlyAmount.test(value) || euroAmount.test(value));

const excerptRules: readonly ExcerptRule[] = [
  { labels: [/^hoitovastike\b/i], valid: monthlyFeeValue },
  { labels: [/^(?:rahoitus|pääoma)vastike(?:\s+[a-z0-9-]+)?\b/i], valid: monthlyFeeValue },
  { labels: [/^(?:yhtiövastike(?:\s+yhteensä)?|vastikkeet\s+yhteensä)(?=\s|:|$)/i], valid: monthlyFeeValue },
  {
    labels: [/^(?:huoneistokohtainen\s+)?(?:velka|yhtiölaina|laina)osuus\b/i, /^osuus\s+yhtiön\s+lainoista\b/i],
    valid: (value) => euroAmount.test(value),
    reject: (value) => /taloyhtiön\s+(?:koko\s+)?(?:lainamäärä|lainat)|yhtiön\s+lainat\s+yhteensä|koko\s+lainamäärä/i.test(value),
  },
  {
    labels: [/^(?:huoneiston\s+|asuin)?pinta-ala\b/i],
    valid: (value) => area.test(value),
    reject: (value) => /rakennuksen|kokonais|tontin|yhtiön\s+pinta-ala/i.test(value),
  },
  { labels: [/^rakennusvuosi\b/i, /^valmistumisvuosi\b/i], valid: (value) => year.test(value) },
  { labels: [/^(?:huoneistoselitelmä|huoneistotyyppi|huoneet)(?=\s|:|$)/i], valid: (value) => room.test(value) },
  { labels: [/^(?:tontin\s+)?omistus(?:muoto)?\b/i], valid: (value) => /oma\s+tontti|vuokratontti|vuokra|valinnainen/i.test(value) },
  { labels: [/^tontti\b/i], valid: (value) => /oma\s+tontti|vuokratontti|valinnainen/i.test(value) },
  { labels: [/^(?:huoneiston\s+)?(?:tunnus|numero)\b/i, /^osakenumerot?\b/i], valid: (value) => /[:\s]\s*[a-z]?\s*\d[\w -]*/iu.test(value) },
  { labels: [/^(?:talo|rakennus)tyyppi\b/i], valid: (value) => /kerrostalo|rivitalo|paritalo|omakotitalo|luhtitalo/i.test(value) },
  { labels: [/^tonttivastike\b/i], valid: monthlyFeeValue },
  { labels: [/^(?:tontin\s+vuosivuokra|maanvuokra\s+vuodessa)\b/i], valid: (value) => euroAmount.test(value) },
  { labels: [/^(?:tonttiosuuden\s+)?lunastushinta\b/i], valid: (value) => euroAmount.test(value) },
  { labels: [/^(?:seuraava\s+)?(?:tonttiosuuden\s+)?lunastusajankohta\b/i], valid: (value) => /\b(?:19|20)\d{2}\b|\d{1,2}\.\d{1,2}\.\d{4}/.test(value) },
  { labels: [/^(?:yhtiöjärjestyksen\s+)?lunastuslauseke\b/i], valid: (value) => /\b(?:kyllä|ei|osakka|yhtiö|tarkist)/i.test(value) },
];

const completedHeadings = /^(?:tehdyt|suoritetut|toteutetut)\s+(?:korjaukset|remontit)|^korjaushistoria\b/i;
const futureHeadings = /^(?:tulevat|suunnitellut)\s+(?:korjaukset|remontit)|^kunnossapitotarve(?:selvitys|et)?\b|^pts\b/i;
const anySectionHeading = /^(?:perustiedot|vastikkeet|maksut|huoneiston tiedot|taloyhtiön tiedot|rakennuksen tiedot|lisätiedot|tontti)\s*:?$/i;

function compactLine(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function isKnownLabel(value: string): boolean {
  return excerptRules.some((rule) => rule.labels.some((label) => label.test(value)));
}

function excerptAt(lines: readonly string[], start: number, rule: ExcerptRule): string | null {
  const selected = [lines[start]!];
  for (let index = start + 1; index < Math.min(lines.length, start + 3); index += 1) {
    const next = lines[index]!;
    if (isKnownLabel(next) || completedHeadings.test(next) || futureHeadings.test(next)) break;
    selected.push(next);
  }
  for (let length = 1; length <= selected.length; length += 1) {
    const candidate = selected.slice(0, length).join("\n");
    if (rule.valid(candidate) && !rule.reject?.(candidate)) return candidate;
  }
  return null;
}

function collectRelevantExcerpts(lines: readonly string[]): DocumentExcerpt[] {
  const found: DocumentExcerpt[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    for (const rule of excerptRules) {
      if (!rule.labels.some((label) => label.test(lines[index]!))) continue;
      const text = excerptAt(lines, index, rule);
      if (text && !found.some((item) => item.text === text)) found.push({ text, confidence: "high" });
      break;
    }
  }
  return found;
}

function collectRepairSections(lines: readonly string[], heading: RegExp): DocumentExcerpt[] {
  const sections: DocumentExcerpt[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!heading.test(lines[index]!)) continue;
    const content: string[] = [];
    const suffix = lines[index]!.replace(heading, "").replace(/^\s*[:–—-]\s*/, "").trim();
    if (suffix) content.push(suffix);
    for (let cursor = index + 1; cursor < Math.min(lines.length, index + 26); cursor += 1) {
      const line = lines[cursor]!;
      if (completedHeadings.test(line) || futureHeadings.test(line) || anySectionHeading.test(line) || isKnownLabel(line)) break;
      content.push(line);
      if (content.join("\n").length >= 2_500) break;
    }
    const text = content.join("\n").trim();
    if (text) sections.push({ text, confidence: "high" });
  }
  return sections;
}

function classifyDocument(text: string, fileName: string, declaredKind?: RepairDocumentKind): DocumentType {
  const identity = `${fileName}\n${text.slice(0, 2_000)}`;
  if (/is(?:ä|a)nn(?:ö|o)itsij(?:ä|a)ntodistus/i.test(identity)) return "manager_certificate";
  if (/kunnossapitotarveselvitys|\bpts\b/i.test(identity)) return "maintenance_plan";
  if (/tilinp[aä][aä]t[oö]s/i.test(identity)) return "financial_statements";
  if (/toimintakertomus/i.test(identity)) return "annual_report";
  if (/yhti[oö]kokouksen\s+p[oö]yt[aä]kirja/i.test(identity)) return "meeting_minutes";
  if (/osakeluettelo/i.test(identity)) return "shareholder_register";
  if (declaredKind && declaredKind !== "listing") return declaredKind;
  return "unknown";
}

export function parseDeterministicDocument(input: {
  text: string;
  fileName: string;
  declaredKind?: RepairDocumentKind;
}): DocumentRawExtraction {
  const lines = input.text.split(/\r?\n/).map(compactLine).filter(Boolean);
  const relevantExcerpts = collectRelevantExcerpts(lines);
  const completedRenovations = collectRepairSections(lines, completedHeadings);
  const futureRenovations = collectRepairSections(lines, futureHeadings);
  const documentType = classifyDocument(input.text, input.fileName, input.declaredKind);
  const hasReliableContent = relevantExcerpts.length + completedRenovations.length + futureRenovations.length > 0;
  return {
    documentType,
    confidence: documentType !== "unknown" && hasReliableContent ? "high" : hasReliableContent ? "medium" : "low",
    relevantExcerpts,
    completedRenovations,
    futureRenovations,
  };
}
