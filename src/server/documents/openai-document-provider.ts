import type {
  DocumentConfidence,
  DocumentRawExtraction,
  DocumentType,
} from "@/core/documents/types";
import type { RepairDocumentKind } from "@/core/rules/repair-history";

export type DocumentAnalysisProviderInput = {
  bytes: Uint8Array;
  mediaType: string;
  fileName: string;
  declaredKind?: RepairDocumentKind;
};

export type DocumentAnalysisProviderErrorCode =
  | "DOCUMENT_ANALYSIS_FAILED"
  | "SAFETY_FILTERED"
  | "TIMEOUT";

export class DocumentAnalysisProviderError extends Error {
  readonly code: DocumentAnalysisProviderErrorCode;

  constructor(code: DocumentAnalysisProviderErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "DocumentAnalysisProviderError";
  }
}

const documentTypes = [
  "manager_certificate",
  "maintenance_plan",
  "financial_statements",
  "annual_report",
  "meeting_minutes",
  "shareholder_register",
  "other",
  "unknown",
] as const satisfies readonly DocumentType[];

const confidenceLevels = ["high", "medium", "low", "unknown"] as const satisfies readonly DocumentConfidence[];

const excerptSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "confidence"],
  properties: {
    text: { type: "string" },
    confidence: { type: "string", enum: confidenceLevels },
  },
} as const;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentType",
    "confidence",
    "relevantExcerpts",
    "completedRenovations",
    "futureRenovations",
  ],
  properties: {
    documentType: { type: "string", enum: documentTypes },
    confidence: { type: "string", enum: confidenceLevels },
    relevantExcerpts: { type: "array", maxItems: 50, items: excerptSchema },
    completedRenovations: { type: "array", maxItems: 30, items: excerptSchema },
    futureRenovations: { type: "array", maxItems: 30, items: excerptSchema },
  },
} as const;

const systemPrompt = `Poimi asunto-osakeyhtiön tai sijoitusasunnon asiakirjasta vain dokumentissa nimenomaisesti näkyviä tietoja. Vastaa suomeksi annetun JSON-skeeman mukaan.

Tiukat rajat:
- Kopioi relevantExcerpts-, completedRenovations- ja futureRenovations-taulukoihin vain tarkkoja, lyhyitä katkelmia tästä dokumentista. Älä selitä, laske, päättele, täydennä tai keksi puuttuvia arvoja.
- Säilytä katkelmissa kentän nimi, rahamäärä, yksikkö ja mahdollinen huoneisto- tai osaketunniste. Säilytä suomalaiset desimaalipilkut ja välilyönnit sellaisina kuin ne näkyvät.
- Nosta relevantExcerpts-taulukkoon hoitovastike, rahoitus- tai pääomavastike, huoneistokohtainen yhtiölainaosuus tai velkaosuus, muu säännöllinen vastike tai maksu, pinta-ala, huoneluku tai huoneistoselitelmä, huoneisto- ja osaketunnisteet, rakennusvuosi, rakennustyyppi sekä tontin omistus- tai vuokratieto, kun ne löytyvät yksiselitteisesti.
- Älä käsittele taloyhtiön koko lainamäärää huoneistokohtaisena lainaosuutena. Poimi lainaosuudeksi vain katkelma, jossa kyseinen huoneisto, osakeryhmä, velkaosuus tai lainaosuus on ilmaistu selvästi.
- Älä laske kokonaisvastikkeesta hoito- tai rahoitusvastiketta. Poimi erilliset vastikelajit erillisinä katkelmina vain, jos asiakirja nimeää ne.
- completedRenovations sisältää vain toteutuneiksi tai valmistuneiksi merkityt korjaukset. futureRenovations sisältää vain suunnitellut, päätetyt, ehdotetut tai arvioidut tulevat korjaukset. Jos ajankohta tai tila on epäselvä, laske varmuutta äläkä arvaa.
- Jos dokumenttilaji tai tieto ei ole luotettavasti tunnistettavissa, käytä confidence-arvoa medium, low tai unknown. Tyhjä taulukko on parempi kuin epävarma keksitty tieto.
- Älä sisällytä henkilötunnuksia, tilinumeroita, allekirjoituksia, yhteystietoja tai muita analyysin kannalta tarpeettomia henkilötietoja.`;

export function documentResponseOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { output_text?: unknown; output?: unknown };
  if (typeof record.output_text === "string") return record.output_text;
  if (!Array.isArray(record.output)) return null;

  for (const item of record.output) {
    if (!item || typeof item !== "object") continue;
    const contentItems = (item as { content?: unknown }).content;
    if (!Array.isArray(contentItems)) continue;
    for (const content of contentItems) {
      if (
        content &&
        typeof content === "object" &&
        typeof (content as { text?: unknown }).text === "string"
      ) {
        return (content as { text: string }).text;
      }
    }
  }

  return null;
}

