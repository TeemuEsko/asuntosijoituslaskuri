import { genericListingAdapter } from "./generic-listing-adapter.ts";
import type { ListingBrowserAdapter } from "./types.ts";

export const oikotieBrowserAdapter: ListingBrowserAdapter = {
  ...genericListingAdapter,
  id: "oikotie",
  version: "1.1.0",
  contentRootSelectors: ["main", "[data-testid*=listing]", "[data-testid*=property]", "[class*=listing]", "article"],
  readySelectors: ["main h1", "[data-testid*=listing]", "[data-testid*=property]", "main"],
};
