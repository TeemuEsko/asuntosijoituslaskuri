"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { analysisFacts, analysisTitle } from "@/core/analysis/analysis-presentation";
import { adaptInvestmentScore } from "@/core/analysis/investment-score-adapter";
import type { AnalysisReliability } from "@/core/analysis/requirements";
import type { FieldStatus } from "@/core/domain/field";
import type { ListingParseResult, RenovationFinding } from "@/core/parser/listing-parser";
import type { NormalizedFieldKey } from "@/core/parser/synonyms";
import { assessRepairHistory, type RepairDocumentKind } from "@/core/rules/repair-history";
import type { PurchaseFieldKey } from "@/data/property-demo";
import { AnalysisCoverageCard } from "./analysis-coverage-card";
import { AnalysisHighlights, KeyMetrics } from "./analysis-summary";
import { AssumptionsCard } from "./assumptions-card";
import { DecisionSummaryCard } from "./decision-summary-card";
import { HousingCompanyCard, PropertyDetailsCard } from "./details-cards";
import { ImportSourceReview } from "./import-source-review";
import { InvestmentOverallScore } from "./investment-overall-score";
import { ProfessionalEvaluationCard } from "./professional-evaluation-card";
import { PurchaseCard } from "./purchase-card";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSidebar } from "./workspace-sidebar";

export type ImportedPropertyData = Partial<Record<NormalizedFieldKey, number | string>> & { renovations?: RenovationFinding[]; documentKinds?: RepairDocumentKind[]; importReview?: ListingParseResult; analysisReliability?: AnalysisReliability; redemptionClause?: "no" | "yes" | "unchecked" };

function purchaseFromImport(data: ImportedPropertyData): Record<PurchaseFieldKey, number> { return { debtFreePrice: typeof data.debtFreePrice === "number" ? data.debtFreePrice : 0, salePrice: typeof data.salePrice === "number" ? data.salePrice : 0, companyLoanShare: typeof data.companyLoanShare === "number" ? data.companyLoanShare : 0, financingFeeMonthly: typeof data.financingFeeMonthly === "number" ? data.financingFeeMonthly : 0, renovationReserve: 0 }; }

export function PropertyWorkspace({ importedData = {}, title, onRequestEvaluation }: { importedData?: ImportedPropertyData; title?: string; onRequestEvaluation?: () => void }) {
  const [data, setData] = useState(importedData);
  const [purchase, setPurchase] = useState<Record<PurchaseFieldKey, number>>(() => purchaseFromImport(importedData));
  const [statuses, setStatuses] = useState<Record<PurchaseFieldKey, FieldStatus>>({ debtFreePrice: importedData.debtFreePrice === undefined ? "missing" : "parser", salePrice: importedData.salePrice === undefined ? "missing" : "parser", companyLoanShare: importedData.companyLoanShare === undefined ? "missing" : "parser", financingFeeMonthly: importedData.financingFeeMonthly === undefined ? "missing" : "parser", renovationReserve: "user" });
  const repairHistory = assessRepairHistory({ renovations: data.renovations ?? [], constructionYear: typeof data.constructionYear === "number" ? data.constructionYear : undefined, documentKinds: data.documentKinds ?? [], buildingType: typeof data.buildingType === "string" ? data.buildingType : undefined });
  const scoreSource = { debtFreePrice: purchase.debtFreePrice, currentRentMonthly: typeof data.currentRentMonthly === "number" ? data.currentRentMonthly : undefined, maintenanceFeeMonthly: typeof data.maintenanceFeeMonthly === "number" ? data.maintenanceFeeMonthly : undefined, financingFeeMonthly: purchase.financingFeeMonthly, companyLoanShare: purchase.companyLoanShare, repairHistory };
  const overallScore = adaptInvestmentScore(scoreSource);
  const presentationData = { ...data, listingTitle: data.listingTitle ?? (title && title !== "Uusi kohde" ? title : undefined) };
  const pageTitle = analysisTitle(presentationData);
  const facts = analysisFacts(presentationData);
  const reliability = data.analysisReliability === "high" ? "Korkea" : data.analysisReliability === "moderate" ? "Kohtalainen" : "Alustava";

  function updatePurchase(key: PurchaseFieldKey, value: number) { setPurchase((current) => ({ ...current, [key]: value })); setStatuses((current) => ({ ...current, [key]: "user" })); }
  function updateImportedField(field: NormalizedFieldKey, value: number | string | undefined) { setData((current) => { const next = { ...current }; if (value === undefined) delete next[field]; else next[field] = value; return next; }); if (["debtFreePrice", "salePrice", "companyLoanShare", "financingFeeMonthly"].includes(field)) setPurchase((current) => ({ ...current, [field]: typeof value === "number" ? value : 0 })); }

  return <TooltipProvider><div className="min-h-screen"><WorkspaceSidebar /><div className="min-w-0 min-[1100px]:pl-18 min-[1600px]:pl-60"><WorkspaceHeader title={pageTitle} location={typeof data.city === "string" ? data.city : ""} /><main className="mx-auto w-full max-w-[1500px] min-w-0 p-4 md:p-6 lg:p-8"><div className="min-w-0 space-y-8">
    <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">Analyysi valmis</p><h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{pageTitle}</h1>{facts.length ? <p className="mt-2 text-sm text-muted-foreground">{facts.join(" · ")}</p> : null}<p className="mt-2 text-xs font-medium text-muted-foreground">Analyysin luotettavuus: {reliability}</p></header>
    <InvestmentOverallScore {...overallScore} />
    <KeyMetrics data={{ ...data, debtFreePrice: purchase.debtFreePrice, financingFeeMonthly: purchase.financingFeeMonthly, companyLoanShare: purchase.companyLoanShare }} />
    <AnalysisHighlights rating={overallScore} />
    <section id="talous" className="scroll-mt-24 space-y-8"><PurchaseCard values={purchase} statuses={statuses} onChange={updatePurchase} /><AssumptionsCard importedData={data} /></section>
    <DecisionSummaryCard repairHistory={repairHistory} />
    <section id="kohde" className="grid min-w-0 scroll-mt-24 gap-6 lg:grid-cols-2"><PropertyDetailsCard importedData={data} /><HousingCompanyCard importedData={data} /></section>
    <AnalysisCoverageCard />
    {data.importReview ? <section id="dokumentit" className="scroll-mt-24"><h2 className="mb-3 text-lg font-semibold">Analyysin lähtötiedot</h2><ImportSourceReview result={data.importReview} onChange={updateImportedField} /></section> : null}
    <ProfessionalEvaluationCard onRequestEvaluation={onRequestEvaluation} />
  </div></main></div></div></TooltipProvider>;
}
