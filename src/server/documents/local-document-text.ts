import { extractTextItems, getDocumentProxy, type StructuredTextItem } from "unpdf";

import {
  SCANNED_DOCUMENT_MESSAGE,
  UNREADABLE_DOCUMENT_MESSAGE,
} from "../../core/documents/messages.ts";

const MAX_PDF_PAGES = 250;

export type LocalDocumentErrorCode =
  | "SCANNED_DOCUMENT"
  | "DOCUMENT_ANALYSIS_FAILED";

export class LocalDocumentError extends Error {
  readonly code: LocalDocumentErrorCode;

  constructor(code: LocalDocumentErrorCode, message: string) {
    super(message);
    this.name = "LocalDocumentError";
    this.code = code;
  }
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function reconstructPdfPageText(items: readonly StructuredTextItem[]): string {
  if (items.length === 0) return "";
  const ordered = [...items].sort((left, right) => {
    const lineDifference = right.y - left.y;
    return Math.abs(lineDifference) > 2 ? lineDifference : left.x - right.x;
  });
  const lines: Array<{ y: number; items: StructuredTextItem[] }> = [];
  for (const item of ordered) {
    if (!item.str.trim()) continue;
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  return lines
    .sort((left, right) => right.y - left.y)
    .map(({ items: lineItems }) => {
      const sorted = [...lineItems].sort((left, right) => left.x - right.x);
      return sorted
        .map((item, index) => {
          const previous = sorted[index - 1];
          if (!previous) return item.str;
          const gap = item.x - (previous.x + previous.width);
          return `${gap > Math.max(1.5, previous.fontSize * 0.12) ? " " : ""}${item.str}`;
        })
        .join("");
    })
    .join("\n");
}

export function hasUsableDocumentText(text: string): boolean {
  const compact = text.replace(/\s/g, "");
  return compact.length >= 8 && /[a-zåäö]{3}/iu.test(compact);
}

export async function extractLocalDocumentText(input: {
  bytes: Uint8Array;
  extension: ".pdf" | ".txt";
}): Promise<string> {
  if (input.extension === ".txt") {
    const text = normalizeExtractedText(new TextDecoder("utf-8", { fatal: false }).decode(input.bytes));
    if (!hasUsableDocumentText(text)) {
      throw new LocalDocumentError("DOCUMENT_ANALYSIS_FAILED", UNREADABLE_DOCUMENT_MESSAGE);
    }
    return text;
  }

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(input.bytes);
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new LocalDocumentError(
        "DOCUMENT_ANALYSIS_FAILED",
        `PDF-asiakirjassa on liikaa sivuja. Enimmäismäärä on ${MAX_PDF_PAGES}.`,
      );
    }
    const extracted = await extractTextItems(pdf);
    const text = normalizeExtractedText(
      extracted.items.map(reconstructPdfPageText).filter(Boolean).join("\n\n"),
    );
    if (!hasUsableDocumentText(text)) {
      throw new LocalDocumentError("SCANNED_DOCUMENT", SCANNED_DOCUMENT_MESSAGE);
    }
    return text;
  } catch (error) {
    if (error instanceof LocalDocumentError) throw error;
    throw new LocalDocumentError("DOCUMENT_ANALYSIS_FAILED", UNREADABLE_DOCUMENT_MESSAGE);
  } finally {
    await pdf?.loadingTask.destroy();
  }
}
