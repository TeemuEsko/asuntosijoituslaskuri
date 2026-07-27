"use client";

import { AlertCircle, ArrowLeft, Check, Link2, LoaderCircle, Pencil, Search, TextCursorInput, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { confidenceLabels, landOwnershipLabels, listingSourceLabels, renovationComponentLabels, timeStatusLabels } from "@/core/i18n/display-values";
import { formatArea, formatEuro, formatMonthlyEuro, formatFinnishNumber } from "@/core/parser/normalization";
import type { FindingDecision, ListingFinding, ListingParseResult } from "@/core/parser/listing-parser";
import type { ImportedPropertyData } from "./property-workspace";

type ImportMode = "url" | "text";
type DecisionState = Record<string, { decision: FindingDecision; correctedValue?: string }>;

function displayFindingValue(finding: ListingFinding, correctedValue?: string): string {
  if (correctedValue !== undefined) return correctedValue;
  if (typeof finding.normalizedValue === "string") {
    if (finding.field === "landOwnership") return landOwnershipLabels[finding.normalizedValue as keyof typeof landOwnershipLabels];
    return finding.normalizedValue;
  }
  if (finding.unit === "€") return formatEuro(finding.normalizedValue);
  if (finding.unit === "€/kk") return formatMonthlyEuro(finding.normalizedValue);
  if (finding.unit === "m²") return formatArea(finding.normalizedValue);
  return formatFinnishNumber(finding.normalizedValue);
}

export function ListingImport({ onBack, onComplete }: { onBack: () => void; onComplete: (values: ImportedPropertyData) => void }) {
  const [mode, setMode] = useState<ImportMode>("url");
  const [value, setValue] = useState("");
  const [result, setResult] = useState<ListingParseResult | null>(null);
  const [decisions, setDecisions] = useState<DecisionState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchListing() {
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/listing-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: mode, value }) });
      const payload = (await response.json()) as ListingParseResult | { error: string };
      if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "Myynti-ilmoituksen tietoja ei voitu hakea.");
      setResult(payload); setDecisions(Object.fromEntries(payload.findings.map((finding) => [finding.id, { decision: "pending" }])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Myynti-ilmoituksen tietoja ei voitu hakea.");
    } finally { setLoading(false); }
  }

  function decide(finding: ListingFinding, decision: FindingDecision) {
    setDecisions((current) => {
      const next = { ...current, [finding.id]: { ...current[finding.id], decision } };
      if ((decision === "accepted" || decision === "corrected") && finding.conflicts.length > 0) {
        for (const sibling of result?.findings ?? []) if (sibling.id !== finding.id && sibling.field === finding.field) next[sibling.id] = { decision: "ignored" };
      }
      return next;
    });
  }

  function createProperty() {
    const importedValues: ImportedPropertyData = {};
    for (const finding of result?.findings ?? []) {
      const state = decisions[finding.id];
      if (!state || (state.decision !== "accepted" && state.decision !== "corrected")) continue;
      const valueToUse = state.correctedValue !== undefined
        ? typeof finding.normalizedValue === "number"
          ? Number(state.correctedValue.replace(/\s/g, "").replace(",", "."))
          : state.correctedValue
        : finding.normalizedValue;
      if ((typeof valueToUse === "number" && Number.isFinite(valueToUse)) || typeof valueToUse === "string") importedValues[finding.field] = valueToUse;
    }
    onComplete(importedValues);
  }

  const reviewed = result !== null && result.findings.length > 0 && result.findings.every((finding) => {
    const state = decisions[finding.id];
    return state?.decision === "accepted" || state?.decision === "ignored" || (state?.decision === "corrected" && Boolean(state.correctedValue?.trim()));
  });
  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 md:px-8 md:py-12"><Button variant="ghost" onClick={onBack}><ArrowLeft /> Takaisin</Button><div className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">asuntosijoituslaskuri.fi</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Hae tiedot myynti-ilmoituksesta</h1><p className="mt-2 max-w-2xl text-muted-foreground">Tarkistat ja hyväksyt jokaisen löydetyn tiedon ennen uuden kohteen luomista.</p></div><Card className="mt-8"><CardHeader><CardTitle>Myynti-ilmoituksen lähde</CardTitle><CardDescription>Valitse Etuovi- tai Oikotie-linkki tai liitä ilmoituksen teksti.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid grid-cols-2 gap-2"><Button variant={mode === "url" ? "default" : "outline"} onClick={() => { setMode("url"); setResult(null); }}><Link2 /> Ilmoituksen linkki</Button><Button variant={mode === "text" ? "default" : "outline"} onClick={() => { setMode("text"); setResult(null); }}><TextCursorInput /> Ilmoituksen teksti</Button></div>{mode === "url" ? <div className="space-y-2"><Label htmlFor="listing-url">Etuovi- tai Oikotie-linkki</Label><Input id="listing-url" type="url" value={value} onChange={(event) => setValue(event.currentTarget.value)} placeholder="https://www.etuovi.com/kohde/..." className="h-11" /></div> : <div className="space-y-2"><Label htmlFor="listing-text">Ilmoituksen teksti</Label><Textarea id="listing-text" value={value} onChange={(event) => setValue(event.currentTarget.value)} placeholder="Liitä myynti-ilmoituksen tiedot tähän" className="min-h-44" /></div>}<Button size="lg" disabled={loading || !value.trim()} onClick={searchListing}>{loading ? <LoaderCircle className="animate-spin" /> : <Search />} {loading ? "Haetaan tietoja…" : "Hae tiedot"}</Button>{error ? <div role="alert" className="flex gap-2 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm text-danger"><AlertCircle className="size-4 shrink-0" />{error}</div> : null}</CardContent></Card>{result ? <section className="mt-8 space-y-4"><div><h2 className="text-xl font-semibold">Löydetyt tiedot</h2><p className="mt-1 text-sm text-muted-foreground">Lähde: {listingSourceLabels[result.source]}. Hyväksy, korjaa tai jätä käyttämättä jokainen tieto.</p></div>{result.warnings.map((warning) => <div key={warning} className="rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm text-warning">{warning}</div>)}{result.findings.map((finding) => { const state = decisions[finding.id] ?? { decision: "pending" as const }; return <Card key={finding.id} className={state.decision === "accepted" || state.decision === "corrected" ? "ring-success/40" : state.decision === "ignored" ? "opacity-60" : finding.conflicts.length ? "ring-danger/40" : undefined}><CardContent className="grid gap-4 pt-1 md:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{finding.fieldName}</h3><Badge variant="outline">Varmuus: {confidenceLabels[finding.confidence]}</Badge>{finding.aggregate ? <Badge variant="outline">Yhteissumma</Badge> : null}</div><p className="mt-2 text-lg font-semibold tabular-nums">{displayFindingValue(finding, state.correctedValue)}</p><p className="mt-2 text-xs text-muted-foreground">Lähdekatkelma: “{finding.sourceExcerpt}”</p><p className="mt-1 text-xs text-muted-foreground">Alkuperäinen arvo: {finding.originalValue}</p>{finding.breakdown ? <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{finding.breakdown.map((part) => <li key={`${part.label}-${part.value}`}>{part.label}: {formatMonthlyEuro(part.value)}</li>)}</ul> : null}{finding.conflicts.map((conflict) => <p key={conflict} className="mt-2 text-sm font-medium text-danger">Ristiriita: {conflict}</p>)}{state.decision === "corrected" ? <div className="mt-3 max-w-xs space-y-2"><Label htmlFor={`correct-${finding.id}`}>Korjattu arvo</Label><Input id={`correct-${finding.id}`} value={state.correctedValue ?? ""} onChange={(event) => setDecisions((current) => ({ ...current, [finding.id]: { decision: "corrected", correctedValue: event.currentTarget.value } }))} /></div> : null}</div><div className="flex flex-wrap content-start gap-2 md:max-w-48"><Button size="sm" variant={state.decision === "accepted" ? "default" : "outline"} onClick={() => decide(finding, "accepted")}><Check /> Hyväksy</Button><Button size="sm" variant={state.decision === "corrected" ? "default" : "outline"} onClick={() => decide(finding, "corrected")}><Pencil /> Korjaa</Button><Button size="sm" variant={state.decision === "ignored" ? "destructive" : "outline"} onClick={() => decide(finding, "ignored")}><X /> Jätä käyttämättä</Button></div></CardContent></Card>; })}{result.renovations.length ? <Card><CardHeader><CardTitle>Remonttihavainnot</CardTitle><CardDescription>Remontin osia ei yhdistetä automaattisesti toisiinsa.</CardDescription></CardHeader><CardContent className="space-y-3">{result.renovations.map((renovation, index) => <div key={`${renovation.component}-${index}`} className="rounded-lg border p-3"><p className="font-medium">{renovationComponentLabels[renovation.component]}</p><p className="mt-1 text-sm">{timeStatusLabels[renovation.status]}{renovation.years.length ? ` ${renovation.years.join("–")}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">“{renovation.sourceExcerpt}” · Varmuus {confidenceLabels[renovation.confidence].toLocaleLowerCase("fi")}</p></div>)}</CardContent></Card> : null}<div className="flex justify-end"><Button size="lg" disabled={!reviewed} onClick={createProperty}>Luo kohde hyväksytyillä tiedoilla</Button></div>{!reviewed && result.findings.length > 0 ? <p className="text-right text-xs text-muted-foreground">Käsittele kaikki löydetyt tiedot ennen jatkamista.</p> : null}</section> : null}</main>;
}
