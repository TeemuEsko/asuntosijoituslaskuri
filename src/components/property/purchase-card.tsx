"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FieldStatus } from "@/core/domain/field";
import { effectiveFinancingFeeMonthly } from "@/core/calculations/purchase-price";
import { formatFinnishNumber, formatMonthlyEuro } from "@/core/parser/normalization";
import { validatePurchaseData } from "@/core/validation/purchase-data";
import type { PurchaseFieldKey } from "@/data/property-demo";
import { PropertyField } from "./property-field";

type Props = { values: Record<PurchaseFieldKey, number>; statuses: Record<PurchaseFieldKey, FieldStatus>; onChange: (key: PurchaseFieldKey, value: number) => void };
const fields: Array<{ key: PurchaseFieldKey; label: string; suffix: string }> = [{ key: "debtFreePrice", label: "Velaton hinta", suffix: "€" }, { key: "salePrice", label: "Myyntihinta", suffix: "€" }, { key: "companyLoanShare", label: "Yhtiölainaosuus", suffix: "€" }, { key: "financingFeeMonthly", label: "Rahoitusvastike", suffix: "€/kk" }, { key: "renovationReserve", label: "Remonttivara", suffix: "€" }];
const formatDraft = (value: number) => value ? formatFinnishNumber(value, 2) : "0";
const parseDraft = (value: string) => Number(value.replace(/[\s\u00a0]/g, "").replace(",", "."));

export function PurchaseCard({ values, statuses, onChange }: Props) {
  const noCompanyLoan = statuses.companyLoanShare !== "missing" && values.companyLoanShare === 0;
  const shownFee = effectiveFinancingFeeMonthly(values.companyLoanShare, values.financingFeeMonthly);
  const financingConflict = validatePurchaseData({ debtFreePrice: values.debtFreePrice, salePrice: values.salePrice, companyLoanShare: values.companyLoanShare, reportedFinancingFeeMonthly: values.financingFeeMonthly }).find((conflict) => conflict.code === "company_loan_fee_conflict");
  return <Card><CardHeader className="border-b"><CardTitle>Kauppatiedot</CardTitle><CardDescription>Muuta velatonta hintaa tai myyntihintaa tarjoushinnan haarukoimiseksi</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{fields.map(({ key, label, suffix }) => <div key={key} className={key === "debtFreePrice" ? "sm:col-span-2" : undefined}><DraftPurchaseField key={`${key}-${values[key]}`} fieldKey={key} label={label} suffix={suffix} value={values[key]} status={statuses[key]} disabled={key === "financingFeeMonthly" && noCompanyLoan} onCommit={onChange} />{key === "financingFeeMonthly" && noCompanyLoan ? <p className="mt-1.5 text-xs font-medium text-success">Ei yhtiölainaa · laskennallinen vastike {formatMonthlyEuro(shownFee)}</p> : null}</div>)}</div>{financingConflict ? <div role="alert" className="flex gap-2 rounded-lg border border-danger/20 bg-danger-soft p-3 text-sm text-danger"><AlertCircle className="mt-0.5 size-4 shrink-0" /><div><p className="font-medium">Lähtötiedoissa on ristiriita</p><p className="mt-0.5 text-xs">{financingConflict.message} Dokumentista saatu arvo säilytetään tarkistusta varten.</p></div></div> : null}</CardContent></Card>;
}

function DraftPurchaseField({ fieldKey, label, suffix, value, status, disabled, onCommit }: { fieldKey: PurchaseFieldKey; label: string; suffix: string; value: number; status: FieldStatus; disabled: boolean; onCommit: (key: PurchaseFieldKey, value: number) => void }) {
  const [draft, setDraft] = useState(() => formatDraft(value));
  function commit() { const parsed = parseDraft(draft); if (Number.isFinite(parsed)) onCommit(fieldKey, Math.max(0, parsed)); else setDraft(formatDraft(value)); }
  return <PropertyField id={`purchase-${fieldKey}`} label={label} status={status} suffix={suffix} type="text" inputMode="decimal" value={draft} disabled={disabled} onChange={(event) => setDraft(event.currentTarget.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className={fieldKey === "debtFreePrice" ? "text-base font-semibold" : undefined} />;
}
