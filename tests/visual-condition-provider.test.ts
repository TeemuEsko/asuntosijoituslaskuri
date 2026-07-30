import test from "node:test";
import assert from "node:assert/strict";
import { OpenAiVisualConditionProvider, VisualConditionProviderError } from "../src/server/visual-condition/openai-vision-provider.ts";

const aiResult = { room: "living_room", visibleSurfaces: ["lattia"], imageQuality: "high", assessability: "good", qualityReason: "Tarkka kuva", unassessableReason: "", observations: [{ area: "floor", type: "wear", severity: "low", summary: "Kulumaa", details: "Lattiassa näkyy vähäistä kulumaa.", confidence: "high", requiresProfessionalInspection: false }] };

test("kuvantulkintapalvelu lähettää käyttäjän kuvan ilman palvelintallennusta ja lukee rakenteisen vastauksen", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const provider = new OpenAiVisualConditionProvider({ apiKey: "test-key", model: "test-model", fetchImpl: async (_url, init) => { requestBody = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ output_text: JSON.stringify(aiResult) }), { status: 200, headers: { "content-type": "application/json" } }); } });
  const result = await provider.analyzeImage({ bytes: new Uint8Array([1, 2, 3]), mediaType: "image/jpeg", fileName: "olohuone.jpg" });
  assert.equal(result.room, "living_room"); assert.equal(requestBody?.store, false); assert.equal(requestBody?.model, "test-model"); assert.match(JSON.stringify(requestBody), /data:image\/jpeg;base64/); assert.match(JSON.stringify(requestBody), /Älä tunnista henkilöitä/);
});

test("palvelun aikakatkaisu palauttaa täsmällisen virhekoodin", async () => {
  const provider = new OpenAiVisualConditionProvider({ apiKey: "test", fetchImpl: async () => { throw new DOMException("timeout", "TimeoutError"); } });
  await assert.rejects(() => provider.analyzeImage({ bytes: new Uint8Array([1]), mediaType: "image/png", fileName: "kuva.png" }), (error) => error instanceof VisualConditionProviderError && error.code === "TIMEOUT");
});

