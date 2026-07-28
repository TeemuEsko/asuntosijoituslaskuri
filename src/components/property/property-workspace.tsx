"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { analysisFacts, analysisTitle } from "@/core/analysis/analysis-presentation";
import { missingCriticalAnalysisFields } from "@/core/analysis/analysis-entry";
import { adaptInvestmentScore } from "@/core/analysis/investment-score-adapter";
import { synchronizePrices, type PrimaryPriceField } from "@/core/calculations/purchase-price";
import type { AnalysisReliability } from "@/core/analysis/requirements";
import type { FieldStatus } from "@/core/domain/field";
import type { RentEstimate } from "@/core/rent-data/types";
import type { ListingParseResult, RenovationFinding } from "@/core/parser/listing-parser";
import type { NormalizedFieldKey } from "@/core/parser/synonyms";
import { assessRepairHistory, type RepairDocumentKind } from "@/core/rules/repair-history";
import type { PurchaseFieldKey } from "@/data/property-demo";
import { AnalysisCoverageCard } from "./analysis-coverage-card";
import { AnalysisHighlights, KeyMetrics } from "./analysis-summary";
import { AssumptionsCard, type AssumptionValues } from "./assumptions-card";
import { DecisionSummaryCard } from "./decision-summary-card";
import { HousingCompanyCard } from "./details-cards";
import { ImportSourceReview } from "./import-source-review";
import { FinancialOverviewCard } from "./financial-overview-card";
import { InvestmentOverallScore } from "./investment-overall-score";
import { OfferPriceCard } from "./offer-price-card";
import { ParserAnalysisSummary } from "./parser-analysis-summary";
import { ProfessionalEvaluationCard } from "./professional-evaluation-card";
import { PurchaseCard } from "./purchase-card";
import { ReportsCard } from "./reports-card";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSidebar } from "./workspace-sidebar";

export type ImportedPropertyData = Partial<Record<NormalizedFieldKey, number | string>> & { renovations?: RenovationFinding[]; documentKinds?: RepairDocumentKind[]; importReview?: ListingParseResult; analysisReliability?: AnalysisReliability; redemptionClause?: "no" | "yes" | "unchecked"; rentEstimate?: RentEstimate };

function purchaseFromImport(data: ImportedPropertyData): Record<PurchaseFieldKey, number> { return { debtFreePrice: typeof data.debtFreePrice === "number" ? data.debtFreePrice : 0, salePrice: typeof data.salePrice === "number" ? data.salePrice : 0, companyLoanShare: typeof data.companyLoanShare === "number" ? data.companyLoanShare : 0, financingFeeMonthly: typeof data.financingFeeMonthly === "number" ? data.financingFeeMonthly : 0, renovationReserve: 0 }; }

