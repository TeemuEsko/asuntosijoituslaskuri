export type FieldStatus = "parser" | "user" | "derived" | "missing";

export type FieldSource = {
  kind: "listing" | "document" | "user" | "calculation";
  documentId?: string;
  label?: string;
};

export type PropertyField<T> = {
  value: T | null;
  status: FieldStatus;
  source?: FieldSource;
  confidence?: number;
  updatedAt?: string;
  notes?: string;
};
