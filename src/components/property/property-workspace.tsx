"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { FieldStatus } from "@/core/domain/field";
import type { NormalizedFieldKey } from "@/core/parser/synonyms";
import type { RenovationFinding } from "@/core/parser/listing-parser";
import { assessRepairHistory, type RepairDocumentKind } from "@/core/rules/repair-history";
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

export type ImportedPropertyData = Partial<Record<NormalizedFieldKey, number | string>> & {
  renovations?: RenovationFinding[];
  documentKinds?: RepairDocumentKind[];
};

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
  const repairHistory = assessRepairHistory({
    renovations: importedData.renovations ?? [],
    constructionYear: typeof importedData.constructionYear === "number" ? importedData.constructionYear : undefined,
    documentKinds: importedData.documentKinds ?? [],
  });

  function updatePurchase(key: PurchaseFieldKey, value: number) {
    setPurchase((current) => ({ ...current, [key]: value }));
    setStatuses((current) => ({ ...current, [key]: "user" }));
  }

  const location = [importedData.address, importedData.city].filter((value): value is string => typeof value === "string" && Boolean(value)).join(", ");

  return <TooltipProvider><div className="min-h-screen"><WorkspaceSidebar /><div className="min-w-0 min-[1100px]:pl-18 min-[1600px]:pl-60"><WorkspaceHeader title={title} location={location} /><main className="mx-auto w-full max-w-[1720px] min-w-0 p-4 md:p-6 lg:p-8"><div id="dokumentit" className="scroll-mt-24" /><div id="riskit" className="scroll-mt-24" /><div className="grid min-w-0 items-start gap-8 min-[1600px]:grid-cols-[minmax(0,1fr)_minmax(300px,350px)]"><div className="min-w-0 space-y-8"><section id="kohde" className="min-w-0 scroll-mt-24"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">Kohdeanalyysi</p><h2 className="mt-1 break-words text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground">Tarkista lähtötiedot ja täydennä omat oletuksesi.</p></div><div className="grid min-w-0 gap-6 lg:grid-cols-2"><PropertyDetailsCard importedData={importedData} /><HousingCompanyCard importedData={importedData} /></div></section><section id="talous" className="min-w-0 scroll-mt-24 space-y-8"><PurchaseCard values={purchase} statuses={statuses} onChange={updatePurchase} /><AssumptionsCard /></section><div className="space-y-6 min-[1600px]:hidden"><section><AnalysisCoverageCard /></section><section><RiskPreviewCard /></section><MissingInformationCard /></div><div id="muistiinpanot" className="scroll-mt-24 sr-only">Muistiinpanot tulevat myöhemmässä versiossa.</div><div id="ai" className="scroll-mt-24 sr-only">Tekoälyselitys tulee myöhemmässä versiossa.</div><DecisionSummaryCard repairHistory={repairHistory} /><ProfessionalEvaluationCard onRequestEvaluation={onRequestEvaluation} /></div><aside className="sticky top-24 hidden min-w-0 space-y-6 min-[1600px]:block"><AnalysisCoverageCard /><RiskPreviewCard /><MissingInformationCard /></aside></div></main></div></div></TooltipProvider>;
}
