import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ListingParseResult } from "@/core/parser/listing-parser";
import { criticalFields } from "@/core/parser/synonyms";

function reliabilityStars(result?: ListingParseResult): string {
  if (!result?.findings.length) return "☆☆☆☆☆";
  const average = result.findings.reduce((sum, finding) => sum + finding.confidenceScore, 0) / result.findings.length;
  const filled = Math.max(1, Math.min(5, Math.round(average / 20)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function ParserAnalysisSummary({ result, missingFields, compact = false }: { result?: ListingParseResult; missingFields: string[]; compact?: boolean }) {
  const found = result ? new Set(result.findings.filter((finding) => finding.validationResult === "accepted" && !finding.conflicts.length).map((finding) => finding.field)).size : 0;
  const complete = missingFields.length === 0;
  const stars = reliabilityStars(result);
  const title = result ? "Analysoimme ilmoituksen onnistuneesti" : complete ? "Analyysin lähtötiedot ovat valmiit" : "Täydennä analyysin lähtötiedot";
  return <Card className="border-success/25 bg-success-soft/30"><CardContent className={compact ? "py-3" : "space-y-5 py-2"}><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /><div className="min-w-0"><p className="font-semibold">{title}</p>{result ? <p className="mt-1 text-sm text-muted-foreground">Löysimme <strong className="text-foreground">{found} / {criticalFields.length}</strong> analyysissä tarvittavaa tietoa automaattisesti.</p> : <p className="mt-1 text-sm text-muted-foreground">{complete ? "Kaikki analyysin muodostamiseen tarvittavat kriittiset tiedot ovat käytettävissä." : "Syötä vain analyysin muodostamiseen tarvittavat puuttuvat tiedot."}</p>}{result ? <p className="mt-2 text-sm"><span className="text-muted-foreground">Parserin luotettavuus:</span> <span aria-label={`${stars.replaceAll("☆", "").length} tähteä viidestä`} className="tracking-wider text-success">{stars}</span></p> : null}</div></div>{!compact && !complete ? <div className="rounded-lg border bg-background/70 p-4"><p className="text-sm font-medium">Täydennä vielä nämä kriittiset tiedot:</p><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">{missingFields.map((field) => <li key={field}>{field}</li>)}</ul><p className="mt-3 text-sm text-muted-foreground">Kun tiedot ovat valmiit, muodostamme sijoitusanalyysin automaattisesti.</p></div> : null}</CardContent></Card>;
}
