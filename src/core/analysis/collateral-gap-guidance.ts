export const COLLATERAL_GAP_GUIDANCE = "Katettava omarahoituksella tai lisävakuuksilla.";

export function getCollateralGapGuidance(collateralShortfall: number | undefined): string | undefined {
  return typeof collateralShortfall === "number" && Number.isFinite(collateralShortfall) && collateralShortfall > 0
    ? COLLATERAL_GAP_GUIDANCE
    : undefined;
}
