export type FieldStatus = "parser" | "user" | "derived" | "default" | "missing";

export type FieldSource = {
  kind: "listing" | "document" | "user" | "calculation";
  documentId?: string;
  label?: string;
};

export type FieldConflict<T> = {
  code: string;
  message: string;
  incomingValue: T | null;
  incomingSource?: FieldSource;
  detectedAt?: string;
};

export type PropertyField<T> = {
  value: T | null;
  status: FieldStatus;
  source?: FieldSource;
  /** Alkuperäinen parserin tai dokumentin arvo säilytetään käyttäjän arvon rinnalla. */
  sourceValue?: T | null;
  conflicts?: FieldConflict<T>[];
  confidence?: number;
  confidenceLevel?: "high" | "medium" | "low" | "unknown";
  extractionMethod?: "label" | "structured_data" | "title" | "free_text" | "calculation" | "user";
  rawText?: string;
  userEdited?: boolean;
  updatedAt?: string;
  notes?: string;
};
