import assert from "node:assert/strict";
import test from "node:test";

import { normalizeDocumentExtraction } from "../src/core/documents/normalize.ts";
import type {
  DocumentExcerpt,
  DocumentRawExtraction,
} from "../src/core/documents/types.ts";

function high(text: string): DocumentExcerpt {
  return { text, confidence: "high" };
}

function raw(
  overrides: Partial<DocumentRawExtraction> = {},
): DocumentRawExtraction {
  return {
    documentType: "manager_certificate",
    confidence: "high",
    relevantExcerpts: [],
    completedRenovations: [],
    futureRenovations: [],
    ...overrides,
  };
}

function normalize(extraction: DocumentRawExtraction) {
  return normalizeDocumentExtraction({
    extraction,
    documentId: "doc-1",
    fileName: "isannointsijantodistus.pdf",
    declaredKind: "manager_certificate",
  });
}

test("isännöitsijäntodistuksen suomalaiset vastike- ja laina-arvot normalisoituvat", () => {
  const result = normalize(
    raw({
      relevantExcerpts: [
        high("Hoitovastike: 263,20 €/kk"),
        high("Pääomavastike: 100.00 € / kk"),
        high("Yhtiövastike yhteensä: 363,20 €/kk"),
        high("Huoneistokohtainen velkaosuus: 12 450,60 €"),
        high("Taloyhtiön koko lainamäärä: 900 000 €"),
      ],
    }),
  );

  assert.equal(result.values.maintenanceFeeMonthly, 263.2);
  assert.equal(result.values.financingFeeMonthly, 100);
  assert.equal(result.values.companyLoanShare, 12_450.6);
  assert.equal(result.values.totalHousingCharge, undefined);
  assert.equal(result.sourceLabel, "Isännöitsijäntodistus");
  assert.equal(result.provenance.maintenanceFeeMonthly?.status, "document");
  assert.equal(
    result.provenance.maintenanceFeeMonthly?.rawText,
    "Hoitovastike: 263,20 €/kk",
  );
  assert.match(result.warnings.join(" "), /kokonaislainaa ei tulkittu/i);
  assert.match(result.warnings.join(" "), /kaksinkertaisen laskennan/i);
});

test("PDF-tekstin rivinvaihto kentän ja arvon välissä normalisoituu mutta alkuperäinen ote säilyy", () => {
  const result = normalize(
    raw({
      relevantExcerpts: [high("Hoitovastike\n263,20 €/kk")],
    }),
  );

  assert.equal(result.values.maintenanceFeeMonthly, 263.2);
  assert.equal(result.provenance.maintenanceFeeMonthly?.rawText, "Hoitovastike\n263,20 €/kk");
});

test("useat nimetyt rahoitusvastikkeet yhdistetään vain kerran", () => {
  const result = normalize(
    raw({
      relevantExcerpts: [
        high("Pääomavastike A: 75,50 €/kk"),
        high("Pääomavastike B: 24,50 €/kk"),
      ],
    }),
  );

  assert.equal(result.values.financingFeeMonthly, 100);
  assert.equal(
    result.fields.filter((field) => field.field === "financingFeeMonthly").length,
    1,
  );
});

test("pinta-ala, huonejako, tunnus, rakennus ja tonttitiedot normalisoituvat", () => {
  const result = normalize(
    raw({
      relevantExcerpts: [
        high("Muut kuukausittaiset maksut: 22,50 €/kk"),
        high("Pinta-ala: 75,5 m²"),
        high("Huoneistoselitelmä: 3h + k + s"),
        high("Huoneiston tunnus: A 12"),
        high("Rakennusvuosi: 2011"),
        high("Rakennustyyppi: Rivitalo"),
        high("Tontin omistusmuoto: valinnainen vuokratontti"),
        high("Tontin vuosivuokra: 18 000,00 €"),
        high("Tontin vuokrasopimus päättyy 31.12.2050"),
        high("Tonttiosuuden lunastushinta: 14 900 €"),
        high("Seuraava lunastusajankohta: 30.6.2027"),
      ],
    }),
  );

  assert.equal(result.values.otherMonthlyFees, 22.5);
  assert.equal(result.values.areaSqm, 75.5);
  assert.equal(result.values.roomDescription, "3h + k + s");
  assert.equal(result.roomConfiguration, "3h + k + s");
  assert.equal(result.roomCount, 3);
  assert.equal(result.values.apartmentIdentifier, "A 12");
  assert.equal(result.values.constructionYear, 2011);
  assert.equal(result.values.buildingType, "terraced");
  assert.equal(result.values.landOwnership, "optional_leasehold");
  assert.equal(result.values.landRentAnnual, 18_000);
  assert.equal(result.values.landLeaseEndDate, "31.12.2050");
  assert.equal(result.values.plotShareRedemptionPrice, 14_900);
  assert.equal(result.values.nextPlotShareRedemptionDate, "30.6.2027");
});

test("vain korkean luottamuksen otteet hyväksytään", () => {
  const result = normalize(
    raw({
      relevantExcerpts: [
        high("Hoitovastike: 280 €/kk"),
        { text: "Pääomavastike: 95 €/kk", confidence: "medium" },
        { text: "Velkaosuus: 8 000 €", confidence: "low" },
      ],
    }),
  );

  assert.equal(result.values.maintenanceFeeMonthly, 280);
  assert.equal(result.values.financingFeeMonthly, undefined);
  assert.equal(result.values.companyLoanShare, undefined);
  assert.match(result.warnings.join(" "), /epävarmoja asiakirjaotteita/i);
});

