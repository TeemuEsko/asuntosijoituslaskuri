import { AlertTriangle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confidenceLabels } from "@/core/i18n/display-values";
import type { RepairHistoryAssessment } from "@/core/rules/repair-history";

export function DecisionSummaryCard({ repairHistory }: { repairHistory?: RepairHistoryAssessment }) {
  if (!repairHistory) return null;
  return <Card id="paatos" className="scroll-mt-24"><CardHeader className="border-b"><CardTitle>Taloyhtiön korjaushistoria</CardTitle></CardHeader><CardContent><section className={`rounded-lg border p-4 ${repairHistory.severity === "medium" ? "border-warning/30 bg-warning-soft" : "bg-muted/35"}`}><div className="flex flex-wrap items-center gap-2"><AlertTriangle className="size-4 text-warning" /><h3 className="font-semibold">{repairHistory.title}</h3><Badge variant="outline">Varmuus: {confidenceLabels[repairHistory.confidence]}</Badge></div><p className="mt-3 text-sm leading-relaxed">{repairHistory.message}</p>{repairHistory.sourceLimitation ? <p className="mt-2 text-sm text-muted-foreground">{repairHistory.sourceLimitation}</p> : null}{repairHistory.relevantSystems.length ? <details className="mt-3 rounded-md border bg-background/80 px-3 py-2 text-sm"><summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><ChevronDown className="size-4" />Mitä suuria korjauksia tarkistetaan?</summary><ul className="mt-3 space-y-2 text-muted-foreground">{repairHistory.relevantSystems.map((item) => <li key={item.system}><span className="font-medium text-foreground">{item.label}:</span> {item.reason}</li>)}</ul></details> : null}</section><p className="mt-4 text-xs text-muted-foreground">Arvio perustuu analyysiin lisättyihin korjaustietoihin ja lähdeasiakirjoihin.</p></CardContent></Card>;
}
