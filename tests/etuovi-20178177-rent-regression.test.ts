import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateInvestmentAnalysis } from "../src/core/calculations/investment-analysis.ts";
import { validateRentEstimate } from "../src/core/financial-sanity-checks/rent.ts";
import { automaticValues } from "../src/core/analysis/requirements.ts";
import { extractStructuredValues, parserInputFromHtml } from "../src/core/listing-acquisition/html-extraction.ts";
import { mapLegacyFieldsToCanonical, parseLegacyListingHtml } from "../src/core/listing-acquisition/legacy-listing-parser.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";
import { prepareListingAnalysis } from "../src/core/analysis/prepare-listing-analysis.ts";
import { parseStrictMonthlyRentCandidate } from "../src/core/rent-data/rent-candidate-parser.ts";
import { resolveEffectiveRent } from "../src/core/rent-data/rent-estimation.ts";
import { clearRentBenchmarkCache } from "../src/core/rent-data/statistics-finland.ts";

const fixtureUrl = new URL("./fixtures/etuovi-20178177.html", import.meta.url);
const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
const metadata = { title: "Vuokraindeksi (2025=100) ja keskineliövuokrat muuttujina", variables: [
  { code: "finance", text: "Vuokra-asunnon rahoitusmuoto", values: ["SSS", "1", "2"], valueTexts: ["Yhteensä", "Vapaarahoitteinen", "Valtion tukema"] },
  { code: "rooms", text: "Huoneluku", values: ["SSS", "1", "2", "3"], valueTexts: ["Yhteensä", "Yksiöt", "Kaksiot", "Kolmiot+"] },
  { code: "area", text: "Alue", values: ["MK15", "905"], valueTexts: ["MK15 Pohjanmaa", "Vaasa"] },
  { code: "time", text: "Vuosineljännes", values: ["2026Q2"], valueTexts: ["2026Q2"], time: true },
  { code: "contents", text: "Tiedot", values: ["rent", "count"], valueTexts: ["Asuntojen keskineliövuokra (eur/m2)", "Asuntojen keskineliövuokralaskennan lukumäärä"] },
] };

async function parseFixture() {
  const html = await readFile(fixtureUrl, "utf8");
  const legacy = parseLegacyListingHtml(html, "https://www.etuovi.com/kohde/20178177");
  const structured = [...extractStructuredValues(html), ...mapLegacyFieldsToCanonical(legacy.fields)];
  return { html, legacy, parsed: parseListingText(parserInputFromHtml(html), "etuovi", structured) };
}

test("Etuovi 20178177 -fixture ei tulkitse autokatospaikkavuokraa asunnon vuokraksi", async () => {
  const { legacy, parsed } = await parseFixture();
  assert.equal(legacy.fields.rent, undefined);
  assert.equal(parsed.findings.some((finding) => finding.field === "currentRentMonthly"), false);
  assert.equal(parsed.diagnostics.rejectedCandidates.some((candidate) => candidate.field === "currentRentMonthly"), false);
});

test("tiukka vuokraparseri hyväksyy vain yksiselitteisen kuukausivuokran", () => {
  for (const text of ["Vuokra 750 €/kk", "Nykyinen vuokra: 750 euroa kuukaudessa", "Vuokrattu 750 € / kk", "Vuokrasopimuksen mukainen vuokra 750,00 €/kk", "Vuokratuotto perustuu 750 euron kuukausivuokraan"]) {
    assert.equal(parseStrictMonthlyRentCandidate(text)?.monthlyRent, 750, text);
  }
  for (const text of ["Autokatospaikkavuokra 8 €/kk", "Autopaikan vuokra 15 €/kk", "Saunamaksu 20 €/kk", "Vesimaksu vuokralaiselta 25 €/kk", "Internetmaksu 10 €/kk", "Tontin vuokra 1 200 €/vuosi", "Neliövuokra 10,7 €/m²/kk"]) {
    assert.equal(parseStrictMonthlyRentCandidate(text), null, text);
    assert.equal(parseListingText(text).findings.some((finding) => finding.field === "currentRentMonthly"), false, text);
  }
  assert.equal(parseStrictMonthlyRentCandidate("Autopaikan vuokra 15 €/kk. Vuokra 750 €/kk")?.monthlyRent, 750);
  assert.equal(parseStrictMonthlyRentCandidate("Neliövuokra 10,7 €/m²/kk. Nykyinen vuokra 750 €/kk")?.monthlyRent, 750);
});

