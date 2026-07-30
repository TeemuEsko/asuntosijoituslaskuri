import { CalendarClock, CheckCircle2, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { confidenceLabels, renovationComponentLabels, timeStatusLabels } from "@/core/i18n/display-values";
import type { HousingCompanyRenovationTexts, RenovationFinding } from "@/core/parser/listing-parser";

const completedStatuses = new Set(["completed", "ongoing"]);

function timingLabel(repair: RenovationFinding): string {
  if (repair.yearFrom !== null && repair.yearTo !== null) return `${repair.yearFrom}–${repair.yearTo}`;
  if (repair.year !== null) return String(repair.year);
  if (repair.timeHorizon === "next_five_years") return "Seuraavan viiden vuoden aikana";
  if (repair.timeHorizon === "one_to_five_years") return "1–5 vuoden aikana";
  if (repair.timeHorizon === "near_future") return "Lähivuosina";
  return "Ajankohta ei tiedossa";
}

function RepairList({ title, icon, repairs }: { title: string; icon: React.ReactNode; repairs: RenovationFinding[] }) {
  if (!repairs.length) return null;
  return <section><div className="mb-3 flex items-center gap-2">{icon}<h3 className="font-semibold">{title}</h3></div><ul className="space-y-3">{repairs.map((repair) => <li key={repair.id} className="rounded-lg border bg-background p-4"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{renovationComponentLabels[repair.component]}</span><Badge variant="outline">{timeStatusLabels[repair.status]}</Badge><Badge variant="outline">{timingLabel(repair)}</Badge></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{repair.description}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Lähde: {repair.sourceName}</span><span>Varmuus: {confidenceLabels[repair.confidence]}</span>{repair.verifiedByDocuments ? <span className="inline-flex items-center gap-1 text-success"><FileCheck2 className="size-3.5" />Vahvistettu asiakirjoista</span> : null}</div>{repair.conflicts.length ? <p className="mt-2 text-xs text-warning">Lähteissä on ristiriita. Korkeamman prioriteetin lähde on käytössä ja alkuperäinen ilmoitustieto on säilytetty.</p> : null}</li>)}</ul></section>;
}

export function HousingCompanyRenovationsCard({ renovations = [], rawTexts }: { renovations?: RenovationFinding[]; rawTexts?: HousingCompanyRenovationTexts }) {
  if (!renovations.length && !rawTexts?.completedRawText && !rawTexts?.plannedRawText) return null;
  const completed = renovations.filter((repair) => completedStatuses.has(repair.status));
  const planned = renovations.filter((repair) => !completedStatuses.has(repair.status));
  return <Card id="taloyhtion-remontit" className="scroll-mt-24"><CardHeader className="border-b"><CardTitle>Taloyhtiön remontit</CardTitle><CardDescription>Myynti-ilmoituksesta tunnistetut tehdyt ja suunnitellut korjaukset</CardDescription></CardHeader><CardContent className="space-y-6"><RepairList title="Tehdyt remontit" icon={<CheckCircle2 className="size-5 text-success" />} repairs={completed} /><RepairList title="Suunnitellut remontit" icon={<CalendarClock className="size-5 text-warning" />} repairs={planned} /><div className="rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm"><p className="font-medium">Vahvista remonttitiedot taloyhtiön asiakirjoista</p><p className="mt-1 text-muted-foreground">Ilmoitustieto ei vielä vahvista hankkeiden tarkkaa laajuutta, päätöksiä, kustannuksia tai huoneistokohtaista maksuosuutta.</p></div>{rawTexts?.completedRawText || rawTexts?.plannedRawText ? <details className="rounded-lg border px-4 py-3 text-sm"><summary className="cursor-pointer font-medium">Näytä alkuperäiset remonttitekstit</summary>{rawTexts.completedRawText ? <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tehdyt remontit</p><p className="mt-1 whitespace-pre-line leading-relaxed">{rawTexts.completedRawText}</p></div> : null}{rawTexts.plannedRawText ? <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suunnitellut remontit</p><p className="mt-1 whitespace-pre-line leading-relaxed">{rawTexts.plannedRawText}</p></div> : null}</details> : null}</CardContent></Card>;
}
