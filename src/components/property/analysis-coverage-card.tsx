"use client";

import { CheckCircle2, FileText } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { RepairDocumentKind } from "@/core/rules/repair-history";

type DocumentState = "missing" | "processing" | "analyzed" | "failed";
const documents: ReadonlyArray<{ kind: RepairDocumentKind; name: string; description: string; weight: number }> = [
  { kind: "financial_statements", name: "Tilinpäätös", description: "Lisää asiakirja taloyhtiön talouden analysoimiseksi.", weight: 25 },
  { kind: "maintenance_plan", name: "PTS tai kunnossapitotarveselvitys", description: "Lisää asiakirja tulevien korjausten arvioimiseksi.", weight: 20 },
  { kind: "shareholder_register", name: "Osakeluettelo", description: "Lisää asiakirja omistuspohjan tarkistamiseksi.", weight: 10 },
];

export function AnalysisCoverageCard({ documentKinds = [], onDocumentAdded }: { documentKinds?: RepairDocumentKind[]; onDocumentAdded?: (kind: RepairDocumentKind) => void }) {
  const [states, setStates] = useState<Record<string, DocumentState>>(() => Object.fromEntries(documents.map(({ kind }) => [kind, documentKinds.includes(kind) ? "analyzed" : "missing"])));
  const [selectedKind, setSelectedKind] = useState<RepairDocumentKind>("financial_statements");
  const fileInput = useRef<HTMLInputElement>(null);
  const coverage = 45 + documents.reduce((sum, item) => sum + (states[item.kind] === "analyzed" ? item.weight : 0), 0);
  function choose(kind: RepairDocumentKind) { setSelectedKind(kind); fileInput.current?.click(); }
  function receiveFile(file?: File) { if (!file) return; setStates((current) => ({ ...current, [selectedKind]: "processing" })); queueMicrotask(() => { setStates((current) => ({ ...current, [selectedKind]: "analyzed" })); onDocumentAdded?.(selectedKind); }); }
  return <Card><CardHeader><CardTitle>Analyysin kattavuus</CardTitle><CardDescription>Kattavuus ei ole kohteen arvosana</CardDescription></CardHeader><CardContent className="space-y-4"><Progress value={coverage}><ProgressLabel>Valmius</ProgressLabel><ProgressValue>{() => `${coverage} %`}</ProgressValue></Progress><div><p className="text-sm leading-relaxed">Voit parantaa analyysin kattavuutta lisäämällä taloyhtiön asiakirjoja.</p><p className="mt-1 text-sm text-muted-foreground">Lisäasiakirjat auttavat arvioimaan taloyhtiön taloutta, tulevia remontteja ja omistuspohjaa.</p></div><input ref={fileInput} type="file" className="sr-only" onChange={(event) => receiveFile(event.currentTarget.files?.[0])} /><div className="divide-y rounded-lg border">{documents.map((item) => <div key={item.kind} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><FileText className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p></div>{states[item.kind] === "analyzed" ? <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4" />Analysoitu</span> : states[item.kind] === "processing" ? <span className="shrink-0 text-sm text-muted-foreground">Analysoidaan…</span> : states[item.kind] === "failed" ? <Button variant="outline" onClick={() => choose(item.kind)}>Yritä uudelleen</Button> : <Button className="w-full sm:w-auto" variant="outline" onClick={() => choose(item.kind)}>Lisää asiakirja</Button>}</div>)}</div></CardContent></Card>;
}
