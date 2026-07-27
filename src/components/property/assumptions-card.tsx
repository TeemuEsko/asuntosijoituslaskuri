"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertyField } from "./property-field";
import { RentalDemandSelector } from "./rental-demand-selector";
import { SourceBadge } from "./status-badge";

export function AssumptionsCard() {
  const [demand, setDemand] = useState(3);
  const [repaymentType, setRepaymentType] = useState("annuity");
  const repaymentLabels: Record<string, string> = { annuity: "Annuiteetti", equal: "Tasalyhennys", bullet: "Kertalyhenteinen laina" };
  return (
    <Card><CardHeader className="border-b"><CardTitle>Sijoittajan oletukset</CardTitle><CardDescription>Muokkaa strategiaasi ja rahoitustasi vastaaviksi</CardDescription></CardHeader><CardContent className="space-y-8"><div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 min-[1600px]:grid-cols-3">
      <PropertyField id="market-rent" label="Markkinavuokra" status="user" suffix="€/kk" type="number" defaultValue={650} help="Käytä realistista pitkän vuokrauksen markkinavuokraa." />
      <PropertyField id="occupancy" label="Käyttöaste" status="user" suffix="%" type="number" defaultValue={97} help="Osuus vuodesta, jolloin asunto on vuokrattuna." />
      <PropertyField id="interest" label="Pankkilainan kokonaiskorko" status="user" suffix="%" type="number" step="0.1" defaultValue={4.5} help="Viitekorko ja pankin marginaali yhteensä." />
      <PropertyField id="loan-term" label="Laina-aika" status="user" suffix="vuotta" type="number" defaultValue={20} help="Pankkilainan suunniteltu takaisinmaksuaika." />
      <PropertyField id="equity" label="Sijoitettu oma pääoma" status="user" suffix="€" type="number" defaultValue={20000} help="Kauppaan sidottava oma raha." />
      <div className="min-w-0 space-y-2"><div className="flex min-h-10 min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1"><Label className="min-w-0 flex-1 whitespace-normal leading-5">Lyhennystyyppi</Label><SourceBadge status="user" /></div><Select value={repaymentType} onValueChange={(value) => value && setRepaymentType(value)}><SelectTrigger className="h-11 w-full min-w-0"><SelectValue>{repaymentLabels[repaymentType]}</SelectValue></SelectTrigger><SelectContent><SelectItem value="annuity">Annuiteetti</SelectItem><SelectItem value="equal">Tasalyhennys</SelectItem><SelectItem value="bullet">Kertalyhenteinen laina</SelectItem></SelectContent></Select></div>
    </div><RentalDemandSelector value={demand} onChange={setDemand} /></CardContent></Card>
  );
}
