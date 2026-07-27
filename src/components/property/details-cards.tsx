"use client";

import { AlertTriangle, Scale } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LandOwnership, PlotShareRedemptionStatus, RedemptionClauseStatus } from "@/core/domain/property";
import { demoProperty } from "@/data/property-demo";
import { SourceBadge } from "./status-badge";

function DetailGrid({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return <dl className="grid grid-cols-2 gap-x-5 gap-y-4">{rows.map(([label, value]) => <div key={label} className="border-b pb-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd>{label === "Rakennusvuosi" ? <div className="mt-1.5"><SourceBadge status="parser" /></div> : null}</div>)}</dl>;
}

function SelectField<T extends string>({ label, value, onChange, children }: { label: string; value: T; onChange: (value: T) => void; children: React.ReactNode }) {
  return <div className="space-y-2"><div className="flex items-center justify-between"><Label>{label}</Label><SourceBadge status="user" /></div><Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select></div>;
}

export function PropertyDetailsCard() {
  return <Card><CardHeader className="border-b"><CardTitle>Kohteen tiedot</CardTitle><CardDescription>Asunnon perustiedot</CardDescription></CardHeader><CardContent><DetailGrid rows={demoProperty.details} /></CardContent></Card>;
}

export function HousingCompanyCard() {
  const [landOwnership, setLandOwnership] = useState<LandOwnership>("owned");
  const [redemptionStatus, setRedemptionStatus] = useState<PlotShareRedemptionStatus>("unknown");
  const [clause, setClause] = useState<RedemptionClauseStatus>("unchecked");

  return <Card><CardHeader className="border-b"><CardTitle>Taloyhtiö</CardTitle><CardDescription>Vastikkeet, korjaukset ja juridiset tiedot</CardDescription></CardHeader><CardContent className="space-y-5"><DetailGrid rows={demoProperty.company} /><div className="space-y-4 rounded-lg border p-4"><SelectField label="Tontin omistusmuoto" value={landOwnership} onChange={setLandOwnership}><SelectItem value="owned">Oma tontti</SelectItem><SelectItem value="leased">Vuokratontti</SelectItem><SelectItem value="optional_leasehold">Valinnainen vuokratontti</SelectItem></SelectField>{landOwnership === "optional_leasehold" ? <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Huoneistokohtainen tonttiosuus" value={redemptionStatus} onChange={setRedemptionStatus}><SelectItem value="redeemed">Lunastettu</SelectItem><SelectItem value="not_redeemed">Ei lunastettu</SelectItem><SelectItem value="unknown">Ei tiedossa</SelectItem></SelectField><div className="space-y-2"><Label htmlFor="plot-price">Lunastushinta</Label><div className="relative"><Input id="plot-price" type="number" min={0} placeholder="Ei tiedossa" className="h-10 pr-8 text-right" /><span className="absolute inset-y-0 right-3 flex items-center text-muted-foreground">€</span></div></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="plot-date">Seuraava mahdollinen lunastusajankohta</Label><Input id="plot-date" type="date" className="h-10" /></div></div> : null}</div><div className="space-y-4 rounded-lg border p-4"><SelectField label="Yhtiöjärjestyksen lunastuslauseke" value={clause} onChange={setClause}><SelectItem value="no">Ei</SelectItem><SelectItem value="yes">Kyllä</SelectItem><SelectItem value="unchecked">Ei voitu tarkistaa</SelectItem></SelectField>{clause !== "no" ? <div role="alert" className="rounded-lg border border-warning/25 bg-warning-soft p-3"><div className="flex items-center gap-2 text-warning"><Scale className="size-4" /><p className="font-medium">Juridinen tarkistus tarvitaan</p></div><p className="mt-2 text-sm text-muted-foreground">{clause === "yes" ? "Osakkailla ja/tai yhtiöllä voi olla lunastusoikeus. Tarkista lausekkeen ehdot, määräajat ja soveltuminen juristilta tai yhtiöjärjestyksestä ennen päätöstä." : "Mahdollista lunastusoikeutta osakkailla ja/tai yhtiöllä ei voitu tarkistaa. Lisää yhtiöjärjestys, jos se on saatavilla."}</p></div> : null}</div><div className="rounded-lg border border-warning/25 bg-warning-soft p-3"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-warning" /><p className="font-medium">Omistuspohja</p><span className="ml-auto rounded-full border border-warning/30 px-2 py-0.5 text-xs text-warning">Tarkistamatta</span></div><p className="mt-2 text-sm text-muted-foreground">Omistuspohjan keskittymistä ei ole voitu tarkistaa.</p><p className="mt-1 text-sm font-medium">Lisää osakeluettelo, jos se on saatavilla.</p></div></CardContent></Card>;
}
