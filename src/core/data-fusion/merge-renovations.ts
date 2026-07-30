import type { RenovationFinding, RenovationSource } from "../parser/listing-parser.ts";

const sourcePriority: Record<RenovationSource, number> = {
  user: 5,
  document: 4,
  listing: 3,
  calculation: 2,
  unknown: 1,
};

const implementedStatuses = new Set(["completed", "ongoing"]);
const futureStatuses = new Set(["decided", "planned", "estimated", "proposed", "under_investigation", "preparing"]);

function statusCompatible(left: RenovationFinding, right: RenovationFinding): boolean {
  return left.status === right.status || (implementedStatuses.has(left.status) && implementedStatuses.has(right.status)) || (futureStatuses.has(left.status) && futureStatuses.has(right.status));
}

function interval(repair: RenovationFinding): [number, number] | null {
  if (repair.yearFrom !== null && repair.yearTo !== null) return [repair.yearFrom, repair.yearTo];
  if (repair.year !== null) return [repair.year, repair.year];
  if (repair.years.length) return [Math.min(...repair.years), Math.max(...repair.years)];
  return null;
}

function timeCompatible(left: RenovationFinding, right: RenovationFinding): boolean {
  const leftInterval = interval(left);
  const rightInterval = interval(right);
  if (!leftInterval || !rightInterval) return true;
  return leftInterval[0] <= rightInterval[1] && rightInterval[0] <= leftInterval[1];
}

function renovationFingerprint(repair: RenovationFinding): string {
  return repair.rawText.toLocaleLowerCase("fi").replace(/\b(?:19|20)\d{2}\b/g, " ").replace(/uusittu|uusiminen|suunnitteilla|suunniteltu|päätetty|tehty|toteutettu|valmistunut|korjattu|saneerattu|remontoitu|käynnissä/g, " ").replace(/[^a-zåäö]/g, "").trim();
}

function sameRenovation(left: RenovationFinding, right: RenovationFinding): boolean {
  const sameComponentAndMethod = left.component === right.component && (!left.method || !right.method || left.method === right.method);
  return sameComponentAndMethod && (timeCompatible(left, right) || (left.source !== right.source && renovationFingerprint(left) === renovationFingerprint(right)));
}

function mergeSame(primary: RenovationFinding, secondary: RenovationFinding, conflicting: boolean): RenovationFinding {
  const documentVerified = primary.verifiedByDocuments || secondary.verifiedByDocuments || primary.source === "document" || secondary.source === "document";
  const confidence = conflicting ? "medium" : documentVerified ? "high" : primary.confidence;
  return {
    ...primary,
    confidence,
    confidenceScore: confidence === "high" ? Math.max(85, primary.confidenceScore) : conflicting ? Math.min(79, primary.confidenceScore) : primary.confidenceScore,
    verifiedByDocuments: documentVerified,
    sourceHistory: [...primary.sourceHistory, ...secondary.sourceHistory].filter((record, index, all) => all.findIndex((candidate) => candidate.source === record.source && candidate.sourceName === record.sourceName && candidate.rawText === record.rawText) === index),
    supportingExcerpts: [...new Set([...primary.supportingExcerpts, ...secondary.supportingExcerpts])],
    conflicts: conflicting ? [...primary.conflicts, ...secondary.conflicts, { code: "renovation_source_conflict", message: "Remontin tila tai ajankohta poikkeaa lähteiden välillä. Korkeamman prioriteetin lähde säilytettiin aktiivisena.", incomingSource: secondary.source, incomingRawText: secondary.rawText }] : [...primary.conflicts, ...secondary.conflicts],
    confidenceReasons: [...new Set([...primary.confidenceReasons, ...secondary.confidenceReasons, ...(documentVerified && !conflicting ? ["Taloyhtiön asiakirja vahvistaa ilmoitustiedon"] : []), ...(conflicting ? ["Lähteiden välillä on ristiriita"] : [])])],
  };
}

/** Yhdistää remonttihavainnot lähdeprioriteetilla käyttäjä > asiakirja > ilmoitus > laskettu > tuntematon. */
export function mergeRenovationFindings(current: RenovationFinding[], incoming: RenovationFinding[]): RenovationFinding[] {
  const merged = [...current];
  for (const next of incoming) {
    const index = merged.findIndex((existing) => sameRenovation(existing, next));
    if (index < 0) { merged.push(next); continue; }
    const existing = merged[index]!;
    const conflicting = !statusCompatible(existing, next) || !timeCompatible(existing, next);
    const incomingWins = sourcePriority[next.source] > sourcePriority[existing.source];
    merged[index] = incomingWins ? mergeSame(next, existing, conflicting) : mergeSame(existing, next, conflicting);
  }
  return merged;
}
