import type { ListingSourceType } from "../../parser/listing-parser.ts";

export type ListingBrowserAdapter = {
  id: Exclude<ListingSourceType, "pasted_text"> | "generic";
  version: string;
  contentRootSelectors: string[];
  readySelectors: string[];
  pairSelectors: string[];
  expandNames: RegExp;
  consentNames: RegExp;
  forbiddenActionNames: RegExp;
  blockedContent: RegExp;
};
