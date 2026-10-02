"use client";

import { useEffect, useState } from "react";
import { ListingImport } from "./listing-import";
import { NewPropertyStart } from "./new-property-start";
import {
  PropertyWorkspace,
  type ImportedPropertyData,
} from "./property-workspace";

type View = "start" | "listing" | "workspace";
const ANALYSIS_DRAFT_KEY = "asuntosijoituslaskuri:analysis-draft:v1";

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

  if (view === "listing")
    return (
      <ListingImport
        initialUrl={listingUrl}
        onBack={() => setView("start")}
        onComplete={openWorkspace}
      />
    );
  if (view === "workspace")
    return <PropertyWorkspace importedData={importedData} />;
  return (
    <NewPropertyStart
      onListing={(url) => {
        setListingUrl(url);
        setView("listing");
      }}
      onManual={() => openWorkspace()}
    />
  );
}
