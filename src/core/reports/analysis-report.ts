import type { InvestmentAnalysisInput, InvestmentAnalysisResult } from "../calculations/investment-analysis.ts";
import type { RentEstimate } from "../rent-data/types.ts";

export type AnalysisReportData = { generatedAt: string; source: "current_canonical_state"; input: InvestmentAnalysisInput; analysis: InvestmentAnalysisResult; rentEstimate?: RentEstimate; provenance: { parserValues: string[]; userValues: string[]; calculatedValues: string[] } };

export function buildAnalysisReportData(input: InvestmentAnalysisInput, analysis: InvestmentAnalysisResult, provenance: Partial<AnalysisReportData["provenance"]> = {}, rentEstimate?: RentEstimate): AnalysisReportData {
  return { generatedAt: new Date().toISOString(), source: "current_canonical_state", input: { ...input }, analysis: structuredClone(analysis), rentEstimate: rentEstimate ? structuredClone(rentEstimate) : undefined, provenance: { parserValues: provenance.parserValues ?? [], userValues: provenance.userValues ?? [], calculatedValues: provenance.calculatedValues ?? Object.keys(analysis).filter((key) => typeof analysis[key as keyof InvestmentAnalysisResult] === "number") } };
}
