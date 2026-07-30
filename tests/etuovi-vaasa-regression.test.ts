import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { automaticValues, missingAnalysisFields } from "../src/core/analysis/requirements.ts";
import { normalizeHeatingType } from "../src/core/domain/heating.ts";
import { displayListingStringValue } from "../src/core/i18n/display-values.ts";
import { extractStructuredValues, parserInputFromHtml } from "../src/core/listing-acquisition/html-extraction.ts";
import { parseListingText } from "../src/core/parser/listing-parser.ts";
import { normalizeRoomCategory } from "../src/core/rent-data/rent-estimation.ts";
import { clearRentBenchmarkCache, fetchStatisticsFinlandRentBenchmark } from "../src/core/rent-data/statistics-finland.ts";
import { prepareListingAnalysis } from "../src/core/analysis/prepare-listing-analysis.ts";

const fixtureUrl = new URL("./fixtures/etuovi-55962690.html", import.meta.url);
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

function metadata(areaValues = ["MK15", "905"], areaLabels = ["MK15 Pohjanmaa", "Vaasa"]) {
  return { title: "Vuokraindeksi (2025=100) ja keskineliövuokrat muuttujina", variables: [
    { code: "rahoitus_2_20260101", text: "Vuokra-asunnon rahoitusmuoto", values: ["SSS", "1", "2"], valueTexts: ["Yhteensä", "Vapaarahoitteinen", "Valtion tukema"] },
    { code: "huoneluku_5_20260101", text: "Huoneluku", values: ["SSS", "1", "2", "3"], valueTexts: ["Yhteensä", "Yksiöt", "Kaksiot", "Kolmiot+"] },
    { code: "alue_44_20260101", text: "Alue", values: areaValues, valueTexts: areaLabels },
    { code: "timeperiod_q", text: "Vuosineljännes", values: ["2026Q1", "2026Q2"], valueTexts: ["2026Q1", "2026Q2"], time: true },
    { code: "contentscode", text: "Tiedot", values: ["asvu_keskineliovuokra", "asvu_keskineliovuokra_lkm"], valueTexts: ["Asuntojen keskineliövuokra (eur/m2)", "Asuntojen keskineliövuokralaskennan lukumäärä"] },
  ] };
}

async function parseFixture() {
  const html = await readFile(fixtureUrl, "utf8");
  return parseListingText(parserInputFromHtml(html), "etuovi", extractStructuredValues(html));
}

test("Etuovi 55962690 normalisoi sijainnin, huonejaon ja kaukolämmön canonical arvoihin", async () => {
  const parsed = await parseFixture();
  const values = automaticValues(parsed);
  assert.equal(values.address, "Kauppapuistikko 18");
  assert.equal(values.city, "Vaasa");
  assert.equal(values.postalCode, "65100");
  assert.equal(values.district, "Keskusta");
  assert.equal(values.roomDescription, "3h + kk");
  assert.equal(normalizeRoomCategory(String(values.roomDescription)), "THREE_PLUS_ROOMS");
  assert.equal(values.areaSqm, 116);
  assert.equal(values.buildingType, "apartment");
  assert.equal(values.constructionYear, 1943);
  assert.equal(values.heatingType, "district");
  const heating = parsed.findings.find((finding) => finding.field === "heatingType");
  assert.equal(heating?.confidence, "high");
  assert.deepEqual(heating?.conflicts, []);
  assert.equal(missingAnalysisFields({ ...values, currentRentMonthly: 900 }).includes("heatingType"), false);
});

test("lämmitystavat käyttävät yhtä enumia ja keskitettyä suomenkielistä labelia", () => {
  for (const text of ["Kaukolämpö", "Lämmitystapa: Kaukolämpö", "Lämmitysmuoto: Kaukolämpö", "Fjärrvärme", "district heating"]) {
    assert.equal(normalizeHeatingType(text), "district", text);
    assert.equal(parseListingText(`Lämmitystapa: ${text}`).findings.find((finding) => finding.field === "heatingType")?.normalizedValue, "district", text);
  }
  assert.equal(displayListingStringValue("heatingType", "district"), "Kaukolämpö");
  assert.equal(displayListingStringValue("heatingType", "ground_source"), "Maalämpö");
  assert.equal(displayListingStringValue("heatingType", "electric"), "Sähkölämmitys");
  assert.equal(parseListingText("2001: Lämmitysjärjestelmä ja sähkö").findings.some((finding) => finding.field === "heatingType"), false);
});

test("3h+-luokka tunnistaa Etuoven kirjoitusasut eikä yleinen huonemäärä syrjäytä selitelmää", async () => {
  for (const value of ["3h, kk", "3h + kk", "3h+k", "3h + k", "3 huonetta", "4 huonetta", "kolmio"]) assert.equal(normalizeRoomCategory(value), "THREE_PLUS_ROOMS", value);
  const values = automaticValues(await parseFixture());
  assert.equal(values.roomDescription, "3h + kk");
});

