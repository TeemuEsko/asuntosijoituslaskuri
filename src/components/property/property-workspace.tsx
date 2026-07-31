"use client";

import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { analysisFacts, analysisTitle } from "@/core/analysis/analysis-presentation";
import { missingCriticalAnalysisFields } from "@/core/analysis/analysis-entry";
import { defaultEquityAssumption, userEquityAssumption } from "@/core/analysis/equity-assumption";
import { adaptInvestmentScore } from "@/core/analysis/investment-score-adapter";
import { calculateBankLoanAmount } from "@/core/calculations/investment-analysis";
import { synchronizePrices, type PrimaryPriceField } from "@/core/calculations/purchase-price";
import type { AnalysisReliability } from "@/core/analysis/requirements";
import type { HousingCompanyLoanResolution } from "@/core/analysis/housing-company-loan";
import type { FieldStatus } from "@/core/domain/field";
import { overrideEstimatedChoice, resolveMarketAssessments, restoreAutomaticChoice, type MarketAssessmentSet, type MarketAssessmentValue } from "@/core/market-assessment/model";
import type { RentEstimate } from "@/core/rent-data/types";
import { resolveEffectiveRent } from "@/core/rent-data/rent-estimation";
import type { HousingCompanyRenovationTexts, ListingParseResult, RenovationFinding } from "@/core/parser/listing-parser";
import type { NormalizedFieldKey } from "@/core/parser/synonyms";
import { assessRepairHistory, type RepairDocumentKind } from "@/core/rules/repair-history";
import type { PurchaseFieldKey } from "@/data/property-demo";
import { visualConditionScoreImpact } from "@/core/visual-condition/analysis";
import type { VisualConditionAnalysis } from "@/core/visual-condition/types";
import type { ListingImageAnalysisStatus } from "@/core/listing-images/types";
import { AnalysisCoverageCard } from "./analysis-coverage-card";
import { AnalysisHighlights, KeyMetrics } from "./analysis-summary";
import { AssumptionsCard, type AssumptionFieldKey, type AssumptionStatuses, type AssumptionValues } from "./assumptions-card";
import { DecisionSummaryCard } from "./decision-summary-card";
import { HousingCompanyCard } from "./details-cards";
import { HousingCompanyRenovationsCard } from "./housing-company-renovations-card";
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
import { VisualConditionCard } from "./visual-condition-card";
import type { MarketAssessmentKind } from "./rental-demand-selector";

export type ImportedPropertyData = Partial<Record<NormalizedFieldKey, number | string>> & { renovations?: RenovationFinding[]; housingCompanyRenovations?: HousingCompanyRenovationTexts; housingCompanyLoan?: HousingCompanyLoanResolution; documentKinds?: RepairDocumentKind[]; importReview?: ListingParseResult; analysisReliability?: AnalysisReliability; redemptionClause?: "no" | "yes" | "unchecked"; rentEstimate?: RentEstimate; marketAssessments?: MarketAssessmentSet; visualCondition?: VisualConditionAnalysis; listingImageAnalysis?: ListingImageAnalysisStatus };
const ANALYSIS_DRAFT_KEY = "asuntosijoituslaskuri:analysis-draft:v1";

