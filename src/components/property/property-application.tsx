"use client";

import { useEffect, useState } from "react";
import { emptyDocumentCanonicalState, mergeDocumentAnalysis, validateDocumentCanonicalConsistency } from "@/core/documents/merge";
import type { DocumentAnalysisResult } from "@/core/documents/types";
import { fieldDisplayNames } from "@/core/parser/synonyms";
import type { RepairDocumentKind } from "@/core/rules/repair-history";
import { analyzePropertyDocument } from "./document-analysis-client";
import { ListingImport } from "./listing-import";
import { NewPropertyStart } from "./new-property-start";
import { PropertyWorkspace, type ImportedPropertyData } from "./property-workspace";

type View = "start" | "listing" | "workspace";
const ANALYSIS_DRAFT_KEY = "asuntosijoituslaskuri:analysis-draft:v1";

function inferDocumentKind(fileName: string): RepairDocumentKind | undefined {
  const name = fileName.toLocaleLowerCase("fi");
  if (/isännöitsijä|isannoitsija/.test(name)) return "manager_certificate";
  if (/kunnossapito|pts/.test(name)) return "maintenance_plan";
  if (/tilinpäätös|tilinpaatos/.test(name)) return "financial_statements";
  if (/toimintakertomus/.test(name)) return "annual_report";
  if (/yhtiökokous|yhtiokokous|pöytäkirja|poytakirja/.test(name)) return "meeting_minutes";
  if (/osakeluettelo/.test(name)) return "shareholder_register";
  return undefined;
}

export function PropertyApplication() {
  const [view, setView] = useState<View>("start");
  const [importedData, setImportedData] = useState<ImportedPropertyData>({});
  const [listingUrl, setListingUrl] = useState("");

  useEffect(() => {
    let restoreTimer: number | undefined;
    try {
      const saved = window.sessionStorage.getItem(ANALYSIS_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ImportedPropertyData;
        restoreTimer = window.setTimeout(() => {
          setImportedData(parsed);
          setView("workspace");
        }, 0);
      }
    } catch {
      /* Istuntotallennus ei ole välttämättä käytettävissä yksityisessä selaustilassa. */
    }
    const returnHome = () => {
      try {
        window.sessionStorage.removeItem(ANALYSIS_DRAFT_KEY);
      } catch {
        /* Etusivulle voi palata ilman istuntotallennusta. */
      }
      setView("start");
    };
    window.addEventListener("property-home", returnHome);
    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
      window.removeEventListener("property-home", returnHome);
    };
  }, []);

  function openWorkspace(values: ImportedPropertyData = {}) {
    setImportedData(values);
    try {
      window.sessionStorage.setItem(ANALYSIS_DRAFT_KEY, JSON.stringify(values));
    } catch {
      /* Analyysi toimii myös ilman istuntotallennusta. */
    }
    setView("workspace");
  }

  async function openDocuments(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    const settled = await Promise.allSettled(selectedFiles.map((file) => analyzePropertyDocument(file, inferDocumentKind(file.name))));
    const analyses = settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
    if (analyses.length === 0) {
      const firstFailure = settled.find((item): item is PromiseRejectedResult => item.status === "rejected");
      throw new Error(firstFailure?.reason instanceof Error ? firstFailure.reason.message : "Asiakirjoja ei voitu analysoida.");
    }

    let canonical = emptyDocumentCanonicalState();
    for (const analysis of analyses) canonical = mergeDocumentAnalysis(canonical, analysis);
    const consistency = validateDocumentCanonicalConsistency(canonical);
    canonical = consistency.state;
    const failedWarnings = settled.flatMap((item, index) => item.status === "rejected"
      ? [`Asiakirjaa ${selectedFiles[index]?.name ?? ""} ei voitu analysoida: ${item.reason instanceof Error ? item.reason.message : "tuntematon virhe"}`]
      : []);
    const documentKinds = analyses.flatMap((analysis: DocumentAnalysisResult) => analysis.documentKind ? [analysis.documentKind] : []);
    openWorkspace({
      ...canonical.values,
      documentProvenance: canonical.provenance,
      documentConflicts: canonical.conflicts,
      documentWarnings: [...new Set([...analyses.flatMap((analysis) => analysis.warnings), ...failedWarnings, ...consistency.warnings, ...canonical.conflicts.map((conflict) => `${fieldDisplayNames[conflict.field]}: ${conflict.message}`)])],
      renovations: canonical.renovations,
      housingCompanyRenovations: canonical.housingCompanyRenovations,
      documentKinds: [...new Set(documentKinds)],
    });
  }

  if (view === "listing") return <ListingImport initialUrl={listingUrl} onBack={() => setView("start")} onComplete={openWorkspace} />;
  if (view === "workspace") return <PropertyWorkspace importedData={importedData} />;
  return <NewPropertyStart onListing={(url) => { setListingUrl(url); setView("listing"); }} onDocuments={openDocuments} onManual={() => openWorkspace()} />;
}
