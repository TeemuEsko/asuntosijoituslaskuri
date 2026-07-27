export type NormalizedFieldKey =
  | "salePrice"
  | "debtFreePrice"
  | "companyLoanShare"
  | "maintenanceFeeMonthly"
  | "financingFeeMonthly"
  | "plotFeeMonthly"
  | "areaSqm"
  | "roomDescription"
  | "constructionYear"
  | "floor"
  | "condition"
  | "housingCompanyName"
  | "apartmentCount"
  | "landOwnership";

export const fieldDisplayNames: Record<NormalizedFieldKey, string> = {
  salePrice: "Myyntihinta",
  debtFreePrice: "Velaton hinta",
  companyLoanShare: "Yhtiölainaosuus",
  maintenanceFeeMonthly: "Hoitovastike",
  financingFeeMonthly: "Rahoitusvastike",
  plotFeeMonthly: "Tonttivastike",
  areaSqm: "Pinta-ala",
  roomDescription: "Huoneistotyyppi",
  constructionYear: "Rakennusvuosi",
  floor: "Kerros",
  condition: "Kunto",
  housingCompanyName: "Taloyhtiön nimi",
  apartmentCount: "Huoneistojen lukumäärä",
  landOwnership: "Tontin omistusmuoto",
};

export const fieldSynonyms: Record<NormalizedFieldKey, readonly string[]> = {
  salePrice: ["myyntihinta", "kauppahinta", "osakkeiden myyntihinta"],
  debtFreePrice: ["velaton hinta", "velaton myyntihinta", "velaton kauppahinta", "kokonaiskauppahinta"],
  companyLoanShare: ["lainaosuus", "velkaosuus", "yhtiölainaosuus", "osuus yhtiölainasta", "huoneistokohtainen lainaosuus", "huoneistokohtainen velkaosuus", "huoneistoon kohdistuva laina", "osakkeisiin kohdistuva lainaosuus"],
  maintenanceFeeMonthly: ["hoitovastike", "yhtiövastikkeen hoito-osa", "hoitovastike kuukaudessa"],
  financingFeeMonthly: ["rahoitusvastike", "pääomavastike", "lainanlyhennysvastike", "yhtiölainavastike", "pääomavastike a", "pääomavastike b", "rahoitusvastike 1", "rahoitusvastike 2"],
  plotFeeMonthly: ["tontinvuokravastike", "tonttivastike", "maanvuokravastike", "valinnaisen vuokratontin vastike"],
  areaSqm: ["pinta-ala", "asuinpinta-ala", "huoneistoala", "yhtiöjärjestyksen mukainen pinta-ala", "pinta-ala yhtiöjärjestyksen mukaan"],
  roomDescription: ["huoneet", "huoneistoselitelmä", "huoneistotyyppi", "huonejako", "pohjaratkaisu"],
  constructionYear: ["rakennusvuosi", "valmistumisvuosi", "käyttöönottovuosi", "valmistunut", "rakennettu"],
  floor: ["kerros", "sijaintikerros", "asuinkerros", "kerros / kerroksia"],
  condition: ["kunto", "yleiskunto", "kuntoarvio"],
  housingCompanyName: ["taloyhtiö", "asunto-osakeyhtiö", "yhtiön nimi", "asunto oy", "as oy"],
  apartmentCount: ["huoneistoja", "asuntojen lukumäärä", "asuinhuoneistoja", "huoneistojen määrä"],
  landOwnership: ["oma tontti", "vuokratontti", "valinnainen vuokratontti", "lunastettava vuokratontti", "tonttiosuuden voi lunastaa", "valinnainen tontinvuokra"],
};

export const excludedCompanyLoanLabels = ["taloyhtiön lainat", "taloyhtiön koko lainamäärä", "remontin kustannusarvio", "pankkilaina"] as const;
