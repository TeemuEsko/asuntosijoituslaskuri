import test from "node:test";
import assert from "node:assert/strict";
import { aggregateVisualCondition, compareVisualConditionWithListing, confirmVisualCondition, normalizeVisualRoom, sanitizeVisualObservationText, updateVisualObservation, visualConditionScoreImpact } from "../src/core/visual-condition/analysis.ts";
import { validateVisualImageBatch, VISUAL_IMAGE_LIMITS } from "../src/core/visual-condition/validation.ts";
import { visualConditionAcceptanceFixtures, visualConditionScenarios } from "./fixtures/visual-condition-fixtures.ts";
import type { VisualConditionImageAssessment, VisualConditionObservation } from "../src/core/visual-condition/types.ts";

function aggregate(scenario: { images: readonly VisualConditionImageAssessment[]; observations: readonly VisualConditionObservation[] }, expectedRooms = 4) {
  return aggregateVisualCondition({ images: [...scenario.images], observations: [...scenario.observations], imageCount: scenario.images.length, areaSqm: 60, expectedRooms, sourceDisclaimerAccepted: true, generatedAt: "2026-07-30T10:00:00.000Z" });
}

test("1: ilman kuvia analyysiä ei muodosteta", () => {
  assert.equal(validateVisualImageBatch([]), "NO_IMAGES");
  const result = aggregateVisualCondition({ images: [], observations: [], imageCount: 0, sourceDisclaimerAccepted: true });
  assert.equal(result.status, "failed"); assert.equal(result.visualConditionScore, null); assert.equal(result.overallRating, "unknown");
});

test("2: yksi selkeä olohuonekuva tuottaa rajatun kattavuuden", () => {
  const result = aggregate(visualConditionScenarios.clearLivingRoom);
  assert.equal(result.status, "completed"); assert.equal(result.apartmentVisualCondition.assessedRooms[0], "living_room"); assert.ok(result.coverage > 0 && result.coverage < 70); assert.equal(result.renovationScope, "none");
});

test("3: usea huone kasvattaa kattavuutta ja säilyttää havainnot", () => {
  const result = aggregate(visualConditionScenarios.multipleRooms);
  assert.equal(result.analyzedImageCount, 3); assert.equal(result.observations.length, 2); assert.ok(result.coverage > aggregate(visualConditionScenarios.clearLivingRoom).coverage); assert.equal(result.renovationScope, "moderate");
});

test("4: vanhanaikainen mutta käyttökelpoinen keittiö ei luo märkätiläpäätelmää", () => {
  const result = aggregate(visualConditionScenarios.outdatedKitchen);
  assert.equal(result.renovationScope, "minor"); assert.equal(result.observations[0]?.type, "outdatedness"); assert.doesNotMatch(JSON.stringify(result), /märkätiläremontti on tarpeen/i);
});

test("5: kylpyhuoneen näkyvä riskihavainto vaatii tarkistuksen mutta ei diagnosoi kosteutta", () => {
  const result = aggregate(visualConditionScenarios.bathroomRisk);
  assert.equal(result.renovationScope, "major"); assert.equal(result.observations[0]?.requiresProfessionalInspection, true);
  const safe = sanitizeVisualObservationText("Tässä on kosteusvaurio", "possible_moisture_indicator");
  assert.match(safe, /syytä ei voida varmistaa kuvasta/i); assert.doesNotMatch(safe, /^Kosteusvaurio/i);
});

test("6: hämärä kuva laskee varmuutta eikä muuta sijoituspistettä", () => {
  const result = confirmVisualCondition(aggregate(visualConditionScenarios.lowLight));
  assert.ok(["low", "unknown"].includes(result.overallConfidence)); assert.equal(visualConditionScoreImpact(result), 0);
});

test("7: saman huoneen duplikaattikuvat eivät kasvata huonekattavuutta", () => {
  const result = aggregate(visualConditionScenarios.duplicateRoom, 4);
  assert.deepEqual(result.apartmentVisualCondition.assessedRooms, ["living_room"]); assert.ok(result.coverage < 70);
});

test("8: julkisivukuva ei muutu huoneiston kuntotiedoksi", () => {
  const result = aggregate(visualConditionScenarios.facadeOnly);
  assert.equal(result.apartmentVisualCondition.visualConditionScore, null); assert.equal(result.buildingVisualCondition.assessedRooms[0], "facade");
});

