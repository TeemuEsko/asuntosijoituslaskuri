import type { RepairHistoryAssessment } from "../rules/repair-history";
import { calculateInvestmentAnalysis, type InvestmentAnalysisInput, type InvestmentAnalysisResult } from "../calculations/investment-analysis.ts";

export type InvestmentScoreSource = Omit<InvestmentAnalysisInput, "repairRiskScore" | "repairHistoryKnown"> & { currentRentMonthly?: number; repairHistory?: RepairHistoryAssessment };

export function adaptInvestmentScore(source: InvestmentScoreSource): InvestmentAnalysisResult {
  const repairRiskScore = source.repairHistory?.severity === "medium" ? 35 : source.repairHistory?.status === "major_recognized" ? 82 : source.repairHistory ? 58 : 50;
  return calculateInvestmentAnalysis({ ...source, monthlyRent: source.monthlyRent ?? source.currentRentMonthly, repairRiskScore, repairHistoryKnown: Boolean(source.repairHistory && source.repairHistory.confidence !== "low") });
}