test("postinumeroalueen julkaistu 3h+-solu muodostaa vuokran ensisijaisesti", async () => {
  clearRentBenchmarkCache();
  const requests: string[] = [];
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== "POST") return response(metadata(["P65100", "905", "MK15"], ["65100 Vaasa", "Vaasa", "MK15 Pohjanmaa"]));
    requests.push(init.body as string);
    return response({ value: [11, 50] });
  }) as typeof fetch;
  const estimate = await fetchStatisticsFinlandRentBenchmark({ municipality: "Vaasa", postalCode: "65100", roomDescription: "3h, kk", areaSqm: 116, fetcher, now: 1 });
  assert.equal(estimate.sourceAreaLevel, "postal_code");
  assert.equal(estimate.effectiveMonthlyRent, 1275);
  assert.equal(JSON.parse(requests[0]!).query[2].selection.values[0], "P65100");
});

test("salattu postinumerosolu jatkaa Vaasa + 3h+ -fallbackiin", async () => {
  clearRentBenchmarkCache();
  const areas: string[] = [];
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== "POST") return response(metadata(["P65100", "905", "MK15"], ["65100 Vaasa", "Vaasa", "MK15 Pohjanmaa"]));
    const area = JSON.parse(init.body as string).query[2].selection.values[0] as string;
    areas.push(area);
    return area === "P65100" ? response({ value: [null, null], status: ["..", null] }) : response({ value: [10.7, 357] });
  }) as typeof fetch;
  const estimate = await fetchStatisticsFinlandRentBenchmark({ municipality: "Vaasa", postalCode: "65100", roomDescription: "3h, kk", areaSqm: 116, fetcher, now: 2 });
  assert.deepEqual(areas, ["P65100", "905"]);
  assert.equal(estimate.sourceArea, "Vaasa");
  assert.equal(estimate.roomCategory, "THREE_PLUS_ROOMS");
  assert.equal(estimate.rentPerSquareMeter, 10.7);
  assert.equal(estimate.exactEstimatedMonthlyRent, 1241.2);
  assert.equal(estimate.effectiveMonthlyRent, 1240);
  assert.equal(estimate.resolutionDiagnostics?.attempts[0]?.result, "missing_or_suppressed");
  assert.equal(estimate.resolutionDiagnostics?.attempts[0]?.suppressionValue, "..");
  assert.equal(estimate.resolutionDiagnostics?.attempts[1]?.result, "success");
});

test("koko Etuovi-fixturen valmisteluketju käyttää Vaasan vuokraa ennen missing fields -päätöstä", async () => {
  clearRentBenchmarkCache();
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => init?.method === "POST" ? response({ value: [10.7, 357] }) : response(metadata())) as typeof fetch;
  const prepared = await prepareListingAnalysis(await parseFixture(), { fetcher });
  assert.equal(prepared.rentEstimate?.effectiveMonthlyRent, 1240);
  assert.equal(prepared.rentEstimate?.source, "statistics_finland");
  assert.equal(prepared.rentEstimate?.sourceArea, "Vaasa");
  assert.equal(prepared.rentEstimate?.sourceAreaLevel, "municipality");
  assert.equal(prepared.rentEstimate?.postalCode, "65100");
  assert.equal(prepared.rentEstimate?.roomCategory, "THREE_PLUS_ROOMS");
  assert.equal(prepared.preparation?.missingCriticalFields.includes("heatingType"), false);
  assert.equal(prepared.preparation?.missingCriticalFields.includes("currentRentMonthly"), false);
  assert.equal(prepared.preparation?.nextStep, "analysis");
});

test("UI käyttää lokalisoitua lämmitysarvoa ja näyttää vuokrayksikön vain suffixina", async () => {
  const review = await readFile(new URL("../src/components/property/import-source-review.tsx", import.meta.url), "utf8");
  const listingImport = await readFile(new URL("../src/components/property/listing-import.tsx", import.meta.url), "utf8");
  const details = await readFile(new URL("../src/components/property/details-cards.tsx", import.meta.url), "utf8");
  assert.match(review, /displayListingStringValue\(finding\.field, finding\.normalizedValue\)/);
  assert.doesNotMatch(review, />\{String\(finding\.normalizedValue\)\}<\/p>/);
  assert.match(listingImport, /right-3 flex items-center[^>]*>€\/kk<\/span>/);
  assert.doesNotMatch(listingImport, />€ \/ kk<\/p>/);
  assert.match(details, /displayListingStringValue\("heatingType"/);
  assert.match(details, /Lämmitysmuoto on löydetty myynti-ilmoituksesta/);
});
