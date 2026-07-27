import { ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";

const documents = [["Tilinpäätös", "Taloyhtiön talous"], ["PTS", "Tulevat korjaukset"], ["Osakeluettelo", "Omistuspohjan keskittyminen"], ["Energiatodistus", "Energiatehokkuus"]] as const;

export function AnalysisCoverageCard() {
  return <Card><CardHeader><CardTitle>Analyysin kattavuus</CardTitle><CardDescription>Kattavuus ei ole kohteen arvosana</CardDescription></CardHeader><CardContent className="space-y-4"><Progress value={72}><ProgressLabel>Valmius</ProgressLabel><ProgressValue>{() => "72 %"}</ProgressValue></Progress><p className="text-sm leading-relaxed text-muted-foreground">Kohde voidaan jo analysoida, mutta lisätiedot parantavat tulosta.</p><div className="divide-y rounded-lg border">{documents.map(([name, unlock]) => <div key={name} className="flex items-center gap-3 p-3"><FileText className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">Avaa: {unlock}</p></div><Button variant="ghost" size="icon-sm" aria-label={`Lisää ${name}`}><ArrowUpRight /></Button></div>)}</div></CardContent></Card>;
}
