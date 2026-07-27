import type { StructuredListingValue } from "../parser/listing-parser.ts";

export function htmlToText(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h[1-6]>|<\/section>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&euro;|&#8364;/gi, "€").replace(/&auml;/gi, "ä").replace(/&ouml;/gi, "ö").replace(/&aring;/gi, "å").replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Aring;/g, "Å").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

function plainText(html: string): string { return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&euro;|&#8364;/gi, "€").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim(); }

export function extractNamedPairs(html: string): string[] {
  const pairs: string[] = [];
  for (const match of html.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)) pairs.push(`${plainText(match[1] ?? "")}: ${plainText(match[2] ?? "")}`);
  for (const match of html.matchAll(/<tr\b[^>]*>[\s\S]*?<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>[\s\S]*?<td\b[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)) pairs.push(`${plainText(match[1] ?? "")}: ${plainText(match[2] ?? "")}`);
  return pairs.filter((pair) => pair !== ": ");
}

export function extractStructuredValues(html: string): StructuredListingValue[] {
  const values: StructuredListingValue[] = [];
  const add = (field: StructuredListingValue["field"], value: unknown, unit: StructuredListingValue["unit"], label: string, sourcePath = "structured_data") => {
    const normalized = typeof value === "number" ? Number.isFinite(value) ? value : null : typeof value === "string" && value.trim() ? value.trim() : null;
    if (normalized !== null) values.push({ field, value: normalized, unit, label, excerpt: `Rakenteinen tieto: ${label} ${String(normalized)}`, sourcePath });
  };
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    const item = node as Record<string, unknown>; const offers = item.offers as Record<string, unknown> | undefined;
    if (offers?.price !== undefined) add("salePrice", Number(offers.price), "€", "hinta");
    const floorSize = item.floorSize as Record<string, unknown> | undefined;
    if (floorSize?.value !== undefined) add("areaSqm", Number(floorSize.value), "m²", "pinta-ala");
    if (item.yearBuilt !== undefined) add("constructionYear", Number(item.yearBuilt), "vuosi", "rakennusvuosi");
    const address = item.address as Record<string, unknown> | string | undefined;
    if (typeof address === "string") { add("address", address, undefined, "osoite", "address"); add("streetAddress", address, undefined, "katuosoite", "address"); }
    else if (address) { if (address.streetAddress) { add("address", address.streetAddress, undefined, "osoite", "address.streetAddress"); add("streetAddress", address.streetAddress, undefined, "katuosoite", "address.streetAddress"); } if (address.postalCode) add("postalCode", address.postalCode, undefined, "postinumero", "address.postalCode"); if (address.addressLocality) add("city", address.addressLocality, undefined, "kunta", "address.addressLocality"); }
    if (typeof item.name === "string") add("listingTitle", item.name, undefined, "ilmoituksen otsikko", "name");
    for (const value of Object.values(item)) if (typeof value === "object" && value !== null) visit(value);
  };
  const structuredScripts = [
    ...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
    ...html.matchAll(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi),
    ...html.matchAll(/<script\b[^>]*(?:type=["']application\/json["']|id=["'][^"']*(?:state|data|hydration)[^"']*["'])[^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const match of structuredScripts) { try { visit(JSON.parse(match[1] ?? "null") as unknown); } catch { /* Näkyvä sisältö toimii varalähteenä. */ } }
  for (const match of html.matchAll(/(?:window\.)?__[A-Z0-9_]*(?:STATE|DATA)[A-Z0-9_]*__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/gi)) { try { visit(JSON.parse(match[1] ?? "null") as unknown); } catch { /* Kaikki tilamuuttujat eivät ole puhdasta JSON:ia. */ } }
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) add("listingTitle", plainText(h1), undefined, "ilmoituksen otsikko", "h1");
  return values.filter((value, index, all) => all.findIndex((candidate) => candidate.field === value.field && String(candidate.value) === String(value.value)) === index);
}

export function parserInputFromHtml(html: string, extraVisibleText = ""): string {
  return `${extractNamedPairs(html).join("\n")}\n${htmlToText(html)}\n${extraVisibleText}`.trim();
}
