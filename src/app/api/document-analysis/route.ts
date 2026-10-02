import { randomUUID } from "node:crypto";
import type { RepairDocumentKind } from "../../../core/rules/repair-history.ts";
import { normalizeDocumentExtraction } from "../../../core/documents/normalize.ts";
import {
  DocumentAnalysisProviderError,
  OpenAiDocumentAnalysisProvider,
} from "../../../server/documents/openai-document-provider.ts";
import { validateDocumentUpload } from "../../../server/documents/file-validation.ts";

export const runtime = "nodejs";

const declaredKinds = new Set<RepairDocumentKind>([
  "listing",
  "manager_certificate",
  "maintenance_plan",
  "financial_statements",
  "annual_report",
  "meeting_minutes",
  "shareholder_register",
]);

function declaredKindFromForm(value: FormDataEntryValue | null): RepairDocumentKind | undefined {
  if (typeof value !== "string") return undefined;
  return declaredKinds.has(value as RepairDocumentKind) ? (value as RepairDocumentKind) : undefined;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { code: "DOCUMENT_REQUIRED", message: "Asiakirjaa ei voitu lukea." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { code: "DOCUMENT_REQUIRED", message: "Valitse analysoitava asiakirja." },
      { status: 400 },
    );
  }

  const validation = validateDocumentUpload({
    fileName: file.name,
    mediaType: file.type,
    size: file.size,
  });
  if (!validation.ok) {
    return Response.json(
      { code: validation.code, message: validation.message },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        code: "DOCUMENT_ANALYSIS_FAILED",
        message: "Asiakirjan analyysipalvelua ei ole määritetty palvelimelle.",
      },
      { status: 503 },
    );
  }

  const documentId = randomUUID();
  const declaredKind = declaredKindFromForm(form.get("declaredKind"));

  try {
    const provider = new OpenAiDocumentAnalysisProvider({
      apiKey,
      model:
        process.env.DOCUMENT_ANALYSIS_MODEL ??
        process.env.VISUAL_CONDITION_MODEL ??
        "gpt-5.6",
    });
    const extraction = await provider.analyzeDocument({
      bytes: new Uint8Array(await file.arrayBuffer()),
      mediaType: validation.value.mediaType,
      fileName: file.name,
      declaredKind,
    });
    const result = normalizeDocumentExtraction({
      extraction,
      documentId,
      fileName: file.name,
      declaredKind,
    });
    return Response.json(result);
  } catch (error) {
    const code =
      error instanceof DocumentAnalysisProviderError
        ? error.code
        : "DOCUMENT_ANALYSIS_FAILED";
    return Response.json(
      {
        code,
        message:
          error instanceof Error
            ? error.message
            : "Asiakirjan analysointi epäonnistui.",
      },
      { status: code === "TIMEOUT" ? 504 : 502 },
    );
  }
}
