"use client";

import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { DocumentAnalysisResult } from "@/core/documents/types";
import type { RepairDocumentKind } from "@/core/rules/repair-history";
import { analyzePropertyDocument } from "./document-analysis-client";

type DocumentState = "missing" | "processing" | "analyzed" | "failed";
type DocumentStates = Record<string, DocumentState>;

const documents: ReadonlyArray<{ kind: RepairDocumentKind; name: string; description: string; weight: number }> = [
  { kind: "manager_certificate", name: "Isännöitsijäntodistus", description: "Poimi kohteen vastike-, laina-, huoneisto- ja taloyhtiötiedot.", weight: 25 },
  { kind: "financial_statements", name: "Tilinpäätös", description: "Lisää asiakirja taloyhtiön talouden analysoimiseksi.", weight: 15 },
  { kind: "maintenance_plan", name: "PTS tai kunnossapitotarveselvitys", description: "Lisää asiakirja tulevien korjausten arvioimiseksi.", weight: 10 },
  { kind: "shareholder_register", name: "Osakeluettelo", description: "Lisää asiakirja omistuspohjan tarkistamiseksi.", weight: 5 },
];

function initialDocumentStates(documentKinds: readonly RepairDocumentKind[]): DocumentStates {
  return Object.fromEntries(
    documents.map(({ kind }) => [
      kind,
      documentKinds.includes(kind) ? "analyzed" : "missing",
    ]),
  );
}

function synchronizeDocumentStates(
  current: DocumentStates,
  analyzedKinds: ReadonlySet<string>,
): DocumentStates {
  let changed = false;
  const next = { ...current };

  for (const { kind } of documents) {
    const synchronizedState = analyzedKinds.has(kind)
      ? "analyzed"
      : current[kind] === "analyzed"
        ? "missing"
        : (current[kind] ?? "missing");
    if (synchronizedState !== current[kind]) {
      next[kind] = synchronizedState;
      changed = true;
    }
  }

  return changed ? next : current;
}

