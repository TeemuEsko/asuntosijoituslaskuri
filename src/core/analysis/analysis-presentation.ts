import { formatArea } from "../parser/normalization.ts";

export type AnalysisPresentationData = Partial<Record<"address" | "city" | "listingTitle" | "roomDescription" | "areaSqm" | "buildingType" | "constructionYear" | "floor" | "condition", number | string>>;

export const buildingTypeLabels: Record<string, string> = { apartment: "Kerrostalo", terraced: "Rivitalo", loft: "Luhtitalo", semi_detached: "Paritalo", detached_unit: "Erillistalo", detached_house: "Omakotitalo", wooden_apartment: "Puutalo-osake", other: "Muu" };

function text(value: unknown): string | undefined { return typeof value === "string" && value.trim() && !/^(unknown|ei tiedossa)$/i.test(value.trim()) ? value.trim() : undefined; }

export function displayBuildingType(value: unknown): string | undefined { const clean = text(value); return clean ? buildingTypeLabels[clean] ?? clean : undefined; }

export function analysisTitle(data: AnalysisPresentationData): string {
  const address = text(data.address); const city = text(data.city);
  if (address) return city && !address.toLocaleLowerCase("fi").includes(city.toLocaleLowerCase("fi")) ? `${address}, ${city}` : address;
  return text(data.listingTitle) ?? "Analysoitu sijoituskohde";
}

export function analysisFacts(data: AnalysisPresentationData): string[] {
  const building = displayBuildingType(data.buildingType); const floor = text(data.floor);
  return [text(data.roomDescription), typeof data.areaSqm === "number" ? formatArea(data.areaSqm) : undefined, building, typeof data.constructionYear === "number" ? `Rakennusvuosi ${Math.trunc(data.constructionYear)}` : undefined, floor && (building === "Kerrostalo" || building === "Luhtitalo") ? `Kerros ${floor}` : undefined].filter((value): value is string => Boolean(value));
}

export function showFloor(buildingType: unknown, floor: unknown): boolean { const building = displayBuildingType(buildingType); return Boolean(text(floor) && (building === "Kerrostalo" || building === "Luhtitalo")); }
