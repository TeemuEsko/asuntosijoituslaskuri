import { NextResponse } from "next/server";

import { acquireListing } from "@/core/listing-acquisition/acquire-listing";
import { parseListingText } from "@/core/parser/listing-parser";
import { addAutomaticRentEstimate } from "@/core/rent-data/enrich-listing-rent";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportRequest = { kind?: "url" | "text"; value?: string; forceRefresh?: boolean };
const MAX_INPUT_LENGTH = 100_000;

export async function POST(request: Request) {
  let body: ImportRequest;
  try { body = (await request.json()) as ImportRequest; }
  catch { return NextResponse.json({ error: "Pyyntöä ei voitu lukea. Yritä uudelleen." }, { status: 400 }); }

  const value = body.value?.trim() ?? "";
  if (!value) return NextResponse.json({ error: "Täytä puuttuvat pakolliset tiedot." }, { status: 400 });
  if (value.length > MAX_INPUT_LENGTH) return NextResponse.json({ error: "Syöte on liian pitkä. Lyhennä tekstiä ja yritä uudelleen." }, { status: 413 });

  if (body.kind === "text") {
    const parsed = parseListingText(value, "pasted_text");
    if (!parsed.findings.length && !parsed.renovations.length) return NextResponse.json({ code: "insufficient_content", error: "Tekstistä ei löytynyt tunnistettavaa kohdedataa. Liitä ilmoituksen koko tietosisältö tai täytä tiedot itse." }, { status: 422 });
    return NextResponse.json(await addAutomaticRentEstimate(parsed));
  }
  if (body.kind !== "url") return NextResponse.json({ code: "invalid_input", error: "Valitse linkki tai ilmoitusteksti." }, { status: 400 });

  const acquisition = await acquireListing(value, { forceRefresh: body.forceRefresh });
  if (!acquisition.ok) return NextResponse.json({ code: acquisition.code, error: acquisition.error, diagnostics: process.env.NODE_ENV === "development" ? acquisition.diagnostics : undefined }, { status: acquisition.status });
  return NextResponse.json(await addAutomaticRentEstimate(acquisition.result));
}
