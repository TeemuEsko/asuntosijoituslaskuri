export type ListingFetchError = {
  code: "listing_removed" | "site_blocked" | "cannot_open";
  error: string;
  status: number;
};

export function classifyListingFetchStatus(status: number): ListingFetchError | null {
  if (status === 404 || status === 410) return { code: "listing_removed", error: "Ilmoitus on poistunut. Liitä ilmoituksen teksti, jos se on tallessa.", status: 404 };
  if (status === 401 || status === 403 || status === 429) return { code: "site_blocked", error: "Sivusto esti automaattisen haun. Liitä ilmoituksen teksti.", status: 502 };
  if (status >= 400) return { code: "cannot_open", error: "Linkkiä ei voitu avata. Liitä ilmoituksen teksti.", status: 502 };
  return null;
}
