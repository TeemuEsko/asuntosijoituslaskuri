export const COLLATERAL_GAP_GUIDANCE = "Summa, joka jää katettavaksi muilla vakuuksilla tai omalla rahalla, kun pankin hyväksymä vakuusarvo ei yksin riitä suunniteltuun rahoitukseen.";

export function getCollateralGapGuidance(collateralShortfall: number | undefined): string | undefined {
  return typeof collateralShortfall === "number" && Number.isFinite(collateralShortfall) && collateralShortfall > 0
    ? COLLATERAL_GAP_GUIDANCE
    : undefined;
}
