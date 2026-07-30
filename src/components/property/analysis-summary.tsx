import { AlertCircle, AlertTriangle, CheckCircle2, CircleHelp, FileQuestion, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { METRIC_CARD_ORDER, METRIC_CARD_STATUS_CLASSES, METRIC_CARD_STATUS_TEXT_CLASSES, SECONDARY_METRIC_CARD_STATUS_CLASSES, metricCardState, type MetricCardKey, type MetricStatusIcon } from "@/core/analysis/metric-card-status";
import { formatFinnishNumber } from "@/core/parser/normalization";
import type { InvestmentAnalysisResult } from "@/core/calculations/investment-analysis";
import { cn } from "@/lib/utils";

function isFiniteNumber(value: number | null | undefined): value is number { return typeof value === "number" && Number.isFinite(value); }
function money(value: number | null | undefined, suffix = "€/kk") { return isFiniteNumber(value) ? `${formatFinnishNumber(value)} ${suffix}` : "Ei laskettavissa"; }
function percent(value: number | null | undefined) { return isFiniteNumber(value) ? `${formatFinnishNumber(value, 1)} %` : "Ei laskettavissa"; }

type MetricCardData = {
  key: MetricCardKey;
  label: string;
  value: number | null | undefined;
  formattedValue: string;
  description: string;
  secondary?: boolean;
};

const statusIcons: Record<MetricStatusIcon, LucideIcon> = {
  check: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  unknown: CircleHelp,
};

export function KeyMetrics({ analysis }: { analysis: InvestmentAnalysisResult }) {
  const collateralKnown = analysis.collateralShortfall !== undefined && analysis.collateralBuffer !== undefined;
  const collateralPosition = !collateralKnown ? undefined : analysis.collateralShortfall! > 0 ? -analysis.collateralShortfall! : analysis.collateralBuffer!;
  const collateralLabel = !collateralKnown ? "Vakuustilanne" : analysis.collateralShortfall! > 0 ? "Vakuusvaje" : analysis.collateralBuffer! > 0 ? "Vakuuspuskuri" : "Vakuustilanne";
  const collateralDescription = analysis.collateralShortfall! > 0
    ? "Lisävakuuden tai oman rahan tarve kohteen vakuusarvon lisäksi."
    : analysis.collateralBuffer! > 0
      ? "Kohteen vakuusarvo ylittää pankkilainan määrän."
      : "Kohteen vakuusarvo ja pankkilainan määrä ovat samalla tasolla.";
  const equityReturnDescription = analysis.equity === 0 ? "Lisää sijoitettava oma pääoma." : "Vuosituotto suhteessa sijoitettuun omaan pääomaan.";
  const principalDescription = analysis.monthlyBankLoanPrincipal === 0 && analysis.repaymentType === "interest_only"
    ? "Vain korkoa maksava laina ei lyhene kuukausittain."
    : analysis.monthlyBankLoanPrincipal === 0 && analysis.repaymentType === "bullet"
      ? "Kertalyhenteinen laina maksetaan laina-ajan lopussa."
      : "Pankkilainan ensimmäisen kuukauden lyhennys.";
  const byKey: Record<MetricCardKey, MetricCardData> = {
    cashFlowAfterBankLoan: { key: "cashFlowAfterBankLoan", label: "Kassavirta pankkilainan jälkeen", value: analysis.cashFlowAfterBankLoan, formattedValue: money(analysis.cashFlowAfterBankLoan), description: analysis.cashFlowAfterBankLoan === undefined ? "Lisää pankkilainan ja kulujen tiedot." : "Vuokra vähennettynä kuluilla ja pankkilainan kuukausierällä." },
    netRentalYield: { key: "netRentalYield", label: "Nettovuokratuotto", value: analysis.netRentalYield, formattedValue: percent(analysis.netRentalYield), description: "Huomioi tyhjäkäynnin ja jatkuvat kuukausikulut." },
    grossRentalYield: { key: "grossRentalYield", label: "Bruttovuokratuotto", value: analysis.grossRentalYield, formattedValue: percent(analysis.grossRentalYield), description: "Efektiivinen vuosivuokra suhteessa velattomaan hintaan." },
    equity: { key: "equity", label: "Oma pääoma", value: analysis.equity, formattedValue: money(analysis.equity, "€"), description: analysis.equitySource === "user" ? "Käyttäjän määrittämä sijoitettava oma pääoma." : "Oletus on 0 €. Lisää sijoitettava oma pääoma tarvittaessa. Oletus ei ole pankin hyväksymä rahoitusratkaisu." },
    returnOnEquity: { key: "returnOnEquity", label: "Oman pääoman tuotto", value: analysis.returnOnEquity, formattedValue: percent(analysis.returnOnEquity), description: analysis.equity === 0 ? equityReturnDescription : "Kassavirta ja lainan lyheneminen suhteessa omaan pääomaan." },
    cashOnCashReturn: { key: "cashOnCashReturn", label: "Oman pääoman kassatuotto", value: analysis.cashOnCashReturn, formattedValue: percent(analysis.cashOnCashReturn), description: equityReturnDescription },
    monthlyBankLoanPrincipal: { key: "monthlyBankLoanPrincipal", label: "Lainan lyheneminen", value: analysis.monthlyBankLoanPrincipal, formattedValue: money(analysis.monthlyBankLoanPrincipal), description: principalDescription },
    collateralPosition: { key: "collateralPosition", label: collateralLabel, value: collateralPosition, formattedValue: collateralKnown ? money(Math.abs(collateralPosition!), "€") : "Ei laskettavissa", description: collateralKnown ? collateralDescription : "Lisää pankkilainan ja vakuusarvon tiedot." },
    annualCashFlowAfterBankLoan: { key: "annualCashFlowAfterBankLoan", label: "Kassavirta vuodessa", value: analysis.annualCashFlowAfterBankLoan, formattedValue: money(analysis.annualCashFlowAfterBankLoan, "€/v"), description: "Kuukausittainen kassavirta kerrottuna kahdellatoista.", secondary: true },
    adjustedAcquisitionPrice: { key: "adjustedAcquisitionPrice", label: "Oikaistu hankintahinta", value: analysis.adjustedAcquisitionPrice, formattedValue: money(analysis.adjustedAcquisitionPrice, "€"), description: "Velaton hinta, remonttivara, varainsiirtovero ja kaupantekokulut." },
  };
  const metrics = METRIC_CARD_ORDER.map((key) => byKey[key]);
  return <Card><CardContent><dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => {
    const status = metricCardState(metric.key, metric.value, { monthlyCashFlow: analysis.cashFlowAfterBankLoan, bankLoanAmount: analysis.bankLoanAmount, equitySource: analysis.equitySource });
    const StatusIcon = statusIcons[status.icon];
    return <div key={metric.key} data-metric={metric.key} data-status={status.status} className={cn("flex h-full min-w-0 flex-col rounded-xl border p-4", metric.secondary ? SECONDARY_METRIC_CARD_STATUS_CLASSES[status.status] : METRIC_CARD_STATUS_CLASSES[status.status])}><div className="flex min-w-0 items-start justify-between gap-3"><dt className="min-w-0 text-sm font-medium text-muted-foreground">{metric.label}</dt><span aria-label={`Tila: ${status.statusLabel}`} className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border bg-background/70 px-2 py-1 text-[0.6875rem] font-medium", METRIC_CARD_STATUS_TEXT_CLASSES[status.status])}><StatusIcon aria-hidden="true" className="size-3.5" />{status.statusLabel}</span></div><dd className="mt-3 break-words text-2xl font-semibold tracking-tight">{metric.formattedValue}</dd><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{metric.description}</p></div>;
  })}</dl></CardContent></Card>;
}

