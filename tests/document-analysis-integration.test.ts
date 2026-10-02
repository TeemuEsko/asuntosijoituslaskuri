import assert from "node:assert/strict";
import test from "node:test";

import { missingCriticalAnalysisFields } from "../src/core/analysis/analysis-entry.ts";
import { calculateInvestmentAnalysis } from "../src/core/calculations/investment-analysis.ts";
import { emptyDocumentCanonicalState } from "../src/core/documents/merge.ts";
import { normalizeDocumentExtraction } from "../src/core/documents/normalize.ts";
import { applyDocumentAnalysisToWorkspaceState, shouldOmitCanonicalFinancialValue, type DocumentWorkspaceFinancialState } from "../src/core/documents/workspace-update.ts";
import { buildAnalysisReportData } from "../src/core/reports/analysis-report.ts";
import { parityFixtures } from "./fixtures/parity-fixtures.ts";

function documentAnalysis(excerpts: string[]) {
  return normalizeDocumentExtraction({
    extraction: {
      documentType: "manager_certificate",
      confidence: "high",
      relevantExcerpts: excerpts.map((text) => ({ text, confidence: "high" as const })),
      completedRenovations: [],
      futureRenovations: [],
    },
    documentId: "manager-certificate-1",
    fileName: "isannoitsijantodistus.pdf",
    declaredKind: "manager_certificate",
  });
}

function workspaceState(
  values: Partial<{ maintenanceFeeMonthly: number; financingFeeMonthly: number; companyLoanShare: number; debtFreePrice: number; salePrice: number; otherCostsMonthly: number }> = {},
): DocumentWorkspaceFinancialState {
  const purchase = {
    debtFreePrice: values.debtFreePrice ?? 120_000,
    salePrice: values.salePrice ?? 100_000,
    companyLoanShare: values.companyLoanShare ?? 20_000,
    financingFeeMonthly: values.financingFeeMonthly ?? 80,
    renovationReserve: 0,
  };
  const maintenanceFeeMonthly = values.maintenanceFeeMonthly ?? 250;
  return {
    canonical: emptyDocumentCanonicalState({
      debtFreePrice: purchase.debtFreePrice,
      salePrice: purchase.salePrice,
      companyLoanShare: purchase.companyLoanShare,
      financingFeeMonthly: purchase.financingFeeMonthly,
      maintenanceFeeMonthly,
    }),
    purchase,
    purchaseStatuses: {
      debtFreePrice: "listing",
      salePrice: "listing",
      companyLoanShare: "listing",
      financingFeeMonthly: "listing",
      renovationReserve: "default",
    },
    maintenanceFeeMonthly,
    maintenanceFeeStatus: "listing",
    otherCostsMonthly: values.otherCostsMonthly ?? 0,
    otherCostsStatus: "default",
    otherCostsUserOverride: false,
    lastEditedPriceField: "debtFreePrice",
  };
}

test("asiakirjan hoitovastike poistuu puuttuvista tiedoista", () => {
  const before = missingCriticalAnalysisFields({
    debtFreePrice: 120_000,
    monthlyRent: 850,
    annualInterestRate: 4.5,
    loanTermYears: 20,
    vacancyMonths: 1,
    companyLoanShare: 0,
    companyLoanKnown: true,
    financingFeeKnown: true,
    bankLoanAmount: 80_000,
    repaymentType: "annuity",
  });
  const updated = applyDocumentAnalysisToWorkspaceState(
    { ...workspaceState(), canonical: emptyDocumentCanonicalState(), maintenanceFeeMonthly: 0, maintenanceFeeStatus: "unknown" },
    documentAnalysis(["Hoitovastike: 263,20 €/kk"]),
  );
  const after = missingCriticalAnalysisFields({
    debtFreePrice: 120_000,
    maintenanceFeeMonthly: updated.maintenanceFeeMonthly,
    monthlyRent: 850,
    annualInterestRate: 4.5,
    loanTermYears: 20,
    vacancyMonths: 1,
    companyLoanShare: 0,
    companyLoanKnown: true,
    financingFeeKnown: true,
    bankLoanAmount: 80_000,
    repaymentType: "annuity",
  });

  assert.ok(before.includes("Hoitovastike"));
  assert.ok(!after.includes("Hoitovastike"));
});