test("pelkkä huoneluku ja osakenumerot säilyvät canonical-muodossa", () => {
  const result = normalize(
    raw({
      relevantExcerpts: [
        high("Huoneluku: 3"),
        high("Osakenumerot: 1234-1300"),
      ],
    }),
  );

  assert.equal(result.values.roomDescription, "3h");
  assert.equal(result.roomCount, 3);
  assert.equal(result.values.apartmentIdentifier, "1234-1300");
});

test("matalan kokonaisluottamuksen poiminta ei muuta canonical-arvoja", () => {
  const result = normalize(
    raw({
      confidence: "low",
      relevantExcerpts: [high("Hoitovastike: 280 €/kk")],
    }),
  );

  assert.deepEqual(result.values, {});
  assert.deepEqual(result.fields, []);
  assert.match(result.warnings.join(" "), /liian matala/i);
});

test("puuttuvat ja virheelliset yksiköt eivät tuota automaattista maksuarvoa", () => {
  const result = normalize(
    raw({
      relevantExcerpts: [
        high("Hoitovastike: ei tiedossa"),
        high("Pääomavastike: 120 euroa vuodessa"),
      ],
    }),
  );

  assert.equal(result.values.maintenanceFeeMonthly, undefined);
  assert.equal(result.values.financingFeeMonthly, undefined);
});

test("taloyhtiön kokonaislaina yksinään ei muutu huoneiston lainaosuudeksi", () => {
  const result = normalize(
    raw({
      relevantExcerpts: [
        high("Taloyhtiön tiedot"),
        high("Taloyhtiön koko lainamäärä: 1 250 000 €"),
      ],
    }),
  );

  assert.equal(result.values.companyLoanShare, undefined);
});

test("asiakirjan toteutuneet ja tulevat remontit saavat dokumenttilähteen", () => {
  const result = normalize(
    raw({
      completedRenovations: [
        high("Käyttövesiputket uusittu 2020"),
        { text: "Julkisivu korjattu 2018", confidence: "medium" },
      ],
      futureRenovations: [high("Kattoremontti suunniteltu 2028")],
    }),
  );

  assert.equal(result.renovations.length, 2);
  assert.deepEqual(
    result.renovations.map((renovation) => renovation.source),
    ["document", "document"],
  );
  assert.ok(result.renovations.every((renovation) => renovation.verifiedByDocuments));
  assert.ok(result.renovations.every((renovation) => renovation.confidence === "high"));
  assert.equal(result.housingCompanyRenovations.completedRawText, "Käyttövesiputket uusittu 2020");
  assert.equal(result.housingCompanyRenovations.plannedRawText, "Kattoremontti suunniteltu 2028");
});

test("tunnistamaton dokumenttilaji ei saa käyttäjän alustavan valinnan lähdelabelia", () => {
  const result = normalizeDocumentExtraction({
    extraction: raw({
      documentType: "unknown",
      relevantExcerpts: [high("Hoitovastike: 280 €/kk")],
    }),
    documentId: "doc-2",
    fileName: "pts.pdf",
    declaredKind: "maintenance_plan",
  });

  assert.equal(result.documentType, "unknown");
  assert.equal(result.documentKind, null);
  assert.equal(result.sourceLabel, "Tunnistamaton asiakirja");
  assert.equal(
    result.provenance.maintenanceFeeMonthly?.sourceLabel,
    "Tunnistamaton asiakirja",
  );
});

test("providerin muu asiakirja -tunnistusta ei korvata käyttäjän alustavalla dokumenttilajilla", () => {
  const result = normalizeDocumentExtraction({
    extraction: raw({
      documentType: "other",
      relevantExcerpts: [high("Hoitovastike: 280 €/kk")],
    }),
    documentId: "doc-other",
    fileName: "liite.pdf",
    declaredKind: "maintenance_plan",
  });

  assert.equal(result.documentType, "other");
  assert.equal(result.documentKind, null);
  assert.equal(result.sourceLabel, "Muu asiakirja");
  assert.equal(
    result.provenance.maintenanceFeeMonthly?.sourceLabel,
    "Muu asiakirja",
  );
});

test("providerin luotettava dokumenttilaji ohittaa käyttäjän alustavan valinnan", () => {
  const result = normalizeDocumentExtraction({
    extraction: raw({
      documentType: "financial_statements",
      confidence: "medium",
    }),
    documentId: "doc-financial",
    fileName: "tilinpaatos.pdf",
    declaredKind: "manager_certificate",
  });

  assert.equal(result.documentType, "financial_statements");
  assert.equal(result.documentKind, "financial_statements");
  assert.equal(result.sourceLabel, "Tilinpäätös");
});

test("epäluotettavaksi merkitty provider-tyyppi ei saa käyttäjän alustavan valinnan lähdelabelia", () => {
  const result = normalizeDocumentExtraction({
    extraction: raw({
      documentType: "financial_statements",
      confidence: "low",
    }),
    documentId: "doc-low-confidence",
    fileName: "epaselva.pdf",
    declaredKind: "manager_certificate",
  });

  assert.equal(result.documentType, "financial_statements");
  assert.equal(result.documentKind, "financial_statements");
  assert.equal(result.sourceLabel, "Tilinpäätös");
});
