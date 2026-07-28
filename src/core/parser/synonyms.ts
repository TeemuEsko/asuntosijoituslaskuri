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
  | "streetAddress"
  | "postalCode"
  | "district"
  | "apartmentIdentifier"
  | "listingTitle"
  | "listingId"
  | "buildingType"
  | "currentRentMonthly"
  | "totalHousingCharge"
  | "waterFeeMonthly"
  | "parkingFeeMonthly"
  | "saunaFeeMonthly"
  | "wasteFeeMonthly"
  | "city"
  | "housingCompanyName"
  | "apartmentCount"
  | "landOwnership"
  | "otherMonthlyFees"
  | "heatingType"
  | "energyClass"
  | "elevator"
  | "floorCount"
  | "apartmentType"
  | "balcony"
  | "sauna"
  | "parking"
  | "landRentAnnual"
  | "plotShareRedemptionPrice"
  | "nextPlotShareRedemptionDate"
  | "articlesRedemptionClause"
  | "usageRestrictions"
  | "maintenancePlanText"
  | "availability"
  | "occupancyStatus";

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
  streetAddress: "Katuosoite",
  postalCode: "Postinumero",
  district: "Kaupunginosa",
  apartmentIdentifier: "Huoneiston tunnus",
  listingTitle: "Ilmoituksen otsikko",
  listingId: "Kohdenumero",
  buildingType: "Talotyyppi",
  currentRentMonthly: "Nykyinen vuokra",
  totalHousingCharge: "Yhtiövastike yhteensä",
  waterFeeMonthly: "Vesimaksu",
  parkingFeeMonthly: "Autopaikkamaksu",
  saunaFeeMonthly: "Saunamaksu",
  wasteFeeMonthly: "Jätemaksu",
  city: "Kunta tai kaupunki",
  housingCompanyName: "Taloyhtiön nimi",
  apartmentCount: "Huoneistojen lukumäärä",
  landOwnership: "Tontin omistusmuoto",
  otherMonthlyFees: "Muut kuukausittaiset maksut",
  heatingType: "Lämmitysmuoto",
  energyClass: "Energialuokka",
  elevator: "Hissi",
  floorCount: "Kerrosten lukumäärä",
  apartmentType: "Asuntotyyppi",
  balcony: "Parveke",
  sauna: "Sauna",
  parking: "Autopaikka",
  landRentAnnual: "Tontin vuosivuokra",
  plotShareRedemptionPrice: "Tonttiosuuden lunastushinta",
  nextPlotShareRedemptionDate: "Seuraava tonttiosuuden lunastusajankohta",
  articlesRedemptionClause: "Yhtiöjärjestyksen lunastuslauseke",
  usageRestrictions: "Käyttörajoitukset",
  maintenancePlanText: "Kunnossapitotarveselvitys",
  availability: "Vapautuminen",
  occupancyStatus: "Vuokraustilanne",
};

