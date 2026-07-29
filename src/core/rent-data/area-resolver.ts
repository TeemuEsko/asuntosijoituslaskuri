import type { RentAreaLevel } from "./types.ts";

const aliases: Record<string, string> = { vasa: "vaasa", helsingfors: "helsinki", esbo: "espoo", tammerfors: "tampere", åbo: "turku", jakobstad: "pietarsaari", karleby: "kokkola" };
const municipalityByPostalLocality: Record<string, string> = { nummela: "vihti", otalampi: "vihti", kirkonkylä: "vihti", klaukkala: "nurmijärvi", rajamäki: "nurmijärvi", tikkurila: "vantaa", myyrmäki: "vantaa", leppävaara: "espoo", tapiola: "espoo", hervanta: "tampere" };
const regionByMunicipality: Record<string, string> = { laihia: "MK15", vaasa: "MK15", vasa: "MK15", mustasaari: "MK15", korsholm: "MK15", pietarsaari: "MK15", vihti: "MK01", nurmijärvi: "MK01", helsinki: "MK01", espoo: "MK01", vantaa: "MK01", turku: "MK02", tampere: "MK06", oulu: "MK17", jyväskylä: "MK13", kuopio: "MK11", joensuu: "MK12", rovaniemi: "MK19" };

export function normalizeMunicipalityName(value?: string | null): string | null {
  const normalized = (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fi").replace(/[^a-zåäö\s-]/g, "").trim();
  return normalized ? aliases[normalized] ?? normalized : null;
}

export function resolveMunicipalityName({ city, district }: { city?: string | null; district?: string | null }): { municipality: string | null; usedFallback: boolean; warning?: string } {
  const normalizedCity = normalizeMunicipalityName(city);
  if (normalizedCity) {
    const municipality = municipalityByPostalLocality[normalizedCity] ?? normalizedCity;
    return municipality === normalizedCity ? { municipality, usedFallback: false } : { municipality, usedFallback: true, warning: `Postitoimipaikka ${city} ratkaistiin kunnaksi ${municipality[0]!.toLocaleUpperCase("fi")}${municipality.slice(1)}.` };
  }
  const normalizedDistrict = normalizeMunicipalityName(district);
  const municipality = normalizedDistrict ? municipalityByPostalLocality[normalizedDistrict] ?? null : null;
  return municipality ? { municipality, usedFallback: true, warning: `Kaupunginosan tai postitoimipaikan perusteella ratkaistu kunta: ${municipality[0]!.toLocaleUpperCase("fi")}${municipality.slice(1)}.` } : { municipality: null, usedFallback: false };
}

export function resolveStatFinArea(municipality: string | null | undefined, areaValues: string[], areaLabels: string[]): { code: string; label: string; level: RentAreaLevel; confidence: "medium" | "low"; warning?: string } | null {
  const normalized = normalizeMunicipalityName(municipality);
  if (!normalized) return null;
  const directIndex = areaLabels.findIndex((label) => normalizeMunicipalityName(label.replace(/^MK\d+\s+/, "")) === normalized);
  if (directIndex >= 0) return { code: areaValues[directIndex]!, label: areaLabels[directIndex]!, level: "municipality", confidence: "medium" };
  const regionCode = regionByMunicipality[normalized];
  const regionIndex = regionCode ? areaValues.indexOf(regionCode) : -1;
  if (regionIndex >= 0) return { code: areaValues[regionIndex]!, label: areaLabels[regionIndex]!.replace(/^MK\d+\s+/, ""), level: "region", confidence: "low", warning: "Kuntakohtaista vertailutietoa ei ollut saatavilla, joten arvio perustuu maakuntatasoon." };
  return null;
}