function purchaseFromImport(data: ImportedPropertyData): Record<PurchaseFieldKey, number> { return { debtFreePrice: typeof data.debtFreePrice === "number" ? data.debtFreePrice : 0, salePrice: typeof data.salePrice === "number" ? data.salePrice : 0, companyLoanShare: typeof data.companyLoanShare === "number" ? data.companyLoanShare : 0, financingFeeMonthly: typeof data.financingFeeMonthly === "number" ? data.financingFeeMonthly : 0, renovationReserve: data.visualCondition && data.visualCondition.confirmationStatus !== "pending" ? data.visualCondition.estimatedRenovationCostRange?.recommendedReserve ?? 0 : 0 }; }
function expectedRoomsFromImport(data: ImportedPropertyData): number | undefined { if (typeof data.roomDescription !== "string") return undefined; const count = Number(data.roomDescription.match(/^\s*(\d+)/)?.[1]); return Number.isFinite(count) && count > 0 ? count : undefined; }
function companyLoanStatus(data: ImportedPropertyData): FieldStatus {
  if (data.housingCompanyLoan?.source === "user") return "user";
  if (data.housingCompanyLoan?.source === "direct") return "listing";
  if (data.housingCompanyLoan && data.housingCompanyLoan.source !== "unknown") return "inferred";
  return data.companyLoanShare === undefined ? "unknown" : "listing";
}
function marketInput(data: ImportedPropertyData, rentEstimate: RentEstimate) {
  const elevator = typeof data.elevator === "string" ? /kyllä|on|true/i.test(data.elevator) : typeof data.elevator === "number" ? data.elevator > 0 : undefined;
  return {
    city: typeof data.city === "string" ? data.city : undefined,
    district: typeof data.district === "string" ? data.district : undefined,
    postalCode: typeof data.postalCode === "string" ? data.postalCode : undefined,
    roomDescription: typeof data.roomDescription === "string" ? data.roomDescription : undefined,
    areaSqm: typeof data.areaSqm === "number" ? data.areaSqm : undefined,
    buildingType: typeof data.buildingType === "string" ? data.buildingType : undefined,
    constructionYear: typeof data.constructionYear === "number" ? data.constructionYear : undefined,
    elevator,
    floor: typeof data.floor === "number" ? data.floor : undefined,
    landOwnership: typeof data.landOwnership === "string" ? data.landOwnership : undefined,
    apartmentCount: typeof data.apartmentCount === "number" ? data.apartmentCount : undefined,
    statisticalRentAvailable: rentEstimate.source === "statistics_finland" || rentEstimate.source === "fallback" || Boolean(rentEstimate.benchmark),
  };
}