test("vuokran järkevyystarkistus erottaa kuukausi- ja neliövuokran sekä poikkeaman", () => {
  assert.equal(validateRentEstimate({ monthlyRent: 8, areaSqm: 91, benchmarkRentPerSquareMeter: 10.7, source: "listing", context: "ambiguous", unit: "€/kk" }).status, "invalid");
  assert.equal(validateRentEstimate({ monthlyRent: 750, areaSqm: 91, benchmarkRentPerSquareMeter: 10.7, source: "listing", context: "listing_explicit", unit: "€/kk" }).valid, true);
  const strongLease = validateRentEstimate({ monthlyRent: 500, areaSqm: 50, benchmarkMonthlyRent: 1_000, source: "lease", context: "lease", unit: "€/kk" });
  assert.equal(strongLease.valid, true);
  assert.equal(strongLease.status, "warning");
  assert.equal(validateRentEstimate({ monthlyRent: 750, rentPerSquareMeter: 75, source: "listing", context: "listing_explicit", unit: "€/kk" }).status, "invalid");
  assert.equal(validateRentEstimate({ monthlyRent: 750, source: "listing", context: "listing_explicit", unit: "€/m²/kk" }).status, "invalid");
  for (const monthlyRent of [0, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(validateRentEstimate({ monthlyRent, source: "listing", context: "ambiguous", unit: "€/kk" }).status, "invalid");
  assert.equal(validateRentEstimate({ monthlyRent: 750, rentPerSquareMeter: 0.08, source: "listing", context: "listing_explicit", unit: "€/kk" }).status, "invalid");
  assert.equal(validateRentEstimate({ monthlyRent: null, rentPerSquareMeter: 10.7, areaSqm: null, source: "statistics_finland", unit: "€/kk" }).status, "invalid");
});

test("resolver hylkää heikon 8 euron löydöksen ja valitsee alueellisen vertailun", () => {
  const statistics = { effectiveMonthlyRent: 975, exactEstimatedMonthlyRent: 973.7, rentPerSquareMeter: 10.7, benchmarkRentPerSquareMeter: 10.7, source: "statistics_finland" as const, confidence: "medium" as const, userOverridden: false };
  const resolved = resolveEffectiveRent({ listingRent: 8, listingRentContext: "ambiguous", listingRentUnit: "€/kk", areaSqm: 91, statisticsEstimate: statistics });
  assert.equal(resolved.effectiveRent, 975);
  assert.equal(resolved.estimate.source, "statistics_finland");
  assert.equal(resolved.estimate.confidence, "medium");
  assert.equal(resolved.estimate.listingMonthlyRent, null);
  assert.equal(resolved.estimate.automaticMonthlyRentEstimate, 975);
  assert.equal(resolved.estimate.benchmarkRentPerSquareMeter, 10.7);
  assert.equal(resolved.estimate.validationStatus, "warning");
  assert.ok(resolved.estimate.validationWarnings?.some((warning) => warning.id === "invalid-listing-rent" && warning.fallbackUsed === "statistics_finland"));
  assert.match(resolved.estimate.warning ?? "", /alueellista markkinavuokra-arviota/);
  const withoutListingRent = resolveEffectiveRent({ listingRent: null, areaSqm: 91, statisticsEstimate: statistics });
  assert.equal(withoutListingRent.effectiveRent, 975);
  assert.equal(withoutListingRent.estimate.source, "statistics_finland");
});

test("koko 20178177-fixtureketju tuottaa 975 €/kk ja laskenta käyttää effectiveMonthlyRent-arvoa", async () => {
  clearRentBenchmarkCache();
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => init?.method === "POST" ? response({ value: [10.7, 357] }) : response(metadata)) as typeof fetch;
  const prepared = await prepareListingAnalysis((await parseFixture()).parsed, { fetcher });
  const values = automaticValues(prepared);
  assert.equal(prepared.rentEstimate?.rentPerSquareMeter, 10.7);
  assert.equal(prepared.rentEstimate?.exactEstimatedMonthlyRent, 973.7);
  assert.equal(prepared.rentEstimate?.effectiveMonthlyRent, 975);
  assert.equal(prepared.rentEstimate?.source, "statistics_finland");
  assert.equal(prepared.rentEstimate?.confidence, "medium");
  assert.equal(values.currentRentMonthly, 975);
  assert.notEqual(values.currentRentMonthly, 8);
  const analysis = calculateInvestmentAnalysis({ debtFreePrice: 145_000, monthlyRent: prepared.rentEstimate?.effectiveMonthlyRent ?? undefined, maintenanceFeeMonthly: 360, financingFeeMonthly: 0, vacancyMonths: 1 });
  assert.equal(analysis.effectiveAnnualRent, 10_725);
  assert.ok((analysis.grossRentalYield ?? 0) > 7);
});

test("vuokran UI näyttää resolverin lähteen ja estää vertailun samaan arvoon", async () => {
  const assumptions = await readFile(new URL("../src/components/property/assumptions-card.tsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../src/components/property/property-workspace.tsx", import.meta.url), "utf8");
  const listingImport = await readFile(new URL("../src/components/property/listing-import.tsx", import.meta.url), "utf8");
  assert.match(assumptions, /Tilastokeskuksen arvio/);
  assert.match(assumptions, /benchmark\.effectiveMonthlyRent !== estimate\.effectiveMonthlyRent/);
  assert.match(workspace, /currentRentMonthly: effectiveRent/);
  assert.match(listingImport, /values\.currentRentMonthly = result\.rentEstimate\.effectiveMonthlyRent/);
});
