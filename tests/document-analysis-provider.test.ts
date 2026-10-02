import assert from "node:assert/strict";
import test from "node:test";

import { SCANNED_DOCUMENT_MESSAGE } from "../src/core/documents/messages.ts";
import { parseDeterministicDocument } from "../src/server/documents/deterministic-document-parser.ts";
import { extractLocalDocumentText, LocalDocumentError } from "../src/server/documents/local-document-text.ts";
import { minimalTextPdf } from "./helpers/minimal-pdf.ts";

const acceptedCases = [
  ["hoitovastike samalla rivillä", "Hoitovastike: 263,20 €/kk"],
  ["hoitovastike seuraavalla rivillä", "Hoitovastike\n263,20 euroa / kk"],
  ["hoitovastike piste-desimaalilla", "Hoitovastike: 263.20 € / kk"],
  ["hoitovastike nimetyn kentän euroarvona", "Hoitovastike: 250 €"],
  ["rahoitusvastike", "Rahoitusvastike: 101,10 €/kk"],
  ["pääomavastike", "Pääomavastike A: 45 e / kk"],
  ["yhtiövastike yhteensä", "Yhtiövastike yhteensä: 364,30 €/kk"],
  ["vastikkeet yhteensä", "Vastikkeet yhteensä\n400 euroa kuukaudessa"],
  ["velkaosuus", "Velkaosuus: 12 450,60 €"],
  ["huoneistokohtainen lainaosuus", "Huoneistokohtainen lainaosuus\n8 000 euroa"],
  ["osuus yhtiön lainoista", "Osuus yhtiön lainoista: 9.500 €"],
  ["pinta-ala", "Pinta-ala: 61,5 m²"],
  ["asuinpinta-ala", "Asuinpinta-ala\n42 m2"],
  ["rakennusvuosi", "Rakennusvuosi: 1998"],
  ["valmistumisvuosi", "Valmistumisvuosi\n2011"],
  ["huoneistoselitelmä", "Huoneistoselitelmä: 3h+k+s"],
  ["huoneet", "Huoneet\n2 huonetta ja keittiö"],
  ["oma tontti", "Tontin omistusmuoto: Oma tontti"],
  ["vuokratontti", "Tontti: Vuokratontti"],
  ["valinnainen tontti", "Omistusmuoto\nValinnainen vuokratontti"],
  ["huoneiston tunnus", "Huoneiston tunnus: A 12"],
  ["osakenumerot", "Osakenumerot: 1234-1300"],
  ["talotyyppi", "Talotyyppi: Rivitalo"],
  ["tonttivastike", "Tonttivastike: 87,50 €/kk"],
  ["tontin vuosivuokra", "Tontin vuosivuokra: 12 000 €"],
  ["lunastushinta", "Tonttiosuuden lunastushinta: 21 000 €"],
  ["lunastusajankohta", "Seuraava lunastusajankohta: 31.12.2027"],
  ["lunastuslauseke", "Yhtiöjärjestyksen lunastuslauseke: Kyllä, osakkailla"],
] as const;

const rejectedCases = [
  ["hoitovastike ilman yksikköä", "Hoitovastike: 263,20"],
  ["taloyhtiön kokonaislaina", "Taloyhtiön koko lainamäärä: 900 000 €"],
  ["yhtiön lainat yhteensä", "Yhtiön lainat yhteensä: 500 000 €"],
  ["rakennuksen pinta-ala", "Rakennuksen pinta-ala: 2 000 m²"],
  ["tontin pinta-ala", "Tontin pinta-ala: 5 000 m²"],
  ["epäkelpo vuosi", "Rakennusvuosi: tuntematon"],
  ["pelkkä huoneotsikko", "Huoneet: ei tiedossa"],
  ["pelkkä tonttiotsikko", "Tontti"],
] as const;

for (const [name, source] of acceptedCases) {
  test(`deterministinen dokumenttiparseri hyväksyy: ${name}`, () => {
    const parsed = parseDeterministicDocument({ text: source, fileName: "isannoitsijantodistus.txt", declaredKind: "manager_certificate" });
    assert.ok(parsed.relevantExcerpts.some((excerpt) => excerpt.text === source && excerpt.confidence === "high"));
    assert.equal(parsed.documentType, "manager_certificate");
  });
}

for (const [name, source] of rejectedCases) {
  test(`deterministinen dokumenttiparseri hylkää: ${name}`, () => {
    const parsed = parseDeterministicDocument({ text: source, fileName: "asiakirja.txt" });
    assert.equal(parsed.relevantExcerpts.length, 0);
  });
}

test("korjaushistoria ja tulevat korjaukset erotetaan omiksi sanatarkoiksi otteikseen", () => {
  const parsed = parseDeterministicDocument({ fileName: "isännöitsijäntodistus.txt", text: "Korjaushistoria\n2020 Vesikaton pinnoitus\n2022 Lukitus uusittu\nKunnossapitotarveselvitys\n2028 Julkisivujen kuntotutkimus" });
  assert.equal(parsed.completedRenovations[0]?.text, "2020 Vesikaton pinnoitus\n2022 Lukitus uusittu");
  assert.equal(parsed.futureRenovations[0]?.text, "2028 Julkisivujen kuntotutkimus");
});

test("paikallinen PDF-lukija palauttaa tekstikerroksen ilman verkkokutsua", async () => {
  const text = await extractLocalDocumentText({ bytes: minimalTextPdf(["Isannoitsijantodistus", "Hoitovastike: 263,20 e/kk"]), extension: ".pdf" });
  assert.match(text, /Hoitovastike: 263,20 e\/kk/);
});

test("tekstikerrokseton PDF tunnistetaan skannatuksi ilman OCR-varajärjestelmää", async () => {
  await assert.rejects(
    () => extractLocalDocumentText({ bytes: minimalTextPdf([]), extension: ".pdf" }),
    (error) => error instanceof LocalDocumentError && error.code === "SCANNED_DOCUMENT" && error.message === SCANNED_DOCUMENT_MESSAGE,
  );
});

test("rikkinäinen PDF palauttaa neutraalin paikallisen lukuvirheen", async () => {
  await assert.rejects(
    () => extractLocalDocumentText({ bytes: new TextEncoder().encode("%PDF-rikki"), extension: ".pdf" }),
    (error) => error instanceof LocalDocumentError && error.code === "DOCUMENT_ANALYSIS_FAILED" && error.message === "Asiakirjan tekstiä ei voitu lukea.",
  );
});
