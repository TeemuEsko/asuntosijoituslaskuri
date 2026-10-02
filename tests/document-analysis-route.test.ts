import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/document-analysis/route.ts";
import { SCANNED_DOCUMENT_MESSAGE } from "../src/core/documents/messages.ts";
import { minimalTextPdf } from "./helpers/minimal-pdf.ts";

function requestFor(bytes: Uint8Array, fileName = "isannoitsijantodistus.pdf", type = "application/pdf") {
  const form = new FormData();
  const contents = bytes.slice().buffer as ArrayBuffer;
  form.set("file", new File([contents], fileName, { type }));
  form.set("declaredKind", "manager_certificate");
  return new Request("http://localhost/api/document-analysis", { method: "POST", body: form });
}

test("dokumenttireitti lukee PDF:n paikallisesti ilman API-avainta tai verkkokutsua", { concurrency: false }, async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = async () => { throw new Error("Verkkokutsua ei saa tehdä"); };
  try {
    const response = await POST(requestFor(minimalTextPdf([
      "Isannoitsijantodistus",
      "Hoitovastike: 263.20 e / kk",
      "Rakennusvuosi: 2011",
    ])));
    const result = await response.json() as {
      documentType: string;
      documentKind: string | null;
      values: { maintenanceFeeMonthly?: number; constructionYear?: number };
      provenance: { maintenanceFeeMonthly?: { sourceLabel?: string; rawText?: string; source?: { kind?: string } } };
    };
    assert.equal(response.status, 200);
    assert.equal(result.documentType, "manager_certificate");
    assert.equal(result.documentKind, "manager_certificate");
    assert.equal(result.values.maintenanceFeeMonthly, 263.2);
    assert.equal(result.values.constructionYear, 2011);
    assert.equal(result.provenance.maintenanceFeeMonthly?.source?.kind, "document");
    assert.equal(result.provenance.maintenanceFeeMonthly?.sourceLabel, "Isännöitsijäntodistus");
    assert.match(result.provenance.maintenanceFeeMonthly?.rawText ?? "", /263\.20 e \/ kk/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousApiKey;
  }
});

test("skannatun PDF:n reitti palauttaa täsmällisen ohjeen ilman AI- tai OCR-varajärjestelmää", async () => {
  const response = await POST(requestFor(minimalTextPdf([]), "skannattu.pdf"));
  const result = await response.json() as { code?: string; message?: string };
  assert.equal(response.status, 422);
  assert.deepEqual(result, { code: "SCANNED_DOCUMENT", message: SCANNED_DOCUMENT_MESSAGE });
});

test("TXT-tiedosto kulkee saman deterministisen normalisointiketjun läpi", async () => {
  const bytes = new TextEncoder().encode("Isännöitsijäntodistus\nPinta-ala: 42,5 m²\nTontin omistusmuoto: Oma tontti");
  const response = await POST(requestFor(bytes, "todistus.txt", "text/plain"));
  const result = await response.json() as { values: { areaSqm?: number; landOwnership?: string } };
  assert.equal(response.status, 200);
  assert.equal(result.values.areaSqm, 42.5);
  assert.equal(result.values.landOwnership, "owned");
});

test("nimetyt vastikkeet normalisoituvat ilman kokonaisvastikkeen kaksinkertaista laskentaa", async () => {
  const bytes = new TextEncoder().encode([
    "Isännöitsijäntodistus",
    "Hoitovastike 250 €",
    "Pääomavastike 100 €",
    "Yhtiövastike yhteensä 350 €",
  ].join("\n"));
  const response = await POST(requestFor(bytes, "todistus.txt", "text/plain"));
  const result = await response.json() as {
    values: { maintenanceFeeMonthly?: number; financingFeeMonthly?: number; totalHousingCharge?: number };
    warnings: string[];
  };
  assert.equal(result.values.maintenanceFeeMonthly, 250);
  assert.equal(result.values.financingFeeMonthly, 100);
  assert.equal(result.values.totalHousingCharge, undefined);
  assert.ok(result.warnings.some((warning) => /kaksinkertaisen laskennan estämiseksi/.test(warning)));
});

test("huoneiston velkaosuus hyväksytään mutta taloyhtiön kokonaislainaa ei yhdistetä", async () => {
  const bytes = new TextEncoder().encode([
    "Isännöitsijäntodistus",
    "Huoneistokohtainen velkaosuus 12 450,60 €",
    "Taloyhtiön lainat yhteensä 1 240 000 €",
  ].join("\n"));
  const response = await POST(requestFor(bytes, "todistus.txt", "text/plain"));
  const result = await response.json() as { values: { companyLoanShare?: number } };
  assert.equal(result.values.companyLoanShare, 12_450.6);
});

test("dokumenttireitti hylkää puuttuvan tiedoston ennen analyysiä", async () => {
  const response = await POST(new Request("http://localhost/api/document-analysis", { method: "POST", body: new FormData() }));
  const result = await response.json() as { code?: string };
  assert.equal(response.status, 400);
  assert.equal(result.code, "DOCUMENT_REQUIRED");
});
