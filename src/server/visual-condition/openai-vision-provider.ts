import type { VisualConditionProvider, VisualImageAiResult, VisualImageInput } from "@/core/visual-condition/provider";
import type { VisualConditionErrorCode } from "@/core/visual-condition/types";

export class VisualConditionProviderError extends Error {
  readonly code: VisualConditionErrorCode;
  constructor(code: VisualConditionErrorCode, message: string) { super(message); this.code = code; this.name = "VisualConditionProviderError"; }
}

const rooms = ["living_room", "bedroom", "kitchen", "bathroom", "toilet", "sauna", "entry", "utility_room", "balcony", "terrace", "yard", "facade", "garage", "basement", "storage", "technical_room", "other", "unknown"] as const;
const areas = ["floor", "wall", "ceiling", "cabinetry", "countertop", "appliance", "fixture", "electrical_fixture", "window", "door", "wet_area", "facade", "balcony", "roof", "foundation", "rainwater_system", "yard", "general", "other"] as const;
const observationTypes = ["wear", "surface_damage", "crack", "discoloration", "outdatedness", "missing_finish", "poor_workmanship", "possible_moisture_indicator", "positive_condition", "unassessable", "other"] as const;

const responseSchema = {
  type: "object", additionalProperties: false,
  required: ["room", "visibleSurfaces", "imageQuality", "assessability", "qualityReason", "unassessableReason", "observations"],
  properties: {
    room: { type: "string", enum: rooms }, visibleSurfaces: { type: "array", maxItems: 20, items: { type: "string" } }, imageQuality: { type: "string", enum: ["high", "medium", "low", "unknown"] }, assessability: { type: "string", enum: ["good", "limited", "not_assessable"] }, qualityReason: { type: "string" }, unassessableReason: { type: "string" },
    observations: { type: "array", maxItems: 12, items: { type: "object", additionalProperties: false, required: ["area", "type", "severity", "summary", "details", "confidence", "requiresProfessionalInspection"], properties: { area: { type: "string", enum: areas }, type: { type: "string", enum: observationTypes }, severity: { type: "string", enum: ["info", "low", "medium", "high"] }, summary: { type: "string" }, details: { type: "string" }, confidence: { type: "string", enum: ["high", "medium", "low", "unknown"] }, requiresProfessionalInspection: { type: "boolean" } } } }
  }
} as const;

const systemPrompt = `Analysoi yksi käyttäjän itse lisäämä asunnon tai rakennuksen valokuva näkyvän kunnon kannalta. Vastaa suomeksi annetun JSON-skeeman mukaan.

Tiukat rajat:
- Kuvaa vain kuvassa näkyviä pintoja, kulumaa, pintavaurioita, halkeamia, värimuutoksia, puuttuvaa viimeistelyä, vanhentunutta ilmettä ja työnjälkeä.
- Älä tee kuntotarkastusta, teknistä diagnoosia tai päätelmää rakenteiden sisäisestä kunnosta.
- Älä koskaan väitä kuvassa olevan kosteusvaurio, homevaurio tai vesivahinko. Jos näkyy epäselvä värimuutos, käytä tyyppiä possible_moisture_indicator, ilmaise että syytä ei voi varmistaa kuvasta ja merkitse ammattilaisen tarkistus.
- Pelkkä vanha tyyli ei tarkoita korjaustarvetta eikä märkätiläremonttia.
- Jos kuva, valaistus tai kuvakulma ei riitä, laske varmuutta ja kerro rajoite. Jos kohdetta ei voi arvioida, käytä not_assessable ja tyhjää havaintolistaa.
- Älä tunnista henkilöitä äläkä päättele asukkaista, terveydestä, taloudesta tai elämäntilanteesta mitään.
- Positiivinen havainto on sallittu vain selvästi näkyvästä siististä ja ehjästä pinnasta.`;

function outputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { output_text?: unknown; output?: unknown };
  if (typeof record.output_text === "string") return record.output_text;
  if (!Array.isArray(record.output)) return null;
  for (const item of record.output) {
    if (!item || typeof item !== "object" || !Array.isArray((item as { content?: unknown }).content)) continue;
    for (const content of (item as { content: unknown[] }).content) if (content && typeof content === "object" && typeof (content as { text?: unknown }).text === "string") return (content as { text: string }).text;
  }
  return null;
}

function isResult(value: unknown): value is VisualImageAiResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<VisualImageAiResult>;
  return rooms.includes(item.room as (typeof rooms)[number])
    && Array.isArray(item.visibleSurfaces) && item.visibleSurfaces.every((surface) => typeof surface === "string")
    && ["high", "medium", "low", "unknown"].includes(String(item.imageQuality))
    && ["good", "limited", "not_assessable"].includes(String(item.assessability))
    && typeof item.qualityReason === "string" && typeof item.unassessableReason === "string"
    && Array.isArray(item.observations) && item.observations.every((observation) => observation && typeof observation === "object"
      && areas.includes(observation.area as (typeof areas)[number])
      && observationTypes.includes(observation.type as (typeof observationTypes)[number])
      && ["info", "low", "medium", "high"].includes(String(observation.severity))
      && ["high", "medium", "low", "unknown"].includes(String(observation.confidence))
      && typeof observation.summary === "string" && typeof observation.details === "string"
      && typeof observation.requiresProfessionalInspection === "boolean");
}

export class OpenAiVisualConditionProvider implements VisualConditionProvider {
  private readonly options: { apiKey: string; model?: string; fetchImpl?: typeof fetch; timeoutMs?: number };
  constructor(options: { apiKey: string; model?: string; fetchImpl?: typeof fetch; timeoutMs?: number }) { this.options = options; }

  async analyzeImage(input: VisualImageInput): Promise<VisualImageAiResult> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    let response: Response;
    try {
      response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST", headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(this.options.timeoutMs ?? 45_000),
        body: JSON.stringify({ model: this.options.model ?? "gpt-5.6", store: false, max_output_tokens: 1_800, input: [{ role: "system", content: [{ type: "input_text", text: systemPrompt }] }, { role: "user", content: [{ type: "input_text", text: `Tiedostonimi: ${input.fileName}. Arvioi vain tämä kuva.` }, { type: "input_image", image_url: `data:${input.mediaType};base64,${Buffer.from(input.bytes).toString("base64")}`, detail: "high" }] }], text: { format: { type: "json_schema", name: "visual_condition_image", strict: true, schema: responseSchema } } })
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new VisualConditionProviderError("TIMEOUT", "Kuvan analysointi aikakatkaistiin.");
      throw new VisualConditionProviderError("IMAGE_ANALYSIS_FAILED", "Kuvantulkintapalveluun ei saatu yhteyttä.");
    }
    const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string }; output?: Array<{ type?: string; content?: Array<{ type?: string }> }> } | null;
    if (!response.ok) {
      const safety = /safety|content_filter|moderation/i.test(`${payload?.error?.code ?? ""} ${payload?.error?.message ?? ""}`);
      throw new VisualConditionProviderError(safety ? "SAFETY_FILTERED" : response.status === 408 || response.status === 504 ? "TIMEOUT" : "IMAGE_ANALYSIS_FAILED", "Kuvan analysointi ei onnistunut.");
    }
    const refused = payload?.output?.some((item) => item.content?.some((content) => content.type === "refusal"));
    if (refused) throw new VisualConditionProviderError("SAFETY_FILTERED", "Kuva suodatettiin turvallisuussyistä.");
    const text = outputText(payload);
    if (!text) throw new VisualConditionProviderError("IMAGE_ANALYSIS_FAILED", "Kuvantulkinta ei palauttanut havaintoja.");
    const parsed = JSON.parse(text) as unknown;
    if (!isResult(parsed)) throw new VisualConditionProviderError("IMAGE_ANALYSIS_FAILED", "Kuvantulkinnan vastaus ei vastannut tietomallia.");
    return parsed;
  }
}
