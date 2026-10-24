export const COLLATERAL_GAP_GUIDANCE = "Lisävakuuden tarve suunnitellulle pankkilainalle. Voidaan kattaa muilla vakuuksilla tai pienentämällä lainaa omalla rahalla.";

export function getCollateralGapGuidance(collateralShortfall: number | undefined): string | undefined {
  return typeof collateralShortfall === "number" && Number.isFinite(collateralShortfall) && collateralShortfall > 0
    ? COLLATERAL_GAP_GUIDANCE
    : undefined;
}
