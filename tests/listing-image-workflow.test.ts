import assert from "node:assert/strict";
import test from "node:test";
import { analyseListingImages } from "../src/server/listing-images/analyse-listing-images.ts";
import type { VisualImageAiResult } from "../src/core/visual-condition/provider.ts";
import { visualConditionScoreImpact } from "../src/core/visual-condition/analysis.ts";

function png(width = 1200, height = 800): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

const aiResult: VisualImageAiResult = { room: "living_room", visibleSurfaces: ["lattia", "seinät"], imageQuality: "high", assessability: "good", qualityReason: "Kuva on tarkka.", unassessableReason: "", observations: [{ area: "floor", type: "positive_condition", severity: "info", summary: "Lattia näyttää siistiltä", details: "Kuvassa näkyvä lattiapinta vaikuttaa ehjältä.", confidence: "high", requiresProfessionalInspection: false }] };
const html = `<html><head><meta property="og:image" content="https://images.etuovi.com/1/living.jpg"></head><body><img src="https://images.etuovi.com/1/kitchen.jpg" alt="Keittiö" width="1200" height="800"></body></html>`;

test("URL-työnkulku analysoi poimitut kuvat kanoniseen malliin ilman URL-osoitteita", async () => {
  const result = await analyseListingImages({ html, pageUrl: "https://www.etuovi.com/kohde/1", source: "etuovi", areaSqm: 60, expectedRooms: 2, provider: { analyzeImage: async () => aiResult }, resolveHost: async () => [{ address: "203.0.113.10" }], fetchImpl: async () => new Response(png().buffer as ArrayBuffer, { headers: { "content-type": "image/png" } }), now: () => "2026-07-30T12:00:00.000Z" });
  assert.equal(result.status.status, "completed");
  assert.equal(result.status.analyzedImageCount, 2);
  assert.equal(result.visualCondition?.source, "listing_session");
  assert.equal(result.visualCondition?.confirmationStatus, "automatic");
  assert.equal(visualConditionScoreImpact(result.visualCondition), 1);
  assert.equal(result.visualCondition?.images[0]?.fileName, "Ilmoituksen kuva 1");
  assert.equal(result.visualCondition?.images[0]?.source, "listing");
  assert.equal(result.visualCondition?.images[0]?.sourceIndex, 0);
  assert.equal(result.visualCondition?.images[0]?.analyzedAt, "2026-07-30T12:00:00.000Z");
  assert.doesNotMatch(JSON.stringify(result), /images\.etuovi\.com|https?:\/\//);
});

test("kuva-analyysin puuttuminen ei estä muuta URL-analyysiä", async () => {
  const result = await analyseListingImages({ html: "<html><body>Ei kuvia</body></html>", pageUrl: "https://www.etuovi.com/kohde/2", source: "etuovi" });
  assert.equal(result.status.status, "unavailable");
  assert.deepEqual(result.status.errorCodes, ["LISTING_IMAGES_NOT_FOUND"]);
  assert.equal(result.visualCondition, undefined);
});

test("osa epäonnistuvista kuvista tuottaa osittaisen mutta käyttökelpoisen tuloksen", async () => {
  let calls = 0;
  const result = await analyseListingImages({ html, pageUrl: "https://www.etuovi.com/kohde/3", source: "etuovi", provider: { analyzeImage: async () => aiResult }, resolveHost: async () => [{ address: "203.0.113.10" }], fetchImpl: async () => { calls += 1; return calls === 1 ? new Response(png().buffer as ArrayBuffer, { headers: { "content-type": "image/png" } }) : new Response(null, { status: 403 }); } });
  assert.equal(result.status.status, "partial");
  assert.equal(result.status.analyzedImageCount, 1);
  assert.ok(result.status.errorCodes.includes("LISTING_IMAGE_ACCESS_DENIED"));
});
