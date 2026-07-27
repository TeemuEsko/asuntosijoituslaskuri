import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { riskItems } from "@/data/property-demo";
import { RuleStatusBadge } from "./status-badge";

export function RiskPreviewCard() {
  return <Card><CardHeader><CardTitle>Risk Engine Preview</CardTitle><CardDescription>Deterministiset ensitarkistukset</CardDescription></CardHeader><CardContent className="space-y-2">{riskItems.map((item) => { const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "warning" ? AlertTriangle : CircleDashed; return <div key={item.title} className="flex items-start gap-2.5 rounded-lg border p-3"><Icon className={`mt-0.5 size-4 shrink-0 ${item.tone === "success" ? "text-success" : item.tone === "warning" ? "text-warning" : "text-muted-foreground"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium leading-snug">{item.title}</p><div className="mt-1.5"><RuleStatusBadge status={item.status} /></div></div></div>})}</CardContent></Card>;
}
