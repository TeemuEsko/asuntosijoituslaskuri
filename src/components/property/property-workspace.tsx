"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { FieldStatus } from "@/core/domain/field";
import type { NormalizedFieldKey } from "@/core/parser/synonyms";
import type { PurchaseFieldKey } from "@/data/property-demo";
import { AnalysisCoverageCard } from "./analysis-coverage-card";
import { AssumptionsCard } from "./assumptions-card";
import { DecisionSummaryCard } from "./decision-summary-card";
import { HousingCompanyCard, PropertyDetailsCard } from "./details-cards";
import { MissingInformationCard } from "./missing-information-card";
import { ProfessionalEvaluationCard } from "./professional-evaluation-card";
import { PurchaseCard } from "./purchase-card";
import { RiskPreviewCard } from "./risk-preview-card";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSidebar } from "./workspace-sidebar";

export type ImportedPropertyData = Partial<Record<NormalizedFieldKey, number | string>>;

function purchaseFromImport(data: ImportedPropertyData): Record<PurchaseFieldKey, number> {
  return {
    debtFreePrice: typeof data.debtFreePrice === "number" ? data.debtFreePrice : 0,
    salePrice: typeof data.salePrice === "number" ? data.salePrice : 0,
    companyLoanShare: typeof data.companyLoanShare === "number" ? data.companyLoanShare : 0,
    financingFeeMonthly: typeof data.financingFeeMonthly === "number" ? data.financingFeeMonthly : 0,
    renovationReserve: 0,
  };
}

type PropertyWorkspaceProps = {
  importedData?: ImportedPropertyData;
  title?: string;
  onRequestEvaluation?: () => void;
};

export function PropertyWorkspace({ importedData = {}, title = "Uusi kohde", onRequestEvaluation }: PropertyWorkspaceProps) {
  const [purchase, setPurchase] = useState<Record<PurchaseFieldKey, number>>(() => purchaseFromImport(importedData));
  const [statuses, setStatuses] = useState<Record<PurchaseFieldKey, FieldStatus>>({
    debtFreePrice: importedData.debtFreePrice === undefined ? "missing" : "parser",
    salePrice: importedData.salePrice === undefined ? "missing" : "parser",
    companyLoanShare: importedData.companyLoanShare === undefined ? "missing" : "parser",
    financingFeeMonthly: importedData.financingFeeMonthly === undefined ? "missing" : "parser",
    renovationReserve: "user",
  });

  function updatePurchase(key: PurchaseFieldKey, value: number) {
    setPurchase((current) => ({ ...current, [key]: value }));
    setStatuses((current) => ({ ...current, [key]: "user" }));
  }

  return <TooltipProvider><div className="min-h-screen"><WorkspaceSidebar /><div className="lg:pl-60"><WorkspaceHeader title={title} /><main className="mx-auto max-w-[1540px] p-4 md:p-6"><div id="dokumentit" className="scroll-mt-24" /><div id="riskit" className="scroll-mt-24" /><div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]"><div className="min-w-0 space-y-6"><section id="kohde" className="scroll-mt-24"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">Kohdeanalyysi</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground">Tarkista lähtötiedot ja täydennä omat oletuksesi.</p></div><div className="grid gap-6 md:grid-cols-2"><PropertyDetailsCard importedData={importedData} /><HousingCompanyCard importedData={importedData} /></div></section><section id="talous" className="scroll-mt-24 space-y-6"><PurchaseCard values={purchase} statuses={statuses} onChange={updatePurchase} /><AssumptionsCard /></section><div className="space-y-6 xl:hidden"><section><AnalysisCoverageCard /></section><section><RiskPreviewCard /></section><MissingInformationCard /></div><div id="muistiinpanot" className="scroll-mt-24 sr-only">Muistiinpanot tulevat myöhemmässä versiossa.</div><div id="ai" className="scroll-mt-24 sr-only">Tekoälyselitys tulee myöhemmässä versiossa.</div><DecisionSummaryCard /><ProfessionalEvaluationCard onRequestEvaluation={onRequestEvaluation} /></div><aside className="sticky top-23 hidden space-y-6 xl:block"><AnalysisCoverageCard /><RiskPreviewCard /><MissingInformationCard /></aside></div></main></div></div></TooltipProvider>;
}
