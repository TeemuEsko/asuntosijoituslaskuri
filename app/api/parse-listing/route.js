import { NextResponse } from "next/server";

function cleanText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&aring;/g, "å")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEuro(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`${label}[^0-9]{0,40}([0-9][0-9\\s.,]*)\\s*€`, "i");
    const m = text.match(re);
    if (m) return Number(m[1].replace(/\s/g, "").replace(",", "."));
  }
  return null;
}

function parseNumberAfter(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`${label}[^0-9]{0,40}([0-9]+(?:[,.][0-9]+)?)`, "i");
    const m = text.match(re);
    if (m) return Number(m[1].replace(",", "."));
  }
  return null;
}

function parseYear(text) {
  const patterns = [
    /(?:\bvuosi\b|\brakennusvuosi\b|\bvalmistumisvuosi\b|\bvalmistunut\b|\brakennettu\b)[^\d]{0,30}((?:19|20)\d{2})/i,
    /(?:\bvuosi\b|\brakennusvuosi\b|\bvalmistumisvuosi\b)[\s:.-]{0,10}((?:19|20)\d{2})/i
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m?.[1]) return Number(m[1]);
  }
  return null;
}

function parseListingId(text, url) {
  const urlMatch = url.match(/kohde\/(\d+)/i);
  if (urlMatch) return urlMatch[1];
  const m = text.match(/(?:kohdenumero|kohde\s*nro|kohde-id)[^\d]{0,20}(\d{5,})/i);
  return m ? m[1] : null;
}

function detectBuildingType(text) {
  const t = text.toLowerCase();
  if (t.includes("rivitalo")) return "terraced";
  if (t.includes("paritalo")) return "semi_detached";
  if (t.includes("luhtitalo")) return "loft";
  if (t.includes("kerrostalo")) return "apartment";
  return null;
}

function detectHeating(text) {
  const t = text.toLowerCase();
  if (t.includes("maalämpö")) return "geothermal";
  if (t.includes("kaukolämpö")) return "district";
  if (t.includes("sähkölämmitys") || t.includes("suora sähkö")) return "electric";
  if (t.includes("öljy")) return "oil";
  if (t.includes("poistoilmalämpöpumppu")) return "exhaust_air";
  return null;
}

function detectLand(text) {
  const t = text.toLowerCase();
  if (t.includes("oma tontti")) return "own";
  if (t.includes("vuokratontti")) return "leased_city";
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL puuttuu." }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; asuntosijoituslaskuri/1.0)",
        "accept-language": "fi-FI,fi;q=0.9,en;q=0.8"
      },
      cache: "no-store"
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Ilmoitusta ei saatu haettua. HTTP ${res.status}` }, { status: 422 });
    }

    const html = await res.text();
    const text = cleanText(html);
    const fields = {};

    const listingId = parseListingId(text, url);
    if (listingId) fields.listingId = listingId;

    const debtFreePrice = parseEuro(text, ["Velaton hinta", "Hinta"]);
    if (debtFreePrice) fields.debtFreePrice = debtFreePrice;

    const sellingPrice = parseEuro(text, ["Myyntihinta"]);
    if (sellingPrice) fields.sellingPrice = sellingPrice;

    const maintenanceFee = parseEuro(text, ["Hoitovastike", "Hoitovastike / kk"]);
    if (maintenanceFee) fields.maintenanceFee = maintenanceFee;

    const financingFee = parseEuro(text, ["Rahoitusvastike", "Rahoitusvastike / kk"]);
    if (financingFee) {
      fields.financingFee = financingFee;
      fields.hasDebtShare = "yes";
    }

    const debtShare = parseEuro(text, ["Velkaosuus", "Yhtiölainaosuus"]);
    if (debtShare) {
      fields.debtShare = debtShare;
      fields.hasDebtShare = "yes";
    }

    const rent = parseEuro(text, ["Vuokra"]);
    if (rent) fields.rent = rent;

    const size = parseNumberAfter(text, ["Koko", "Pinta-ala", "Asuinpinta-ala"]);
    if (size) fields.size = size;

    const buildYear = parseYear(text);
    if (buildYear) fields.buildYear = buildYear;

    const buildingType = detectBuildingType(text);
    if (buildingType) fields.buildingType = buildingType;

    const heatingType = detectHeating(text);
    if (heatingType) fields.heatingType = heatingType;

    const landType = detectLand(text);
    if (landType) fields.landType = landType;

    if (Object.keys(fields).length === 0 && url.includes("oikotie.fi")) {
      return NextResponse.json({
        error: "Oikotie-kohteen tietoja ei saatu luettua kevyellä HTML-parserilla. Oikotie vaatii todennäköisesti selainpohjaisen parserin.",
        sourceUrl: url,
        fields: {},
        foundKeys: []
      }, { status: 422 });
    }

    return NextResponse.json({ sourceUrl: url, fields, foundKeys: Object.keys(fields) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "URL-haku epäonnistui." }, { status: 500 });
  }
}
