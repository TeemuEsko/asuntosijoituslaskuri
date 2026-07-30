import type { FieldStatus } from "../domain/field";
import { heatingTypeLabel, heatingTypeLabels } from "../domain/heating.ts";
import type { LandOwnership, PlotShareRedemptionStatus, RedemptionClauseStatus } from "../domain/property";
import type { RuleSeverity, RuleStatus } from "../rules/types";

export const brandName = "asuntosijoituslaskuri.fi";

export const fieldStatusLabels: Record<FieldStatus, string> = {
  parser: "Tietojen haku",
  user: "Oma tieto",
  derived: "Laskettu",
  missing: "Puuttuu",
};

export const landOwnershipLabels: Record<LandOwnership, string> = {
  owned: "Oma tontti",
  leased: "Vuokratontti",
  optional_leasehold: "Valinnainen vuokratontti",
};

export { heatingTypeLabels };

export function displayListingStringValue(field: string, value: string): string {
  if (field === "heatingType") return heatingTypeLabel(value);
  if (field === "landOwnership" && value in landOwnershipLabels)
    return landOwnershipLabels[value as LandOwnership];
  if (field === "elevator" && value.toLocaleLowerCase("fi") in booleanLabels)
    return booleanLabels[value.toLocaleLowerCase("fi") as keyof typeof booleanLabels];
  return value;
}

export const plotShareRedemptionLabels: Record<PlotShareRedemptionStatus, string> = {
  redeemed: "Lunastettu",
  not_redeemed: "Ei lunastettu",
  unknown: "Ei tiedossa",
};

export const redemptionClauseLabels: Record<RedemptionClauseStatus, string> = {
  no: "Ei",
  yes: "Kyllä",
  unchecked: "Ei voitu tarkistaa",
};

export const ruleStatusLabels: Record<RuleStatus, string> = {
  not_detected: "Ei havaittu",
  detected: "Havaittu",
  unchecked: "Ei tarkistettu",
  not_applicable: "Ei koske kohdetta",
  data_conflict: "Ristiriita",
};

export const severityLabels: Record<RuleSeverity, string> = {
  info: "Tiedoksi",
  low: "Matala",
  medium: "Keskitaso",
  high: "Korkea",
  critical: "Kriittinen",
};

export const confidenceLabels = {
  high: "Korkea",
  medium: "Keskitaso",
  low: "Matala",
} as const;

export const booleanLabels: Record<"true" | "false", string> = {
  true: "Kyllä",
  false: "Ei",
};

export const workflowStatusLabels = {
  draft: "Luonnos",
  ready: "Valmis",
  pending: "Kesken",
  error: "Virhe",
  warning: "Varoitus",
  success: "Onnistui",
} as const;

export const listingSourceLabels = {
  etuovi: "Etuovi",
  oikotie: "Oikotie",
  pasted_text: "Liitetty ilmoitusteksti",
} as const;

export const timeStatusLabels = {
  completed: "Tehty",
  ongoing: "Käynnissä",
  decided: "Päätetty",
  planned: "Suunnitteilla",
  estimated: "Arvioitu",
  proposed: "Ehdotettu",
  under_investigation: "Tutkittavana",
  investigated: "Tutkittu",
  preparing: "Valmistelussa",
  not_done: "Ei tehty",
  not_implemented: "Ei vielä toteutettu",
  unknown: "Ei tiedossa",
} as const;

export const renovationComponentLabels = {
  pipe_unspecified: "Putkiremontti, laajuus ei tiedossa",
  line_unspecified: "Linjasaneeraus, osat eivät tiedossa",
  full_line: "Täydellinen linjasaneeraus",
  water_pipes: "Käyttövesiputket",
  drains: "Viemärit",
  drain_lining: "Viemärien sukitus",
  electrical: "Sähköjärjestelmät",
  bathrooms: "Kylpyhuoneet",
  facade: "Julkisivu",
  balconies: "Parvekkeet",
  element_seams: "Elementtisaumat",
  roof_replacement: "Vesikaton uusiminen",
  roof_coating: "Katon pinnoitus",
  roof_unspecified: "Kattoremontti, laajuus ei tiedossa",
  windows: "Ikkunat",
  doors: "Ovet",
  drainage: "Salaojat",
  elevator: "Hissi",
  ventilation: "Ilmanvaihto",
  heating: "Lämmitysjärjestelmä",
  locks: "Lukitus",
  yard: "Piha-alueet",
  entry_phone: "Ovipuhelinjärjestelmä",
  mailboxes: "Postilaatikot",
  yard_lighting: "Pihavalaistus",
  painting: "Maalaustyöt",
  fire_safety: "Palo- ja turvajärjestelmät",
  telecom: "Tietoliikenne- ja antennijärjestelmät",
  heating_exchanger: "Lämmönvaihdin",
  foundations: "Perustukset ja vedeneristys",
  yard_deck: "Pihakansi ja rakenteet",
  energy_project: "Energiatehokkuushanke",
} as const;