function isExcerpt(value: unknown): value is { text: string; confidence: DocumentConfidence } {
  if (!value || typeof value !== "object") return false;
  const excerpt = value as { text?: unknown; confidence?: unknown };
  return (
    typeof excerpt.text === "string" &&
    confidenceLevels.includes(excerpt.confidence as DocumentConfidence)
  );
}

export function isDocumentRawExtraction(value: unknown): value is DocumentRawExtraction {
  if (!value || typeof value !== "object") return false;
  const extraction = value as Partial<DocumentRawExtraction>;
  return (
    documentTypes.includes(extraction.documentType as DocumentType) &&
    confidenceLevels.includes(extraction.confidence as DocumentConfidence) &&
    Array.isArray(extraction.relevantExcerpts) &&
    extraction.relevantExcerpts.every(isExcerpt) &&
    Array.isArray(extraction.completedRenovations) &&
    extraction.completedRenovations.every(isExcerpt) &&
    Array.isArray(extraction.futureRenovations) &&
    extraction.futureRenovations.every(isExcerpt)
  );
}

export class OpenAiDocumentAnalysisProvider {
  private readonly options: {
    apiKey: string;
    model?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  };

  constructor(options: {
    apiKey: string;
    model?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  }) {
    this.options = options;
  }

  async analyzeDocument(input: DocumentAnalysisProviderInput): Promise<DocumentRawExtraction> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const declaredKind = input.declaredKind?.trim() || "ei ilmoitettu";
    let response: Response;

    try {
      response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 60_000),
        body: JSON.stringify({
          model:
            this.options.model ??
            process.env.DOCUMENT_ANALYSIS_MODEL ??
            process.env.VISUAL_CONDITION_MODEL ??
            "gpt-5.6",
          store: false,
          max_output_tokens: 4_000,
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: systemPrompt }],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Tiedostonimi: ${input.fileName}. Käyttöliittymän alustava asiakirjalaji: ${declaredKind}. Tunnista laji silti ensisijaisesti dokumentin sisällöstä ja analysoi vain tämä tiedosto.`,
                },
                {
                  type: "input_file",
                  filename: input.fileName,
                  file_data: `data:${input.mediaType};base64,${Buffer.from(input.bytes).toString("base64")}`,
                  detail: "high",
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "property_document_extraction",
              strict: true,
              schema: responseSchema,
            },
          },
        }),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new DocumentAnalysisProviderError(
          "TIMEOUT",
          "Asiakirjan analysointi aikakatkaistiin.",
        );
      }
      throw new DocumentAnalysisProviderError(
        "DOCUMENT_ANALYSIS_FAILED",
        "Asiakirjan analyysipalveluun ei saatu yhteyttä.",
      );
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
      output?: Array<{ content?: Array<{ type?: string }> }>;
    } | null;

    if (!response.ok) {
      const safetyFiltered = /safety|content_filter|moderation/i.test(
        `${payload?.error?.code ?? ""} ${payload?.error?.message ?? ""}`,
      );
      throw new DocumentAnalysisProviderError(
        safetyFiltered
          ? "SAFETY_FILTERED"
          : response.status === 408 || response.status === 504
            ? "TIMEOUT"
            : "DOCUMENT_ANALYSIS_FAILED",
        safetyFiltered
          ? "Asiakirja suodatettiin turvallisuussyistä."
          : "Asiakirjan analysointi ei onnistunut.",
      );
    }

    const refused = payload?.output?.some((item) =>
      item.content?.some((content) => content.type === "refusal"),
    );
    if (refused) {
      throw new DocumentAnalysisProviderError(
        "SAFETY_FILTERED",
        "Asiakirja suodatettiin turvallisuussyistä.",
      );
    }

    const text = documentResponseOutputText(payload);
    if (!text) {
      throw new DocumentAnalysisProviderError(
        "DOCUMENT_ANALYSIS_FAILED",
        "Asiakirjan analyysi ei palauttanut poimittuja tietoja.",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new DocumentAnalysisProviderError(
        "DOCUMENT_ANALYSIS_FAILED",
        "Asiakirjan analyysin vastausta ei voitu lukea.",
      );
    }

    if (!isDocumentRawExtraction(parsed)) {
      throw new DocumentAnalysisProviderError(
        "DOCUMENT_ANALYSIS_FAILED",
        "Asiakirjan analyysin vastaus ei vastannut tietomallia.",
      );
    }

    return parsed;
  }
}
