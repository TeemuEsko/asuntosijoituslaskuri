import { parseListingText } from "../parser/listing-parser.ts";
import type {
  ListingFinding,
  RenovationFinding,
} from "../parser/listing-parser.ts";
import type { NormalizedFieldKey } from "../parser/synonyms.ts";
import type { RepairDocumentKind } from "../rules/repair-history.ts";
import {
  documentTypeLabels,
  type DocumentAnalysisResult,
  type DocumentExcerpt,
  type DocumentFieldFinding,
  type DocumentFieldProvenance,
  type DocumentType,
  type NormalizeDocumentExtractionInput,
} from "./types.ts";

const supportedDocumentFields = new Set<NormalizedFieldKey>([
  "maintenanceFeeMonthly",
  "financingFeeMonthly",
  "companyLoanShare",
  "otherMonthlyFees",
  "areaSqm",
  "roomDescription",
  "apartmentIdentifier",
  "constructionYear",
  "buildingType",
  "apartmentType",
  "housingCompanyName",
  "floor",
  "landOwnership",
  "plotFeeMonthly",
  "landRentAnnual",
  "landLeaseEndDate",
  "plotShareRedemptionPrice",
  "nextPlotShareRedemptionDate",
  "articlesRedemptionClause",
]);

type UploadDocumentKind = Exclude<RepairDocumentKind, "listing">;

const repairDocumentKinds = new Set<UploadDocumentKind>([
  "manager_certificate",
  "maintenance_plan",
  "financial_statements",
  "annual_report",
  "meeting_minutes",
  "shareholder_register",
]);

function isRepairDocumentKind(value: DocumentType): value is UploadDocumentKind {
  return repairDocumentKinds.has(value as UploadDocumentKind);
}

function resolvedDocumentType(documentType: DocumentType): DocumentType {
  // declaredKind is only a user-selected analysis hint. Replacing the provider's
  // classification with it would attach a false document type and source label
  // to extracted data, especially for explicit "other" and "unknown" results.
  return documentType;
}

function highConfidenceTexts(excerpts: readonly DocumentExcerpt[] | undefined): string[] {
  if (!Array.isArray(excerpts)) return [];
  return excerpts
    .filter(
      (excerpt) =>
        excerpt &&
        typeof excerpt.text === "string" &&
        excerpt.confidence === "high" &&
        excerpt.text.trim().length > 0,
    )
    .map((excerpt) => excerpt.text.trim());
}

function collapseExtractedWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function originalEvidence(
  finding: ListingFinding,
  excerpts: readonly string[],
): string {
  const parsedEvidence = collapseExtractedWhitespace(finding.sourceExcerpt).toLocaleLowerCase("fi");
  return excerpts.find((excerpt) => {
    const normalized = collapseExtractedWhitespace(excerpt).toLocaleLowerCase("fi");
    return normalized === parsedEvidence || normalized.includes(parsedEvidence) || parsedEvidence.includes(normalized);
  }) ?? finding.sourceExcerpt;
}

function uniqueValueCount(findings: readonly ListingFinding[]): number {
  return new Set(
    findings.map((finding) =>
      typeof finding.normalizedValue === "number"
        ? `number:${finding.normalizedValue}`
        : `string:${finding.normalizedValue.toLocaleLowerCase("fi").trim()}`,
    ),
  ).size;
}

function selectDocumentFindings(
  findings: readonly ListingFinding[],
  warnings: string[],
): ListingFinding[] {
  const selected: ListingFinding[] = [];
  for (const field of supportedDocumentFields) {
    let candidates = findings.filter(
      (finding) =>
        finding.field === field &&
        finding.validationResult === "accepted" &&
        finding.conflicts.length === 0,
    );

    if (field === "companyLoanShare") {
      candidates = candidates.filter(
        (finding) =>
          finding.originalLabel !== "Päätelty hinnoista" &&
          !finding.calculationBasis &&
          !/taloyhtiön\s+(?:koko\s+)?(?:lainamäärä|lainat)|yhtiön\s+lainat\s+yhteensä/i.test(
            finding.sourceExcerpt,
          ),
      );
    }

    if (field === "financingFeeMonthly") {
      const aggregate = candidates.find((finding) => finding.aggregate);
      if (aggregate) {
        selected.push(aggregate);
        continue;
      }
    }

    if (candidates.length === 0) continue;
    if (uniqueValueCount(candidates) > 1) {
      warnings.push(
        `${candidates[0]!.fieldName}: asiakirjasta löytyi ristiriitaisia arvoja, joten tietoa ei yhdistetty automaattisesti.`,
      );
      continue;
    }

    selected.push(
      [...candidates].sort(
        (left, right) => right.confidenceScore - left.confidenceScore,
      )[0]!,
    );
  }
  return selected;
}

function asDocumentRenovations(
  renovations: readonly RenovationFinding[],
  documentId: string,
  sourceLabel: string,
): RenovationFinding[] {
  return renovations.map((renovation, index) => ({
    ...renovation,
    id: `document-${documentId}-${renovation.component}-${renovation.status}-${index}`,
    source: "document",
    sourceName: sourceLabel,
    verifiedByDocuments: true,
    confidence: "high",
    confidenceScore: Math.max(85, renovation.confidenceScore),
    confidenceReasons: [
      ...new Set([
        ...renovation.confidenceReasons.filter(
          (reason) => reason !== "Lähteenä myynti-ilmoitus",
        ),
        `Vahvistettu asiakirjasta: ${sourceLabel}`,
      ]),
    ],
    sourceHistory: [
      {
        source: "document",
        sourceName: sourceLabel,
        rawText: renovation.rawText,
        confidence: "high",
      },
    ],
  }));
}

