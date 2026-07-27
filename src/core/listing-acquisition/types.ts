import type { ListingParseResult, ListingSourceType } from "../parser/listing-parser.ts";

export type BrowserAcquisitionDiagnostics = {
  provider: string;
  adapter: string;
  adapterVersion: string;
  loadTimeMs: number;
  consentHandled: boolean;
  scrollRounds: number;
  initialHeight: number;
  finalHeight: number;
  newContentElements: number;
  accordionsFound: number;
  accordionsOpened: number;
  failedClicks: number;
  namedPairsFound: number;
  jsonLdFound: boolean;
  totalDurationMs: number;
};

export type BrowserContentContext = {
  section?: string;
  fieldName?: string;
  originalValue?: string;
  excerpt: string;
  domSourceType: "definition_list" | "table" | "visible_text" | "structured_data";
  selector: string;
  revealedAfterExpansion: boolean;
};

export type BrowserAcquisitionResult = {
  ok: true;
  finalUrl: string;
  html: string;
  visibleText: string;
  contexts: BrowserContentContext[];
  diagnostics: BrowserAcquisitionDiagnostics;
} | {
  ok: false;
  code: "browser_unavailable" | "automation_blocked" | "listing_removed" | "cannot_open" | "timeout" | "unsafe_redirect";
  error: string;
  diagnostics?: Partial<BrowserAcquisitionDiagnostics>;
};

export interface ListingBrowserProvider {
  readonly name: string;
  acquire(url: string, source: Exclude<ListingSourceType, "pasted_text">): Promise<BrowserAcquisitionResult>;
}

export type ListingAcquisitionDiagnostics = {
  acquisitionMethod: "static" | "browser" | "cache";
  browserFallbackReason?: string;
  staticLoadTimeMs: number;
  browser?: BrowserAcquisitionDiagnostics;
  contentContexts?: BrowserContentContext[];
  staticCriticalFieldCount: number;
  finalCriticalFieldCount: number;
  staticFindingCount: number;
  finalFindingCount: number;
  cacheHit: boolean;
  rawContentHash: string;
  totalDurationMs: number;
  finalErrorType?: string;
};

export type ListingAcquisitionSuccess = { ok: true; result: ListingParseResult; diagnostics: ListingAcquisitionDiagnostics; partial: boolean };
export type ListingAcquisitionFailure = { ok: false; code: string; error: string; status: number; diagnostics: ListingAcquisitionDiagnostics };
export type ListingAcquisitionResult = ListingAcquisitionSuccess | ListingAcquisitionFailure;