export function PropertyWorkspace({ importedData = {}, title, onRequestEvaluation }: { importedData?: ImportedPropertyData; title?: string; onRequestEvaluation?: () => void }) {
  const initialAutomaticRent: RentEstimate = importedData.rentEstimate ?? (typeof importedData.currentRentMonthly === "number" ? { monthlyRent: importedData.currentRentMonthly, source: "listing", sourceName: "Myynti-ilmoitus", confidence: "high", userOverridden: false } : { monthlyRent: null, source: "unknown", confidence: "unknown", userOverridden: false });
  const [data, setData] = useState(importedData);
  const [purchase, setPurchase] = useState<Record<PurchaseFieldKey, number>>(() => purchaseFromImport(importedData));
  const [statuses, setStatuses] = useState<Record<PurchaseFieldKey, FieldStatus>>({ debtFreePrice: importedData.debtFreePrice === undefined ? "missing" : "parser", salePrice: importedData.salePrice === undefined ? "missing" : "parser", companyLoanShare: importedData.companyLoanShare === undefined ? "missing" : "parser", financingFeeMonthly: importedData.financingFeeMonthly === undefined ? "missing" : "parser", renovationReserve: "user" });
  const [lastEditedPriceField, setLastEditedPriceField] = useState<PrimaryPriceField>("debtFreePrice");
  const [automaticRentEstimate, setAutomaticRentEstimate] = useState<RentEstimate>(initialAutomaticRent);
  const [rentEstimate, setRentEstimate] = useState<RentEstimate>(initialAutomaticRent);
  const [assumptions, setAssumptions] = useState<AssumptionValues>(() => ({ monthlyRent: initialAutomaticRent.monthlyRent ?? 0, maintenanceFeeMonthly: typeof importedData.maintenanceFeeMonthly === "number" ? importedData.maintenanceFeeMonthly : 0, vacancyMonths: 1, annualInterestRate: 4.5, loanTermYears: 20, equity: 20_000, repaymentType: "annuity", rentalDemand: 3, otherCostsMonthly: 0, maintenanceReserveMonthly: 0, collateralValue: typeof importedData.debtFreePrice === "number" ? importedData.debtFreePrice * .7 : 0, transferTaxRate: 1.5, transactionCosts: 0, locationRisk: 3, resaleLiquidity: 3 }));
  const [analysisUpdating, setAnalysisUpdating] = useState(false);
  const repairHistory = assessRepairHistory({ renovations: data.renovations ?? [], constructionYear: typeof data.constructionYear === "number" ? data.constructionYear : undefined, documentKinds: data.documentKinds ?? [], buildingType: typeof data.buildingType === "string" ? data.buildingType : undefined });
  const bankLoanAmount = Math.max(0, purchase.salePrice - assumptions.equity);
  const effectiveFinancingFee = purchase.companyLoanShare === 0 && statuses.companyLoanShare !== "missing" ? 0 : statuses.financingFeeMonthly === "missing" ? undefined : purchase.financingFeeMonthly;
  const effectiveRent = rentEstimate.monthlyRent ?? undefined;
  const scoreSource = { debtFreePrice: purchase.debtFreePrice || undefined, salePrice: purchase.salePrice || undefined, currentRentMonthly: effectiveRent, maintenanceFeeMonthly: assumptions.maintenanceFeeMonthly || undefined, financingFeeMonthly: effectiveFinancingFee, companyLoanShare: statuses.companyLoanShare === "missing" ? undefined : purchase.companyLoanShare, vacancyMonths: assumptions.vacancyMonths, otherCostsMonthly: assumptions.otherCostsMonthly, maintenanceReserveMonthly: assumptions.maintenanceReserveMonthly, renovationReserve: purchase.renovationReserve, transferTaxRate: assumptions.transferTaxRate, transactionCosts: assumptions.transactionCosts, bankLoanAmount, annualInterestRate: assumptions.annualInterestRate, loanTermYears: assumptions.loanTermYears, repaymentType: assumptions.repaymentType, equity: assumptions.equity, collateralValue: assumptions.collateralValue || undefined, rentalDemand: assumptions.rentalDemand, locationRisk: assumptions.locationRisk, resaleLiquidity: assumptions.resaleLiquidity, repairHistory };
  const overallScore = adaptInvestmentScore(scoreSource);
  const presentationData = { ...data, listingTitle: data.listingTitle ?? (title && title !== "Uusi kohde" ? title : undefined) };
  const pageTitle = analysisTitle(presentationData);
  const facts = analysisFacts(presentationData);
  const missingCriticalFields = missingCriticalAnalysisFields({ debtFreePrice: purchase.debtFreePrice, maintenanceFeeMonthly: assumptions.maintenanceFeeMonthly, monthlyRent: effectiveRent, annualInterestRate: assumptions.annualInterestRate, loanTermYears: assumptions.loanTermYears, vacancyMonths: assumptions.vacancyMonths, companyLoanShare: purchase.companyLoanShare, companyLoanKnown: statuses.companyLoanShare !== "missing", financingFeeKnown: effectiveFinancingFee !== undefined, bankLoanAmount, repaymentType: assumptions.repaymentType });
  const analysisReady = missingCriticalFields.length === 0;

  function updatePurchase(key: PurchaseFieldKey, value: number) { setPurchase((current) => ["debtFreePrice", "salePrice", "companyLoanShare"].includes(key) ? { ...current, ...synchronizePrices(current, key as "debtFreePrice" | "salePrice" | "companyLoanShare", value, lastEditedPriceField) } : { ...current, [key]: value }); if (key === "debtFreePrice" || key === "salePrice") setLastEditedPriceField(key); setStatuses((current) => ({ ...current, [key]: "user", ...(key === "debtFreePrice" ? { salePrice: "derived" as const } : key === "salePrice" ? { debtFreePrice: "derived" as const } : key === "companyLoanShare" ? { [lastEditedPriceField === "debtFreePrice" ? "salePrice" : "debtFreePrice"]: "derived" as const } : {}) })); }
  function updateAssumption<K extends keyof AssumptionValues>(key: K, value: AssumptionValues[K]) { setAssumptions((current) => ({ ...current, [key]: value })); }
  function overrideRent(value: number) { setRentEstimate({ monthlyRent: value, source: "user", sourceName: "Käyttäjän määrittämä vuokra", confidence: "high", userOverridden: true, previousAutomaticEstimate: automaticRentEstimate.monthlyRent, benchmark: automaticRentEstimate.benchmark ?? (["statistics_finland", "fallback"].includes(automaticRentEstimate.source) ? automaticRentEstimate : null) }); updateAssumption("monthlyRent", value); setAnalysisUpdating(true); window.setTimeout(() => setAnalysisUpdating(false), 500); }
  function restoreRent() { setRentEstimate(automaticRentEstimate); updateAssumption("monthlyRent", automaticRentEstimate.monthlyRent ?? 0); }
  function addDocument(kind: RepairDocumentKind) { setData((current) => ({ ...current, documentKinds: [...new Set([...(current.documentKinds ?? []), kind])] })); }
  function updateImportedField(field: NormalizedFieldKey, value: number | string | undefined) { setData((current) => { const next = { ...current }; if (value === undefined) delete next[field]; else next[field] = value; return next; }); if (["debtFreePrice", "salePrice", "companyLoanShare", "financingFeeMonthly"].includes(field)) setPurchase((current) => ({ ...current, [field]: typeof value === "number" ? value : 0 })); if (field === "maintenanceFeeMonthly" && typeof value === "number") updateAssumption("maintenanceFeeMonthly", value); if (field === "currentRentMonthly" && typeof value === "number") { const next: RentEstimate = { monthlyRent: value, source: "listing", sourceName: "Myynti-ilmoitus", confidence: "high", userOverridden: false, benchmark: automaticRentEstimate.benchmark }; setAutomaticRentEstimate(next); setRentEstimate(next); updateAssumption("monthlyRent", value); } }

  return <TooltipProvider><div className="min-h-screen"><WorkspaceSidebar /><div className="min-w-0 min-[1100px]:pl-18 min-[1600px]:pl-60"><WorkspaceHeader title={pageTitle} location={typeof data.city === "string" ? data.city : ""} /><main className="mx-auto w-full max-w-[1500px] min-w-0 p-4 md:p-6 lg:p-8"><div className="min-w-0 space-y-8">
    <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">{analysisReady ? "Analyysi valmis" : "Analyysin lähtötiedot"}</p><h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{analysisReady ? "Analysoitu sijoituskohde" : "Täydennä sijoituskohteen analyysi"}</h1>{pageTitle !== "Analysoitu sijoituskohde" ? <p className="mt-2 font-medium">{pageTitle}</p> : null}{facts.length ? <p className="mt-1 text-sm text-muted-foreground">{facts.join(" · ")}</p> : null}<p className="mt-2 text-sm text-muted-foreground">{analysisReady ? "Analyysi perustuu käytettävissä oleviin kohde-, talous- ja rahoitustietoihin." : "Analyysi on alustava, kunnes kaikki kriittiset tiedot ovat käytettävissä."}</p></header>
    <ParserAnalysisSummary result={data.importReview} missingFields={missingCriticalFields} compact={analysisReady} />
    {analysisReady && analysisUpdating ? <p role="status" className="text-sm font-medium text-primary">Päivitetään analyysiä…</p> : null}
    <section aria-labelledby="assumptions-heading" className="space-y-3"><h2 id="assumptions-heading" className="text-xl font-semibold">Oletukset ja muokattavat tiedot</h2><AssumptionsCard values={assumptions} rentEstimate={rentEstimate} onRentOverride={overrideRent} onRentRestore={restoreRent} onChange={updateAssumption} onUpdating={setAnalysisUpdating} /></section>
    <section id="talous" aria-labelledby="financial-heading" className="scroll-mt-24 space-y-3"><h2 id="financial-heading" className="text-xl font-semibold">Talous ja rahoitus</h2><PurchaseCard values={purchase} statuses={statuses} onChange={updatePurchase} />{analysisReady ? <FinancialOverviewCard purchase={purchase} assumptions={assumptions} analysis={overallScore} /> : null}</section>
    {analysisReady ? <><section aria-labelledby="calculation-heading" className="space-y-3"><h2 id="calculation-heading" className="text-xl font-semibold">Laskennan yhteenveto</h2><KeyMetrics analysis={overallScore} /></section><InvestmentOverallScore {...overallScore} /><section id="riskit" className="scroll-mt-24"><AnalysisHighlights rating={overallScore} /></section><OfferPriceCard input={scoreSource} /><DecisionSummaryCard repairHistory={repairHistory} /><section id="kohde" className="min-w-0 scroll-mt-24"><HousingCompanyCard importedData={data} /></section><AnalysisCoverageCard documentKinds={data.documentKinds} onDocumentAdded={addDocument} /><ReportsCard input={scoreSource} analysis={overallScore} rentEstimate={rentEstimate} /><ProfessionalEvaluationCard onRequestEvaluation={onRequestEvaluation} /></> : null}
    {data.importReview ? <section id="dokumentit" className="scroll-mt-24"><h2 className="mb-3 text-lg font-semibold">Analyysin lähtötiedot ja lähteet</h2><ImportSourceReview result={data.importReview} onChange={updateImportedField} /></section> : null}
  </div></main></div></div></TooltipProvider>;
}
