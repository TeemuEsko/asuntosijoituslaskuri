export type CollateralValueSource = "bank" | "calculated" | "user" | "unknown";

export type OpportunityScoreSubScores = {
  cashFlow: number;
  riskAdjustedYield: number;
  housingCompanyRisk: number;
  valueCreation: number;
  financing: number;
  market: number;
};

export type OpportunityScoreResult = {
  score: number;
  uncappedScore: number;
  subScores: OpportunityScoreSubScores;
  reliability: "preliminary" | "moderate" | "good";
  missingData: string[];
  severeRisks: Array<{ id: "verified-rental-prohibition" | "verified-land-lease-end"; label: string; cap: 39 | 49 }>;
  appliedCap?: 39 | 49;
  totalInvestment?: number;
  riskAdjustedNetYield?: number;
  requiredNetYieldFor80?: number;
  currentFreeCollateral?: number;
};

export type OpportunityScoreV2Input = {
  debtFreePrice?: number;
  renovationCost?: number;
  transferTax?: number;
  transactionCosts?: number;
  effectiveAnnualRent?: number;
  annualOperatingCosts?: number;
  monthlyCashFlowAfterDebtService?: number;
  bankLoanAmount?: number;
  companyLoanShare?: number;
  annualInterestRate?: number;
  loanTermYears?: number;
  repaymentType?: "annuity" | "fixed_payment" | "equal_principal" | "interest_only" | "bullet";
  annualBankLoanPrincipal?: number;
  annualCompanyLoanPrincipal?: number;
  maintenanceFeeMonthly?: number;
  financingFeeMonthly?: number;
  otherCostsMonthly?: number;
  repairHistoryScore?: number;
  technicalConditionScore?: number;
  apartmentCount?: number;
  landOwnership?: string;
  landLeaseEndDate?: string;
  plotShareRedeemed?: boolean;
  collateralValue?: number;
  collateralValueSource?: CollateralValueSource;
  rentalDemand?: number;
  resaleLiquidity?: number;
  locationRisk?: number;
  vacancyMonths?: number;
  preliminary?: boolean;
  missingData?: string[];
  verifiedLongTermRentalProhibition?: boolean;
  verifiedLandLeaseNonRenewal?: boolean;
  documentedLandRentIncrease?: boolean;
  landRentIncreaseDescription?: string;
  heatingCostResponsibility?: "tenant" | "landlord" | "included" | "unknown";
  asOfYear?: number;
};

const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value));

export function interpolateScore(
  value: number,
  points: ReadonlyArray<readonly [number, number]>,
): number {
  if (!Number.isFinite(value)) return 50;
  if (value <= points[0]![0]) return points[0]![1];
  for (let index = 1; index < points.length; index += 1) {
    const [x2, y2] = points[index]!;
    const [x1, y1] = points[index - 1]!;
    if (value <= x2) return y1 + ((value - x1) / (x2 - x1)) * (y2 - y1);
  }
  return points.at(-1)![1];
}

