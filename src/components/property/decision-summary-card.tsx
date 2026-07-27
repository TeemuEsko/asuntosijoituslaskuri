import { AlertTriangle, CheckCircle2, ChevronDown, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confidenceLabels } from "@/core/i18n/display-values";
import type { RepairHistoryAssessment } from "@/core/rules/repair-history";

const columns = [
  { title: "Vahvuudet", icon: CheckCircle2, tone: "text-success", items: ["Oma tontti", "Hintatiedot täsmäävät"] },
  { title: "Tarkistettavat asiat", icon: AlertTriangle, tone: "text-warning", items: ["Taloyhtiön talous", "Asbestikartoitus ennen purkutöitä"] },
  { title: "Puuttuvat lisätiedot", icon: FileQuestion, tone: "text-muted-foreground", items: ["Tilinpäätös", "Osakeluettelo"] },
] as const;

export function DecisionSummaryCard({ repairHistory }: { repairHistory?: RepairHistoryAssessment }) {
  return <Card id="paatos" className="scroll-mt-24"><CardHeader className="border-b"><div className="flex items-center justify-between gap-3"><CardTitle>Päätöskooste</CardTitle><Badge variant="outline" className="border-warning/30 bg-warning-soft text-warning">Analyysi kesken</Badge></div></CardHeader><CardContent><div className="grid gap-6 md:grid-cols-3">{columns.map(({ title, icon: Icon, tone, items }) => <section key={title}><div className="flex items-center gap-2"><Icon className={`size-4 ${tone}`} /><h3 className="font-medium">{title}</h3></div><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{items.map((item) => <li key={item} className="border-l-2 pl-3">{item}</li>)}</ul></section>)}</div>{repairHistory ? <section className={`mt-6 rounded-lg border p-4 ${repairHistory.severity === "medium" ? "border-warning/30 bg-warning-soft" : "bg-muted/35"}`}><div className="flex flex-wrap items-center gap-2"><AlertTriangle className="size-4 text-warning" /><h3 className="font-semibold">Suurten taloyhtiöremonttien tilanne</h3><Badge variant="outline">{repairHistory.title}</Badge><Badge variant="outline">Varmuus: {confidenceLabels[repairHistory.confidence]}</Badge></div><p className="mt-3 text-sm leading-relaxed">{repairHistory.message}</p>{repairHistory.sourceLimitation ? <p className="mt-2 text-sm text-muted-foreground">{repairHistory.sourceLimitation}</p> : null}{repairHistory.relevantSystems.length ? <details className="mt-3 rounded-md border bg-background/80 px-3 py-2 text-sm"><summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><ChevronDown className="size-4" />Mitä suuria korjauksia tarkistetaan?</summary><ul className="mt-3 space-y-2 text-muted-foreground">{repairHistory.relevantSystems.map((item) => <li key={item.system}><span className="font-medium text-foreground">{item.label}:</span> {item.reason}</li>)}</ul></details> : null}</section> : null}<p className="mt-6 border-t pt-4 text-xs text-muted-foreground">Kooste perustuu tällä sivulla näkyviin tietoihin. Palvelu ei anna osta tai älä osta -suositusta.</p></CardContent></Card>;
}
