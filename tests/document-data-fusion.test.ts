import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCanonicalFieldOverride,
  emptyDocumentCanonicalState,
  mergeDocumentAnalysis,
  validateDocumentCanonicalConsistency,
} from "../src/core/documents/merge.ts";
import { normalizeDocumentExtraction } from "../src/core/documents/normalize.ts";
import type {
  DocumentCanonicalState,
  DocumentRawExtraction,
} from "../src/core/documents/types.ts";

function analysis(
  excerpts: string[],
  overrides: Partial<DocumentRawExtraction> = {},
) {
  return normalizeDocumentExtraction({
    extraction: {
      documentType: "manager_certificate",
      confidence: "high",
      relevantExcerpts: excerpts.map((text) => ({ text, confidence: "high" })),
      completedRenovations: [],
      futureRenovations: [],
      ...overrides,
    },
    documentId: "doc-1",
    fileName: "isannointsijantodistus.pdf",
    declaredKind: "manager_certificate",
  });
}

function state(
  values: DocumentCanonicalState["values"] = {},
): DocumentCanonicalState {
  return emptyDocumentCanonicalState(values);
}

test("asiakirja täydentää puuttuvan arvon ja provenance säilyy", () => {
  const merged = mergeDocumentAnalysis(
    state(),
    analysis(["Hoitovastike: 263,20 €/kk"]),
  );

  assert.equal(merged.values.maintenanceFeeMonthly, 263.2);
  assert.equal(merged.provenance.maintenanceFeeMonthly?.status, "document");
  assert.equal(
    merged.provenance.maintenanceFeeMonthly?.sourceLabel,
    "Isännöitsijäntodistus",
  );
  assert.deepEqual(merged.conflicts, []);
});

test("asiakirja voittaa ristiriitaisen ilmoitustiedon ja säilyttää konfliktin", () => {
  const merged = mergeDocumentAnalysis(
    state({ maintenanceFeeMonthly: 250 }),
    analysis(["Hoitovastike: 263,20 €/kk"]),
  );

  assert.equal(merged.values.maintenanceFeeMonthly, 263.2);
  assert.equal(merged.provenance.maintenanceFeeMonthly?.source.kind, "document");
  assert.equal(merged.conflicts.length, 1);
  assert.equal(merged.conflicts[0]?.activeValue, 263.2);
  assert.equal(merged.conflicts[0]?.conflictingValue, 250);
  assert.equal(merged.conflicts[0]?.conflictingSource?.kind, "listing");
});

test("käyttäjän arvoa ei ylikirjoiteta asiakirjalla", () => {
  const current = state({ maintenanceFeeMonthly: 275 });
  current.provenance.maintenanceFeeMonthly = {
    source: { kind: "user", label: "Käyttäjän syöttämä" },
    status: "user",
    sourceLabel: "Käyttäjän syöttämä",
  };

  const merged = mergeDocumentAnalysis(
    current,
    analysis(["Hoitovastike: 263,20 €/kk"]),
  );

  assert.equal(merged.values.maintenanceFeeMonthly, 275);
  assert.equal(merged.provenance.maintenanceFeeMonthly?.source.kind, "user");
  assert.equal(merged.conflicts[0]?.conflictingValue, 263.2);
  assert.equal(merged.conflicts[0]?.conflictingSource?.kind, "document");
});

test("käyttäjän korjaus säilyttää aiemman asiakirja-arvon ja alkuperäisen otteen", () => {
  const fromDocument = mergeDocumentAnalysis(
    state(),
    analysis(["Hoitovastike: 263,20 €/kk"]),
  );
  const userProvenance = {
    source: { kind: "user" as const, label: "Käyttäjän tieto" },
    status: "user" as const,
    sourceLabel: "Käyttäjän tieto",
    confidence: "high" as const,
  };
  const overridden = applyCanonicalFieldOverride(
    fromDocument,
    "maintenanceFeeMonthly",
    275,
    userProvenance,
  );
  const repeated = applyCanonicalFieldOverride(
    overridden,
    "maintenanceFeeMonthly",
    275,
    userProvenance,
  );

  assert.equal(overridden.values.maintenanceFeeMonthly, 275);
  assert.equal(overridden.provenance.maintenanceFeeMonthly?.source.kind, "user");
  assert.equal(overridden.conflicts[0]?.conflictingValue, 263.2);
  assert.equal(overridden.conflicts[0]?.conflictingSource?.kind, "document");
  assert.equal(
    overridden.conflicts[0]?.conflictingProvenance?.rawText,
    "Hoitovastike: 263,20 €/kk",
  );
  assert.equal(repeated.conflicts.length, 1);
});