function known(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function confidenceWeight(source: CollateralValueSource | undefined): number {
  if (source === "bank") return 1;
  if (source === "calculated") return 0.6;
  if (source === "user") return 0.4;
  return 0;
}

function confidenceAdjusted(score: number, source: CollateralValueSource | undefined): number {
  return 50 + (score - 50) * confidenceWeight(source);
}

function paymentAtRate(input: OpportunityScoreV2Input, annualRate: number): number | undefined {
  if (!known(input.bankLoanAmount) || !known(input.loanTermYears) || !input.repaymentType || input.loanTermYears <= 0) return undefined;
  const amount = Math.max(0, input.bankLoanAmount);
  const months = Math.max(1, Math.round(input.loanTermYears * 12));
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;
  if (input.repaymentType === "interest_only" || input.repaymentType === "bullet") return amount * monthlyRate;
  if (input.repaymentType === "equal_principal") return amount / months + amount * monthlyRate;
  return monthlyRate === 0 ? amount / months : (amount * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}

function companyDebtScore(input: OpportunityScoreV2Input): number {
  if (!known(input.companyLoanShare) || !known(input.debtFreePrice) || input.debtFreePrice <= 0) return 50;
  return interpolateScore(input.companyLoanShare / input.debtFreePrice, [[0, 90], [0.1, 80], [0.25, 60], [0.4, 35], [0.6, 0]]);
}

function housingCompanySizeScore(count: number | undefined): number {
  if (!known(count) || count <= 0) return 50;
  return interpolateScore(count, [[1, 25], [5, 45], [10, 60], [20, 75], [50, 90]]);
}

function yearsUntil(date: string | undefined, asOfYear: number): number | undefined {
  if (!date) return undefined;
  const year = Number(date.match(/\b(20\d{2})\b/)?.[1]);
  return Number.isFinite(year) ? year - asOfYear : undefined;
}

function landScore(input: OpportunityScoreV2Input, asOfYear: number): number {
  const ownership = input.landOwnership?.toLowerCase();
  if (ownership === "owned" || ownership === "oma tontti") return 100;
  if (input.plotShareRedeemed) return 90;
  if (!ownership || ownership === "unknown") return 50;
  const increasePenalty = input.documentedLandRentIncrease ? 15 : 0;
  if (ownership === "optional_lease" || ownership === "optional_leasehold" || ownership.includes("valinnainen"))
    return Math.max(20, 60 - increasePenalty);
  const years = yearsUntil(input.landLeaseEndDate, asOfYear);
  if (!known(years)) return Math.max(20, 50 - increasePenalty);
  return Math.max(10, interpolateScore(years, [[0, 15], [5, 40], [15, 65], [30, 80]]) - increasePenalty);
}

function housingCompanyScore(input: OpportunityScoreV2Input, asOfYear: number): number {
  const history = known(input.repairHistoryScore) ? clamp(input.repairHistoryScore) : 50;
  const repairs = history * 0.6 + 50 * 0.4;
  const technical = known(input.technicalConditionScore) ? clamp(input.technicalConditionScore) : 50;
  const finances = companyDebtScore(input) * 0.25 + 50 * 0.75;
  return clamp(
    repairs * 0.4 +
      technical * 0.2 +
      finances * 0.2 +
      housingCompanySizeScore(input.apartmentCount) * 0.1 +
      landScore(input, asOfYear) * 0.1,
  );
}

function valueCreationScore(input: OpportunityScoreV2Input, totalInvestment: number | undefined) {
  if (!totalInvestment) return { score: 50 };
  const freeCollateral = known(input.collateralValue) && known(input.bankLoanAmount)
    ? input.collateralValue - input.bankLoanAmount
    : undefined;
  const collateralRaw = known(freeCollateral)
    ? interpolateScore(freeCollateral / totalInvestment, [[-0.3, 0], [-0.1, 30], [0, 50], [0.1, 70], [0.2, 90], [0.3, 100]])
    : 50;
  const collateral = known(freeCollateral)
    ? confidenceAdjusted(collateralRaw, input.collateralValueSource)
    : 50;
  return {
    score: clamp(collateral * 0.35 + 50 * 0.65),
    freeCollateral,
  };
}

function structureScore(input: OpportunityScoreV2Input): number {
  if (!input.repaymentType) return 50;
  if (input.repaymentType === "annuity" || input.repaymentType === "equal_principal") return 90;
  if (input.repaymentType === "fixed_payment") return 75;
  if (input.repaymentType === "interest_only") return 45;
  if (!known(input.loanTermYears)) return 50;
  return interpolateScore(input.loanTermYears, [[0, 0], [3, 20], [5, 35], [10, 55], [20, 70]]);
}

function financingScore(input: OpportunityScoreV2Input, totalInvestment: number | undefined): number {
  const stressRate = known(input.annualInterestRate) ? Math.max(6, input.annualInterestRate + 2) : undefined;
  const stressedPayment = known(stressRate) ? paymentAtRate(input, stressRate) : undefined;
  const monthlyOperatingIncome = known(input.effectiveAnnualRent)
    ? input.effectiveAnnualRent / 12 - Math.max(0, input.maintenanceFeeMonthly ?? 0) - Math.max(0, input.otherCostsMonthly ?? 0)
    : undefined;
  const debtService = known(stressedPayment)
    ? stressedPayment + Math.max(0, input.financingFeeMonthly ?? 0)
    : undefined;
  const dscr = known(monthlyOperatingIncome) && known(debtService) && debtService > 0
    ? monthlyOperatingIncome / debtService
    : known(debtService) && debtService === 0
      ? 2
      : undefined;
  const debtServiceScore = known(dscr)
    ? interpolateScore(dscr, [[0.7, 0], [0.9, 30], [1, 50], [1.15, 70], [1.3, 85], [1.5, 100]])
    : 50;
  const totalDebt = known(input.bankLoanAmount)
    ? Math.max(0, input.bankLoanAmount) + Math.max(0, input.companyLoanShare ?? 0)
    : undefined;
  const leverage = totalInvestment && known(totalDebt) ? totalDebt / totalInvestment : undefined;
  const leverageScore = known(leverage)
    ? interpolateScore(leverage, [[0, 100], [0.5, 85], [0.7, 70], [0.85, 45], [1, 20], [1.2, 0]])
    : 50;
  const companyPrincipalKnown = !known(input.companyLoanShare) || input.companyLoanShare <= 0 || known(input.annualCompanyLoanPrincipal);
  const annualPrincipal = companyPrincipalKnown && known(input.annualBankLoanPrincipal)
    ? input.annualBankLoanPrincipal + Math.max(0, input.annualCompanyLoanPrincipal ?? 0)
    : undefined;
  const amortizationRate = known(annualPrincipal) && known(totalDebt) && totalDebt > 0 ? annualPrincipal / totalDebt : undefined;
  const amortizationScore = known(amortizationRate)
    ? interpolateScore(amortizationRate, [[0, 20], [0.01, 40], [0.02, 60], [0.03, 75], [0.05, 100]])
    : totalDebt === 0
      ? 100
      : 50;
  return clamp(debtServiceScore * 0.4 + leverageScore * 0.2 + amortizationScore * 0.2 + structureScore(input) * 0.2);
}

function marketScore(input: OpportunityScoreV2Input): number {
  const positive = (value: number | undefined) => interpolateScore(value ?? 3, [[1, 0], [2, 25], [3, 50], [4, 75], [5, 100]]);
  const location = interpolateScore(input.locationRisk ?? 3, [[1, 100], [2, 75], [3, 50], [4, 25], [5, 0]]);
  const vacancy = interpolateScore(input.vacancyMonths ?? 0, [[0, 100], [1, 80], [2, 60], [3, 40], [6, 0]]);
  return clamp(positive(input.rentalDemand) * 0.4 + positive(input.resaleLiquidity) * 0.3 + location * 0.2 + vacancy * 0.1);
}

export function calculateOpportunityScoreV2(input: OpportunityScoreV2Input): OpportunityScoreResult {
  const totalInvestment = known(input.debtFreePrice) && input.debtFreePrice > 0
    ? input.debtFreePrice + Math.max(0, input.renovationCost ?? 0) + Math.max(0, input.transferTax ?? 0) + Math.max(0, input.transactionCosts ?? 0)
    : undefined;
  const euroCash = known(input.monthlyCashFlowAfterDebtService)
    ? interpolateScore(input.monthlyCashFlowAfterDebtService, [[-200, 0], [-100, 25], [0, 50], [100, 75], [200, 100]])
    : 50;
  const relativeCash = known(input.monthlyCashFlowAfterDebtService) && totalInvestment
    ? interpolateScore((input.monthlyCashFlowAfterDebtService * 12 * 100) / totalInvestment, [[-3, 0], [-1, 30], [0, 50], [1, 65], [2, 80], [3, 100]])
    : 50;
  const cashFlow = (euroCash + relativeCash) / 2;
  const asOfYear = input.asOfYear ?? new Date().getFullYear();
  const housingCompanyRisk = housingCompanyScore(input, asOfYear);
  const requiredNetYieldFor80 = 12 - housingCompanyRisk * 0.04;
  const riskAdjustedNetYield = totalInvestment && known(input.effectiveAnnualRent) && known(input.annualOperatingCosts)
    ? ((input.effectiveAnnualRent - input.annualOperatingCosts) / totalInvestment) * 100
    : undefined;
  const riskAdjustedYield = known(riskAdjustedNetYield)
    ? interpolateScore(riskAdjustedNetYield, [[0, 0], [requiredNetYieldFor80 * 0.5, 40], [requiredNetYieldFor80 * 0.75, 60], [requiredNetYieldFor80, 80], [requiredNetYieldFor80 * 1.25, 100]])
    : 50;
  const value = valueCreationScore(input, totalInvestment);
  const financing = financingScore(input, totalInvestment);
  const market = marketScore(input);
  const subScores = { cashFlow, riskAdjustedYield, housingCompanyRisk, valueCreation: value.score, financing, market };
  const uncappedScore =
    cashFlow * 0.2 +
    riskAdjustedYield * 0.2 +
    housingCompanyRisk * 0.2 +
    value.score * 0.2 +
    financing * 0.1 +
    market * 0.1;
  const severeRisks: OpportunityScoreResult["severeRisks"] = [];
  if (input.verifiedLongTermRentalProhibition) severeRisks.push({ id: "verified-rental-prohibition", label: "Pitkäaikainen vuokraaminen on todennetusti kielletty.", cap: 39 });
  const leaseYears = yearsUntil(input.landLeaseEndDate, asOfYear);
  if (input.verifiedLandLeaseNonRenewal && known(leaseYears) && leaseYears <= 3) severeRisks.push({ id: "verified-land-lease-end", label: "Tontin vuokrasopimus päättyy enintään kolmessa vuodessa eikä sitä dokumentoidusti jatketa.", cap: 49 });
  const appliedCap = severeRisks.length ? Math.min(...severeRisks.map((risk) => risk.cap)) as 39 | 49 : undefined;
  const score = Math.round(appliedCap ? Math.min(uncappedScore, appliedCap) : uncappedScore);
  const missingData = [...new Set(input.missingData ?? [])];
  const reliability = input.preliminary ? "preliminary" : missingData.length ? "moderate" : "good";
  return {
    score,
    uncappedScore,
    subScores,
    reliability,
    missingData,
    severeRisks,
    appliedCap,
    totalInvestment,
    riskAdjustedNetYield,
    requiredNetYieldFor80,
    currentFreeCollateral: value.freeCollateral,
  };
}
