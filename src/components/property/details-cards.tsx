"use client";

import { AlertTriangle, Scale } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LandOwnership, PlotShareRedemptionStatus, RedemptionClauseStatus } from "@/core/domain/property";
import { landOwnershipLabels, plotShareRedemptionLabels, redemptionClauseLabels } from "@/core/i18n/display-values";
import { formatArea, formatFinnishNumber, formatMonthlyEuro } from "@/core/parser/normalization";
import type { ImportedPropertyData } from "./property-workspace";
import { SourceBadge } from "./status-badge";

function DetailGrid({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return <dl className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="min-w-0 border-b pb-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl>;
}

function SelectField<T extends string>({ label, value, onChange, children }: { label: string; value: T; onChange: (value: T) => void; children: ReactNode }) {
  return <div className="min-w-0 space-y-2"><div className="flex min-h-10 min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1"><Label className="min-w-0 flex-1 whitespace-normal leading-5">{label}</Label><SourceBadge status="user" /></div><Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}><SelectTrigger className="h-11 w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent>{children}</SelectContent></Select></div>;
}

export function PropertyDetailsCard({ importedData }: { importedData: ImportedPropertyData }) {
  const rows: ReadonlyArray<readonly [string, string]> = [
    ["Pinta-ala", typeof importedData.areaSqm === "number" ? formatArea(importedData.areaSqm) : "Ei tiedossa"],
    ["Huoneet", typeof importedData.roomDescription === "string" ? importedData.roomDescription : "Ei tiedossa"],
    ["Rakennusvuosi", typeof importedData.constructionYear === "number" ? formatFinnishNumber(importedData.constructionYear, 0) : "Ei tiedossa"],
    ["Kerros", typeof importedData.floor === "string" ? importedData.floor : "Ei tiedossa"],
    ["Kunto", typeof importedData.condition === "string" ? importedData.condition : "Ei tiedossa"],
  ];
  return <Card><CardHeader className="border-b"><CardTitle>Kohteen tiedot</CardTitle><CardDescription>Asunnon perustiedot</CardDescription></CardHeader><CardContent><DetailGrid rows={rows} /></CardContent></Card>;
}

export function HousingCompanyCard({ importedData }: { importedData: ImportedPropertyData }) {
  const importedLand = importedData.landOwnership;
  const initialLand: LandOwnership = importedLand === "owned" || importedLand === "leased" || importedLand === "optional_leasehold" ? importedLand : "owned";
  const [landOwnership, setLandOwnership] = useState<LandOwnership>(initialLand);
  const [redemptionStatus, setRedemptionStatus] = useState<PlotShareRedemptionStatus>("unknown");
  const [clause, setClause] = useState<RedemptionClauseStatus>("unchecked");
  const rows: ReadonlyArray<readonly [string, string]> = [
    ["Taloyhtiö", typeof importedData.housingCompanyName === "string" ? importedData.housingCompanyName : "Ei tiedossa"],
    ["Hoitovastike", typeof importedData.maintenanceFeeMonthly === "number" ? formatMonthlyEuro(importedData.maintenanceFeeMonthly) : "Ei tiedossa"],
    ["Rahoitusvastike", typeof importedData.financingFeeMonthly === "number" ? formatMonthlyEuro(importedData.financingFeeMonthly) : "Ei tiedossa"],
    ["Huoneistoja", typeof importedData.apartmentCount === "number" ? formatFinnishNumber(importedData.apartmentCount, 0) : "Ei tiedossa"],
  ];
  return <Card><CardHeader className="border-b"><CardTitle>Taloyhtiö</CardTitle><CardDescription>Vastikkeet, korjaukset ja juridiset tiedot</CardDescription></CardHeader><CardContent className="space-y-6"><DetailGrid rows={rows} /><div className="space-y-4 rounded-lg border p-4"><SelectField label="Tontin omistusmuoto" value={landOwnership} onChange={setLandOwnership}>{(Object.entries(landOwnershipLabels) as Array<[LandOwnership, string]>).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectField>{landOwnership === "optional_leasehold" ? <div className="grid gap-4 sm:grid-cols-2"><SelectField label="Huoneistokohtainen tonttiosuus" value={redemptionStatus} onChange={setRedemptionStatus}>{(Object.entries(plotShareRedemptionLabels) as Array<[PlotShareRedemptionStatus, string]>).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectField><div className="space-y-2"><Label htmlFor="plot-price">Lunastushinta</Label><div className="relative"><Input id="plot-price" type="number" min={0} placeholder="Ei tiedossa" className="h-11 pr-10 text-right" /><span className="absolute inset-y-0 right-3 flex items-center text-muted-foreground">€</span></div></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="plot-date" className="whitespace-normal leading-5">Seuraava mahdollinen lunastusajankohta</Label><Input id="plot-date" type="date" className="h-11" /></div></div> : null}</div><div className="space-y-4 rounded-lg border p-4"><SelectField label="Yhtiöjärjestyksen lunastuslauseke" value={clause} onChange={setClause}>{(Object.entries(redemptionClauseLabels) as Array<[RedemptionClauseStatus, string]>).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectField>{clause !== "no" ? <div role="alert" className="rounded-lg border border-warning/25 bg-warning-soft p-3"><div className="flex items-center gap-2 text-warning"><Scale className="size-4 shrink-0" /><p className="font-medium">Juridinen tarkistus tarvitaan</p></div><p className="mt-2 text-sm text-muted-foreground">{clause === "yes" ? "Osakkailla ja/tai yhtiöllä voi olla lunastusoikeus. Tarkista lausekkeen ehdot, määräajat ja soveltuminen juristilta tai yhtiöjärjestyksestä ennen päätöstä." : "Mahdollista lunastusoikeutta osakkailla ja/tai yhtiöllä ei voitu tarkistaa. Lisää yhtiöjärjestys, jos se on saatavilla."}</p></div> : null}</div><div className="rounded-lg border border-warning/25 bg-warning-soft p-3"><div className="flex flex-wrap items-center gap-2"><AlertTriangle className="size-4 shrink-0 text-warning" /><p className="min-w-0 flex-1 font-medium">Omistuspohja</p><span className="shrink-0 rounded-full border border-warning/30 px-2 py-0.5 text-xs text-warning">Ei tarkistettu</span></div><p className="mt-2 text-sm text-muted-foreground">Omistuspohjan keskittymistä ei ole voitu tarkistaa.</p><p className="mt-1 text-sm font-medium">Lisää osakeluettelo, jos se on saatavilla.</p></div></CardContent></Card>;
}
