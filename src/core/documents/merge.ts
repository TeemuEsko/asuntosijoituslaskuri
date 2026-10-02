import { mergeSourceObservation } from "../data-fusion/merge-field.ts";
import { mergeRenovationFindings } from "../data-fusion/merge-renovations.ts";
import type { FieldSource, PropertyField } from "../domain/field.ts";
import type { HousingCompanyRenovationTexts } from "../parser/listing-parser.ts";
import type { NormalizedFieldKey } from "../parser/synonyms.ts";
import type {
  DocumentAnalysisResult,
  DocumentCanonicalState,
  DocumentFieldConflict,
  DocumentFieldProvenance,
} from "./types.ts";

function valuesEqual(
  left: number | string | undefined,
  right: number | string | undefined,
): boolean {
  return Object.is(left, right);
}

function defaultListingProvenance(): DocumentFieldProvenance {
  return {
    source: { kind: "listing", label: "Myynti-ilmoitus" },
    status: "listing",
    sourceLabel: "Myynti-ilmoitus",
  };
}

function asPropertyField(
  value: number | string | undefined,
  provenance: DocumentFieldProvenance | undefined,
): PropertyField<number | string> {
  if (value === undefined) return { value: null, status: "missing" };
  const resolvedProvenance = provenance ?? defaultListingProvenance();
  return {
    value,
    status: resolvedProvenance.status,
    source: resolvedProvenance.source,
    sourceValue: value,
    confidenceLevel: resolvedProvenance.confidence,
    rawText: resolvedProvenance.rawText,
  };
}

function sourceEqual(
  left: FieldSource | undefined,
  right: FieldSource | undefined,
): boolean {
  return (
    left?.kind === right?.kind &&
    left?.documentId === right?.documentId &&
    left?.label === right?.label
  );
}

function conflictAlreadyRecorded(
  conflicts: readonly DocumentFieldConflict[],
  next: DocumentFieldConflict,
): boolean {
  return conflicts.some(
    (current) =>
      current.field === next.field &&
      valuesEqual(current.activeValue, next.activeValue) &&
      valuesEqual(current.conflictingValue, next.conflictingValue) &&
      sourceEqual(current.activeSource, next.activeSource) &&
      sourceEqual(current.conflictingSource, next.conflictingSource),
  );
}

function appendConflict(
  conflicts: readonly DocumentFieldConflict[],
  conflict: DocumentFieldConflict,
): DocumentFieldConflict[] {
  return conflictAlreadyRecorded(conflicts, conflict)
    ? [...conflicts]
    : [...conflicts, conflict];
}

type DocumentCanonicalFieldState = Pick<
  DocumentCanonicalState,
  "values" | "provenance" | "conflicts"
>;

/**
 * Tallentaa käyttöliittymässä tietoisesti valitun aktiiviarvon menettämättä
 * sitä edeltänyttä ilmoitus- tai asiakirjahavaintoa. Tätä käytetään käyttäjän
 * korjauksiin sekä niistä johdettuihin hintakenttiin.
 */
export function applyCanonicalFieldOverride(
  current: DocumentCanonicalFieldState,
  field: NormalizedFieldKey,
  value: number | string,
  activeProvenance: DocumentFieldProvenance,
): DocumentCanonicalFieldState {
  const previousValue = current.values[field];
  const previousProvenance = current.provenance[field];
  let conflicts = current.conflicts;

  if (
    previousValue !== undefined &&
    !valuesEqual(previousValue, value) &&
    previousProvenance?.source.kind !== activeProvenance.source.kind
  ) {
    const conflictingProvenance = previousProvenance ?? defaultListingProvenance();
    conflicts = appendConflict(conflicts, {
      field,
      activeValue: value,
      conflictingValue: previousValue,
      activeSource: activeProvenance.source,
      conflictingSource: conflictingProvenance.source,
      activeProvenance,
      conflictingProvenance,
      message:
        activeProvenance.source.kind === "user"
          ? "Käyttäjän arvo poikkeaa aiemmasta lähdetiedosta. Käyttäjän arvo otettiin käyttöön ja alkuperäinen arvo säilytettiin ristiriitatietona."
          : "Johdettu arvo poikkeaa aiemmasta lähdetiedosta. Johdettu arvo otettiin käyttöön ja alkuperäinen arvo säilytettiin ristiriitatietona.",
    });
  }

  return {
    values: { ...current.values, [field]: value },
    provenance: { ...current.provenance, [field]: activeProvenance },
    conflicts,
  };
}

function mergeRawText(
  current: string | null,
  incoming: string | null,
): string | null {
  const lines = [current, incoming]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(/\r?\n/))
    .map((value) => value.trim())
    .filter(Boolean);
  return lines.length ? [...new Set(lines)].join("\n") : null;
}

function mergeHousingCompanyRenovationTexts(
  current: HousingCompanyRenovationTexts,
  incoming: HousingCompanyRenovationTexts,
): HousingCompanyRenovationTexts {
  return {
    completedRawText: mergeRawText(
      current.completedRawText,
      incoming.completedRawText,
    ),
    plannedRawText: mergeRawText(
      current.plannedRawText,
      incoming.plannedRawText,
    ),
  };
}

/**
 * Yhdistää normalisoidun asiakirjan canonical-arvoihin. Asiakirja täydentää
 * puuttuvan tiedon ja ohittaa ilmoituksen, mutta ei koskaan käyttäjän arvoa.
 */
