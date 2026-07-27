import { NextResponse } from "next/server";

import { getListingSourceFromUrl, parseListingText } from "@/core/parser/listing-parser";

type ImportRequest = { kind?: "url" | "text"; value?: string };

const MAX_INPUT_LENGTH = 100_000;
const MAX_REMOTE_LENGTH = 2_000_000;

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>/gi, "\n")
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

  if (body.kind === "text") return NextResponse.json(parseListingText(value, "pasted_text"));
  if (body.kind !== "url") return NextResponse.json({ error: "Valitse linkki tai ilmoitusteksti." }, { status: 400 });

  const source = getListingSourceFromUrl(value);
  if (!source) return NextResponse.json({ error: "Tarkista, että linkki on oikein ja johtaa Etuovi- tai Oikotie-ilmoitukseen." }, { status: 400 });

  try {
    const response = await fetch(value, { cache: "no-store", redirect: "manual", headers: { "User-Agent": "asuntosijoituslaskuri.fi/1.0 listing import" }, signal: AbortSignal.timeout(10_000) });
    if (response.status >= 300 && response.status < 400) return NextResponse.json({ error: "Myynti-ilmoitus ohjasi toiseen osoitteeseen. Avaa ilmoitus ja kopioi sen lopullinen linkki." }, { status: 400 });
    if (!response.ok) return NextResponse.json({ error: "Myynti-ilmoituksen tietoja ei voitu hakea. Liitä ilmoituksen teksti käsin." }, { status: 502 });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REMOTE_LENGTH) return NextResponse.json({ error: "Myynti-ilmoituksen sisältö on liian suuri käsiteltäväksi." }, { status: 413 });
    const html = await response.text();
    if (html.length > MAX_REMOTE_LENGTH) return NextResponse.json({ error: "Myynti-ilmoituksen sisältö on liian suuri käsiteltäväksi." }, { status: 413 });
    return NextResponse.json(parseListingText(htmlToText(html), source));
  } catch {
    return NextResponse.json({ error: "Myynti-ilmoituksen tietoja ei voitu hakea. Liitä ilmoituksen teksti käsin." }, { status: 502 });
  }
}
