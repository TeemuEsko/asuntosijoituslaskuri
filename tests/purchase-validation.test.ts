import assert from "node:assert/strict";
import test from "node:test";

import { validatePurchaseData } from "../src/core/validation/purchase-data.ts";

test("yhtiölainan ja raportoidun vastikkeen ristiriita palautetaan erillisenä varoituksena", () => {
  const conflicts = validatePurchaseData({ debtFreePrice: 79_000, salePrice: 79_000, companyLoanShare: 0, reportedFinancingFeeMonthly: 145 });
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0]?.code, "company_loan_fee_conflict");
  assert.equal(conflicts[0]?.sourceValues.reportedFinancingFeeMonthly, 145);
});

test("hintaristiriita käyttää yhden euron toleranssia", () => {
  assert.equal(validatePurchaseData({ debtFreePrice: 79_001, salePrice: 79_000, companyLoanShare: 0, reportedFinancingFeeMonthly: 0 }).length, 0);
  assert.equal(validatePurchaseData({ debtFreePrice: 79_002, salePrice: 79_000, companyLoanShare: 0, reportedFinancingFeeMonthly: 0 })[0]?.code, "purchase_price_conflict");
});
