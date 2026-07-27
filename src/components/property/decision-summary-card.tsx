import { AlertTriangle, CheckCircle2, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const columns = [
  { title: "Vahvuudet", icon: CheckCircle2, tone: "text-success", items: ["Oma tontti", "Putkiremontti tehty 2018", "Hintatiedot täsmäävät"] },
  { title: "Tarkistettavat asiat", icon: AlertTriangle, tone: "text-warning", items: ["Julkisivuremontti suunnitteilla 2029", "Taloyhtiön talous", "Asbestikartoitus ennen purkutöitä"] },
  { title: "Puuttuvat lisätiedot", icon: FileQuestion, tone: "text-muted-foreground", items: ["Tilinpäätös", "Osakeluettelo"] },
] as const;

export function DecisionSummaryCard() {
  return <Card id="paatos" className="scroll-mt-24"><CardHeader className="border-b"><div className="flex items-center justify-between gap-3"><CardTitle>Päätöskooste</CardTitle><Badge variant="outline" className="border-warning/30 bg-warning-soft text-warning">Analyysi kesken</Badge></div></CardHeader><CardContent><div className="grid gap-6 md:grid-cols-3">{columns.map(({ title, icon: Icon, tone, items }) => <section key={title}><div className="flex items-center gap-2"><Icon className={`size-4 ${tone}`} /><h3 className="font-medium">{title}</h3></div><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{items.map((item) => <li key={item} className="border-l-2 pl-3">{item}</li>)}</ul></section>)}</div><p className="mt-6 border-t pt-4 text-xs text-muted-foreground">Kooste perustuu tällä sivulla näkyviin tietoihin. Palvelu ei anna osta tai älä osta -suositusta.</p></CardContent></Card>;
}
