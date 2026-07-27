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
  | "address"
  | "city"
  | "housingCompanyName"
  | "apartmentCount"
  | "landOwnership"
  | "otherMonthlyFees"
  | "heatingType"
  | "energyClass"
  | "elevator";

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
  address: "Osoite",
  city: "Kunta tai kaupunki",
  housingCompanyName: "Taloyhtiön nimi",
  apartmentCount: "Huoneistojen lukumäärä",
  landOwnership: "Tontin omistusmuoto",
  otherMonthlyFees: "Muut kuukausittaiset maksut",
  heatingType: "Lämmitysmuoto",
  energyClass: "Energialuokka",
  elevator: "Hissi",
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
  address: ["osoite", "käyntiosoite", "kohteen osoite"],
  city: ["kunta", "kaupunki", "sijaintikunta"],
  housingCompanyName: ["taloyhtiö", "asunto-osakeyhtiö", "yhtiön nimi", "asunto oy", "as oy"],
  apartmentCount: ["huoneistoja", "asuntojen lukumäärä", "asuinhuoneistoja", "huoneistojen määrä"],
  landOwnership: ["tontin omistusmuoto", "oma tontti", "vuokratontti", "valinnainen vuokratontti", "lunastettava vuokratontti", "tonttiosuuden voi lunastaa", "valinnainen tontinvuokra"],
  otherMonthlyFees: ["muut maksut", "muut kuukausittaiset maksut", "vesimaksu", "autopaikkamaksu", "saunamaksu"],
  heatingType: ["lämmitys", "lämmitysmuoto", "lämmitysjärjestelmä"],
  energyClass: ["energialuokka", "energiatehokkuusluokka"],
  elevator: ["hissi", "onko talossa hissiä"],
};

export const excludedCompanyLoanLabels = ["taloyhtiön lainat", "taloyhtiön koko lainamäärä", "yhtiön lainat yhteensä", "remontin kustannusarvio", "lainan enimmäismäärä", "pankkilaina", "henkilökohtainen laina"] as const;

export const criticalFields: ReadonlyArray<{ key: NormalizedFieldKey | "completedRenovations" | "futureRenovations"; label: string }> = [
  { key: "address", label: "Osoite" },
  { key: "city", label: "Kunta tai kaupunki" },
  { key: "areaSqm", label: "Pinta-ala" },
  { key: "roomDescription", label: "Huoneistotyyppi" },
  { key: "constructionYear", label: "Rakennusvuosi" },
  { key: "salePrice", label: "Myyntihinta" },
  { key: "debtFreePrice", label: "Velaton hinta" },
  { key: "companyLoanShare", label: "Yhtiölainaosuus" },
  { key: "maintenanceFeeMonthly", label: "Hoitovastike" },
  { key: "financingFeeMonthly", label: "Rahoitusvastike" },
  { key: "plotFeeMonthly", label: "Tonttivastike" },
  { key: "otherMonthlyFees", label: "Muut kuukausittaiset maksut" },
  { key: "landOwnership", label: "Tontin omistusmuoto" },
  { key: "housingCompanyName", label: "Taloyhtiön nimi" },
  { key: "condition", label: "Huoneiston kunto" },
  { key: "heatingType", label: "Lämmitysmuoto" },
  { key: "energyClass", label: "Energialuokka" },
  { key: "floor", label: "Kerros" },
  { key: "elevator", label: "Hissi" },
  { key: "completedRenovations", label: "Tehdyt remontit" },
  { key: "futureRenovations", label: "Tulevat remontit" },
];
