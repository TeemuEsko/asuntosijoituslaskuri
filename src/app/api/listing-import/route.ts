import { NextResponse } from "next/server";

import { getListingSourceFromUrl, parseListingText, type StructuredListingValue } from "@/core/parser/listing-parser";
import { classifyListingFetchStatus } from "@/core/parser/listing-fetch";

type ImportRequest = { kind?: "url" | "text"; value?: string };

const MAX_INPUT_LENGTH = 100_000;
const MAX_REMOTE_LENGTH = 2_000_000;

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h[1-6]>|<\/section>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&euro;|&#8364;/gi, "€")
    .replace(/&auml;/gi, "ä").replace(/&ouml;/gi, "ö").replace(/&aring;/gi, "å")
    .replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Aring;/g, "Å")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&euro;|&#8364;/gi, "€").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
}

function extractNamedPairs(html: string): string[] {
  const pairs: string[] = [];
  for (const match of html.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)) pairs.push(`${plainText(match[1] ?? "")}: ${plainText(match[2] ?? "")}`);
  for (const match of html.matchAll(/<tr\b[^>]*>[\s\S]*?<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>[\s\S]*?<td\b[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)) pairs.push(`${plainText(match[1] ?? "")}: ${plainText(match[2] ?? "")}`);
  return pairs.filter((pair) => pair !== ": ");
}

function extractStructuredValues(html: string): StructuredListingValue[] {
  const values: StructuredListingValue[] = [];
  const add = (field: StructuredListingValue["field"], value: unknown, unit: StructuredListingValue["unit"], label: string) => {
    const normalized = typeof value === "number"
      ? Number.isFinite(value) ? value : null
      : typeof value === "string" && value.trim() ? value.trim() : null;
    if (normalized !== null) values.push({ field, value: normalized, unit, label, excerpt: `Rakenteinen tieto: ${label} ${String(normalized)}` });
  };
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    const item = node as Record<string, unknown>;
    const offers = item.offers as Record<string, unknown> | undefined;
    if (offers?.price !== undefined) add("salePrice", Number(offers.price), "€", "hinta");
    const floorSize = item.floorSize as Record<string, unknown> | undefined;
    if (floorSize?.value !== undefined) add("areaSqm", Number(floorSize.value), "m²", "pinta-ala");
    if (item.yearBuilt !== undefined) add("constructionYear", Number(item.yearBuilt), "vuosi", "rakennusvuosi");
    const address = item.address as Record<string, unknown> | string | undefined;
    if (typeof address === "string") add("address", address, undefined, "osoite");
    else if (address) { if (address.streetAddress) add("address", address.streetAddress, undefined, "osoite"); if (address.addressLocality) add("city", address.addressLocality, undefined, "kunta"); }
    for (const value of Object.values(item)) if (typeof value === "object" && value !== null) visit(value);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(match[1] ?? "null") as unknown); } catch { /* Virheellinen JSON-LD ohitetaan ja näkyvä teksti käsitellään. */ }
  }
  return values.filter((value, index, all) => all.findIndex((candidate) => candidate.field === value.field && String(candidate.value) === String(value.value)) === index);
}

export async function POST(request: Request) {
  let body: ImportRequest;
  try {
    body = (await request.json()) as ImportRequest;
  } catch {
    return NextResponse.json({ error: "Pyyntöä ei voitu lukea. Yritä uudelleen." }, { status: 400 });
  }

  const value = body.value?.trim() ?? "";
  if (!value) return NextResponse.json({ error: "Täytä puuttuvat pakolliset tiedot." }, { status: 400 });
  if (value.length > MAX_INPUT_LENGTH) return NextResponse.json({ error: "Syöte on liian pitkä. Lyhennä tekstiä ja yritä uudelleen." }, { status: 413 });

  if (body.kind === "text") {
    const parsed = parseListingText(value, "pasted_text");
    if (parsed.findings.length < 3) return NextResponse.json({ code: "insufficient_content", error: "Tekstistä ei löytynyt riittävästi kohdetietoja. Liitä ilmoituksen koko tietosisältö tai täytä tiedot itse." }, { status: 422 });
    return NextResponse.json(parsed);
  }
  if (body.kind !== "url") return NextResponse.json({ code: "invalid_input", error: "Valitse linkki tai ilmoitusteksti." }, { status: 400 });

  const source = getListingSourceFromUrl(value);
  if (!source) return NextResponse.json({ code: "unsupported_url", error: "Linkki ei ole tuettu. Käytä Etuovi- tai Oikotie-linkkiä tai liitä ilmoituksen teksti." }, { status: 400 });

  try {
    const response = await fetch(value, { cache: "no-store", redirect: "manual", headers: { "User-Agent": "asuntosijoituslaskuri.fi/1.0 listing import" }, signal: AbortSignal.timeout(10_000) });
    if (response.status >= 300 && response.status < 400) return NextResponse.json({ code: "redirected", error: "Myynti-ilmoitus ohjasi toiseen osoitteeseen. Avaa ilmoitus ja kopioi sen lopullinen linkki." }, { status: 400 });
    const fetchError = classifyListingFetchStatus(response.status);
    if (fetchError) return NextResponse.json({ code: fetchError.code, error: fetchError.error }, { status: fetchError.status });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REMOTE_LENGTH) return NextResponse.json({ error: "Myynti-ilmoituksen sisältö on liian suuri käsiteltäväksi." }, { status: 413 });
    const html = await response.text();
    if (html.length > MAX_REMOTE_LENGTH) return NextResponse.json({ error: "Myynti-ilmoituksen sisältö on liian suuri käsiteltäväksi." }, { status: 413 });
    const parsed = parseListingText(`${extractNamedPairs(html).join("\n")}\n${htmlToText(html)}`, source, extractStructuredValues(html));
    if (parsed.findings.length < 3) return NextResponse.json({ code: "insufficient_content", error: "Sivulta ei löytynyt riittävästi kohdetietoja. Liitä ilmoituksen teksti." }, { status: 422 });
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ code: "processing_failed", error: "Tietojen käsittely epäonnistui tai linkkiä ei voitu avata. Liitä ilmoituksen teksti." }, { status: 502 });
  }
}