export function AnalysisCoverageCard({
  documentKinds = [],
  listingRenovationsFound = false,
  warnings = [],
  onDocumentAnalyzed,
}: {
  documentKinds?: RepairDocumentKind[];
  listingRenovationsFound?: boolean;
  warnings?: string[];
  onDocumentAnalyzed?: (analysis: DocumentAnalysisResult) => void;
}) {
  const [states, setStates] = useState<DocumentStates>(() => initialDocumentStates(documentKinds));
  const [errors, setErrors] = useState<Partial<Record<RepairDocumentKind, string>>>({});
  const [notices, setNotices] = useState<Partial<Record<RepairDocumentKind, string>>>({});
  const selectedKind = useRef<RepairDocumentKind>("manager_certificate");
  const activeUploadKind = useRef<RepairDocumentKind | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const documentKindsSignature = documents
    .filter(({ kind }) => documentKinds.includes(kind))
    .map(({ kind }) => kind)
    .join("|");
  const coverage = 45 + documents.reduce((sum, item) => sum + (states[item.kind] === "analyzed" ? item.weight : 0), 0);
  const uploadInProgress = Object.values(states).some((state) => state === "processing");

  useEffect(() => {
    const analyzedKinds = new Set(documentKindsSignature.split("|").filter(Boolean));
    setStates((current) => synchronizeDocumentStates(current, analyzedKinds));
    setErrors((current) => {
      let changed = false;
      const next = { ...current };
      for (const kind of analyzedKinds) {
        if (next[kind as RepairDocumentKind] !== undefined) {
          delete next[kind as RepairDocumentKind];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [documentKindsSignature]);

  function choose(kind: RepairDocumentKind) {
    if (activeUploadKind.current !== null) return;
    selectedKind.current = kind;
    if (fileInput.current) {
      fileInput.current.value = "";
      fileInput.current.click();
    }
  }

  async function receiveFile(file?: File) {
    if (!file || activeUploadKind.current !== null) return;
    const kind = selectedKind.current;
    activeUploadKind.current = kind;
    setStates((current) => ({ ...current, [kind]: "processing" }));
    setErrors((current) => ({ ...current, [kind]: undefined }));
    setNotices((current) => ({ ...current, [kind]: undefined }));
    try {
      const result = await analyzePropertyDocument(file, kind);
      onDocumentAnalyzed?.(result);
      setStates((current) => {
        const next = {
          ...current,
          [kind]: documentKinds.includes(kind) ? "analyzed" : "missing",
        } satisfies DocumentStates;
        if (result.documentKind) next[result.documentKind] = "analyzed";
        return next;
      });
      const noticeKind = result.documentKind ?? kind;
      setNotices((current) => ({
        ...current,
        [noticeKind]: result.fields.length > 0 || result.renovations.length > 0
          ? `Analyysi päivitettiin asiakirjan tiedoilla (${result.fields.length} kenttää).`
          : "Asiakirja analysoitiin, mutta siitä ei löytynyt uusia varmoja analyysitietoja.",
      }));
    } catch (error) {
      setStates((current) => ({ ...current, [kind]: "failed" }));
      setErrors((current) => ({ ...current, [kind]: error instanceof Error ? error.message : "Asiakirjan analysointi epäonnistui." }));
    } finally {
      activeUploadKind.current = null;
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Analyysin kattavuus</CardTitle><CardDescription>Kattavuus ei ole kohteen arvosana</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <Progress value={coverage}><ProgressLabel>Valmius</ProgressLabel><ProgressValue>{() => `${coverage} %`}</ProgressValue></Progress>
        <div><p className="text-sm leading-relaxed">{listingRenovationsFound ? "Ilmoituksesta löytyi remonttitietoja. Lisää taloyhtiön asiakirjat, jotta tehdyt ja suunnitellut remontit voidaan vahvistaa." : "Voit parantaa analyysin kattavuutta lisäämällä taloyhtiön asiakirjoja."}</p><p className="mt-1 text-sm text-muted-foreground">Lisäasiakirjat auttavat arvioimaan vastikkeita, yhtiölainaa, taloyhtiön taloutta, tulevia remontteja ja omistuspohjaa.</p></div>
        {warnings.length > 0 ? <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning"><p className="flex items-center gap-2 font-medium"><AlertCircle className="size-4" />Asiakirjojen ristiriidat ja rajaukset</p><ul className="mt-2 list-disc space-y-1 pl-5">{[...new Set(warnings)].map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
        <input ref={fileInput} type="file" accept=".pdf,.txt" className="sr-only" aria-label="Valitse analysoitava asiakirja" onChange={(event) => { const file = event.currentTarget.files?.[0]; void receiveFile(file); }} />
        <div className="divide-y rounded-lg border">
          {documents.map((item) => <div key={item.kind} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><FileText className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>{notices[item.kind] ? <p role="status" className="mt-1 text-xs leading-relaxed text-success">{notices[item.kind]}</p> : null}{errors[item.kind] ? <p role="alert" className="mt-1 text-xs leading-relaxed text-danger">{errors[item.kind]}</p> : null}</div>{states[item.kind] === "analyzed" ? <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4" />Analysoitu</span> : states[item.kind] === "processing" ? <span role="status" className="shrink-0 text-sm text-muted-foreground">Analysoidaan…</span> : states[item.kind] === "failed" ? <Button type="button" className="w-full sm:w-auto" variant="outline" disabled={uploadInProgress} onClick={() => choose(item.kind)}>Yritä uudelleen</Button> : <Button type="button" className="w-full sm:w-auto" variant="outline" disabled={uploadInProgress} onClick={() => choose(item.kind)}>Lisää asiakirja</Button>}</div>)}
        </div>
      </CardContent>
    </Card>
  );
}