test("asiakirja voittaa laskennallisen arvon", () => {
  const current = state({ financingFeeMonthly: 90 });
  current.provenance.financingFeeMonthly = {
    source: { kind: "calculation", label: "Laskettu" },
    status: "derived",
    sourceLabel: "Laskettu",
  };

  const merged = mergeDocumentAnalysis(
    current,
    analysis(["Rahoitusvastike: 100 €/kk"]),
  );

  assert.equal(merged.values.financingFeeMonthly, 100);
  assert.equal(merged.provenance.financingFeeMonthly?.source.kind, "document");
  assert.equal(merged.conflicts[0]?.conflictingValue, 90);
});

test("saman dokumenttituloksen yhdistäminen on idempotentti", () => {
  const document = analysis(["Hoitovastike: 263,20 €/kk"], {
    completedRenovations: [
      { text: "Käyttövesiputket uusittu 2020", confidence: "high" },
    ],
  });
  const once = mergeDocumentAnalysis(
    state({ maintenanceFeeMonthly: 250 }),
    document,
  );
  const twice = mergeDocumentAnalysis(once, document);

  assert.deepEqual(twice, once);
  assert.equal(twice.conflicts.length, 1);
  assert.equal(twice.renovations.length, 1);
});

test("matalan luottamuksen tai tyhjä tulos ei nollaa nykyisiä tietoja", () => {
  const current = state({
    maintenanceFeeMonthly: 250,
    companyLoanShare: 9_000,
  });
  const lowConfidence = analysis([], {
    confidence: "low",
    relevantExcerpts: [
      { text: "Hoitovastike: 0 €/kk", confidence: "high" },
    ],
  });
  const merged = mergeDocumentAnalysis(current, lowConfidence);

  assert.deepEqual(merged.values, current.values);
  assert.deepEqual(merged.provenance, current.provenance);
  assert.deepEqual(merged.conflicts, []);
});

test("asiakirja päivittää vain löytämänsä kentät", () => {
  const current = state({
    maintenanceFeeMonthly: 250,
    constructionYear: 1999,
    roomDescription: "2h + k",
  });
  const merged = mergeDocumentAnalysis(
    current,
    analysis(["Hoitovastike: 263,20 €/kk"]),
  );

  assert.equal(merged.values.maintenanceFeeMonthly, 263.2);
  assert.equal(merged.values.constructionYear, 1999);
  assert.equal(merged.values.roomDescription, "2h + k");
});

test("saman prioriteetin ristiriitainen dokumentti ei ylikirjoita ensimmäistä", () => {
  const first = mergeDocumentAnalysis(
    state(),
    analysis(["Hoitovastike: 263,20 €/kk"]),
  );
  const secondDocument = normalizeDocumentExtraction({
    extraction: {
      documentType: "manager_certificate",
      confidence: "high",
      relevantExcerpts: [
        { text: "Hoitovastike: 270 €/kk", confidence: "high" },
      ],
      completedRenovations: [],
      futureRenovations: [],
    },
    documentId: "doc-2",
    fileName: "toinen-todistus.pdf",
  });
  const merged = mergeDocumentAnalysis(first, secondDocument);

  assert.equal(merged.values.maintenanceFeeMonthly, 263.2);
  assert.equal(merged.conflicts[0]?.conflictingValue, 270);
  assert.equal(merged.conflicts[0]?.conflictingSource?.documentId, "doc-2");
});

test("ristiriitainen rahoitusvastike säilyy mutta nollavelka merkitään tarkistettavaksi", () => {
  const current = state({ companyLoanShare: 0, financingFeeMonthly: 100 });
  current.provenance.companyLoanShare = {
    source: { kind: "document", documentId: "doc-1", label: "Isännöitsijäntodistus" },
    status: "document",
    sourceLabel: "Isännöitsijäntodistus",
  };
  current.provenance.financingFeeMonthly = {
    source: { kind: "document", documentId: "doc-1", label: "Isännöitsijäntodistus" },
    status: "document",
    sourceLabel: "Isännöitsijäntodistus",
  };
  const result = validateDocumentCanonicalConsistency(current);

  assert.equal(result.state.values.companyLoanShare, 0);
  assert.equal(result.state.values.financingFeeMonthly, 100);
  assert.equal(result.state.provenance.companyLoanShare?.status, "unknown");
  assert.deepEqual(result.fieldsNeedingReview, ["companyLoanShare"]);
  assert.equal(result.warnings.length, 1);
});

test("käyttäjän vahvistettu nollavelka säilyy käyttäjätietona myös vastikeristiriidassa", () => {
  const current = state({ companyLoanShare: 0, financingFeeMonthly: 100 });
  current.provenance.companyLoanShare = {
    source: { kind: "user", label: "Käyttäjän tieto" },
    status: "user",
    sourceLabel: "Käyttäjän tieto",
  };
  const result = validateDocumentCanonicalConsistency(current);

  assert.equal(result.state.provenance.companyLoanShare?.status, "user");
  assert.deepEqual(result.fieldsNeedingReview, []);
  assert.equal(result.warnings.length, 1);
});
