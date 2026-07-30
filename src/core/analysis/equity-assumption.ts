export type EquitySource = "default" | "user";

export type EquityAssumption = {
  equity: number;
  equitySource: EquitySource;
  equityUserOverridden: boolean;
};

export const DEFAULT_EQUITY = 0;

export function defaultEquityAssumption(): EquityAssumption {
  return {
    equity: DEFAULT_EQUITY,
    equitySource: "default",
    equityUserOverridden: false,
  };
}

export function userEquityAssumption(value: number): EquityAssumption {
  return {
    equity: Number.isFinite(value) ? Math.max(0, value) : DEFAULT_EQUITY,
    equitySource: "user",
    equityUserOverridden: true,
  };
}
