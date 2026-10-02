import type {
  FieldSource,
  FieldStatus,
} from "../domain/field.ts";
import type {
  HousingCompanyRenovationTexts,
  ListingFinding,
  RenovationFinding,
} from "../parser/listing-parser.ts";
import type { NormalizedFieldKey } from "../parser/synonyms.ts";
import type { RepairDocumentKind } from "../rules/repair-history.ts";

export type DocumentConfidence = "high" | "medium" | "low" | "unknown";

export type DocumentType = Exclude<RepairDocumentKind, "listing"> | "other" | "unknown";

export const documentTypeLabels: Record<DocumentType, string> = {
  manager_certificate: "Isännöitsijäntodistus",
  maintenance_plan: "Kunnossapitotarveselvitys",
  financial_statements: "Tilinpäätös",
  annual_report: "Toimintakertomus",
  meeting_minutes: "Yhtiökokouksen pöytäkirja",
  shareholder_register: "Osakeluettelo",
  other: "Muu asiakirja",
  unknown: "Tunnistamaton asiakirja",
};

export type DocumentExcerpt = {
  text: string;
  confidence: DocumentConfidence;
};

export type DocumentRawExtraction = {
  documentType: DocumentType;
  confidence: DocumentConfidence;
  relevantExcerpts: DocumentExcerpt[];
  completedRenovations: DocumentExcerpt[];
  futureRenovations: DocumentExcerpt[];
};

export type DocumentFieldProvenance = {
  source: FieldSource;
  status: FieldStatus;
  sourceLabel: string;
  documentType?: DocumentType;
  fileName?: string;
  rawText?: string;
  confidence?: DocumentConfidence;
};

export type DocumentFieldFinding = {
  field: NormalizedFieldKey;
  value: number | string;
  unit?: ListingFinding["unit"];
  originalLabel: string;
  rawText: string;
  confidence: "high";
  confidenceScore: number;
  source: FieldSource & { kind: "document" };
  sourceLabel: string;
};

export type DocumentAnalysisResult = {
  documentId: string;
  fileName: string;
  documentType: DocumentType;
  documentKind: RepairDocumentKind | null;
  confidence: DocumentConfidence;
  source: FieldSource & { kind: "document" };
  sourceLabel: string;
  fields: DocumentFieldFinding[];
  values: Partial<Record<NormalizedFieldKey, number | string>>;
  provenance: Partial<Record<NormalizedFieldKey, DocumentFieldProvenance>>;
  roomConfiguration: string | null;
  roomCount: number | null;
  renovations: RenovationFinding[];
  housingCompanyRenovations: HousingCompanyRenovationTexts;
  warnings: string[];
};

export type DocumentFieldConflict = {
  field: NormalizedFieldKey;
  activeValue: number | string;
  conflictingValue: number | string;
  activeSource?: FieldSource;
  conflictingSource?: FieldSource;
  activeProvenance?: DocumentFieldProvenance;
  conflictingProvenance?: DocumentFieldProvenance;
  message: string;
};

export type DocumentCanonicalState = {
  values: Partial<Record<NormalizedFieldKey, number | string>>;
  provenance: Partial<Record<NormalizedFieldKey, DocumentFieldProvenance>>;
  conflicts: DocumentFieldConflict[];
  renovations: RenovationFinding[];
  housingCompanyRenovations: HousingCompanyRenovationTexts;
};

export type NormalizeDocumentExtractionInput = {
  extraction: DocumentRawExtraction;
  documentId: string;
  fileName: string;
  declaredKind?: RepairDocumentKind;
};
