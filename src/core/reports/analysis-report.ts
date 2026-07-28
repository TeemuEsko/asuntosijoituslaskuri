import type { InvestmentAnalysisInput, InvestmentAnalysisResult } from "../calculations/investment-analysis.ts";

export type AnalysisReportData = { generatedAt: string; source: "current_canonical_state"; input: InvestmentAnalysisInput; analysis: InvestmentAnalysisResult; provenance: { parserValues: string[]; userValues: string[]; calculatedValues: string[] } };

export function buildAnalysisReportData(input: InvestmentAnalysisInput, analysis: InvestmentAnalysisResult, provenance: Partial<AnalysisReportData["provenance"]> = {}): AnalysisReportData {
  return { generatedAt: new Date().toISOString(), source: "current_canonical_state", input: { ...input }, analysis: structuredClone(analysis), provenance: { parserValues: provenance.parserValues ?? [], userValues: provenance.userValues ?? [], calculatedValues: provenance.calculatedValues ?? Object.keys(analysis).filter((key) => typeof analysis[key as keyof InvestmentAnalysisResult] === "number") } };
}
