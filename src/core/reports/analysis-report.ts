import type { InvestmentAnalysisInput, InvestmentAnalysisResult } from "../calculations/investment-analysis.ts";
import { formatFinnishNumber } from "../parser/normalization.ts";
import type { RentEstimate } from "../rent-data/types.ts";
import { visualConditionReportDisclaimer, type VisualConditionAnalysis } from "../visual-condition/types.ts";

export type AnalysisReportSummary = {
  equity: string;
  cashOnCashReturn: string;
  returnOnEquity: string;
  collateralPosition: string;
};

export type AnalysisReportData = { generatedAt: string; source: "current_canonical_state"; input: InvestmentAnalysisInput; analysis: InvestmentAnalysisResult; summary: AnalysisReportSummary; rentEstimate?: RentEstimate; visualCondition?: { title: "Valokuvien perusteella arvioitu kunto"; disclaimer: string; analysis: VisualConditionAnalysis }; provenance: { parserValues: string[]; userValues: string[]; calculatedValues: string[] } };

function reportPercentage(value: number | null | undefined, equity: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${formatFinnishNumber(value, 1)} %`
    : equity === 0 ? "Ei laskettavissa – lisää sijoitettava oma pääoma." : "Ei laskettavissa";
}

function reportSummary(input: InvestmentAnalysisInput, analysis: InvestmentAnalysisResult): AnalysisReportSummary {
  const equity = typeof input.equity === "number" && Number.isFinite(input.equity)
    ? `${formatFinnishNumber(input.equity)} € (${input.equitySource === "user" ? "oma tieto" : "oletus"})`
    : "Ei tiedossa";
  const collateralPosition = analysis.collateralShortfall === undefined || analysis.collateralBuffer === undefined
    ? "Ei laskettavissa"
    : analysis.collateralShortfall > 0
      ? `Vakuusvaje ${formatFinnishNumber(analysis.collateralShortfall)} €`
      : analysis.collateralBuffer > 0
        ? `Vakuuspuskuri ${formatFinnishNumber(analysis.collateralBuffer)} €`
        : "Vakuustilanne tasapainossa";
  return { equity, cashOnCashReturn: reportPercentage(analysis.cashOnCashReturn, input.equity), returnOnEquity: reportPercentage(analysis.returnOnEquity, input.equity), collateralPosition };
}

export function buildAnalysisReportData(input: InvestmentAnalysisInput, analysis: InvestmentAnalysisResult, provenance: Partial<AnalysisReportData["provenance"]> = {}, rentEstimate?: RentEstimate, visualCondition?: VisualConditionAnalysis): AnalysisReportData {
  return { generatedAt: new Date().toISOString(), source: "current_canonical_state", input: { ...input }, analysis: structuredClone(analysis), summary: reportSummary(input, analysis), rentEstimate: rentEstimate ? structuredClone(rentEstimate) : undefined, visualCondition: visualCondition ? { title: "Valokuvien perusteella arvioitu kunto", disclaimer: visualConditionReportDisclaimer(visualCondition.source), analysis: structuredClone(visualCondition) } : undefined, provenance: { parserValues: provenance.parserValues ?? [], userValues: provenance.userValues ?? [], calculatedValues: provenance.calculatedValues ?? Object.keys(analysis).filter((key) => typeof analysis[key as keyof InvestmentAnalysisResult] === "number") } };
}
