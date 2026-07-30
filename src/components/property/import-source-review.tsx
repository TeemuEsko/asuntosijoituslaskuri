"use client";

import { useState } from "react";
import { ChevronDown, EyeOff, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confidenceLabels, displayListingStringValue } from "@/core/i18n/display-values";
import { normalizeHeatingType } from "@/core/domain/heating";
import type { ListingParseResult } from "@/core/parser/listing-parser";
import type { NormalizedFieldKey } from "@/core/parser/synonyms";

export function ImportSourceReview({ result, onChange }: { result: ListingParseResult; onChange: (field: NormalizedFieldKey, value: number | string | undefined) => void }) {
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  return <details className="rounded-lg border bg-background"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium"><span>Näytä löydetyt tiedot ja lähteet</span><ChevronDown className="size-4" /></summary><div className="space-y-3 border-t p-4">{result.findings.map((finding) => { const isIgnored = ignored.has(finding.id); const displayValue = typeof finding.normalizedValue === "string" ? displayListingStringValue(finding.field, finding.normalizedValue) : String(finding.normalizedValue); return <div key={finding.id} className={`rounded-md border p-3 ${isIgnored ? "opacity-50" : ""}`}><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{finding.fieldName}</p><Badge variant="outline">Varmuus: {confidenceLabels[finding.confidence]}</Badge></div>{editing === finding.id ? <Input className="mt-2" defaultValue={displayValue} onBlur={(event) => { const raw = event.currentTarget.value; const value = typeof finding.normalizedValue === "number" ? Number(raw.replace(",", ".")) : finding.field === "heatingType" ? normalizeHeatingType(raw) ?? raw : raw; if ((typeof value === "number" && Number.isFinite(value)) || typeof value === "string") onChange(finding.field, value); setEditing(null); }} autoFocus /> : <p className="mt-1 text-sm">{displayValue}</p>}<p className="mt-2 text-xs text-muted-foreground">Myynti-ilmoituksesta löydetty.</p><p className="text-xs text-muted-foreground">Lähde: {finding.sourceExcerpt}</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(finding.id)}><Pencil /> Muokkaa</Button><Button size="sm" variant="outline" onClick={() => { setIgnored((current) => new Set(current).add(finding.id)); onChange(finding.field, undefined); }}><EyeOff /> Jätä käyttämättä</Button></div></div>; })}</div></details>;
}
