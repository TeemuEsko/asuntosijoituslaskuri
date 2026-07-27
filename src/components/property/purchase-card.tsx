"use client";

import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { effectiveFinancingFeeMonthly, expectedDebtFreePrice, pricesAreConsistent } from "@/core/calculations/purchase-price";
import type { FieldStatus } from "@/core/domain/field";
import { formatEuro, formatMonthlyEuro } from "@/core/parser/normalization";
import { validatePurchaseData } from "@/core/validation/purchase-data";
import type { PurchaseFieldKey } from "@/data/property-demo";
import { PropertyField } from "./property-field";

type Props = { values: Record<PurchaseFieldKey, number>; statuses: Record<PurchaseFieldKey, FieldStatus>; onChange: (key: PurchaseFieldKey, value: number) => void };

const fields: Array<{ key: PurchaseFieldKey; label: string; suffix: string }> = [
  { key: "debtFreePrice", label: "Velaton hinta", suffix: "€" },
  { key: "salePrice", label: "Myyntihinta", suffix: "€" },
  { key: "companyLoanShare", label: "Yhtiölainaosuus", suffix: "€" },
  { key: "financingFeeMonthly", label: "Rahoitusvastike", suffix: "€/kk" },
  { key: "renovationReserve", label: "Remonttivara", suffix: "€" },
];

export function PurchaseCard({ values, statuses, onChange }: Props) {
  const canCompare = statuses.debtFreePrice !== "missing" && statuses.salePrice !== "missing" && statuses.companyLoanShare !== "missing";
  const consistent = canCompare && pricesAreConsistent(values.debtFreePrice, values.salePrice, values.companyLoanShare);
  const noCompanyLoan = statuses.companyLoanShare !== "missing" && values.companyLoanShare === 0;
  const shownFee = effectiveFinancingFeeMonthly(values.companyLoanShare, values.financingFeeMonthly);
  const calculatedPrice = expectedDebtFreePrice(values.salePrice, values.companyLoanShare);
  const conflicts = canCompare ? validatePurchaseData({ debtFreePrice: values.debtFreePrice, salePrice: values.salePrice, companyLoanShare: values.companyLoanShare, reportedFinancingFeeMonthly: values.financingFeeMonthly }) : [];
  const financingConflict = conflicts.find((conflict) => conflict.code === "company_loan_fee_conflict");
  return <Card><CardHeader className="border-b"><CardTitle>Kauppatiedot</CardTitle><CardDescription>Hinta ja hankintaan varattu pääoma</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2">{fields.map(({ key, label, suffix }) => <div key={key} className={key === "debtFreePrice" ? "sm:col-span-2" : undefined}><PropertyField id={`purchase-${key}`} label={label} status={statuses[key]} suffix={suffix} type="number" min={0} value={values[key]} disabled={key === "financingFeeMonthly" && noCompanyLoan} onChange={(event) => onChange(key, Math.max(0, event.currentTarget.valueAsNumber || 0))} className={key === "debtFreePrice" ? "text-base font-semibold" : undefined} />{key === "financingFeeMonthly" && noCompanyLoan ? <p className="mt-1.5 text-xs font-medium text-success">Ei yhtiölainaa · laskennallinen vastike {formatMonthlyEuro(shownFee)}</p> : null}</div>)}</div>{financingConflict ? <div role="alert" className="flex gap-2 rounded-lg border border-danger/20 bg-danger-soft p-3 text-sm text-danger"><AlertCircle className="mt-0.5 size-4 shrink-0" /><div><p className="font-medium">Lähtötiedoissa on ristiriita</p><p className="mt-0.5 text-xs">{financingConflict.message} Dokumentista saatu arvo {formatMonthlyEuro(values.financingFeeMonthly)} säilytettiin, eikä sitä ylikirjoitettu.</p></div></div> : null}{!canCompare ? <div role="status" className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground"><CircleDashed className="mt-0.5 size-4 shrink-0" /><div><p className="font-medium text-foreground">Hintatietojen tarkistus odottaa tietoja</p><p className="mt-0.5 text-xs">Täytä velaton hinta, myyntihinta ja yhtiölainaosuus.</p></div></div> : <div role="status" className={`flex gap-2 rounded-lg border p-3 text-sm ${consistent ? "border-success/20 bg-success-soft text-success" : "border-danger/20 bg-danger-soft text-danger"}`}>{consistent ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}<div><p className="font-medium">{consistent ? "Hintatiedot täsmäävät" : "Hintatiedot eivät täsmää"}</p>{!consistent ? <p className="mt-0.5 text-xs">Myyntihinta {formatEuro(values.salePrice)} + yhtiölainaosuus {formatEuro(values.companyLoanShare)} = {formatEuro(calculatedPrice)}, mutta ilmoitettu velaton hinta on {formatEuro(values.debtFreePrice)}. Arvoja ei muutettu automaattisesti.</p> : null}</div></div>}</CardContent></Card>;
}