export function AnalysisHighlights({ rating }: { rating: InvestmentAnalysisResult }) {
  const groups = [
    { title: "Huomioitavat riskit", icon: AlertTriangle, items: rating.warningFactors ?? [], color: "text-orange-600", border: "border-orange-400", empty: "Nykyisillä tiedoilla ei tunnistettu erityisiä riskejä." },
    { title: "Kohteen vahvuudet", icon: CheckCircle2, items: rating.positiveFactors ?? [], color: "text-emerald-600", border: "border-emerald-500", empty: "Nykyisillä tiedoilla ei tunnistettu erityisiä vahvuuksia." },
    { title: "Puuttuvat tai tarkistettavat tiedot", icon: FileQuestion, items: rating.missingFactors ?? [], color: "text-amber-600", border: "border-amber-400", empty: "Ei puuttuvia kriittisiä tietoja." },
  ];
  return <Card><CardHeader className="border-b"><CardTitle>Analyysin tärkeimmät huomiot</CardTitle></CardHeader><CardContent><div className="grid gap-6 md:grid-cols-3">{groups.map(({ title, icon: Icon, items, color, border, empty }) => <section key={title}><div className="flex items-center gap-2"><Icon className={`size-4 ${color}`} /><h3 className="font-medium">{title}</h3></div>{items.length ? <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{items.map((item) => <li key={item} className={`border-l-2 pl-3 ${border}`}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">{empty}</p>}</section>)}</div></CardContent></Card>;
}
