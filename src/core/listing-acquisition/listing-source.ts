export function getListingSourceFromUrl(
  input: string,
): "etuovi" | "oikotie" | null {
  try {
    const url = new URL(input);
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.toLocaleLowerCase("fi");
    if (host === "etuovi.com" || host.endsWith(".etuovi.com")) return "etuovi";
    if (host === "oikotie.fi" || host.endsWith(".oikotie.fi")) return "oikotie";
    return null;
  } catch {
    return null;
  }
}
