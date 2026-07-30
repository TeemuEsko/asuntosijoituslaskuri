export const heatingTypes = [
  "district",
  "geothermal",
  "electric",
  "oil",
  "air_to_water",
  "exhaust_air",
  "other",
] as const;

export type HeatingType = (typeof heatingTypes)[number];

export const heatingTypeLabels: Record<HeatingType, string> = {
  district: "Kaukolämpö",
  geothermal: "Maalämpö",
  electric: "Sähkölämmitys",
  oil: "Öljylämmitys",
  air_to_water: "Ilma-vesilämpöpumppu",
  exhaust_air: "Poistoilmalämpöpumppu",
  other: "Muu",
};

const canonicalHeatingTypes = new Set<string>(heatingTypes);

export function normalizeHeatingType(value: string): HeatingType | null {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fi")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (canonicalHeatingTypes.has(value)) return value as HeatingType;
  if (/kaukolampo|fjarrvarme|district heating/.test(normalized)) return "district";
  if (/maalampo|jordvarme|ground source|geothermal/.test(normalized)) return "geothermal";
  if (/ilma vesilampopumppu|air to water/.test(normalized)) return "air_to_water";
  if (/poistoilmalampopumppu|exhaust air/.test(normalized)) return "exhaust_air";
  if (/sahkolammitys|suora sahko|electric/.test(normalized)) return "electric";
  if (/oljylammitys|oljy|oil/.test(normalized)) return "oil";
  if (/^muu$|^other$/.test(normalized)) return "other";
  return null;
}

export function isHeatingType(value: unknown): value is HeatingType {
  return typeof value === "string" && canonicalHeatingTypes.has(value);
}

export function heatingTypeLabel(value: string): string {
  const canonical = normalizeHeatingType(value);
  return canonical ? heatingTypeLabels[canonical] : value;
}
