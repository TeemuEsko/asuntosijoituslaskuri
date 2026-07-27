import { genericListingAdapter } from "./generic-listing-adapter.ts";
import type { ListingBrowserAdapter } from "./types.ts";

export const etuoviBrowserAdapter: ListingBrowserAdapter = {
  ...genericListingAdapter,
  id: "etuovi",
  version: "1.1.0",
  contentRootSelectors: ["main", "[data-testid*=property]", "[data-testid*=listing]", "[class*=propertyDetails]", "article"],
  readySelectors: ["main h1", "[data-testid*=property]", "[data-testid*=listing]", "main"],
};
