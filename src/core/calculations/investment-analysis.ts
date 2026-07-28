import { effectiveAnnualRent, occupancyFromVacancyMonths } from "./occupancy.ts";
import { clampInvestmentScore, getInvestmentRating, type InvestmentOverallScoreData, type RatingSubScore } from "../analysis/investment-overall-score.ts";
import { evaluateInvestmentObservations, type InvestmentObservation } from "../rules/investment-observations.ts";

export type RepaymentType = "annuity" | "equal_principal" | "interest_only" | "bullet";
export type InvestmentAnalysisInput = {
  debtFreePrice?: number; salePrice?: number; companyLoanShare?: number; monthlyRent?: number; maintenanceFeeMonthly?: number; financingFeeMonthly?: number; otherCostsMonthly?: number; maintenanceReserveMonthly?: number; vacancyMonths?: number;
  bankLoanAmount?: number; annualInterestRate?: number; loanTermYears?: number; repaymentType?: RepaymentType; equity?: number; collateralValue?: number; rentalDemand?: number; repairRiskScore?: number; repairHistoryKnown?: boolean; monthlyBankLoanPayment?: number;
  renovationReserve?: number; transferTaxRate?: number; transactionCosts?: number; annualCompanyLoanPrincipal?: number; locationRisk?: number; resaleLiquidity?: number; sellingCostsRate?: number; holdingPeriodYears?: number; annualAppreciationRate?: number;
};

export type InvestmentAnalysisResult = InvestmentOverallScoreData & {
  preliminary: boolean; grossRentalYield?: number; netRentalYield?: number; effectiveAnnualRent?: number; cashFlowBeforeBankLoan?: number; cashFlowAfterBankLoan?: number; annualCashFlowAfterBankLoan?: number; monthlyBankLoanPayment?: number; monthlyBankLoanInterest?: number; monthlyBankLoanPrincipal?: number; annualBankLoanPrincipal?: number; bankLoanAmount?: number; equity?: number; adjustedAcquisitionPrice?: number; transferTax?: number; totalAcquisitionCosts?: number; actualEquityRequired?: number; collateralShortfall?: number; leverageRatio?: number; cashOnCashReturn?: number; returnOnEquity?: number; estimatedExitPrice?: number; estimatedExitProfit?: number; observations: InvestmentObservation[];
};

function interpolate(value: number, points: ReadonlyArray<readonly [number, number]>): number {
  if (value <= points[0]![0]) return points[0]![1];
  for (let index = 1; index < points.length; index += 1) { const [x2, y2] = points[index]!; const [x1, y1] = points[index - 1]!; if (value <= x2) return y1 + (value - x1) / (x2 - x1) * (y2 - y1); }
  return points.at(-1)![1];
}

export function classifyGrossRentalYield(value: number): "Heikko" | "Matala" | "Kohtalainen" | "Hyvä" | "Vahva" { return value < 4.5 ? "Heikko" : value < 5.5 ? "Matala" : value < 6.5 ? "Kohtalainen" : value < 8 ? "Hyvä" : "Vahva"; }
export function grossYieldScore(value: number): number { return clampInvestmentScore(interpolate(value, [[0, 0], [4.5, 30], [5.5, 45], [6.5, 60], [8, 80], [10, 100]])); }
export function netYieldScore(value: number): number { return clampInvestmentScore(interpolate(value, [[0, 0], [2.5, 25], [3.5, 40], [4.5, 60], [6, 80], [8, 100]])); }

export function calculateBankLoanPayment(amount: number, annualInterestRate: number, loanTermYears: number, repaymentType: RepaymentType) {
  if (![amount, annualInterestRate, loanTermYears].every(Number.isFinite) || amount < 0 || annualInterestRate < 0 || loanTermYears <= 0) return undefined;
  const months = Math.round(loanTermYears * 12); const monthlyRate = annualInterestRate / 100 / 12; const interest = amount * monthlyRate;
  let principal = 0; let payment = 0;
  if (repaymentType === "annuity") { payment = monthlyRate === 0 ? amount / months : amount * monthlyRate / (1 - (1 + monthlyRate) ** -months); principal = payment - interest; }
  else if (repaymentType === "equal_principal") { principal = amount / months; payment = principal + interest; }
  else if (repaymentType === "interest_only" || repaymentType === "bullet") { payment = interest; principal = 0; }
  return { payment, interest, principal };
}