export function PropertyWorkspace({ importedData = {}, title, onRequestEvaluation }: { importedData?: ImportedPropertyData; title?: string; onRequestEvaluation?: () => void }) {
  const initialRentEstimate: RentEstimate = importedData.rentEstimate ?? resolveEffectiveRent({ listingRent: typeof importedData.currentRentMonthly === "number" ? importedData.currentRentMonthly : null, listingRentContext: "listing_explicit", listingRentUnit: "€/kk", areaSqm: typeof importedData.areaSqm === "number" ? importedData.areaSqm : null }).estimate;
  const initialAutomaticRent: RentEstimate = initialRentEstimate.benchmark ?? initialRentEstimate;
  const [data, setData] = useState(importedData);
  const [purchase, setPurchase] = useState<Record<PurchaseFieldKey, number>>(() => purchaseFromImport(importedData));
  const [statuses, setStatuses] = useState<Record<PurchaseFieldKey, FieldStatus>>({ debtFreePrice: importedData.debtFreePrice === undefined ? "unknown" : "listing", salePrice: importedData.salePrice === undefined ? "unknown" : "listing", companyLoanShare: companyLoanStatus(importedData), financingFeeMonthly: importedData.financingFeeMonthly === undefined ? "unknown" : "listing", renovationReserve: importedData.visualCondition && importedData.visualCondition.confirmationStatus !== "pending" ? importedData.visualCondition.renovationReserveSource === "user" ? "user" : "inferred" : "default" });
  const [renovationReserveUserEdited, setRenovationReserveUserEdited] = useState(importedData.visualCondition?.renovationReserveSource === "user");
  const [lastEditedPriceField, setLastEditedPriceField] = useState<PrimaryPriceField>("debtFreePrice");
  const [automaticRentEstimate] = useState<RentEstimate>(initialAutomaticRent);
  const [rentEstimate, setRentEstimate] = useState<RentEstimate>(initialRentEstimate);
  const initialMarketAssessments = importedData.marketAssessments ?? resolveMarketAssessments(marketInput(importedData, initialRentEstimate));
  const [marketAssessments, setMarketAssessments] = useState<MarketAssessmentSet>(initialMarketAssessments);
  const [assumptions, setAssumptions] = useState<AssumptionValues>(() => ({ monthlyRent: initialRentEstimate.effectiveMonthlyRent ?? 0, maintenanceFeeMonthly: typeof importedData.maintenanceFeeMonthly === "number" ? importedData.maintenanceFeeMonthly : 0, vacancyMonths: 1, annualInterestRate: 4.5, loanTermYears: 20, ...defaultEquityAssumption(), repaymentType: "annuity", rentalDemand: initialMarketAssessments.rentalDemand.effectiveValue ?? 3, otherCostsMonthly: 0, collateralValue: typeof importedData.debtFreePrice === "number" ? importedData.debtFreePrice * .7 : 0, transferTaxRate: 1.5, transactionCosts: 0, locationRisk: initialMarketAssessments.locationRisk.effectiveValue ?? 3, resaleLiquidity: initialMarketAssessments.resaleLiquidity.effectiveValue ?? 3 }));
  const [assumptionStatuses, setAssumptionStatuses] = useState<AssumptionStatuses>({ monthlyRent: initialRentEstimate.source === "user" ? "user" : initialRentEstimate.source === "statistics_finland" || initialRentEstimate.source === "fallback" ? "statistics" : initialRentEstimate.source === "listing" ? "listing" : "unknown", maintenanceFeeMonthly: importedData.maintenanceFeeMonthly === undefined ? "unknown" : "listing", vacancyMonths: "default", annualInterestRate: "default", loanTermYears: "default", equity: "default", repaymentType: "default", rentalDemand: "automatic", otherCostsMonthly: "default", collateralValue: importedData.debtFreePrice === undefined ? "default" : "inferred", transferTaxRate: "default", transactionCosts: "default", locationRisk: "automatic", resaleLiquidity: "automatic" });
  const [analysisUpdating, setAnalysisUpdating] = useState(false);
  const repairHistory = assessRepairHistory({ renovations: data.renovations ?? [], constructionYear: typeof data.constructionYear === "number" ? data.constructionYear : undefined, documentKinds: data.documentKinds ?? [], buildingType: typeof data.buildingType === "string" ? data.buildingType : undefined });
  const transferTax = purchase.debtFreePrice * Math.max(0, assumptions.transferTaxRate) / 100;
  const additionalFinancingNeeds = purchase.renovationReserve + transferTax + assumptions.transactionCosts;
  const bankLoanAmount = calculateBankLoanAmount(purchase.salePrice, assumptions.equity, additionalFinancingNeeds);
  const companyLoanKnown = statuses.companyLoanShare !== "missing" && statuses.companyLoanShare !== "unknown";
  const effectiveFinancingFee = purchase.companyLoanShare === 0 && companyLoanKnown ? 0 : statuses.financingFeeMonthly === "missing" || statuses.financingFeeMonthly === "unknown" ? undefined : purchase.financingFeeMonthly;
  const financingFeeStatus: FieldStatus = purchase.companyLoanShare === 0 && companyLoanKnown ? "inferred" : statuses.financingFeeMonthly;
  const financingFeeDescription = purchase.companyLoanShare === 0 && companyLoanKnown ? "Päätelty yhtiölainatiedosta: kohteella ei ole huoneistokohtaista yhtiölainaa." : effectiveFinancingFee === undefined ? "Ei tiedossa. Lisää huoneistokohtaiseen yhtiölainaan liittyvä kuukausittainen rahoitusvastike." : "Huoneistokohtaiseen yhtiölainaan liittyvä kuukausittainen pääoma- tai rahoitusvastike.";
  const effectiveRent = rentEstimate.effectiveMonthlyRent ?? undefined;
  const scoreSource = { debtFreePrice: purchase.debtFreePrice || undefined, salePrice: purchase.salePrice || undefined, currentRentMonthly: effectiveRent, maintenanceFeeMonthly: assumptions.maintenanceFeeMonthly || undefined, financingFeeMonthly: effectiveFinancingFee, companyLoanShare: companyLoanKnown ? purchase.companyLoanShare : undefined, vacancyMonths: assumptions.vacancyMonths, otherCostsMonthly: assumptions.otherCostsMonthly, renovationReserve: purchase.renovationReserve, transferTaxRate: assumptions.transferTaxRate, transactionCosts: assumptions.transactionCosts, bankLoanAmount, annualInterestRate: assumptions.annualInterestRate, loanTermYears: assumptions.loanTermYears, repaymentType: assumptions.repaymentType, equity: assumptions.equity, equitySource: assumptions.equitySource, equityUserOverridden: assumptions.equityUserOverridden, collateralValue: assumptions.collateralValue || undefined, rentalDemand: assumptions.rentalDemand, locationRisk: assumptions.locationRisk, resaleLiquidity: assumptions.resaleLiquidity, marketAssessments, repairHistory, visualConditionScoreImpact: visualConditionScoreImpact(data.visualCondition), visualConditionConfirmed: Boolean(data.visualCondition && data.visualCondition.confirmationStatus !== "pending"), visualConditionConfidence: data.visualCondition?.overallConfidence, visualConditionRating: data.visualCondition?.overallRating };
  const overallScore = adaptInvestmentScore(scoreSource);
  const presentationData = { ...data, listingTitle: data.listingTitle ?? (title && title !== "Uusi kohde" ? title : undefined) };
  const pageTitle = analysisTitle(presentationData);
  const facts = analysisFacts(presentationData);
  const missingCriticalFields = missingCriticalAnalysisFields({ debtFreePrice: purchase.debtFreePrice, maintenanceFeeMonthly: assumptions.maintenanceFeeMonthly, monthlyRent: effectiveRent, annualInterestRate: assumptions.annualInterestRate, loanTermYears: assumptions.loanTermYears, vacancyMonths: assumptions.vacancyMonths, companyLoanShare: purchase.companyLoanShare, companyLoanKnown, financingFeeKnown: effectiveFinancingFee !== undefined, bankLoanAmount, repaymentType: assumptions.repaymentType });
  const analysisReady = missingCriticalFields.length === 0;
  useEffect(() => { try { window.sessionStorage.setItem(ANALYSIS_DRAFT_KEY, JSON.stringify({ ...data, currentRentMonthly: rentEstimate.effectiveMonthlyRent ?? undefined, rentEstimate, marketAssessments })); } catch { /* Analyysi toimii myös ilman istuntotallennusta. */ } }, [data, rentEstimate, marketAssessments]);

  function updatePurchase(key: PurchaseFieldKey, value: number) { setPurchase((current) => ["debtFreePrice", "salePrice", "companyLoanShare"].includes(key) ? { ...current, ...synchronizePrices(current, key as "debtFreePrice" | "salePrice" | "companyLoanShare", value, lastEditedPriceField) } : { ...current, [key]: value }); if (key === "debtFreePrice" || key === "salePrice") setLastEditedPriceField(key); if (key === "renovationReserve") setRenovationReserveUserEdited(true); setStatuses((current) => ({ ...current, [key]: "user", ...(key === "debtFreePrice" ? { salePrice: "inferred" as const, companyLoanShare: "inferred" as const } : key === "salePrice" ? { debtFreePrice: "inferred" as const, companyLoanShare: "inferred" as const } : key === "companyLoanShare" ? { [lastEditedPriceField === "debtFreePrice" ? "salePrice" : "debtFreePrice"]: "inferred" as const } : {}) })); }
  function updateAssumption<K extends AssumptionFieldKey>(key: K, value: AssumptionValues[K]) { setAssumptions((current) => key === "equity" ? { ...current, ...userEquityAssumption(Number(value)) } : { ...current, [key]: value }); setAssumptionStatuses((current) => ({ ...current, [key]: "user" })); }
  function resetEquity() { setAssumptions((current) => ({ ...current, ...defaultEquityAssumption() })); setAssumptionStatuses((current) => ({ ...current, equity: "default" })); }
  function updateFinancingFee(value: number) { updatePurchase("financingFeeMonthly", value); }
  function updateMarketAssessment(kind: MarketAssessmentKind, value: MarketAssessmentValue) { setMarketAssessments((current) => ({ ...current, [kind]: overrideEstimatedChoice(current[kind], value) })); setAssumptions((current) => ({ ...current, [kind]: value })); setAssumptionStatuses((current) => ({ ...current, [kind]: "user" })); }
  function restoreMarketAssessment(kind: MarketAssessmentKind) { setMarketAssessments((current) => { const restored = restoreAutomaticChoice(current[kind]); setAssumptions((values) => ({ ...values, [kind]: restored.effectiveValue ?? 3 })); return { ...current, [kind]: restored }; }); setAssumptionStatuses((current) => ({ ...current, [kind]: "automatic" })); }
  function overrideRent(value: number) { const next = resolveEffectiveRent({ userRent: value, userOverridden: true, areaSqm: typeof data.areaSqm === "number" ? data.areaSqm : null, statisticsEstimate: automaticRentEstimate }).estimate; if (next.source !== "user") return; setRentEstimate(next); updateAssumption("monthlyRent", value); setAnalysisUpdating(true); window.setTimeout(() => setAnalysisUpdating(false), 500); }
  function restoreRent() { setRentEstimate(automaticRentEstimate); setAssumptions((current) => ({ ...current, monthlyRent: automaticRentEstimate.effectiveMonthlyRent ?? 0 })); setAssumptionStatuses((current) => ({ ...current, monthlyRent: automaticRentEstimate.source === "statistics_finland" || automaticRentEstimate.source === "fallback" ? "statistics" : automaticRentEstimate.source === "listing" ? "listing" : "unknown" })); }
  function addDocument(kind: RepairDocumentKind) { setData((current) => ({ ...current, documentKinds: [...new Set([...(current.documentKinds ?? []), kind])] })); }
  function updateVisualCondition(visualCondition: VisualConditionAnalysis) { const visualUserEdited = visualCondition.renovationReserveSource === "user"; setData((current) => ({ ...current, visualCondition })); if (visualUserEdited) setRenovationReserveUserEdited(true); if (visualCondition.confirmationStatus !== "pending" && (!renovationReserveUserEdited || visualUserEdited)) { setPurchase((current) => ({ ...current, renovationReserve: visualCondition.estimatedRenovationCostRange?.recommendedReserve ?? current.renovationReserve })); setStatuses((current) => ({ ...current, renovationReserve: visualUserEdited ? "user" : "derived" })); } }
  function updateImportedField(field: NormalizedFieldKey, value: number | string | undefined) { setData((current) => { const next = { ...current }; if (value === undefined) delete next[field]; else next[field] = value; const recalculated = resolveMarketAssessments(marketInput(next, rentEstimate)); setMarketAssessments((choices) => ({ rentalDemand: choices.rentalDemand.userOverridden ? choices.rentalDemand : recalculated.rentalDemand, locationRisk: choices.locationRisk.userOverridden ? choices.locationRisk : recalculated.locationRisk, resaleLiquidity: choices.resaleLiquidity.userOverridden ? choices.resaleLiquidity : recalculated.resaleLiquidity })); return next; }); if (["debtFreePrice", "salePrice", "companyLoanShare", "financingFeeMonthly"].includes(field)) setPurchase((current) => ({ ...current, [field]: typeof value === "number" ? value : 0 })); if (field === "maintenanceFeeMonthly" && typeof value === "number") { setAssumptions((current) => ({ ...current, maintenanceFeeMonthly: value })); setAssumptionStatuses((current) => ({ ...current, maintenanceFeeMonthly: "user" })); } if (field === "currentRentMonthly" && typeof value === "number") overrideRent(value); }

  return <TooltipProvider><div className="min-h-screen"><WorkspaceSidebar /><div className="min-w-0 min-[1100px]:pl-18 min-[1600px]:pl-60"><WorkspaceHeader title={pageTitle} location={typeof data.city === "string" ? data.city : ""} /><main className="mx-auto w-full max-w-[1500px] min-w-0 p-4 md:p-6 lg:p-8"><div className="min-w-0 space-y-8">
    <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">{analysisReady ? "Analyysi valmis" : "Analyysin lähtötiedot"}</p><h1 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{analysisReady ? "Analysoitu sijoituskohde" : "Täydennä sijoituskohteen analyysi"}</h1>{pageTitle !== "Analysoitu sijoituskohde" ? <p className="mt-2 font-medium">{pageTitle}</p> : null}{facts.length ? <p className="mt-1 text-sm text-muted-foreground">{facts.join(" · ")}</p> : null}<p className="mt-2 text-sm text-muted-foreground">{analysisReady ? "Analyysi perustuu käytettävissä oleviin kohde-, talous- ja rahoitustietoihin." : "Analyysi on alustava, kunnes kaikki kriittiset tiedot ovat käytettävissä."}</p></header>
    <ParserAnalysisSummary result={data.importReview} missingFields={missingCriticalFields} compact={analysisReady} />
    {analysisReady && analysisUpdating ? <p role="status" className="text-sm font-medium text-primary">Päivitetään analyysiä…</p> : null}
    <section aria-labelledby="assumptions-heading" className="space-y-4"><h2 id="assumptions-heading" className="text-xl font-semibold">Oletukset ja muokattavat tiedot</h2><PurchaseCard values={purchase} statuses={statuses} transferTaxRate={assumptions.transferTaxRate} transactionCosts={assumptions.transactionCosts} transferTaxStatus={assumptionStatuses.transferTaxRate ?? "default"} transactionCostsStatus={assumptionStatuses.transactionCosts ?? "default"} onChange={updatePurchase} onAssumptionChange={updateAssumption} /><AssumptionsCard values={assumptions} statuses={assumptionStatuses} rentEstimate={rentEstimate} financingFeeMonthly={effectiveFinancingFee} financingFeeStatus={financingFeeStatus} financingFeeDescription={financingFeeDescription} financingFeeDisabled={purchase.companyLoanShare === 0 && companyLoanKnown} bankLoanAmount={bankLoanAmount} marketAssessments={marketAssessments} onRentOverride={overrideRent} onRentRestore={restoreRent} onChange={updateAssumption} onFinancingFeeChange={updateFinancingFee} onResetEquity={resetEquity} onMarketChange={updateMarketAssessment} onMarketRestore={restoreMarketAssessment} /></section>
    <section id="talous" aria-labelledby="financial-heading" className="scroll-mt-24 space-y-3"><h2 id="financial-heading" className="text-xl font-semibold">Talous ja rahoitus</h2>{analysisReady ? <FinancialOverviewCard purchase={purchase} purchaseStatuses={statuses} effectiveFinancingFee={effectiveFinancingFee} assumptions={assumptions} analysis={overallScore} /> : null}</section>
    {analysisReady ? <><section aria-labelledby="calculation-heading" className="space-y-3"><h2 id="calculation-heading" className="text-xl font-semibold">Laskennan yhteenveto</h2><KeyMetrics analysis={overallScore} /></section><InvestmentOverallScore {...overallScore} /><section id="riskit" className="scroll-mt-24"><AnalysisHighlights rating={overallScore} /></section><VisualConditionCard initialAnalysis={data.visualCondition} listingImageAnalysis={data.listingImageAnalysis} areaSqm={typeof data.areaSqm === "number" ? data.areaSqm : undefined} expectedRooms={expectedRoomsFromImport(data)} listingCondition={typeof data.condition === "string" ? data.condition : undefined} onChange={updateVisualCondition} /><HousingCompanyRenovationsCard renovations={data.renovations} rawTexts={data.housingCompanyRenovations} /><DecisionSummaryCard repairHistory={repairHistory} /><OfferPriceCard input={scoreSource} /><section id="kohde" className="min-w-0 scroll-mt-24"><HousingCompanyCard importedData={data} /></section><AnalysisCoverageCard documentKinds={data.documentKinds} listingRenovationsFound={Boolean(data.renovations?.length)} onDocumentAdded={addDocument} /><ReportsCard input={scoreSource} analysis={overallScore} rentEstimate={rentEstimate} visualCondition={data.visualCondition} /><ProfessionalEvaluationCard onRequestEvaluation={onRequestEvaluation} /></> : null}
    {data.importReview ? <section id="dokumentit" className="scroll-mt-24"><h2 className="mb-3 text-lg font-semibold">Analyysin lähtötiedot ja lähteet</h2><ImportSourceReview result={data.importReview} onChange={updateImportedField} /></section> : null}
  </div></main></div></div></TooltipProvider>;
}
