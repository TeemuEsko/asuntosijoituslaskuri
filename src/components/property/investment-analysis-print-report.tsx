import type { InvestmentAnalysisResult, RepaymentType } from "@/core/calculations/investment-analysis";
import { getInvestmentRating } from "@/core/analysis/investment-overall-score";
import { displayListingStringValue, landOwnershipLabels, renovationComponentLabels, timeStatusLabels } from "@/core/i18n/display-values";
import type { MarketAssessmentSet, MarketAssessmentValue } from "@/core/market-assessment/model";
import { formatFinnishNumber } from "@/core/parser/normalization";
import type { RenovationFinding } from "@/core/parser/listing-parser";
import type { RentEstimate } from "@/core/rent-data/types";
import type { RepairHistoryAssessment } from "@/core/rules/repair-history";
import type { PurchaseFieldKey } from "@/data/property-demo";
import type { AssumptionValues } from "./assumptions-card";
import type { ImportedPropertyData } from "./property-workspace";

const money = (value: number | null | undefined, suffix = "€") =>
  typeof value === "number" && Number.isFinite(value)
    ? `${formatFinnishNumber(value, 1)} ${suffix}`
    : "Ei tiedossa";
const percent = (value: number | null | undefined, decimals = 1) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${formatFinnishNumber(value, decimals)} %`
    : "Ei tiedossa";

const repaymentLabels: Record<RepaymentType, string> = {
  annuity: "Annuiteetti",
  fixed_payment: "Kiinteä tasaerä",
  equal_principal: "Tasalyhennys",
  interest_only: "Vain korko",
  bullet: "Kertalyhennys",
};

const confidenceLabels = {
  high: "Korkea",
  medium: "Kohtalainen",
  low: "Matala",
  unknown: "Ei tiedossa",
} as const;

const marketLabels: Record<
  "rentalDemand" | "locationRisk" | "resaleLiquidity",
  { title: string; values: Record<MarketAssessmentValue, string> }
> = {
  rentalDemand: {
    title: "Vuokrakysyntä",
    values: { 1: "Heikko", 2: "Melko heikko", 3: "Normaali", 4: "Hyvä", 5: "Vahva" },
  },
  locationRisk: {
    title: "Sijaintiriski",
    values: { 1: "Pieni", 2: "Melko pieni", 3: "Keskitaso", 4: "Melko suuri", 5: "Suuri" },
  },
  resaleLiquidity: {
    title: "Jälleenmyytävyys",
    values: { 1: "Hidas", 2: "Melko hidas", 3: "Normaali", 4: "Hyvä", 5: "Nopea" },
  },
};

type Row = readonly [label: string, value: string];

function ReportRows({ rows }: { rows: Row[] }) {
  return (
    <dl className="print-report-rows">
      {rows.map(([label, value]) => (
        <div key={label} className="print-report-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FinancialGroup({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="print-report-panel print-avoid-break">
      <h3>{title}</h3>
      <ReportRows rows={rows} />
    </section>
  );
}

function HighlightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "risk";
}) {
  const visibleItems = items.length ? items.slice(0, 4) : ["Ei erillisiä havaintoja käytettävissä olevilla tiedoilla."];
  return (
    <section className={`print-report-highlight print-report-highlight-${tone} print-avoid-break`}>
      <h3>{title}</h3>
      <ul>
        {visibleItems.map((item) => (
          <li key={item}>
            <span aria-hidden>{tone === "positive" ? "✓" : "!"}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function renovationTiming(repair: RenovationFinding): string {
  if (repair.yearFrom !== null && repair.yearTo !== null)
    return `${repair.yearFrom}–${repair.yearTo}`;
  if (repair.year !== null) return String(repair.year);
  if (repair.timeHorizon === "next_five_years") return "Seuraavan viiden vuoden aikana";
  if (repair.timeHorizon === "one_to_five_years") return "1–5 vuoden aikana";
  if (repair.timeHorizon === "near_future") return "Lähivuosina";
  return "Ajankohta ei tiedossa";
}

function MarketAssessment({
  kind,
  choice,
}: {
  kind: keyof MarketAssessmentSet;
  choice: MarketAssessmentSet[keyof MarketAssessmentSet];
}) {
  const label = marketLabels[kind];
  const value = choice.effectiveValue;
  const explanation = choice.factors.find((factor) => factor.impact !== "neutral")?.description ?? choice.factors[0]?.description ?? choice.sourceName;
  return (
    <section className="print-market-card print-avoid-break">
      <p className="print-eyebrow">{label.title}</p>
      <div className="print-market-value">
        <strong>{value === null ? "–" : `${value} / 5`}</strong>
        <span>{value === null ? "Ei tiedossa" : label.values[value]}</span>
      </div>
      <p>{explanation}</p>
      <small>Luotettavuus: {confidenceLabels[choice.confidence]}</small>
    </section>
  );
}

function propertyValue(data: ImportedPropertyData, key: keyof ImportedPropertyData) {
  const value = data[key];
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

export function InvestmentAnalysisPrintReport({
  reportAddress,
  facts,
  data,
  purchase,
  assumptions,
  effectiveFinancingFee,
  companyLoanKnown,
  analysis,
  rentEstimate,
  marketAssessments,
  repairHistory,
}: {
  reportAddress?: string;
  facts: string[];
  data: ImportedPropertyData;
  purchase: Record<PurchaseFieldKey, number>;
  assumptions: AssumptionValues;
  effectiveFinancingFee?: number;
  companyLoanKnown: boolean;
  analysis: InvestmentAnalysisResult;
  rentEstimate: RentEstimate;
  marketAssessments: MarketAssessmentSet;
  repairHistory: RepairHistoryAssessment;
}) {
  const rating = getInvestmentRating(analysis.score);
  const collateralKnown = analysis.collateralShortfall !== undefined && analysis.collateralBuffer !== undefined;
  const collateralIsGap = collateralKnown && (analysis.collateralShortfall ?? 0) > 0;
  const collateralValue = collateralIsGap ? analysis.collateralShortfall : analysis.collateralBuffer;
  const completedRenovations = (data.renovations ?? []).filter((item) => ["completed", "ongoing"].includes(item.status));
  const plannedRenovations = (data.renovations ?? []).filter((item) => !["completed", "ongoing"].includes(item.status));
  const reviewItems = [...new Set([
    ...(analysis.missingFactors ?? []),
    ...(data.documentWarnings ?? []),
    ...(repairHistory.sourceLimitation ? [repairHistory.sourceLimitation] : []),
    ...repairHistory.relevantSystems.slice(0, 4).map((item) => `${item.label}: ${item.reason}`),
  ])];
  const rentAreaNotice = rentEstimate.sourceAreaLevel && !["postal_code", "municipality"].includes(rentEstimate.sourceAreaLevel)
    ? "Vuokra-arvio perustuu kuntaa laajempaan vertailualueeseen."
    : undefined;
  const housingRows: Row[] = [
    ["Taloyhtiö", String(propertyValue(data, "housingCompanyName") ?? "Ei tiedossa")],
    ["Hoitovastike", money(assumptions.maintenanceFeeMonthly, "€/kk")],
    ["Rahoitusvastike", money(effectiveFinancingFee, "€/kk")],
    ["Tontti", typeof data.landOwnership === "string" ? landOwnershipLabels[data.landOwnership as keyof typeof landOwnershipLabels] ?? data.landOwnership : "Ei tiedossa"],
    ["Lämmitysmuoto", typeof data.heatingType === "string" ? displayListingStringValue("heatingType", data.heatingType) : "Ei tiedossa"],
  ];
  if (typeof data.apartmentCount === "number") housingRows.push(["Huoneistoja", formatFinnishNumber(data.apartmentCount, 0)]);
  if (data.redemptionClause) housingRows.push(["Lunastuslauseke", data.redemptionClause === "yes" ? "Kyllä – tarkista ehdot yhtiöjärjestyksestä" : data.redemptionClause === "no" ? "Ei" : "Ei voitu tarkistaa"]);

  return (
    <article className="print-report" aria-label="Tulostettava sijoitusanalyysi">
      <section className="print-report-page print-report-cover">
        <header className="print-report-brand">
          <span>asuntosijoituslaskuri.fi</span>
          <span>Sijoitusanalyysi</span>
        </header>
        <div className="print-report-property">
          <p className="print-eyebrow">Sijoitusanalyysi</p>
          <h1>{reportAddress ?? "Analysoitu sijoituskohde"}</h1>
          {facts.length ? <p>{facts.join(" · ")}</p> : null}
        </div>

        <section className="print-score-hero print-avoid-break">
          <p className="print-eyebrow">Sijoitusmahdollisuus</p>
          <div className="print-score-heading">
            <strong>{analysis.score} <span>/ 100</span></strong>
            <div><b style={{ backgroundColor: rating.color }}>{rating.grade}</b><span>{rating.label}</span></div>
          </div>
          <div className="print-score-track" role="img" aria-label={`Sijoitusmahdollisuus ${analysis.score} pistettä sadasta`}>
            <span style={{ width: `${analysis.score}%`, backgroundColor: rating.color }} />
          </div>
          <p>{rating.summary}</p>
        </section>

        <div className="print-kpi-grid">
          {[
            ["Nettovuokratuotto", percent(analysis.netRentalYield, 2)],
            ["Kassavirta", money(analysis.cashFlowAfterBankLoan, "€/kk")],
            ["Arvioitu kuukausivuokra", money(rentEstimate.effectiveMonthlyRent, "€/kk")],
            [collateralIsGap ? "Vakuusvaje" : collateralKnown ? "Vakuuspuskuri" : "Vakuustilanne", money(collateralValue)],
          ].map(([label, value]) => (
            <section key={label} className="print-kpi-card print-avoid-break"><p>{label}</p><strong>{value}</strong></section>
          ))}
        </div>
        <div className="print-highlight-grid">
          <HighlightList title="Tärkeimmät vahvuudet" items={analysis.positiveFactors ?? []} tone="positive" />
          <HighlightList title="Huomioitavat riskit" items={analysis.warningFactors ?? []} tone="risk" />
        </div>
      </section>

      <section className="print-report-page">
        <header className="print-section-heading"><p className="print-eyebrow">02</p><h2>Tuotto ja rahoitus</h2></header>
        <div className="print-financial-grid">
          <FinancialGroup title="Hankinta" rows={[
            ["Velaton hinta", money(purchase.debtFreePrice)],
            ["Myyntihinta", money(purchase.salePrice)],
            ["Yhtiölainaosuus", companyLoanKnown ? money(purchase.companyLoanShare) : "Ei tiedossa"],
            ["Varainsiirtovero", money(analysis.transferTax)],
            ["Muut hankintakulut", money(assumptions.transactionCosts)],
            ["Kokonaisinvestointi", money(analysis.adjustedAcquisitionPrice)],
          ]} />
          <FinancialGroup title="Tuotto" rows={[
            ["Kuukausivuokra", money(rentEstimate.effectiveMonthlyRent, "€/kk")],
            ["Hoitovastike", money(assumptions.maintenanceFeeMonthly, "€/kk")],
            ["Rahoitusvastike", money(effectiveFinancingFee, "€/kk")],
            ["Muut kuukausikulut", money(assumptions.otherCostsMonthly, "€/kk")],
            ["Tyhjäkäynti", `${formatFinnishNumber(assumptions.vacancyMonths, 1)} kk/v`],
            ["Bruttovuokratuotto", percent(analysis.grossRentalYield)],
            ["Nettovuokratuotto", percent(analysis.netRentalYield, 2)],
          ]} />
          <FinancialGroup title="Rahoitus" rows={[
            ["Pankkilaina", money(analysis.bankLoanAmount)],
            ["Oma pääoma", money(assumptions.equity)],
            ["Korko", percent(assumptions.annualInterestRate)],
            ["Laina-aika", `${formatFinnishNumber(assumptions.loanTermYears, 1)} vuotta`],
            ["Lyhennystapa", repaymentLabels[assumptions.repaymentType]],
            ["Kuukausierä", money(analysis.monthlyBankLoanPayment, "€/kk")],
            ["Lainan lyhennys", money(analysis.monthlyBankLoanPrincipal, "€/kk")],
          ]} />
          <FinancialGroup title="Vakuudet" rows={[
            ["Vakuusarvo", money(assumptions.collateralValue)],
            ["Pankkilaina", money(analysis.bankLoanAmount)],
            [collateralIsGap ? "Vakuusvaje" : "Vakuuspuskuri", money(collateralValue)],
            ["Velkavipu", percent(typeof analysis.leverageRatio === "number" ? analysis.leverageRatio * 100 : undefined)],
          ]} />
        </div>
      </section>

      <section className="print-report-page">
        <header className="print-section-heading"><p className="print-eyebrow">03</p><h2>Markkina-arviot</h2></header>
        <div className="print-market-grid">
          <MarketAssessment kind="rentalDemand" choice={marketAssessments.rentalDemand} />
          <MarketAssessment kind="locationRisk" choice={marketAssessments.locationRisk} />
          <MarketAssessment kind="resaleLiquidity" choice={marketAssessments.resaleLiquidity} />
        </div>
        <section className="print-rent-summary print-avoid-break">
          <div>
            <p className="print-eyebrow">Vuokra-arvio</p>
            <h3>{money(rentEstimate.effectiveMonthlyRent, "€/kk")}</h3>
            <p>{rentEstimate.sourceName ?? "Lähde ei tiedossa"}</p>
          </div>
          <ReportRows rows={[
            ["Neliövuokra", money(rentEstimate.rentPerSquareMeter, "€/m²/kk")],
            ["Vertailualue", rentEstimate.sourceArea ?? "Ei tiedossa"],
            ["Ajanjakso", rentEstimate.referencePeriod ?? "Ei tiedossa"],
            ["Havaintoja", typeof rentEstimate.sampleSize === "number" ? formatFinnishNumber(rentEstimate.sampleSize, 0) : "Ei tiedossa"],
          ]} />
          {rentAreaNotice ? <p className="print-report-notice">{rentAreaNotice}</p> : null}
        </section>
        <section className="print-report-section">
          <header><p className="print-eyebrow">Kohde</p><h2>Taloyhtiön perustiedot</h2></header>
          <div className="print-report-panel print-avoid-break"><ReportRows rows={housingRows} /></div>
        </section>
      </section>

      <section className="print-report-page print-report-last-page">
        <header className="print-section-heading"><p className="print-eyebrow">04</p><h2>Taloyhtiö ja remontit</h2></header>
        <section className="print-repair-summary print-avoid-break">
          <h3>{repairHistory.title}</h3>
          <p>{repairHistory.message}</p>
          <small>Arvion luotettavuus: {confidenceLabels[repairHistory.confidence]}</small>
        </section>
        <div className="print-repair-columns">
          {[
            ["Tehdyt remontit", completedRenovations],
            ["Suunnitellut remontit", plannedRenovations],
          ].map(([title, renovations]) => (
            <section key={title as string} className="print-report-panel">
              <h3>{title as string}</h3>
              {(renovations as RenovationFinding[]).length ? (
                <ul className="print-repair-list">
                  {(renovations as RenovationFinding[]).map((repair) => (
                    <li key={repair.id} className="print-avoid-break">
                      <strong>{renovationComponentLabels[repair.component]}</strong>
                      <span>{timeStatusLabels[repair.status]} · {renovationTiming(repair)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="print-empty">Ei tunnistettuja tietoja.</p>}
            </section>
          ))}
        </div>
        <section className="print-review-block">
          <header><p className="print-eyebrow">Tarkistettavat tiedot</p><h2>Varmista ennen sijoituspäätöstä</h2></header>
          {reviewItems.length ? <ul>{reviewItems.map((item) => <li key={item} className="print-avoid-break">{item}</li>)}</ul> : <p>Ei erillisiä tarkistettavia tietoja käytettävissä olevilla lähtötiedoilla.</p>}
        </section>
        <footer className="print-disclaimer print-avoid-break">
          <h2>Vastuuvapaus</h2>
          <p>Analyysi on laskennallinen arvio ja tarkoitettu sijoituspäätöksen tueksi. Se ei ole sijoitussuositus, kiinteistönvälittäjän arviolausunto eikä lupaus tulevasta tuotosta tai arvonkehityksestä.</p>
          <p>Analyysi ei määritä kohteen todellista markkinahintaa eikä ota kantaa siihen, onko pyyntihinta markkinahintaan nähden edullinen tai kallis. Varmista olennaiset tiedot alkuperäisistä asiakirjoista ja asiantuntijoilta ennen päätöstä.</p>
          <strong>asuntosijoituslaskuri.fi</strong>
        </footer>
      </section>
    </article>
  );
}
