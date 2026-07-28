"use client";
/* eslint-disable react-hooks/static-components -- minified workspace JSX keeps the data-bound assumptions adapter local. */

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AnalysisReliability } from "@/core/analysis/requirements";
import type { FieldStatus } from "@/core/domain/field";
import type { ListingParseResult, RenovationFinding } from "@/core/parser/listing-parser";
import type { NormalizedFieldKey } from "@/core/parser/synonyms";
import { assessRepairHistory, type RepairDocumentKind } from "@/core/rules/repair-history";
import type { PurchaseFieldKey } from "@/data/property-demo";
import { AnalysisCoverageCard } from "./analysis-coverage-card";
import { AssumptionsCard as AssumptionsCardBase } from "./assumptions-card";
import { DecisionSummaryCard } from "./decision-summary-card";
import { HousingCompanyCard, PropertyDetailsCard } from "./details-cards";
import { ImportSourceReview } from "./import-source-review";
import { MissingInformationCard } from "./missing-information-card";
import { ProfessionalEvaluationCard } from "./professional-evaluation-card";
import { PurchaseCard } from "./purchase-card";
import { RiskPreviewCard } from "./risk-preview-card";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSidebar } from "./workspace-sidebar";

export type ImportedPropertyData = Partial<Record<NormalizedFieldKey, number | string>> & { renovations?: RenovationFinding[]; documentKinds?: RepairDocumentKind[]; importReview?: ListingParseResult; analysisReliability?: AnalysisReliability };

function purchaseFromImport(data: ImportedPropertyData): Record<PurchaseFieldKey, number> {
  return { debtFreePrice: typeof data.debtFreePrice === "number" ? data.debtFreePrice : 0, salePrice: typeof data.salePrice === "number" ? data.salePrice : 0, companyLoanShare: typeof data.companyLoanShare === "number" ? data.companyLoanShare : 0, financingFeeMonthly: typeof data.financingFeeMonthly === "number" ? data.financingFeeMonthly : 0, renovationReserve: 0 };
}

type PropertyWorkspaceProps = { importedData?: ImportedPropertyData; title?: string; onRequestEvaluation?: () => void };

export function PropertyWorkspace({ importedData = {}, title = "Uusi kohde", onRequestEvaluation }: PropertyWorkspaceProps) {
  const [data, setData] = useState(importedData);
  const [purchase, setPurchase] = useState<Record<PurchaseFieldKey, number>>(() => purchaseFromImport(importedData));
  const [statuses, setStatuses] = useState<Record<PurchaseFieldKey, FieldStatus>>({ debtFreePrice: importedData.debtFreePrice === undefined ? "missing" : "parser", salePrice: importedData.salePrice === undefined ? "missing" : "parser", companyLoanShare: importedData.companyLoanShare === undefined ? "missing" : "parser", financingFeeMonthly: importedData.financingFeeMonthly === undefined ? "missing" : "parser", renovationReserve: "user" });
  const repairHistory = assessRepairHistory({ renovations: data.renovations ?? [], constructionYear: typeof data.constructionYear === "number" ? data.constructionYear : undefined, documentKinds: data.documentKinds ?? [] });
  function updatePurchase(key: PurchaseFieldKey, value: number) { setPurchase((current) => ({ ...current, [key]: value })); setStatuses((current) => ({ ...current, [key]: "user" })); }
  function updateImportedField(field: NormalizedFieldKey, value: number | string | undefined) {
    setData((current) => { const next = { ...current }; if (value === undefined) delete next[field]; else next[field] = value; return next; });
    if (["debtFreePrice", "salePrice", "companyLoanShare", "financingFeeMonthly"].includes(field)) setPurchase((current) => ({ ...current, [field]: typeof value === "number" ? value : 0 }));
  }
  const location = [data.address, data.city].filter((value): value is string => typeof value === "string" && Boolean(value)).join(", ");
  const reliability = data.analysisReliability === "high" ? "Korkea" : data.analysisReliability === "moderate" ? "Kohtalainen" : "Alustava";
  const AssumptionsCard = () => <AssumptionsCardBase importedData={data} />;

  return <TooltipProvider><div className="min-h-screen"><WorkspaceSidebar /><div className="min-w-0 min-[1100px]:pl-18 min-[1600px]:pl-60"><WorkspaceHeader title={title} location={location} /><main className="mx-auto w-full max-w-[1720px] min-w-0 p-4 md:p-6 lg:p-8"><div id="dokumentit" className="scroll-mt-24" /><div id="riskit" className="scroll-mt-24" /><div className="grid min-w-0 items-start gap-8 min-[1600px]:grid-cols-[minmax(0,1fr)_minmax(300px,350px)]"><div className="min-w-0 space-y-8"><section id="kohde" className="min-w-0 scroll-mt-24"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">Analyysi valmis</p><h2 className="mt-1 break-words text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm font-medium">Analyysin luotettavuus: {reliability}</p></div>{data.importReview ? <div className="mb-6"><ImportSourceReview result={data.importReview} onChange={updateImportedField} /></div> : null}<div className="grid min-w-0 gap-6 lg:grid-cols-2"><PropertyDetailsCard importedData={data} /><HousingCompanyCard importedData={data} /></div></section><section id="talous" className="min-w-0 scroll-mt-24 space-y-8"><PurchaseCard values={purchase} statuses={statuses} onChange={updatePurchase} /><AssumptionsCard /></section><div className="space-y-6 min-[1600px]:hidden"><section><AnalysisCoverageCard /></section><section><RiskPreviewCard /></section><MissingInformationCard /></div><div id="muistiinpanot" className="scroll-mt-24 sr-only">Muistiinpanot tulevat myöhemmässä versiossa.</div><div id="ai" className="scroll-mt-24 sr-only">Tekoälyselitys tulee myöhemmässä versiossa.</div><DecisionSummaryCard repairHistory={repairHistory} /><ProfessionalEvaluationCard onRequestEvaluation={onRequestEvaluation} /></div><aside className="sticky top-24 hidden min-w-0 space-y-6 min-[1600px]:block"><AnalysisCoverageCard /><RiskPreviewCard /><MissingInformationCard /></aside></div></main></div></div></TooltipProvider>;
}
