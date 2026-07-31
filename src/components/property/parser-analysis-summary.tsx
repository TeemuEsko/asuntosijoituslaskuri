import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { countAnalysisFields } from "@/core/analysis/analysis-field-registry";
import type { ListingParseResult } from "@/core/parser/listing-parser";

function reliabilityStars(result?: ListingParseResult): string {
  if (!result?.findings.length) return "☆☆☆☆☆";
  const average = result.findings.reduce((sum, finding) => sum + finding.confidenceScore, 0) / result.findings.length;
  const filled = Math.max(1, Math.min(5, Math.round(average / 20)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function ParserAnalysisSummary({ result, missingFields, compact = false }: { result?: ListingParseResult; missingFields: string[]; compact?: boolean }) {
  const fieldCount = result ? countAnalysisFields(result) : null;
  if (compact) return <div role="status" className="inline-flex max-w-full items-start gap-2 rounded-lg border border-success/25 bg-success-soft/30 px-3 py-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /><span><strong>Lähtötiedot valmiit.</strong> Kaikki kriittiset lähtötiedot ovat käytettävissä.</span></div>;
  const missingCopy = missingFields.length === 1 ? "Tarvitaan vielä 1 kriittinen tieto" : `Tarvitaan vielä ${missingFields.length} kriittistä tietoa`;
  return <Card className="border-success/25 bg-success-soft/30"><CardContent className="space-y-5 py-2"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /><div className="min-w-0"><p className="font-semibold">Täydennä vielä analyysin lähtötiedot</p><p className="mt-1 text-sm text-muted-foreground">Löysimme suurimman osan kohteen tiedoista automaattisesti. Täydennä vielä alla olevat tiedot, jotta sijoitusanalyysi voidaan muodostaa luotettavasti.</p>{result && fieldCount ? <><p className="mt-3 text-sm">Löydetty automaattisesti: <strong>{fieldCount.found} / {fieldCount.total} tietoa</strong></p><p className="mt-1 text-sm"><span className="text-muted-foreground">Parserin luotettavuus:</span> <span aria-label={`${reliabilityStars(result).replaceAll("☆", "").length} tähteä viidestä`} className="tracking-wider text-amber-600">{reliabilityStars(result)}</span></p></> : null}</div></div><div><p className="text-sm font-semibold">{missingCopy}:</p><ul className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{missingFields.map((field) => <li key={field} className="rounded-md border bg-background/75 px-3 py-2">{field}</li>)}</ul></div><p className="text-sm font-medium">Lopullinen sijoitusarvio muodostuu, kun kriittiset lähtötiedot on täydennetty.</p></CardContent></Card>;
}
