import type { ListingSourceType } from "../../parser/listing-parser.ts";
import { etuoviBrowserAdapter } from "./etuovi-browser-adapter.ts";
import { oikotieBrowserAdapter } from "./oikotie-browser-adapter.ts";

export function getListingBrowserAdapter(source: Exclude<ListingSourceType, "pasted_text">) {
  return source === "etuovi" ? etuoviBrowserAdapter : oikotieBrowserAdapter;
}
