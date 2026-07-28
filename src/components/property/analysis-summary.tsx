import { AlertTriangle, CheckCircle2, FileQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFinnishNumber } from "@/core/parser/normalization";
import type { InvestmentOverallScoreData } from "@/core/analysis/investment-overall-score";
import type { ImportedPropertyData } from "./property-workspace";

export function KeyMetrics({ data }: { data: ImportedPropertyData }) {
  const price = typeof data.debtFreePrice === "number" && data.debtFreePrice > 0 ? data.debtFreePrice : undefined;
  const rent = typeof data.currentRentMonthly === "number" ? data.currentRentMonthly : undefined;
  const maintenance = typeof data.maintenanceFeeMonthly === "number" ? data.maintenanceFeeMonthly : undefined;
  const financing = typeof data.financingFeeMonthly === "number" ? data.financingFeeMonthly : 0;
  const yieldValue = price && rent ? rent * 12 / price * 100 : undefined;
  const cashFlow = rent !== undefined && maintenance !== undefined ? rent - maintenance - financing : undefined;
  const equity = price !== undefined && typeof data.companyLoanShare === "number" ? price - data.companyLoanShare : undefined;
  const metrics = [["Kassavirta ennen pankkilainaa", cashFlow === undefined ? "Tarkentuu" : `${formatFinnishNumber(cashFlow)} €/kk`], ["Bruttovuokratuotto", yieldValue === undefined ? "Tarkentuu" : `${formatFinnishNumber(yieldValue, 1)} %`], ["Velaton pääomatarve", equity === undefined ? "Tarkentuu" : `${formatFinnishNumber(equity)} €`]];
  return <Card><CardContent><dl className="grid gap-4 sm:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-lg bg-muted/35 p-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold">{value}</dd></div>)}</dl></CardContent></Card>;
}

export function AnalysisHighlights({ rating }: { rating: InvestmentOverallScoreData }) {
  const groups = [{ title: "Kohteen vahvuudet", icon: CheckCircle2, items: rating.positiveFactors ?? [] }, { title: "Huomioitavat riskit", icon: AlertTriangle, items: rating.warningFactors ?? [] }, { title: "Puuttuvat tai tarkistettavat tiedot", icon: FileQuestion, items: rating.missingFactors ?? [] }];
  return <Card><CardHeader className="border-b"><CardTitle>Analyysin tärkeimmät huomiot</CardTitle></CardHeader><CardContent><div className="grid gap-6 md:grid-cols-3">{groups.map(({ title, icon: Icon, items }) => <section key={title}><div className="flex items-center gap-2"><Icon className="size-4 text-primary" /><h3 className="font-medium">{title}</h3></div>{items.length ? <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{items.map((item) => <li key={item} className="border-l-2 pl-3">{item}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Ei erillisiä huomioita nykyisillä tiedoilla.</p>}</section>)}</div></CardContent></Card>;
}