test("ristiriidan vuoksi tuntemattomaksi merkitty asiakirja-arvo säilyy seuraavaa yhdistämistä varten", () => {
  const documentProvenance = {
    source: { kind: "document" as const, documentId: "doc-1", label: "Isännöitsijäntodistus" },
    status: "unknown" as const,
    sourceLabel: "Isännöitsijäntodistus",
  };

  assert.equal(shouldOmitCanonicalFinancialValue("unknown", documentProvenance), false);
  assert.equal(shouldOmitCanonicalFinancialValue("unknown"), true);
  assert.equal(shouldOmitCanonicalFinancialValue("missing", documentProvenance), false);
});

test("asiakirjan hoitovastike ja rahoitusvastike lasketaan nykyisellä financial enginellä", () => {
  const baselineInput = { ...parityFixtures.apartmentWithCompanyLoan, maintenanceFeeMonthly: 250, financingFeeMonthly: 80 };
  const baseline = calculateInvestmentAnalysis(baselineInput);
  const workspace = applyDocumentAnalysisToWorkspaceState(
    workspaceState({ maintenanceFeeMonthly: 250, financingFeeMonthly: 80 }),
    documentAnalysis(["Hoitovastike: 263,20 €/kk", "Rahoitusvastike: 100 €/kk"]),
  );
  const updatedInput = {
    ...baselineInput,
    maintenanceFeeMonthly: workspace.maintenanceFeeMonthly,
    financingFeeMonthly: workspace.purchase.financingFeeMonthly,
  };
  const updated = calculateInvestmentAnalysis(updatedInput);

  assert.equal(updatedInput.maintenanceFeeMonthly, 263.2);
  assert.equal(updatedInput.financingFeeMonthly, 100);
  assert.notEqual(baseline.cashFlowBeforeBankLoan, undefined);
  assert.notEqual(updated.cashFlowBeforeBankLoan, undefined);
  assert.notEqual(baseline.cashFlowAfterBankLoan, undefined);
  assert.notEqual(updated.cashFlowAfterBankLoan, undefined);
  assert.notEqual(baseline.netRentalYield, undefined);
  assert.notEqual(updated.netRentalYield, undefined);
  assert.ok(Math.abs((baseline.cashFlowBeforeBankLoan! - updated.cashFlowBeforeBankLoan!) - 33.2) < 0.001);
  assert.ok(Math.abs((baseline.cashFlowAfterBankLoan! - updated.cashFlowAfterBankLoan!) - 33.2) < 0.001);
  assert.ok(updated.netRentalYield! < baseline.netRentalYield!);
});

test("asiakirjan muu säännöllinen vastike vaikuttaa nykyisen enginen kuukausikuluihin", () => {
  const baselineInput = { ...parityFixtures.apartmentWithCompanyLoan, otherCostsMonthly: 0 };
  const baseline = calculateInvestmentAnalysis(baselineInput);
  const workspace = applyDocumentAnalysisToWorkspaceState(
    workspaceState({ otherCostsMonthly: 0 }),
    documentAnalysis(["Laajakaistavastike: 22,50 €/kk", "Tonttivastike: 45 €/kk"]),
  );
  const updated = calculateInvestmentAnalysis({
    ...baselineInput,
    otherCostsMonthly: workspace.otherCostsMonthly,
  });

  assert.equal(workspace.canonical.values.otherMonthlyFees, 22.5);
  assert.equal(workspace.canonical.values.plotFeeMonthly, 45);
  assert.equal(workspace.otherCostsMonthly, 67.5);
  assert.notEqual(baseline.cashFlowBeforeBankLoan, undefined);
  assert.notEqual(updated.cashFlowBeforeBankLoan, undefined);
  assert.ok(Math.abs((baseline.cashFlowBeforeBankLoan! - updated.cashFlowBeforeBankLoan!) - 67.5) < 0.001);
});

