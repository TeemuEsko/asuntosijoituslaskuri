import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvestmentAnalysisResult, RepaymentType } from "@/core/calculations/investment-analysis";
import type { FieldStatus } from "@/core/domain/field";
import { formatFinnishNumber } from "@/core/parser/normalization";
import type { PurchaseFieldKey } from "@/data/property-demo";
import type { AssumptionValues } from "./assumptions-card";

const money = (value: number | undefined, suffix = "€") => value === undefined ? "Ei tiedossa" : `${formatFinnishNumber(value, 1)} ${suffix}`;
const repaymentLabels: Record<RepaymentType, string> = {
  annuity: "Annuiteetti",
  fixed_payment: "Kiinteä tasaerä",
  equal_principal: "Tasalyhennys",
  interest_only: "Vain korko",
  bullet: "Kertalyhennys / bullet",
};

type Row = { label: string; value: string; note?: string };

export function FinancialOverviewCard({
  purchase,
  purchaseStatuses,
  effectiveFinancingFee,
  assumptions,
  analysis,
}: {
  purchase: Record<PurchaseFieldKey, number>;
  purchaseStatuses: Record<PurchaseFieldKey, FieldStatus>;
  effectiveFinancingFee?: number;
  assumptions: AssumptionValues;
  analysis: InvestmentAnalysisResult;
}) {
  const collateralKnown = analysis.collateralShortfall !== undefined && analysis.collateralBuffer !== undefined;
  const collateralTitle = !collateralKnown ? "Vakuustilanne" : analysis.collateralShortfall! > 0 ? "Vakuusvaje" : analysis.collateralBuffer! > 0 ? "Vakuuspuskuri" : "Vakuustilanne";
  const collateralAmount = !collateralKnown ? undefined : analysis.collateralShortfall! > 0 ? analysis.collateralShortfall : analysis.collateralBuffer;
  const companyLoanNote = purchaseStatuses.companyLoanShare === "parser" || purchaseStatuses.companyLoanShare === "listing"
    ? "Löydetty myynti-ilmoituksesta."
    : purchaseStatuses.companyLoanShare === "missing" || purchaseStatuses.companyLoanShare === "unknown"
      ? "Yhtiölainaosuuden määrää ei tiedetä."
      : purchase.companyLoanShare === 0
        ? "Päätelty hinnoista: velaton hinta ja myyntihinta ovat samat."
        : "Päätelty velattoman hinnan ja myyntihinnan erotuksesta.";
  const groups: Array<{ title: string; rows: Row[] }> = [
    {
      title: "Hankinta",
      rows: [
        { label: "Velaton hinta", value: money(purchase.debtFreePrice) },
        { label: "Myyntihinta", value: money(purchase.salePrice) },
        { label: "Yhtiölainaosuus", value: purchaseStatuses.companyLoanShare === "missing" || purchaseStatuses.companyLoanShare === "unknown" ? "Ei tiedossa" : money(purchase.companyLoanShare), note: companyLoanNote },
        { label: "Varainsiirtovero", value: money(analysis.transferTax) },
        { label: "Muut hankintakulut", value: money(assumptions.transactionCosts) },
        { label: "Kokonaisinvestointi", value: money(analysis.adjustedAcquisitionPrice) },
      ],
    },
    {
      title: "Kuukausikulut",
      rows: [
        { label: "Hoitovastike", value: money(assumptions.maintenanceFeeMonthly, "€/kk") },
        { label: "Rahoitusvastike", value: money(effectiveFinancingFee, "€/kk") },
        { label: "Muut kuukausikulut", value: money(assumptions.otherCostsMonthly, "€/kk") },
      ],
    },
    {
      title: "Pankkilaina",
      rows: [
        { label: "Lainan määrä", value: money(analysis.bankLoanAmount) },
        { label: "Oma pääoma", value: money(assumptions.equity) },
        { label: "Korko", value: `${formatFinnishNumber(assumptions.annualInterestRate, 1)} %` },
        { label: "Laina-aika", value: `${formatFinnishNumber(assumptions.loanTermYears, 1)} vuotta` },
        { label: "Lyhennystapa", value: repaymentLabels[assumptions.repaymentType] },
        { label: "Kuukausierä", value: money(analysis.monthlyBankLoanPayment, "€/kk") },
        { label: "Korko-osuus", value: money(analysis.monthlyBankLoanInterest, "€/kk") },
        { label: "Lyhennysosuus", value: money(analysis.monthlyBankLoanPrincipal, "€/kk") },
        { label: "Pääoma laina-ajan lopussa", value: money(analysis.remainingBankLoanPrincipalAtEnd) },
      ],
    },
    {
      title: "Vakuudet",
      rows: [
        { label: "Pankin vakuusarvo", value: money(assumptions.collateralValue) },
        { label: "Pankkilaina", value: money(analysis.bankLoanAmount) },
        { label: collateralTitle, value: money(collateralAmount) },
      ],
    },
  ];

  return (
    <Card>
      <CardHeader className="border-b"><CardTitle>Talous- ja rahoitusyhteenveto</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {groups.map((group) => (
            <section key={group.title}>
              <h3 className="font-semibold">{group.title}</h3>
              <dl className="mt-3 space-y-2">
                {group.rows.map((row) => (
                  <div key={row.label} className="border-b border-border/60 pb-2 text-sm">
                    <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">{row.label}</dt><dd className="text-right font-medium">{row.value}</dd></div>
                    {row.note ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.note}</p> : null}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
