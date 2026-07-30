import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { validateVisualImage } from "@/core/visual-condition/validation";
import { OpenAiVisualConditionProvider, VisualConditionProviderError } from "@/server/visual-condition/openai-vision-provider";
import { mapVisualImageResult } from "@/server/visual-condition/map-result";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ code: "IMAGE_ACCESS_DENIED", message: "Kuvatiedostoa ei voitu lukea." }, { status: 400 }); }
  const file = form.get("image");
  const disclaimerAccepted = form.get("sourceDisclaimerAccepted") === "true";
  if (!(file instanceof File)) return NextResponse.json({ code: "NO_IMAGES", message: "Lisää vähintään yksi kuva." }, { status: 400 });
  if (!disclaimerAccepted) return NextResponse.json({ code: "IMAGE_ACCESS_DENIED", message: "Hyväksy kuvien käsittelyä koskeva rajaus." }, { status: 400 });
  const validationError = validateVisualImage({ type: file.type, size: file.size });
  if (validationError) return NextResponse.json({ code: validationError }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ code: "IMAGE_ANALYSIS_FAILED", message: "Kuvantulkintapalvelua ei ole määritetty palvelimelle." }, { status: 503 });
  const imageId = String(form.get("imageId") || randomUUID());
  try {
    const provider = new OpenAiVisualConditionProvider({ apiKey, model: process.env.VISUAL_CONDITION_MODEL });
    const result = await provider.analyzeImage({ bytes: new Uint8Array(await file.arrayBuffer()), mediaType: file.type as "image/jpeg" | "image/png" | "image/webp", fileName: file.name });
    const noAnalysableContent = result.assessability === "not_assessable" && !result.observations.length;
    const { image, observations } = mapVisualImageResult({ result, imageId, fileName: file.name });
    return NextResponse.json({ image, observations, warningCode: noAnalysableContent ? "NO_ANALYSABLE_CONTENT" : result.imageQuality === "low" ? "LOW_IMAGE_QUALITY" : null });
  } catch (error) {
    const code = error instanceof VisualConditionProviderError ? error.code : "IMAGE_ANALYSIS_FAILED";
    return NextResponse.json({ code, message: error instanceof Error ? error.message : "Kuvan analysointi epäonnistui." }, { status: code === "TIMEOUT" ? 504 : 502 });
  }
}
