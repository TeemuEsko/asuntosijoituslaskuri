import test from "node:test";
import assert from "node:assert/strict";
import { calculateBankLoanAmount, calculateBankLoanPayment, calculateInvestmentAnalysis, classifyGrossRentalYield } from "../src/core/calculations/investment-analysis.ts";

const complete = { debtFreePrice: 120_000, salePrice: 120_000, monthlyRent: 900, maintenanceFeeMonthly: 300, financingFeeMonthly: 100, otherCostsMonthly: 50, vacancyMonths: 0, bankLoanAmount: 80_000, annualInterestRate: 4.5, loanTermYears: 20, repaymentType: "annuity" as const, equity: 40_000, collateralValue: 84_000, rentalDemand: 3, repairRiskScore: 60, repairHistoryKnown: true };

test("kassavirta erottaa pankkilainaa edeltävän ja sen jälkeisen tuloksen", () => {
  const result = calculateInvestmentAnalysis({ ...complete, monthlyBankLoanPayment: 500 });
  assert.equal(result.cashFlowBeforeBankLoan, 450);
  assert.equal(result.cashFlowAfterBankLoan, -50);
  assert.match((result.warningFactors ?? []).join(" "), /negatiiviselle kassavirralle/);
});

test("tyhjäkäynti vähentää toteutuvaa vuosivuokraa", () => {
  const result = calculateInvestmentAnalysis({ ...complete, vacancyMonths: 1 });
  assert.equal(result.effectiveAnnualRent, 9_900);
});

test("bruttovuokratuoton luokitus noudattaa sovittuja rajoja", () => {
  assert.equal(classifyGrossRentalYield(4.49), "Heikko");
  assert.equal(classifyGrossRentalYield(4.5), "Matala");
  assert.equal(classifyGrossRentalYield(5.5), "Kohtalainen");
  assert.equal(classifyGrossRentalYield(6.5), "Hyvä");
  assert.equal(classifyGrossRentalYield(8), "Vahva");
});

test("puuttuva pankkilaina tekee arviosta alustavan ja rajaa pisteet", () => {
  const result = calculateInvestmentAnalysis({ ...complete, bankLoanAmount: undefined, annualInterestRate: undefined, loanTermYears: undefined, repaymentType: undefined });
  assert.equal(result.preliminary, true);
  assert.ok(result.score <= 59);
  assert.equal(result.cashFlowAfterBankLoan, undefined);
  assert.match((result.missingFactors ?? []).join(" "), /Pankkilainan tiedot puuttuvat/);
});

test("vuokran muuttaminen päivittää tuotot, kassavirran ja pisteytyksen", () => {
  const low = calculateInvestmentAnalysis({ ...complete, monthlyRent: 600 });
  const high = calculateInvestmentAnalysis({ ...complete, monthlyRent: 1_100 });
  assert.ok(high.grossRentalYield! > low.grossRentalYield!);
  assert.ok(high.cashFlowAfterBankLoan! > low.cashFlowAfterBankLoan!);
  assert.ok(high.score > low.score);
  assert.doesNotMatch((high.positiveFactors ?? []).join(" "), /yhtiövastikkeet/);
});

test("kaikki viisi lyhennystapaa erittelevät maksun, koron, lyhennyksen ja loppupääoman", () => {
  const annuity = calculateBankLoanPayment(120_000, 4, 20, "annuity")!;
  const fixed = calculateBankLoanPayment(120_000, 4, 20, "fixed_payment")!;
  const equal = calculateBankLoanPayment(120_000, 4, 20, "equal_principal")!;
  const interestOnly = calculateBankLoanPayment(120_000, 4, 20, "interest_only")!;
  const bullet = calculateBankLoanPayment(120_000, 4, 20, "bullet")!;
  assert.ok(annuity.payment > annuity.interest);
  assert.equal(annuity.remainingPrincipalAtEnd, 0);
  assert.equal(fixed.payment, annuity.payment);
  assert.equal(fixed.interest, 400);
  assert.ok(fixed.principal > 0);
  assert.equal(fixed.remainingPrincipalAtEnd, 0);
  assert.equal(equal.payment, 900);
  assert.equal(equal.interest, 400);
  assert.equal(equal.principal, 500);
  assert.equal(equal.remainingPrincipalAtEnd, 0);
  assert.equal(interestOnly.payment, 400);
  assert.equal(interestOnly.interest, 400);
  assert.equal(interestOnly.principal, 0);
  assert.equal(interestOnly.remainingPrincipalAtEnd, 120_000);
  assert.equal(interestOnly.principalDueAtMaturity, 0);
  assert.equal(bullet.payment, 400);
  assert.equal(bullet.interest, 400);
  assert.equal(bullet.principal, 0);
  assert.equal(bullet.remainingPrincipalAtEnd, 120_000);
  assert.equal(bullet.principalDueAtMaturity, 120_000);
});

test("pankkilaina reagoi käyttäjän omaan pääomaan muuttamatta hinnan käsitteitä", () => {
  assert.equal(calculateBankLoanAmount(120_000, 0), 120_000);
  assert.equal(calculateBankLoanAmount(120_000, 20_000), 100_000);
  assert.equal(calculateBankLoanAmount(120_000, 150_000), 0);
  assert.equal(calculateBankLoanAmount(120_000, 20_000, 10_000), 110_000);
});

test("kertaluonteinen remonttivara vaikuttaa hankintaan mutta ei kuukausikassavirtaan", () => {
  const withoutReserve = calculateInvestmentAnalysis({ ...complete, renovationReserve: 0 });
  const withReserve = calculateInvestmentAnalysis({ ...complete, renovationReserve: 15_000 });
  assert.equal(withReserve.adjustedAcquisitionPrice! - withoutReserve.adjustedAcquisitionPrice!, 15_000);
  assert.equal(withReserve.cashFlowBeforeBankLoan, withoutReserve.cashFlowBeforeBankLoan);
});

test("nolla omaa pääomaa ei tuota ääretöntä tai harhaanjohtavaa oman pääoman tuottoa", () => {
  const result = calculateInvestmentAnalysis({ ...complete, equity: 0, equitySource: "default", equityUserOverridden: false });
  assert.equal(result.equity, 0);
  assert.equal(result.equitySource, "default");
  assert.equal(result.equityUserOverridden, false);
  assert.equal(result.cashOnCashReturn, null);
  assert.equal(result.returnOnEquity, null);
  assert.doesNotMatch(JSON.stringify(result), /NaN|Infinity/);
});

test("positiivinen oma pääoma laskee suhteelliset tuotot eikä vaikuta pisteisiin itsenäisesti", () => {
  const withEquity = calculateInvestmentAnalysis({ ...complete, equity: 40_000, equitySource: "user", equityUserOverridden: true });
  const withoutEquityReturn = calculateInvestmentAnalysis({ ...complete, equity: 0, equitySource: "default", equityUserOverridden: false });
  assert.ok(Number.isFinite(withEquity.cashOnCashReturn));
  assert.ok(Number.isFinite(withEquity.returnOnEquity));
  assert.equal(withEquity.score, withoutEquityReturn.score);
  assert.equal(withEquity.collateralShortfall, 0);
  assert.equal(withEquity.collateralBuffer, 4_000);
});