export const fieldSynonyms: Record<NormalizedFieldKey, readonly string[]> = {
  salePrice: ["myyntihinta", "kauppahinta", "osakkeiden myyntihinta"],
  debtFreePrice: ["velaton hinta", "velaton myyntihinta", "velaton kauppahinta", "kokonaiskauppahinta"],
  companyLoanShare: ["lainaosuus", "velkaosuus", "yhtiölainaosuus", "osuus yhtiölainasta", "huoneistokohtainen lainaosuus", "huoneistokohtainen velkaosuus", "huoneistoon kohdistuva laina", "osakkeisiin kohdistuva lainaosuus"],
  maintenanceFeeMonthly: ["hoitovastike", "yhtiövastikkeen hoito-osa", "hoitovastike kuukaudessa"],
  financingFeeMonthly: ["rahoitusvastike", "pääomavastike", "lainanlyhennysvastike", "yhtiölainavastike", "pääomavastike a", "pääomavastike b", "rahoitusvastike 1", "rahoitusvastike 2"],
  plotFeeMonthly: ["tontinvuokravastike", "tonttivastike", "maanvuokravastike", "valinnaisen vuokratontin vastike"],
  areaSqm: ["pinta-ala", "asuinpinta-ala", "huoneistoala", "yhtiöjärjestyksen mukainen pinta-ala", "pinta-ala yhtiöjärjestyksen mukaan"],
  roomDescription: ["huoneet", "huoneistoselitelmä", "huoneistotyyppi", "huonejako", "asuinhuoneet", "kohteen tyyppi", "pohjaratkaisu"],
  constructionYear: ["rakennusvuosi", "valmistumisvuosi", "käyttöönottovuosi", "valmistunut", "rakennettu"],
  floor: ["kerros", "sijaintikerros", "asuinkerros", "kerros / kerroksia"],
  condition: ["kunto", "asunnon kunto", "yleiskunto", "kuntoarvio"],
  address: ["osoite", "käyntiosoite", "kohteen osoite"],
  streetAddress: ["katuosoite"],
  postalCode: ["postinumero"],
  district: ["kaupunginosa", "alue"],
  apartmentIdentifier: ["huoneiston tunnus", "asunnon tunnus"],
  listingTitle: ["ilmoituksen otsikko", "kohteen otsikko"],
  listingId: ["kohdenumero", "kohde nro", "kohde-id"],
  buildingType: ["talotyyppi", "rakennuksen tyyppi", "asuntotyyppi", "kohdetyyppi", "rakennustyyppi"],
  currentRentMonthly: ["nykyinen vuokra", "vuokra", "vuokrattu"],
  totalHousingCharge: ["yhtiövastike yhteensä", "vastikkeet yhteensä"],
  waterFeeMonthly: ["vesimaksu"],
  parkingFeeMonthly: ["autopaikkamaksu"],
  saunaFeeMonthly: ["saunamaksu"],
  wasteFeeMonthly: ["jätemaksu"],
  city: ["kunta", "kaupunki", "sijaintikunta"],
  housingCompanyName: ["taloyhtiön nimi", "asunto-osakeyhtiön nimi", "yhtiön nimi", "taloyhtiö", "asunto-osakeyhtiö", "asunto oy", "as oy"],
  apartmentCount: ["huoneistoja", "asuntojen lukumäärä", "asuinhuoneistoja", "huoneistojen määrä"],
  landOwnership: ["tontin omistusmuoto", "tontin omistus", "tontin hallinta", "tontti", "oma tontti", "vuokratontti", "valinnainen vuokratontti", "lunastettava vuokratontti", "tonttiosuuden voi lunastaa", "valinnainen tontinvuokra"],
  otherMonthlyFees: ["muut maksut", "muut kuukausittaiset maksut", "vesimaksu", "autopaikkamaksu", "saunamaksu"],
  heatingType: ["lämmitys", "lämmitysmuoto", "lämmitysjärjestelmä"],
  energyClass: ["energialuokka", "energiatehokkuusluokka"],
  elevator: ["hissi", "onko talossa hissiä"],
  floorCount: ["kerrosten lukumäärä", "kerroksia", "talossa kerroksia"],
  apartmentType: ["asuntotyyppi", "huoneistomuoto"],
  balcony: ["parveke", "parveketyyppi"],
  sauna: ["sauna", "saunatyyppi"],
  parking: ["autopaikka", "autopaikat", "pysäköinti"],
  landRentAnnual: ["tontin vuosivuokra", "maanvuokra vuodessa", "tontin vuokra"],
  plotShareRedemptionPrice: ["tonttiosuuden lunastushinta", "tonttiosuuden hinta", "lunastusosuus"],
  nextPlotShareRedemptionDate: ["seuraava lunastusajankohta", "tonttiosuuden lunastusajankohta"],
  articlesRedemptionClause: ["lunastuslauseke", "yhtiöjärjestyksen lunastuslauseke", "lunastusoikeus"],
  usageRestrictions: ["käyttörajoitukset", "käyttö- ja luovutusrajoitukset", "rajoitukset"],
  maintenancePlanText: ["kunnossapitotarveselvitys", "pts", "kunnossapitotarve seuraavalle viidelle vuodelle"],
  availability: ["vapautuminen", "vapautuu", "hallinnan luovutus"],
  occupancyStatus: ["vuokrattu", "vuokraustilanne", "hallintamuoto"],
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
