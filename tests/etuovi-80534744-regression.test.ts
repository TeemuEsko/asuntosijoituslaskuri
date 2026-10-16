import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { prepareListingAnalysis } from "../src/core/analysis/prepare-listing-analysis.ts";
import { automaticValues } from "../src/core/analysis/requirements.ts";
import { acquireListing, clearListingAcquisitionCache } from "../src/core/listing-acquisition/acquire-listing.ts";
import type { ListingAcquisitionResult } from "../src/core/listing-acquisition/types.ts";
import { clearRentBenchmarkCache } from "../src/core/rent-data/statistics-finland.ts";
import { allowListingIdentifyAttempt, clearListingIdentifyFallbackRateLimit } from "../src/server/access/listing-identify-rate-limit.ts";
import { handleListingIdentify } from "../src/server/listing-identify/handler.ts";

const listingUrl = "https://www.etuovi.com/kohde/80534744?haku=M2617109905";
const fixtureUrl = new URL("./fixtures/etuovi-80534744.html", import.meta.url);
const jsonResponse = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

async function fixtureAcquisition(htmlOverride?: string): Promise<ListingAcquisitionResult> {
  clearListingAcquisitionCache();
  const html = htmlOverride ?? await readFile(fixtureUrl, "utf8");
  return acquireListing(listingUrl, {
    skipDnsCheck: true,
    fetchImpl: async () => new Response(html, { status: 200, headers: { "Content-Type": "text/html" } }),
    browserProvider: null,
    forceRefresh: true,
  });
}

function request(): Request {
  return new Request("https://asuntosijoituslaskuri.fi/api/listing-identify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://asuntosijoituslaskuri.fi",
      Host: "asuntosijoituslaskuri.fi",
      "X-Forwarded-For": "203.0.113.10",
    },
    body: JSON.stringify({ value: listingUrl }),
  });
}

function rentMetadata() {
  return { title: "Vuokraindeksi (2025=100) ja keskineliövuokrat muuttujina", variables: [
    { code: "rahoitus", text: "Vuokra-asunnon rahoitusmuoto", values: ["1"], valueTexts: ["Vapaarahoitteinen"] },
    { code: "huoneluku", text: "Huoneluku", values: ["3"], valueTexts: ["Kolmiot+"] },
    { code: "alue", text: "Alue", values: ["P65100", "905"], valueTexts: ["65100 Vaasa", "Vaasa"] },
    { code: "timeperiod_q", text: "Vuosineljännes", values: ["2026Q3"], valueTexts: ["2026Q3"], time: true },
    { code: "contentscode", text: "Tiedot", values: ["rent", "count"], valueTexts: ["Asuntojen keskineliövuokra (eur/m2)", "Asuntojen keskineliövuokralaskennan lukumäärä"] },
  ] };
}

test("Etuovi 80534744: HTTP 200 -vastaus tunnistuu eikä hoitovastike estä kohdetta", async () => {
  const result = await fixtureAcquisition();
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const values = automaticValues(result.result);
  assert.equal(result.diagnostics.fetchStatus, 200);
  assert.equal(result.diagnostics.acquisitionMethod, "static");
  assert.equal(values.listingId, "80534744");
  assert.equal(values.address, "Korsholmanpuistikko 15 As");
  assert.equal(values.areaSqm, 94.5);
  assert.equal(values.debtFreePrice, 199_000);
  assert.equal(values.maintenanceFeeMonthly, 321.3);
});

test("tunnistus-API palauttaa kohteen, vaikka pysyvä rate limit ja funnel-tallennus eivät ole käytettävissä", async () => {
  clearListingIdentifyFallbackRateLimit();
  const errors: unknown[] = [];
  const response = await handleListingIdentify(request(), {
    acquireListing: () => fixtureAcquisition(),
    allowAttempt: (currentRequest) => allowListingIdentifyAttempt({
      request: currentRequest,
      repository: { async allowAttempt() { throw new Error("DATABASE_URL_MISSING"); } },
      secret: undefined,
      now: 1_000,
      logger: { error: (...args: unknown[]) => errors.push(args) },
    }),
    async recordFunnelEvent() { throw new Error("FUNNEL_UNAVAILABLE"); },
    logger: { error: (...args: unknown[]) => errors.push(args) },
  });
  const payload = await response.json() as { preview?: { address?: string; areaSqm?: number; debtFreePrice?: number } };
  assert.equal(response.status, 200);
  assert.equal(payload.preview?.address, "Korsholmanpuistikko 15 As");
  assert.equal(payload.preview?.areaSqm, 94.5);
  assert.equal(payload.preview?.debtFreePrice, 199_000);
  assert.equal(errors.length, 1);
});

test("onnistunutta parseritulosta ei hylätä funnel-tapahtuman tallennusvirheen vuoksi", async () => {
  const errors: unknown[] = [];
  const response = await handleListingIdentify(request(), {
    acquireListing: () => fixtureAcquisition(),
    async allowAttempt() { return { allowed: true, persistent: true }; },
    async recordFunnelEvent() { throw new Error("FUNNEL_UNAVAILABLE"); },
    logger: { error: (...args: unknown[]) => errors.push(args) },
  });
  assert.equal(response.status, 200);
  assert.equal(errors.length, 1);
  assert.match(JSON.stringify(errors[0]), /funnel_event/);
});

test("yksittäisen hoitovastikekentän puuttuminen ei estä tunnistamista", async () => {
  const html = (await readFile(fixtureUrl, "utf8"))
    .replace(/\s*<dt>Hoitovastike<\/dt><dd>321,30 € \/ kk<\/dd>/, "")
    .replace(/\s*\{\"periodicCharge\":\"HOUSING_COMPANY_MAINTENANCE_CHARGE\"[^}]+\},?/, "");
  const result = await fixtureAcquisition(html);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.result.findings.some((finding) => finding.field === "address"), true);
    assert.equal(result.result.findings.some((finding) => finding.field === "maintenanceFeeMonthly"), false);
  }
});

test("URL → tunnistus → vuokra-arvio → analyysi toimii kohteen 80534744 vastausdatalla", async () => {
  clearRentBenchmarkCache();
  const acquisition = await fixtureAcquisition();
  assert.equal(acquisition.ok, true);
  if (!acquisition.ok) return;
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) =>
    init?.method === "POST" ? jsonResponse({ value: [12.5, 80] }) : jsonResponse(rentMetadata())) as typeof fetch;
  const prepared = await prepareListingAnalysis(acquisition.result, { fetcher });
  assert.equal(prepared.rentEstimate?.effectiveMonthlyRent, 1180);
  assert.equal(prepared.preparation?.nextStep, "analysis");
  assert.equal(prepared.preparation?.allAutomaticEnrichmentsCompleted, true);
});
