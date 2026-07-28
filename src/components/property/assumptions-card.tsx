"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RepaymentType } from "@/core/calculations/investment-analysis";
import { PropertyField } from "./property-field";
import { RentalDemandSelector } from "./rental-demand-selector";
import { SourceBadge } from "./status-badge";

export type AssumptionValues = { monthlyRent: number; maintenanceFeeMonthly: number; vacancyMonths: number; annualInterestRate: number; loanTermYears: number; equity: number; repaymentType: RepaymentType; rentalDemand: number; otherCostsMonthly: number; maintenanceReserveMonthly: number; collateralValue: number; transferTaxRate: number; transactionCosts: number; locationRisk: number; resaleLiquidity: number };

function DebouncedRentField({ value, onChange, onUpdating }: { value: number; onChange: (value: number) => void; onUpdating: (value: boolean) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { const parsed = Number(draft.replace(",", ".")); const timer = window.setTimeout(() => { if (Number.isFinite(parsed) && parsed >= 0 && parsed !== value) onChange(parsed); onUpdating(false); }, 500); return () => window.clearTimeout(timer); }, [draft, onChange, onUpdating, value]);
  return <PropertyField id="market-rent" label="Markkinavuokra" status="user" suffix="€/kk" type="text" inputMode="decimal" value={draft} onChange={(event) => { setDraft(event.currentTarget.value); onUpdating(true); }} help="Käytä realistista pitkän vuokrauksen markkinavuokraa." />;
}

export function AssumptionsCard({ values, onChange, onUpdating }: { values: AssumptionValues; onChange: <K extends keyof AssumptionValues>(key: K, value: AssumptionValues[K]) => void; onUpdating: (value: boolean) => void }) {
  const repaymentLabels: Record<RepaymentType, string> = { annuity: "Annuiteetti", equal_principal: "Tasalyhennys", interest_only: "Vain korko", bullet: "Kertalyhenteinen laina" };
  return <Card><CardHeader className="border-b"><CardTitle>Sijoittajan oletukset</CardTitle><CardDescription>Kaikki muutokset päivittävät analyysin automaattisesti</CardDescription></CardHeader><CardContent className="space-y-8"><div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 min-[1600px]:grid-cols-3">
    <DebouncedRentField value={values.monthlyRent} onChange={(value) => onChange("monthlyRent", value)} onUpdating={onUpdating} />
    <PropertyField id="maintenance-fee" label="Hoitovastike" status="user" suffix="€/kk" type="number" min={0} value={values.maintenanceFeeMonthly} onChange={(event) => onChange("maintenanceFeeMonthly", Math.max(0, event.currentTarget.valueAsNumber || 0))} />
    <PropertyField id="vacancy-months" label="Arvioitu tyhjäkäynti" status="user" suffix="kk / vuosi" type="number" min={0} max={12} step={1} value={values.vacancyMonths} onChange={(event) => onChange("vacancyMonths", Math.min(12, Math.max(0, Math.round(event.currentTarget.valueAsNumber || 0))))} help={`Vuokrattuna arviolta ${12 - values.vacancyMonths} kk vuodessa.`} />
    <PropertyField id="interest" label="Pankkilainan kokonaiskorko" status="user" suffix="%" type="number" min={0} step="0.1" value={values.annualInterestRate} onChange={(event) => onChange("annualInterestRate", Math.max(0, event.currentTarget.valueAsNumber || 0))} />
    <PropertyField id="loan-term" label="Laina-aika" status="user" suffix="vuotta" type="number" min={1} value={values.loanTermYears} onChange={(event) => onChange("loanTermYears", Math.max(1, event.currentTarget.valueAsNumber || 1))} />
    <PropertyField id="equity" label="Sijoitettu oma pääoma" status="user" suffix="€" type="number" min={0} value={values.equity} onChange={(event) => onChange("equity", Math.max(0, event.currentTarget.valueAsNumber || 0))} />
    <PropertyField id="collateral" label="Arvioitu vakuusarvo" status="user" suffix="€" type="number" min={0} value={values.collateralValue} onChange={(event) => onChange("collateralValue", Math.max(0, event.currentTarget.valueAsNumber || 0))} />
    <PropertyField id="other-costs" label="Muut kuukausikulut" status="user" suffix="€/kk" type="number" min={0} value={values.otherCostsMonthly} onChange={(event) => onChange("otherCostsMonthly", Math.max(0, event.currentTarget.valueAsNumber || 0))} />
    <PropertyField id="maintenance-reserve" label="Kuukausittainen remonttivara" status="user" suffix="€/kk" type="number" min={0} value={values.maintenanceReserveMonthly} onChange={(event) => onChange("maintenanceReserveMonthly", Math.max(0, event.currentTarget.valueAsNumber || 0))} />
    <PropertyField id="transfer-tax" label="Varainsiirtovero" status="user" suffix="%" type="number" min={0} step="0.1" value={values.transferTaxRate} onChange={(event) => onChange("transferTaxRate", Math.max(0, event.currentTarget.valueAsNumber || 0))} />
    <PropertyField id="transaction-costs" label="Muut kaupantekokulut" status="user" suffix="€" type="number" min={0} value={values.transactionCosts} onChange={(event) => onChange("transactionCosts", Math.max(0, event.currentTarget.valueAsNumber || 0))} />
    <div className="min-w-0 space-y-2"><div className="flex min-h-10 items-start justify-between gap-3"><Label>Lyhennystyyppi</Label><SourceBadge status="user" /></div><Select value={values.repaymentType} onValueChange={(value) => value && onChange("repaymentType", value as RepaymentType)}><SelectTrigger className="h-11 w-full"><SelectValue>{repaymentLabels[values.repaymentType]}</SelectValue></SelectTrigger><SelectContent>{Object.entries(repaymentLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
  </div><div className="grid gap-6 lg:grid-cols-3"><RentalDemandSelector value={values.rentalDemand} onChange={(value) => onChange("rentalDemand", value)} /><RentalDemandSelector label="Sijaintiriski" value={values.locationRisk} onChange={(value) => onChange("locationRisk", value)} /><RentalDemandSelector label="Jälleenmyytävyys" value={values.resaleLiquidity} onChange={(value) => onChange("resaleLiquidity", value)} /></div></CardContent></Card>;
}
