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
  return (
    <Card><CardHeader className="border-b"><CardTitle>Sijoittajan oletukset</CardTitle><CardDescription>Muokkaa strategiaasi ja rahoitustasi vastaaviksi</CardDescription></CardHeader><CardContent className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <PropertyField id="market-rent" label="Markkinavuokra" status="user" suffix="€/kk" type="number" defaultValue={650} help="Käytä realistista pitkän vuokrauksen markkinavuokraa." />
      <PropertyField id="occupancy" label="Käyttöaste" status="user" suffix="%" type="number" defaultValue={97} help="Osuus vuodesta, jolloin asunto on vuokrattuna." />
      <PropertyField id="interest" label="Pankkilainan kokonaiskorko" status="user" suffix="%" type="number" step="0.1" defaultValue={4.5} help="Viitekorko ja pankin marginaali yhteensä." />
      <PropertyField id="loan-term" label="Laina-aika" status="user" suffix="vuotta" type="number" defaultValue={20} help="Pankkilainan suunniteltu takaisinmaksuaika." />
      <PropertyField id="equity" label="Sijoitettu oma pääoma" status="user" suffix="€" type="number" defaultValue={20000} help="Kauppaan sidottava oma raha." />
      <div className="space-y-2"><div className="flex min-h-5 items-center justify-between"><Label>Lyhennystyyppi</Label><SourceBadge status="user" /></div><Select defaultValue="annuity"><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="annuity">Annuiteetti</SelectItem><SelectItem value="equal">Tasalyhennys</SelectItem><SelectItem value="bullet">Kertalyhenteinen laina</SelectItem></SelectContent></Select></div>
    </div><RentalDemandSelector value={demand} onChange={setDemand} /></CardContent></Card>
  );
}
