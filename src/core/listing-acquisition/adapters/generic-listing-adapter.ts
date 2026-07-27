import type { ListingBrowserAdapter } from "./types.ts";

export const genericListingAdapter: ListingBrowserAdapter = {
  id: "generic",
  version: "1.0.0",
  contentRootSelectors: ["main", "[role=main]", "article"],
  readySelectors: ["main", "[role=main]", "article", "body"],
  pairSelectors: ["dl", "table"],
  expandNames: /näytä lisää|näytä kaikki|lue lisää|avaa tiedot|katso kaikki tiedot|taloyhtiön tiedot|hintatiedot|asunnon tiedot|rakennuksen tiedot|tulevat remontit|tehdyt remontit|korjaukset|kunnossapitotarveselvitys|lisätiedot|vastikkeet ja maksut|tontti|energialuokka|expand|show more|read more/i,
  consentNames: /hyväksy(?: kaikki)?|salli kaikki|jatka|accept(?: all)?|allow all/i,
  forbiddenActionNames: /ota yhteyttä|varaa esittely|jätä tarjous|kirjaudu|suosik|kartta|kuvat|galleria|välittäjä|mainos/i,
  blockedContent: /captcha|verify you are human|access denied|pääsy estetty|kirjaudu sisään/i,
};
