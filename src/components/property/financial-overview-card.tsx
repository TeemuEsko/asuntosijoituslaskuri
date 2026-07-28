import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvestmentAnalysisResult, RepaymentType } from "@/core/calculations/investment-analysis";
import { formatFinnishNumber } from "@/core/parser/normalization";
import type { PurchaseFieldKey } from "@/data/property-demo";
import type { AssumptionValues } from "./assumptions-card";

const money = (value: number | undefined, suffix = "€") => value === undefined ? "Ei laskettavissa" : `${formatFinnishNumber(value)} ${suffix}`;
const repaymentLabels: Record<RepaymentType, string> = { annuity: "Annuiteetti", equal_principal: "Tasalyhennys", interest_only: "Vain korko", bullet: "Kertalyhenteinen laina" };

export function FinancialOverviewCard({ purchase, assumptions, analysis }: { purchase: Record<PurchaseFieldKey, number>; assumptions: AssumptionValues; analysis: InvestmentAnalysisResult }) {
  const collateralBuffer = Math.max(0, assumptions.collateralValue - (analysis.bankLoanAmount ?? 0));
  const groups = [
    { title: "Hankinta", rows: [["Velaton hinta", money(purchase.debtFreePrice)], ["Myyntihinta", money(purchase.salePrice)], ["Yhtiölainaosuus", money(purchase.companyLoanShare)], ["Varainsiirtovero", money(analysis.transferTax)], ["Muut hankintakulut", money(assumptions.transactionCosts)], ["Kokonaisinvestointi", money(analysis.adjustedAcquisitionPrice)]] },
    { title: "Kuukausikulut", rows: [["Hoitovastike", money(assumptions.maintenanceFeeMonthly, "€/kk")], ["Rahoitusvastike", money(purchase.financingFeeMonthly, "€/kk")], ["Muut kuukausikulut", money(assumptions.otherCostsMonthly, "€/kk")], ["Remonttivara", money(assumptions.maintenanceReserveMonthly, "€/kk")]] },
    { title: "Pankkilaina", rows: [["Lainan määrä", money(analysis.bankLoanAmount)], ["Oma pääoma", money(assumptions.equity)], ["Korko", `${formatFinnishNumber(assumptions.annualInterestRate, 1)} %`], ["Laina-aika", `${formatFinnishNumber(assumptions.loanTermYears)} vuotta`], ["Lyhennystapa", repaymentLabels[assumptions.repaymentType]], ["Kuukausierä", money(analysis.monthlyBankLoanPayment, "€/kk")], ["Korko-osuus", money(analysis.monthlyBankLoanInterest, "€/kk")], ["Lyhennysosuus", money(analysis.monthlyBankLoanPrincipal, "€/kk")]] },
    { title: "Vakuudet", rows: [["Pankin vakuusarvo", money(assumptions.collateralValue)], ["Tarvittava lisävakuus", money(analysis.collateralShortfall)], [analysis.collateralShortfall ? "Vakuusvaje" : "Vakuuspuskuri", money(analysis.collateralShortfall || collateralBuffer)]] },
  ];
  return <Card><CardHeader className="border-b"><CardTitle>Talous- ja rahoitusyhteenveto</CardTitle></CardHeader><CardContent><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">{groups.map((group) => <section key={group.title}><h3 className="font-semibold">{group.title}</h3><dl className="mt-3 space-y-2">{group.rows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl></section>)}</div></CardContent></Card>;
}
