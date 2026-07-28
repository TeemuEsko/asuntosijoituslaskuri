import { Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayBuildingType, showFloor } from "@/core/analysis/analysis-presentation";
import { landOwnershipLabels } from "@/core/i18n/display-values";
import { formatArea, formatFinnishNumber, formatMonthlyEuro } from "@/core/parser/normalization";
import type { ImportedPropertyData } from "./property-workspace";

function present(value: unknown): value is string | number { return (typeof value === "string" && Boolean(value.trim()) && !/^(unknown|ei tiedossa)$/i.test(value.trim())) || (typeof value === "number" && Number.isFinite(value)); }

function DetailGrid({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return <dl className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="min-w-0 border-b pb-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl>;
}

export function PropertyDetailsCard({ importedData }: { importedData: ImportedPropertyData }) {
  const rows: Array<readonly [string, string]> = [];
  const type = displayBuildingType(importedData.buildingType);
  if (type) rows.push(["Asuntotyyppi", type]);
  if (present(importedData.roomDescription)) rows.push(["Huonejako", String(importedData.roomDescription)]);
  if (typeof importedData.areaSqm === "number") rows.push(["Pinta-ala", formatArea(importedData.areaSqm)]);
  if (typeof importedData.constructionYear === "number") rows.push(["Rakennusvuosi", formatFinnishNumber(importedData.constructionYear, 0)]);
  if (showFloor(importedData.buildingType, importedData.floor)) rows.push(["Kerros", String(importedData.floor)]);
  if (present(importedData.condition)) rows.push(["Kunto", String(importedData.condition)]);
  return <Card><CardHeader className="border-b"><CardTitle>Kohteen tiedot</CardTitle><CardDescription>Asunnon saatavilla olevat perustiedot</CardDescription></CardHeader><CardContent>{rows.length ? <DetailGrid rows={rows} /> : <p className="text-sm text-muted-foreground">Perustietoja ei ole vielä saatavilla.</p>}</CardContent></Card>;
}

const landLabels: Record<string, string> = { ...landOwnershipLabels, partial_ownership: "Osittain oma tontti", other: "Muu", unknown: "Ei tiedossa" };

export function HousingCompanyCard({ importedData }: { importedData: ImportedPropertyData }) {
  const rows: Array<readonly [string, string]> = [];
  if (present(importedData.housingCompanyName)) rows.push(["Taloyhtiö", String(importedData.housingCompanyName)]);
  if (typeof importedData.maintenanceFeeMonthly === "number") rows.push(["Hoitovastike", formatMonthlyEuro(importedData.maintenanceFeeMonthly)]);
  if (typeof importedData.financingFeeMonthly === "number") rows.push(["Rahoitusvastike", formatMonthlyEuro(importedData.financingFeeMonthly)]);
  if (typeof importedData.apartmentCount === "number") rows.push(["Huoneistoja", formatFinnishNumber(importedData.apartmentCount, 0)]);
  if (present(importedData.landOwnership)) rows.push(["Tontin omistusmuoto", landLabels[String(importedData.landOwnership)] ?? String(importedData.landOwnership)]);
  const hasClause = importedData.redemptionClause === "yes";
  return <Card><CardHeader className="border-b"><CardTitle>Taloyhtiö ja remontit</CardTitle><CardDescription>Vastikkeet, tontti ja olennaiset juridiset huomiot</CardDescription></CardHeader><CardContent className="space-y-5">{rows.length ? <DetailGrid rows={rows} /> : <p className="text-sm text-muted-foreground">Taloyhtiön tietoja ei ole vielä saatavilla.</p>}{hasClause ? <div className="flex gap-3 rounded-lg border bg-muted/30 p-3"><Scale className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><div><p className="font-medium">Yhtiöjärjestyksessä on lunastuslauseke.</p><p className="mt-1 text-sm text-muted-foreground">Lauseke voi vaikuttaa osakkeiden siirtymiseen kaupan jälkeen. Tarkista ehdot yhtiöjärjestyksestä.</p></div></div> : null}</CardContent></Card>;
}
