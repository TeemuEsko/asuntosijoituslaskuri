import { AlertTriangle, CheckCircle2, FileQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFinnishNumber } from "@/core/parser/normalization";
import type { InvestmentAnalysisResult } from "@/core/calculations/investment-analysis";

function money(value: number | undefined, suffix = "€/kk") { return value === undefined ? "Ei laskettavissa" : `${formatFinnishNumber(value)} ${suffix}`; }

export function KeyMetrics({ analysis }: { analysis: InvestmentAnalysisResult }) {
  const metrics = [
    ["Kassavirta pankkilainan jälkeen", money(analysis.cashFlowAfterBankLoan), analysis.cashFlowAfterBankLoan === undefined ? "Lisää pankkilainan ja kulujen tiedot." : "Vuokra vähennettynä kuluilla ja pankkilainan kuukausierällä."],
    ["Nettovuokratuotto", analysis.netRentalYield === undefined ? "Ei laskettavissa" : `${formatFinnishNumber(analysis.netRentalYield, 1)} %`, "Huomioi tyhjäkäynnin ja jatkuvat kuukausikulut."],
    ["Oma pääoma", money(analysis.equity, "€"), "Analyysissa käytetty sijoittajan oma pääoma."],
    ["Lainan lyheneminen", money(analysis.monthlyBankLoanPrincipal), "Pankkilainan ensimmäisen kuukauden lyhennys."],
    ["Kassavirta vuodessa", money(analysis.annualCashFlowAfterBankLoan, "€/v"), "Kuukausittainen kassavirta kerrottuna kahdellatoista."],
    ["Oman pääoman kassatuotto", analysis.cashOnCashReturn === undefined ? "Ei laskettavissa" : `${formatFinnishNumber(analysis.cashOnCashReturn, 1)} %`, "Vuosikassavirta suhteessa sijoitettuun omaan pääomaan."],
    ["Vakuusvaje", money(analysis.collateralShortfall, "€"), "Pankkilainan ja kohteen vakuusarvon positiivinen erotus."],
    ["Oikaistu hankintahinta", money(analysis.adjustedAcquisitionPrice, "€"), "Velaton hinta, remonttivara, varainsiirtovero ja kaupantekokulut."],
  ];
  return <Card><CardContent><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value, description]) => <div key={label} className="rounded-lg bg-muted/35 p-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold">{value}</dd><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p></div>)}</dl></CardContent></Card>;
}

export function AnalysisHighlights({ rating }: { rating: InvestmentAnalysisResult }) {
  const groups = [
    { title: "Huomioitavat riskit", icon: AlertTriangle, items: rating.warningFactors ?? [], color: "text-orange-600", border: "border-orange-400", empty: "Nykyisillä tiedoilla ei tunnistettu erityisiä riskejä." },
    { title: "Kohteen vahvuudet", icon: CheckCircle2, items: rating.positiveFactors ?? [], color: "text-emerald-600", border: "border-emerald-500", empty: "Nykyisillä tiedoilla ei tunnistettu erityisiä vahvuuksia." },
    { title: "Puuttuvat tai tarkistettavat tiedot", icon: FileQuestion, items: rating.missingFactors ?? [], color: "text-amber-600", border: "border-amber-400", empty: "Ei puuttuvia kriittisiä tietoja." },
  ];
  return <Card><CardHeader className="border-b"><CardTitle>Analyysin tärkeimmät huomiot</CardTitle></CardHeader><CardContent><div className="grid gap-6 md:grid-cols-3">{groups.map(({ title, icon: Icon, items, color, border, empty }) => <section key={title}><div className="flex items-center gap-2"><Icon className={`size-4 ${color}`} /><h3 className="font-medium">{title}</h3></div>{items.length ? <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{items.map((item) => <li key={item} className={`border-l-2 pl-3 ${border}`}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">{empty}</p>}</section>)}</div></CardContent></Card>;
}
