export const runtime = "nodejs";

function decodeEntities(text) {
  return text
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&euro;", "€")
    .replaceAll("&auml;", "ä")
    .replaceAll("&ouml;", "ö")
    .replaceAll("&aring;", "å")
    .replaceAll("&Auml;", "Ä")
    .replaceAll("&Ouml;", "Ö")
    .replaceAll("&Aring;", "Å")
    .replaceAll("&quot;", '"');
}

function cleanText(html) {
  return decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberAfterLabel(text, labels, maxDistance = 150) {
  for (const label of labels) {
    const index = text.indexOf(label);
    if (index === -1) continue;
    const slice = text.slice(index + label.length, index + label.length + maxDistance);
    let started = false;
    let raw = "";
    for (const char of slice) {
      const ok = "0123456789 ,.".includes(char);
      if (!started && "0123456789".includes(char)) started = true;
      if (started && ok) raw += char;
      if (started && !ok) break;
    }
    const value = Number(raw.replaceAll(" ", "").replace(",", "."));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function parseYear(text) {
  const match = text.match(/(rakennusvuosi|valmistunut|rakennettu)[^\d]*(19\d{2}|20\d{2})/i);
  return match ? Number(match[2]) : null;
}

function parseFields(rawText) {
  const text = rawText.toLowerCase();
  const fields = {};

  const debtFreePrice = parseNumberAfterLabel(text, ["velaton myyntihinta", "velaton hinta"]);
  if (debtFreePrice !== null) fields.debtFreePrice = Math.round(debtFreePrice);

  const sellingPrice = parseNumberAfterLabel(text, ["myyntihinta"]);
  if (sellingPrice !== null) fields.sellingPrice = Math.round(sellingPrice);

  const debtShare = parseNumberAfterLabel(text, ["velkaosuus", "lainaosuus"]);
  if (debtShare !== null) {
    fields.debtShare = Math.round(debtShare);
    fields.hasDebtShare = debtShare > 0 ? "yes" : "no";
  }

  const maintenanceFee = parseNumberAfterLabel(text, ["hoitovastike"]);
  if (maintenanceFee !== null) fields.maintenanceFee = Math.round(maintenanceFee);

  const financingFee = parseNumberAfterLabel(text, ["rahoitusvastike", "pääomavastike"]);
  if (financingFee !== null) {
    fields.financingFee = Math.round(financingFee);
    fields.hasDebtShare = financingFee > 0 || fields.debtShare > 0 ? "yes" : "no";
  }

  const size = parseNumberAfterLabel(text, ["asuinpinta-ala", "pinta-ala"]);
  if (size !== null && size > 5 && size < 1000) fields.size = Math.round(size * 10) / 10;

  const buildYear = parseYear(text);
  if (buildYear !== null) fields.buildYear = buildYear;

  if (text.includes("kerrostalo")) fields.buildingType = "apartment";
  if (text.includes("rivitalo")) fields.buildingType = "terraced";
  if (text.includes("paritalo")) fields.buildingType = "semi_detached";
  if (text.includes("luhtitalo")) fields.buildingType = "loft";

  if (text.includes("oma tontti")) fields.landType = "own";
  if (text.includes("vuokratontti") || text.includes("tontin vuokra") || text.includes("tontinvuokra")) fields.landType = "leased_city";
  if (text.includes("yksityinen vuokratontti")) fields.landType = "leased_private";

  if (text.includes("kaukolämpö")) fields.heatingType = "district";
  if (text.includes("maalämpö")) fields.heatingType = "geothermal";
  if (text.includes("sähkölämmitys") || text.includes("suora sähkö")) fields.heatingType = "electric";
  if (text.includes("öljylämmitys")) fields.heatingType = "oil";
  if (text.includes("poistoilmalämpöpumppu")) fields.heatingType = "exhaust_air";

  return fields;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) return Response.json({ error: "URL puuttuu." }, { status: 400 });
  if (!url.includes("etuovi.com") && !url.includes("oikotie.fi")) {
    return Response.json({ error: "Sallittu vain Etuovi- tai Oikotie-linkeille." }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fi-FI,fi;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });

    const html = await response.text();
    if (!response.ok) {
      return Response.json({ error: `Ilmoitussivun haku epäonnistui: ${response.status}` }, { status: 502 });
    }

    const rawText = cleanText(html);
    const fields = parseFields(rawText);

    if (Object.keys(fields).length === 0 && url.includes("oikotie.fi")) {
      return Response.json({
        error: "Oikotie-kohteen tietoja ei saatu luettua kevyellä HTML-parserilla. Oikotie vaatii todennäköisesti selainpohjaisen parserin.",
        sourceUrl: url,
        fields,
        rawText,
        foundKeys: [],
      }, { status: 422 });
    }

    return Response.json({ sourceUrl: url, fields, rawText, foundKeys: Object.keys(fields) });
  } catch (error) {
    return Response.json({ error: error.message || "URL-haku epäonnistui." }, { status: 500 });
  }
}
