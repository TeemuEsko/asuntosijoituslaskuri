import assert from "node:assert/strict";
import test from "node:test";
import { clearMarketEvidenceCache, fetchStatisticsFinlandMarketEvidence, STATFIN_POPULATION_DATASET_ID, STATFIN_TRANSACTIONS_DATASET_ID } from "../src/core/market-assessment/statistics-finland.ts";

const populationMetadata = { title: "Tunnuslukuja väestöstä muuttujina Alue, Tiedot ja Vuosi", variables: [
  { code: "area", text: "Alue", values: ["KU905"], valueTexts: ["Vaasa"] },
  { code: "content", text: "Tiedot", values: ["change"], valueTexts: ["Väkiluvun muutos, %"] },
  { code: "time", text: "Vuosi", values: ["2024", "2025"], valueTexts: ["2024", "2025"], time: true },
] };
const transactionMetadata = { title: "Vanhojen osakeasuntojen neliöhinnat ja kauppojen lukumäärät kunnittain, vuosittain muuttujina Vuosi, Kunta, Talotyyppi ja Tiedot", variables: [
  { code: "time", text: "Vuosi", values: ["2024", "2025"], valueTexts: ["2024", "2025"], time: true },
  { code: "area", text: "Kunta", values: ["905"], valueTexts: ["Vaasa"] },
  { code: "type", text: "Talotyyppi", values: ["0", "1", "3"], valueTexts: ["Talotyypit yhteensä", "Rivitalot", "Kerrostalot"] },
  { code: "content", text: "Tiedot", values: ["price", "count"], valueTexts: ["Neliöhinta (EUR/m2)", "Kauppojen lukumäärä, varainsiirtoverotiedot vuodesta 2020 alkaen"] },
] };

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("StatFin-markkinadata käyttää todennettuja 11ra- ja 13mx-tauluja sekä uusinta havaintovuotta", async () => {
  clearMarketEvidenceCache();
  const queries: Array<{ url: string; body?: string }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); queries.push({ url, body: init?.body as string | undefined });
    if (!init?.method) return response(url.includes("11ra") ? populationMetadata : transactionMetadata);
    return response({ value: [url.includes("11ra") ? 0.6 : 87] });
  }) as typeof fetch;
  const result = await fetchStatisticsFinlandMarketEvidence({ municipality: "Vaasa", buildingType: "apartment", fetcher, now: Date.UTC(2026, 9, 16) });
  assert.equal(result.populationChangePercent, 0.6);
  assert.equal(result.realisedTransactions, 87);
  assert.equal(result.populationEvidence?.datasetId, STATFIN_POPULATION_DATASET_ID);
  assert.equal(result.transactionEvidence?.datasetId, STATFIN_TRANSACTIONS_DATASET_ID);
  assert.equal(result.populationEvidence?.period, "2025");
  assert.equal(result.transactionEvidence?.period, "2025");
  assert.equal(result.transactionEvidence?.areaLevel, "municipality");
  assert.equal(result.transactionEvidence?.license, "CC BY 4.0");
  const transactionQuery = JSON.parse(queries.find((item) => item.url.includes("13mx") && item.body)?.body ?? "{}") as { query: Array<{ selection: { values: string[] } }> };
  assert.equal(transactionQuery.query[2]?.selection.values[0], "3");
});

test("toisen StatFin-taulun virhe ei estä käyttökelpoisen lähteen palauttamista", async () => {
  clearMarketEvidenceCache();
  let transactionAttempts = 0;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("13mx")) { transactionAttempts += 1; return response({}, 503); }
    return !init?.method ? response(populationMetadata) : response({ value: [-0.2] });
  }) as typeof fetch;
  const result = await fetchStatisticsFinlandMarketEvidence({ municipality: "Vaasa", fetcher, now: 1_000 });
  assert.equal(result.populationChangePercent, -0.2);
  assert.equal(result.realisedTransactions, undefined);
  assert.equal(transactionAttempts, 2);
});

test("tuntematon kunta ja täydellinen API-virhe tuottavat hallitun tyhjän evidenssin", async () => {
  clearMarketEvidenceCache();
  const fetcher = (async () => response({}, 503)) as typeof fetch;
  assert.deepEqual(await fetchStatisticsFinlandMarketEvidence({ municipality: "Tuntematon", fetcher, now: 2_000 }), {});
  assert.deepEqual(await fetchStatisticsFinlandMarketEvidence({ municipality: undefined, fetcher, now: 3_000 }), {});
});