export function mergeDocumentAnalysis(
  current: DocumentCanonicalState,
  analysis: DocumentAnalysisResult,
): DocumentCanonicalState {
  const values = { ...current.values };
  const provenance = { ...current.provenance };
  let conflicts = [...current.conflicts];

  for (const finding of analysis.fields) {
    const field = finding.field;
    const previousValue = values[field];
    const previousProvenance = provenance[field];
    const merged = mergeSourceObservation(
      asPropertyField(previousValue, previousProvenance),
      finding.value,
      finding.source,
    );

    if (merged.value === null) continue;
    values[field] = merged.value;
    const incomingWon = sourceEqual(merged.source, finding.source);
    if (incomingWon) {
      provenance[field] = analysis.provenance[field] ?? {
        source: finding.source,
        status: "document",
        sourceLabel: finding.sourceLabel,
        documentType: analysis.documentType,
        fileName: analysis.fileName,
        rawText: finding.rawText,
        confidence: finding.confidence,
      };
    }

    if (
      previousValue !== undefined &&
      !valuesEqual(previousValue, finding.value)
    ) {
      const activeValue = merged.value;
      const activeSource = merged.source;
      const conflictingValue = incomingWon ? previousValue : finding.value;
      const conflictingSource = incomingWon
        ? previousProvenance?.source ?? defaultListingProvenance().source
        : finding.source;
      conflicts = appendConflict(conflicts, {
        field,
        activeValue,
        conflictingValue,
        activeSource,
        conflictingSource,
        activeProvenance: incomingWon
          ? analysis.provenance[field]
          : previousProvenance,
        conflictingProvenance: incomingWon
          ? previousProvenance ?? defaultListingProvenance()
          : analysis.provenance[field],
        message: incomingWon
          ? "Asiakirjan arvo poikkeaa aiemmasta ilmoitustiedosta. Asiakirjan arvo otettiin käyttöön ja ilmoituksen arvo säilytettiin ristiriitatietona."
          : activeSource?.kind === "user"
            ? "Asiakirjan arvo poikkeaa käyttäjän vahvistamasta tiedosta. Käyttäjän arvo säilytettiin ja asiakirjan arvo tallennettiin ristiriitatietona."
            : "Asiakirjalähteiden arvot poikkeavat toisistaan. Aiemmin hyväksytty arvo säilytettiin ja uusi arvo tallennettiin ristiriitatietona.",
      });
    }
  }

  const unseenRenovations = analysis.renovations.filter(
    (incoming) =>
      !current.renovations.some(
        (existing) =>
          existing.id === incoming.id ||
          (existing.source === "document" &&
            incoming.source === "document" &&
            existing.sourceName === incoming.sourceName &&
            existing.rawText === incoming.rawText),
      ),
  );

  return {
    values,
    provenance,
    conflicts,
    renovations: mergeRenovationFindings(
      current.renovations,
      unseenRenovations,
    ),
    housingCompanyRenovations: mergeHousingCompanyRenovationTexts(
      current.housingCompanyRenovations,
      analysis.housingCompanyRenovations,
    ),
  };
}

export function emptyDocumentCanonicalState(
  values: DocumentCanonicalState["values"] = {},
): DocumentCanonicalState {
  return {
    values: { ...values },
    provenance: {},
    conflicts: [],
    renovations: [],
    housingCompanyRenovations: {
      completedRawText: null,
      plannedRawText: null,
    },
  };
}

export function documentProvenanceForField(
  state: DocumentCanonicalState,
  field: NormalizedFieldKey,
): DocumentFieldProvenance | undefined {
  return state.provenance[field];
}

export const financingDebtConflictWarning =
  "Asiakirjan rahoitusvastike on yli 0 €, mutta huoneistokohtainen yhtiölainaosuus on 0 €. Molemmat lähtöarvot säilytettiin ja yhtiölainaosuus merkitään tarkistettavaksi.";

/**
 * Tarkistaa eri canonical-kenttien väliset ristiriidat muuttamatta alkuperäisiä
 * arvoja. Tarkistustila tallennetaan provenanceen, jotta se säilyy myös
 * istuntoluonnoksen lataamisen jälkeen.
 */
export function validateDocumentCanonicalConsistency(
  current: DocumentCanonicalState,
): {
  state: DocumentCanonicalState;
  warnings: string[];
  fieldsNeedingReview: NormalizedFieldKey[];
} {
  const companyLoanShare = current.values.companyLoanShare;
  const financingFeeMonthly = current.values.financingFeeMonthly;
  if (
    companyLoanShare !== 0 ||
    typeof financingFeeMonthly !== "number" ||
    financingFeeMonthly <= 0
  ) {
    return { state: current, warnings: [], fieldsNeedingReview: [] };
  }

  const existing = current.provenance.companyLoanShare;
  const userConfirmed = existing?.source.kind === "user" || existing?.status === "user";
  const provenance = userConfirmed
    ? current.provenance
    : {
        ...current.provenance,
        companyLoanShare: existing
          ? { ...existing, status: "unknown" as const }
          : {
              source: { kind: "calculation" as const, label: "Tarkistettava tieto" },
              status: "unknown" as const,
              sourceLabel: "Tarkistettava tieto",
            },
      };

  return {
    state: { ...current, provenance },
    warnings: [financingDebtConflictWarning],
    fieldsNeedingReview: userConfirmed ? [] : ["companyLoanShare"],
  };
}