function sub(score: number, summary: string): RatingSubScore { const rounded = Math.round(clampInvestmentScore(score)); return { score: rounded, grade: getInvestmentRating(rounded).grade, summary }; }

export function calculateInvestmentAnalysis(input: InvestmentAnalysisInput): InvestmentAnalysisResult {
  const positiveFactors: string[] = []; const warningFactors: string[] = []; const missingFactors: string[] = [];
  const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
  const price = valid(input.debtFreePrice) && input.debtFreePrice > 0 ? input.debtFreePrice : undefined;
  const rent = valid(input.monthlyRent) && input.monthlyRent > 0 ? input.monthlyRent : undefined;
  const maintenance = valid(input.maintenanceFeeMonthly) ? input.maintenanceFeeMonthly : undefined;
  const financing = valid(input.financingFeeMonthly) ? input.financingFeeMonthly : undefined;
  const vacancy = occupancyFromVacancyMonths(input.vacancyMonths ?? 1);
  const annualRent = rent === undefined ? undefined : effectiveAnnualRent(rent, vacancy.vacancyMonths);
  const grossYield = price && annualRent !== undefined ? annualRent / price * 100 : undefined;
  const annualOperating = maintenance === undefined || financing === undefined ? undefined : (maintenance + financing + (input.otherCostsMonthly ?? 0) + (input.maintenanceReserveMonthly ?? 0)) * 12;
  const netYield = price && annualRent !== undefined && annualOperating !== undefined ? (annualRent - annualOperating) / price * 100 : undefined;
  const beforeLoan = annualRent !== undefined && annualOperating !== undefined ? (annualRent - annualOperating) / 12 : undefined;
  const explicitPayment = valid(input.monthlyBankLoanPayment) && input.monthlyBankLoanPayment >= 0 ? input.monthlyBankLoanPayment : undefined;
  const loanKnown = explicitPayment !== undefined || (valid(input.bankLoanAmount) && valid(input.annualInterestRate) && valid(input.loanTermYears) && Boolean(input.repaymentType));
  const loan = explicitPayment !== undefined ? { payment: explicitPayment, interest: 0, principal: explicitPayment } : loanKnown ? calculateBankLoanPayment(input.bankLoanAmount!, input.annualInterestRate!, input.loanTermYears!, input.repaymentType!) : undefined;
  const afterLoan = beforeLoan !== undefined && loan ? beforeLoan - loan.payment : undefined;

  const renovationReserve = valid(input.renovationReserve) ? Math.max(0, input.renovationReserve) : 0;
  const transferTax = price !== undefined && valid(input.transferTaxRate) ? price * Math.max(0, input.transferTaxRate) / 100 : undefined;
  const transactionCosts = valid(input.transactionCosts) ? Math.max(0, input.transactionCosts) : 0;
  const adjustedAcquisitionPrice = price === undefined ? undefined : price + renovationReserve + (transferTax ?? 0) + transactionCosts;
  const actualEquityRequired = valid(input.salePrice) && valid(input.bankLoanAmount) ? Math.max(0, input.salePrice + renovationReserve + (transferTax ?? 0) + transactionCosts - input.bankLoanAmount) : undefined;
  const collateralShortfall = valid(input.bankLoanAmount) && valid(input.collateralValue) ? Math.max(0, input.bankLoanAmount - input.collateralValue) : undefined;
  const totalDebt = valid(input.bankLoanAmount) ? input.bankLoanAmount + (valid(input.companyLoanShare) ? input.companyLoanShare : 0) : undefined;
  const leverage = adjustedAcquisitionPrice && totalDebt !== undefined ? totalDebt / adjustedAcquisitionPrice : undefined;
  const annualCashFlow = afterLoan === undefined ? undefined : afterLoan * 12;
  const annualBankPrincipal = loan ? loan.principal * 12 : undefined;
  const equityBase = valid(input.equity) && input.equity > 0 ? input.equity : actualEquityRequired && actualEquityRequired > 0 ? actualEquityRequired : undefined;
  const cashOnCashReturn = annualCashFlow !== undefined && equityBase ? annualCashFlow / equityBase * 100 : undefined;
  const returnOnEquity = annualCashFlow !== undefined && annualBankPrincipal !== undefined && equityBase ? (annualCashFlow + annualBankPrincipal + (input.annualCompanyLoanPrincipal ?? 0)) / equityBase * 100 : undefined;
  const holdingYears = valid(input.holdingPeriodYears) ? Math.max(0, input.holdingPeriodYears) : undefined;
  const exitPrice = price !== undefined && holdingYears !== undefined && valid(input.annualAppreciationRate) ? price * (1 + input.annualAppreciationRate / 100) ** holdingYears : undefined;
  const exitProfit = exitPrice !== undefined ? exitPrice * (1 - Math.max(0, input.sellingCostsRate ?? 0) / 100) - price! : undefined;

  if (!price) missingFactors.push("Velaton hinta puuttuu"); if (!rent) missingFactors.push("Kuukausivuokra puuttuu"); if (maintenance === undefined) missingFactors.push("Hoitovastike puuttuu"); if (financing === undefined) missingFactors.push("Rahoitusvastike puuttuu");
  if (!loanKnown) missingFactors.push("Pankkilainan tiedot puuttuvat – kassavirta ja arvio ovat alustavia");
  if (!input.repairHistoryKnown) missingFactors.push("Taloyhtiön korjaushistoria on tarkistettava lähdeasiakirjoista");
  if (grossYield !== undefined && grossYield < 5.5) warningFactors.push("Bruttovuokratuotto on nykyisellä hinnalla matala.");
  if (netYield !== undefined && netYield < 4) warningFactors.push("Nettovuokratuotto jää tavoitetason alapuolelle.");
  if (afterLoan !== undefined && afterLoan < 0) warningFactors.push("Kohde jää pankkilainan jälkeen negatiiviselle kassavirralle.");
  else if (afterLoan === 0) warningFactors.push("Kassavirta jää pankkilainan jälkeen nollaan.");
  else if (afterLoan !== undefined && afterLoan < 100) { positiveFactors.push("Kohde jää pankkilainan jälkeen lievästi positiiviselle kassavirralle."); warningFactors.push("Kassavirtapuskuri jää pankkilainan jälkeen pieneksi."); }
  else if (afterLoan !== undefined && afterLoan >= 100) positiveFactors.push("Vuokra kattaa kaikki kuukausittaiset kulut ja jättää vahvan positiivisen kassavirran.");
  if (netYield !== undefined && netYield >= 6) positiveFactors.push("Nettovuokratuotto on vahva suhteessa velattomaan hintaan.");
  if (leverage !== undefined && leverage > 0.8) warningFactors.push("Pankkilainan määrä on suuri suhteessa kohteen arvoon."); else if (leverage !== undefined && leverage <= 0.6) positiveFactors.push("Pankkilainan velkavipu on maltillinen.");
  if (valid(input.annualInterestRate) && input.annualInterestRate >= 6) warningFactors.push("Pankkilainan korkotaso altistaa kassavirran korkoriskille.");
  if (vacancy.vacancyMonths >= 3) warningFactors.push("Korkea tyhjäkäyntioletus heikentää vuokratuottoa.");

  const observations = evaluateInvestmentObservations({ cashFlowAfterLoan: afterLoan, netYield, leverageRatio: leverage, annualInterestRate: input.annualInterestRate, rentalDemand: input.rentalDemand, vacancyMonths: vacancy.vacancyMonths, collateralShortfall, repairRiskScore: input.repairRiskScore, repairHistoryKnown: Boolean(input.repairHistoryKnown), locationRisk: input.locationRisk, resaleLiquidity: input.resaleLiquidity, loanKnown });
  positiveFactors.splice(0, positiveFactors.length, ...observations.filter((item) => item.type === "strength").map((item) => item.description));
  warningFactors.splice(0, warningFactors.length, ...observations.filter((item) => item.type === "risk" || item.type === "notice").map((item) => item.description));
  for (const item of observations.filter((finding) => finding.type === "missingData")) if (!missingFactors.includes(item.description)) missingFactors.push(item.description);

  const yieldComponent = netYield === undefined ? (grossYield === undefined ? 35 : grossYieldScore(grossYield) * .7) : netYieldScore(netYield);
  const cashFlowComponent = afterLoan === undefined ? 30 : clampInvestmentScore(50 + afterLoan / 4);
  const financingComponent = !loanKnown ? 30 : leverage === undefined ? 40 : clampInvestmentScore(95 - leverage * 70 - Math.max(0, input.annualInterestRate! - 4) * 5);
  const repairComponent = input.repairRiskScore ?? 50;
  const demandComponent = clampInvestmentScore(20 + (input.rentalDemand ?? 3) * 15 - vacancy.vacancyMonths * 4 - Math.max(0, (input.locationRisk ?? 3) - 3) * 8 + ((input.resaleLiquidity ?? 3) - 3) * 5);
  const collateralBuffer = price && valid(input.collateralValue) && valid(input.bankLoanAmount) ? (input.collateralValue - input.bankLoanAmount) / price : undefined;
  const collateralComponent = collateralBuffer === undefined ? 40 : clampInvestmentScore(50 + collateralBuffer * 100);
  let score = Math.round(cashFlowComponent * .25 + yieldComponent * .2 + financingComponent * .2 + repairComponent * .2 + demandComponent * .1 + collateralComponent * .05);
  score = Math.round(clampInvestmentScore(score + observations.reduce((sum, item) => sum + item.scoreImpact, 0) * .25));
  if (!loanKnown) score = Math.min(score, 59); if ((grossYield ?? 0) < 5 && (netYield ?? 0) < 4.5) score = Math.min(score, 59); if (afterLoan !== undefined && afterLoan < 0) score = Math.min(score, 54);
  return { score, preliminary: !loanKnown || missingFactors.length > 0, grossRentalYield: grossYield, netRentalYield: netYield, effectiveAnnualRent: annualRent, cashFlowBeforeBankLoan: beforeLoan, cashFlowAfterBankLoan: afterLoan, annualCashFlowAfterBankLoan: annualCashFlow, monthlyBankLoanPayment: loan?.payment, monthlyBankLoanInterest: loan?.interest, monthlyBankLoanPrincipal: loan?.principal, annualBankLoanPrincipal: annualBankPrincipal, bankLoanAmount: input.bankLoanAmount, equity: input.equity, adjustedAcquisitionPrice, transferTax, totalAcquisitionCosts: adjustedAcquisitionPrice, actualEquityRequired, collateralShortfall, leverageRatio: leverage, cashOnCashReturn, returnOnEquity, estimatedExitPrice: exitPrice, estimatedExitProfit: exitProfit, observations, positiveFactors, warningFactors, missingFactors, subScores: { yield: sub(yieldComponent, "Nettovuokratuotto painottaa toteutuvaa vuokraa ja jatkuvia kuluja."), cashFlow: sub(cashFlowComponent, "Kassavirta huomioi pankkilainan kuukausierän."), housingCompanyRisk: sub(repairComponent, "Arvio perustuu tunnistettuun korjaushistoriaan."), financing: sub(financingComponent, "Arvio huomioi velkavivun, koron ja laina-ajan.") } };
}