test("käyttäjän muut kuukausikulut eivät muutu uuden dokumentin tonttivastikkeesta", () => {
  const current = workspaceState({ otherCostsMonthly: 80 });
  current.otherCostsStatus = "user";
  current.otherCostsUserOverride = true;
  current.canonical.values.otherMonthlyFees = 80;
  current.canonical.provenance.otherMonthlyFees = {
    source: { kind: "user", label: "Käyttäjän tieto" },
    status: "user",
    sourceLabel: "Käyttäjän tieto",
  };
  const workspace = applyDocumentAnalysisToWorkspaceState(
    current,
    documentAnalysis(["Tonttivastike: 45 €/kk"]),
  );

  assert.equal(workspace.canonical.values.plotFeeMonthly, 45);
  assert.equal(workspace.otherCostsMonthly, 80);
  assert.equal(workspace.otherCostsStatus, "user");
});

test("käyttäjän korjaama yksittäinen muu maksu yhdistyy myöhemmin löytyvään tonttivastikkeeseen", () => {
  const current = workspaceState({ otherCostsMonthly: 80 });
  current.otherCostsStatus = "user";
  current.otherCostsUserOverride = false;
  current.canonical.values.otherMonthlyFees = 80;
  current.canonical.provenance.otherMonthlyFees = {
    source: { kind: "user", label: "Käyttäjän tieto" },
    status: "user",
    sourceLabel: "Käyttäjän tieto",
  };
  const workspace = applyDocumentAnalysisToWorkspaceState(
    current,
    documentAnalysis(["Tonttivastike: 45 €/kk"]),
  );

  assert.equal(workspace.otherCostsMonthly, 125);
  assert.equal(workspace.otherCostsStatus, "user");
});

test("asiakirjan huoneistokohtainen velkaosuus käyttää olemassa olevaa hintasynkronointia", () => {
  const workspace = applyDocumentAnalysisToWorkspaceState(
    workspaceState({ debtFreePrice: 120_000, salePrice: 120_000, companyLoanShare: 0 }),
    documentAnalysis(["Huoneistokohtainen velkaosuus: 12 450,60 €"]),
  );

  assert.deepEqual(
    { debtFreePrice: workspace.purchase.debtFreePrice, salePrice: workspace.purchase.salePrice, companyLoanShare: workspace.purchase.companyLoanShare },
    { debtFreePrice: 120_000, salePrice: 107_549.4, companyLoanShare: 12_450.6 },
  );
  assert.equal(workspace.purchaseStatuses.companyLoanShare, "document");
  assert.equal(workspace.purchaseStatuses.salePrice, "inferred");
});

test("raportti käyttää dokumentin päivittämää canonical inputia ja provenancea", () => {
  const workspace = applyDocumentAnalysisToWorkspaceState(
    workspaceState({ maintenanceFeeMonthly: 250 }),
    documentAnalysis(["Hoitovastike: 263,20 €/kk"]),
  );
  const input = { ...parityFixtures.apartmentWithCompanyLoan, maintenanceFeeMonthly: workspace.maintenanceFeeMonthly };
  const analysis = calculateInvestmentAnalysis(input);
  const report = buildAnalysisReportData(input, analysis, {
    documentValues: [`maintenanceFeeMonthly (${workspace.canonical.provenance.maintenanceFeeMonthly?.sourceLabel})`],
  });

  assert.equal(report.input.maintenanceFeeMonthly, 263.2);
  assert.equal(report.analysis.cashFlowAfterBankLoan, analysis.cashFlowAfterBankLoan);
  assert.deepEqual(report.provenance.documentValues, ["maintenanceFeeMonthly (Isännöitsijäntodistus)"]);
});
