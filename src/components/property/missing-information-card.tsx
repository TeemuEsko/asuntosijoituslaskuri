import { Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MissingInformationCard() {
  return <Card><CardHeader><CardTitle>Olennaiset puuttuvat tiedot</CardTitle><CardDescription>Kumpikaan ei estä perusanalyysiä</CardDescription></CardHeader><CardContent className="space-y-4"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Päätöksen estävät</p><p className="mt-2 flex items-center gap-2 text-sm text-success"><Info className="size-4" />Ei puuttuvia tietoja</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Analyysiä syventävät</p><ul className="mt-2 list-inside list-disc space-y-1 text-sm"><li>Taloyhtiön tilinpäätös</li><li>Osakeluettelo</li></ul></div></CardContent></Card>;
}
