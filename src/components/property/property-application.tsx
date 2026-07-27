"use client";

import { useState } from "react";
import { ListingImport } from "./listing-import";
import { NewPropertyStart } from "./new-property-start";
import { PropertyWorkspace, type ImportedPropertyData } from "./property-workspace";

type View = "start" | "listing" | "workspace";

export function PropertyApplication() {
  const [view, setView] = useState<View>("start");
  const [importedData, setImportedData] = useState<ImportedPropertyData>({});
  const [title, setTitle] = useState("Uusi kohde");

  function openWorkspace(values: ImportedPropertyData = {}) {
    setImportedData(values);
    setTitle("Uusi kohde");
    setView("workspace");
  }

  if (view === "listing") return <ListingImport onBack={() => setView("start")} onComplete={openWorkspace} />;
  if (view === "workspace") return <PropertyWorkspace importedData={importedData} title={title} />;
  return <NewPropertyStart onListing={() => setView("listing")} onDocuments={() => openWorkspace()} onManual={() => openWorkspace()} />;
}
