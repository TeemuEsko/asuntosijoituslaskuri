const FIFTEEN_MEGABYTES = 15 * 1024 * 1024;

const supportedMediaTypes = {
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".doc": ["application/msword"],
  ".rtf": ["application/rtf", "text/rtf"],
} as const;

export type DocumentUploadErrorCode =
  | "DOCUMENT_REQUIRED"
  | "DOCUMENT_TOO_LARGE"
  | "UNSUPPORTED_DOCUMENT_FORMAT";

export type ValidatedDocumentUpload = {
  mediaType: string;
  extension: keyof typeof supportedMediaTypes;
};

function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

export function validateDocumentUpload(input: {
  fileName: string;
  mediaType: string;
  size: number;
}):
  | { ok: true; value: ValidatedDocumentUpload }
  | { ok: false; code: DocumentUploadErrorCode; message: string } {
  if (!input.fileName.trim() || input.size <= 0) {
    return {
      ok: false,
      code: "DOCUMENT_REQUIRED",
      message: "Valitse analysoitava asiakirja.",
    };
  }

  if (input.size > FIFTEEN_MEGABYTES) {
    return {
      ok: false,
      code: "DOCUMENT_TOO_LARGE",
      message: "Asiakirjan enimmäiskoko on 15 Mt.",
    };
  }

  const extension = extensionOf(input.fileName) as keyof typeof supportedMediaTypes;
  const allowedTypes = supportedMediaTypes[extension] as readonly string[] | undefined;
  const normalizedType = input.mediaType.trim().toLowerCase();
  if (
    !allowedTypes ||
    (normalizedType !== "" &&
      normalizedType !== "application/octet-stream" &&
      !allowedTypes.includes(normalizedType))
  ) {
    return {
      ok: false,
      code: "UNSUPPORTED_DOCUMENT_FORMAT",
      message: "Tiedostomuotoa ei tueta. Käytä PDF-, DOC-, DOCX-, RTF- tai TXT-tiedostoa.",
    };
  }

  const mediaType =
    normalizedType && normalizedType !== "application/octet-stream"
      ? normalizedType
      : allowedTypes[0];
  return { ok: true, value: { extension, mediaType } };
}
