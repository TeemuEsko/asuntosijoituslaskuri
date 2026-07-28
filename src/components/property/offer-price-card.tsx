"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatFinnishNumber } from "@/core/parser/normalization";
import { simulateMaximumOfferPrice } from "@/core/calculations/offer-price";
import type { InvestmentAnalysisInput } from "@/core/calculations/investment-analysis";

export function OfferPriceCard({ input }: { input: InvestmentAnalysisInput }) {
  const [targetCashFlow, setTargetCashFlow] = useState(100);
  const [targetYield, setTargetYield] = useState(6);
  const result = useMemo(() => simulateMaximumOfferPrice(input, { monthlyCashFlow: targetCashFlow, netRentalYield: targetYield }), [input, targetCashFlow, targetYield]);
  return <Card id="tarjoushinta" className="scroll-mt-24"><CardHeader className="border-b"><CardTitle>Tarjoushintasimulaattori</CardTitle><CardDescription>Enimmäishinta päivittyy automaattisesti valittujen tavoitteiden ja analyysin nykyisten lähtötietojen perusteella.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Vaadittu kassavirta pankkilainan jälkeen<Input type="number" value={targetCashFlow} onChange={(event) => setTargetCashFlow(event.currentTarget.valueAsNumber || 0)} /><span className="block text-xs font-normal text-muted-foreground">€/kk</span></label><label className="space-y-2 text-sm font-medium">Vaadittu nettovuokratuotto<Input type="number" step="0.1" value={targetYield} onChange={(event) => setTargetYield(event.currentTarget.valueAsNumber || 0)} /><span className="block text-xs font-normal text-muted-foreground">%</span></label></div><div className="rounded-xl bg-success-soft p-5"><p className="text-xs font-medium uppercase tracking-wide text-success">Tarjottava velaton hinta enintään</p><p className="mt-1 text-3xl font-semibold">{result.maximumDebtFreePrice === undefined ? "Ei laskettavissa" : `${formatFinnishNumber(result.maximumDebtFreePrice)} €`}</p>{result.maximumDebtFreePrice !== undefined ? <p className="mt-2 text-sm text-muted-foreground">Kassavirta {formatFinnishNumber(result.cashFlowAfterLoan ?? 0)} €/kk · nettotuotto {formatFinnishNumber(result.netRentalYield ?? 0, 1)} %</p> : <p className="mt-2 text-sm text-muted-foreground">Nykyisillä lähtötiedoilla tavoitetta ei saavuteta simuloidulla hintavälillä.</p>}</div></CardContent></Card>;
}
