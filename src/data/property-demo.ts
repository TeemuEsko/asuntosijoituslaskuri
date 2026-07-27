import type { FieldStatus } from "@/core/domain/field";
import type { RuleStatus } from "@/core/rules/types";

export const demoProperty = {
  title: "Koulukatu 12 A 4",
  city: "Vaasa",
  purchase: {
    debtFreePrice: 79000,
    salePrice: 79000,
    companyLoanShare: 0,
    financingFeeMonthly: 0,
    renovationReserve: 5000,
  },
  details: [
    ["Osoite", "Koulukatu 12 A 4, Vaasa"],
    ["Pinta-ala", "32 m²"],
    ["Huoneet", "1h + kk"],
    ["Rakennusvuosi", "1972"],
    ["Kerros", "3 / 5"],
    ["Lämmitys", "Kaukolämpö"],
    ["Kunto", "Tyydyttävä"],
  ],
  company: [
    ["Hoitovastike", "185 €/kk"],
    ["Rahoitusvastike", "0 €/kk"],
    ["Huoneistoja", "28"],
    ["Putkiremontti", "Tehty 2018"],
    ["Julkisivu", "Suunnitteilla 2029"],
  ],
} as const;

export type PurchaseFieldKey = keyof typeof demoProperty.purchase;

export const initialPurchaseStatuses: Record<PurchaseFieldKey, FieldStatus> = {
  debtFreePrice: "parser",
  salePrice: "parser",
  companyLoanShare: "parser",
  financingFeeMonthly: "derived",
  renovationReserve: "user",
};

export const riskItems: ReadonlyArray<{
  title: string;
  status: RuleStatus;
  tone: "success" | "warning" | "neutral";
}> = [
  { title: "Oma tontti", status: "not_detected", tone: "success" },
  { title: "Putkiremontti tehty", status: "not_detected", tone: "success" },
  { title: "Julkisivuremontti suunnitteilla", status: "detected", tone: "warning" },
  { title: "Omistuspohja tarkistamatta", status: "unchecked", tone: "warning" },
  { title: "Taloyhtiön talous tarkistamatta", status: "unchecked", tone: "warning" },
  { title: "Asbestiriski huomioitava ennen purkutöitä", status: "not_applicable", tone: "neutral" },
];