test("käyttäjän muokkaus voittaa ja alkuperäinen AI-havainto säilyy historiassa", () => {
  const original = aggregate(visualConditionScenarios.multipleRooms);
  const changed = updateVisualObservation(original, "floor", { details: "Käyttäjä tarkisti pinnan paikan päällä.", severity: "info" }, 60);
  const observation = changed.observations.find((item) => item.id === "floor")!;
  assert.equal(observation.source, "user_confirmed"); assert.equal(observation.status, "edited"); assert.equal(observation.userConfirmed, true); assert.equal(observation.userEdited, true); assert.match(observation.originalAiObservation ?? "", /käytön jälkeä/); assert.equal(observation.sourceHistory.length, 2);
});

test("tilaluokan normalisointi tukee suomen- ja englanninkielisiä nimiä pakottamatta epäselvää luokkaa", () => {
  assert.equal(normalizeVisualRoom("Olohuone"), "living_room"); assert.equal(normalizeVisualRoom("technical-room"), "technical_room"); assert.equal(normalizeVisualRoom("autokatos"), "garage"); assert.equal(normalizeVisualRoom("epäselvä näkymä"), "unknown");
});

test("ilmoitustekstin kuntoluokitus yhdistetään kuviin varovaisena tukena tai ristiriitana", () => {
  const good = aggregate(visualConditionAcceptanceFixtures.renovatedApartment, 3);
  assert.equal(compareVisualConditionWithListing("Hyvä", good)?.status, "supports");
  const extensive = aggregate(visualConditionAcceptanceFixtures.extensiveRenovation, 4);
  const conflict = compareVisualConditionWithListing("Hyvä", extensive);
  assert.equal(conflict?.status, "conflict"); assert.match(conflict?.message ?? "", /tarkistettava paikan päällä/);
  const low = aggregate(visualConditionAcceptanceFixtures.unclearBathroom, 1);
  assert.equal(compareVisualConditionWithListing("Hyvä", low)?.status, "not_comparable");
});

test("kahdeksan hyväksymisfixtureä kattavat remontoidun, vanhan, laajan, epäselvän, kosteus-, ulko-, heikkolaatuisen ja kuvattoman tilanteen", () => {
  const renovated = aggregate(visualConditionAcceptanceFixtures.renovatedApartment, 3); assert.ok(["good", "excellent"].includes(renovated.overallRating));
  const old = aggregate(visualConditionAcceptanceFixtures.oldButCleanApartment, 3); assert.equal(old.overallRating, "fair"); assert.equal(old.renovationScope, "moderate");
  const extensive = aggregate(visualConditionAcceptanceFixtures.extensiveRenovation, 4); assert.ok(["poor", "very_poor"].includes(extensive.overallRating)); assert.equal(extensive.renovationScope, "extensive");
  const unclear = aggregate(visualConditionAcceptanceFixtures.unclearBathroom, 1); assert.equal(unclear.overallConfidence, "low"); assert.equal(unclear.observations[0]?.requiresProfessionalInspection, true); assert.equal(unclear.status, "partial");
  assert.equal(aggregate(visualConditionAcceptanceFixtures.possibleMoistureMark, 1).observations[0]?.type, "possible_moisture_indicator");
  assert.equal(aggregate(visualConditionAcceptanceFixtures.exteriorOnly, 1).apartmentVisualCondition.visualConditionScore, null);
  assert.equal(aggregate(visualConditionAcceptanceFixtures.lowQualityImages, 1).status, "partial");
  assert.equal(aggregateVisualCondition({ ...visualConditionAcceptanceFixtures.noImages, images: [], observations: [], imageCount: 0, sourceDisclaimerAccepted: true }).status, "failed");
});

test("kuvien rajat validoidaan ennen palvelupyyntöä", () => {
  assert.equal(validateVisualImageBatch([{ type: "image/gif", size: 100 }]), "UNSUPPORTED_FORMAT");
  assert.equal(validateVisualImageBatch([{ type: "image/jpeg", size: 100, width: 200, height: 200 }]), "IMAGE_TOO_SMALL");
  assert.equal(validateVisualImageBatch(Array.from({ length: VISUAL_IMAGE_LIMITS.maxCount + 1 }, () => ({ type: "image/jpeg", size: 100 }))), "IMAGE_TOO_LARGE");
});
