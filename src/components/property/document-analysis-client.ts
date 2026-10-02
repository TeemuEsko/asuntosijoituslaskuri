import type { RepairDocumentKind } from "@/core/rules/repair-history";
import type { DocumentAnalysisResult } from "@/core/documents/types";

type DocumentAnalysisErrorPayload = {
  code?: string;
  message?: string;
};

export async function analyzePropertyDocument(
  file: File,
  declaredKind?: RepairDocumentKind,
): Promise<DocumentAnalysisResult> {
  const form = new FormData();
  form.set("file", file);
  if (declaredKind) form.set("declaredKind", declaredKind);

  let response: Response;
  try {
    response = await fetch("/api/document-analysis", {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error("Asiakirjan analyysipalveluun ei saatu yhteyttä.");
  }

  const payload = (await response.json().catch(() => null)) as
    | DocumentAnalysisResult
    | DocumentAnalysisErrorPayload
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "Asiakirjan analysointi epäonnistui.",
    );
  }

  if (!payload || !("documentId" in payload)) {
    throw new Error("Asiakirjan analyysin vastausta ei voitu lukea.");
  }

  return payload as DocumentAnalysisResult;
}
