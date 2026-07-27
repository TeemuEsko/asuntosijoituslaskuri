import type { PropertyField } from "./field";

export type PropertyModel = {
  id: string;
  identity: {
    title: PropertyField<string>;
    address: PropertyField<string>;
    listingUrl: PropertyField<string>;
  };
  purchase: {
    debtFreePrice: PropertyField<number>;
    salePrice: PropertyField<number>;
    companyLoanShare: PropertyField<number>;
    renovationReserve: PropertyField<number>;
  };
  housingCompany: {
    maintenanceFeeMonthly: PropertyField<number>;
    financingFeeMonthly: PropertyField<number>;
    apartmentCount: PropertyField<number>;
    landOwnership: PropertyField<"owned" | "leased">;
  };
  rent: {
    currentRentMonthly: PropertyField<number>;
    marketRentMonthly: PropertyField<number>;
    occupancyRate: PropertyField<number>;
    rentalDemand: PropertyField<1 | 2 | 3 | 4 | 5>;
  };
  financing: {
    equityInvested: PropertyField<number>;
    annualInterestRate: PropertyField<number>;
    loanTermYears: PropertyField<number>;
    repaymentType: PropertyField<"annuity" | "equal_principal" | "bullet">;
  };
};