function roomCountFromConfiguration(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^\s*([1-9]\d?)\s*h\b/i);
  return match ? Number(match[1]) : null;
}

/**
 * Normalisoi mallin palauttamat, sanatarkat asiakirjaotteet olemassa olevan
 * suomalaisen ilmoitusparserin kautta. Vain korkean luottamuksen otteita
 * käytetään automaattisesti.
 */
export function normalizeDocumentExtraction({
  extraction,
  documentId,
  fileName,
}: NormalizeDocumentExtractionInput): DocumentAnalysisResult {
  const documentType = resolvedDocumentType(extraction.documentType);
  const sourceLabel = documentTypeLabels[documentType];
  const source = {
    kind: "document" as const,
    documentId,
    label: sourceLabel,
  };
  const warnings: string[] = [];

  const allRelevantExcerpts = Array.isArray(extraction.relevantExcerpts)
    ? extraction.relevantExcerpts
    : [];
  const ignoredRelevantCount = allRelevantExcerpts.filter(
    (excerpt) => excerpt?.confidence !== "high" && excerpt?.text?.trim(),
  ).length;
  const mayUseExtraction =
    extraction.confidence !== "low" && extraction.confidence !== "unknown";
  const relevantTexts = mayUseExtraction
    ? highConfidenceTexts(allRelevantExcerpts)
    : [];

  if (!mayUseExtraction) {
    warnings.push(
      "Asiakirjan tunnistuksen luotettavuus oli liian matala, joten tietoja ei yhdistetty automaattisesti.",
    );
  }
  if (ignoredRelevantCount > 0) {
    warnings.push(
      "Epävarmoja asiakirjaotteita ei yhdistetty automaattisesti.",
    );
  }

  const relevantText = relevantTexts.map(collapseExtractedWhitespace).join("\n");
  const parsed = parseListingText(relevantText, "pasted_text");
  const selectedFindings = selectDocumentFindings(parsed.findings, warnings);

  if (
    /taloyhtiön\s+(?:koko\s+)?(?:lainamäärä|lainat)|yhtiön\s+lainat\s+yhteensä/i.test(
      relevantText,
    )
  ) {
    warnings.push(
      "Taloyhtiön kokonaislainaa ei tulkittu huoneistokohtaiseksi yhtiölainaosuudeksi.",
    );
  }
  if (/yhtiövastike\s+yhteensä|vastikkeet\s+yhteensä/i.test(relevantText)) {
    warnings.push(
      "Yhtiövastikkeen yhteissumma pidettiin erillään hoito- ja rahoitusvastikkeista kaksinkertaisen laskennan estämiseksi.",
    );
  }

  const fields: DocumentFieldFinding[] = selectedFindings.map((finding) => ({
    field: finding.field,
    value: finding.normalizedValue,
    unit: finding.unit,
    originalLabel: finding.originalLabel,
    rawText: originalEvidence(finding, relevantTexts),
    confidence: "high",
    confidenceScore: Math.max(85, finding.confidenceScore),
    source,
    sourceLabel,
  }));
  const values: Partial<Record<NormalizedFieldKey, number | string>> = {};
  const provenance: Partial<
    Record<NormalizedFieldKey, DocumentFieldProvenance>
  > = {};
  for (const field of fields) {
    values[field.field] = field.value;
    provenance[field.field] = {
      source,
      status: "document",
      sourceLabel,
      documentType,
      fileName,
      rawText: field.rawText,
      confidence: "high",
    };
  }

  const completedTexts = mayUseExtraction
    ? highConfidenceTexts(extraction.completedRenovations)
    : [];
  const futureTexts = mayUseExtraction
    ? highConfidenceTexts(extraction.futureRenovations)
    : [];
  const repairText = [
    ...(completedTexts.length
      ? ["Tehdyt remontit", ...completedTexts]
      : []),
    ...(futureTexts.length ? ["Tulevat remontit", ...futureTexts] : []),
  ].join("\n");
  const renovations = repairText
    ? asDocumentRenovations(
        parseListingText(repairText, "pasted_text").renovations,
        documentId,
        sourceLabel,
      )
    : [];
  const roomConfiguration =
    typeof values.roomDescription === "string"
      ? values.roomDescription
      : null;

  return {
    documentId,
    fileName,
    documentType,
    documentKind: isRepairDocumentKind(documentType) ? documentType : null,
    confidence: extraction.confidence,
    source,
    sourceLabel,
    fields,
    values,
    provenance,
    roomConfiguration,
    roomCount: roomCountFromConfiguration(roomConfiguration ?? undefined),
    renovations,
    housingCompanyRenovations: {
      completedRawText: completedTexts.length
        ? completedTexts.join("\n")
        : null,
      plannedRawText: futureTexts.length ? futureTexts.join("\n") : null,
    },
    warnings: [...new Set(warnings)],
  };
}
