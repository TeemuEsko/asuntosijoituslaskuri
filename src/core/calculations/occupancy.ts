export function clampVacancyMonths(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.min(12, Math.max(0, Math.round(value as number))) : 1;
}

export function occupancyFromVacancyMonths(value: number | null | undefined) {
  const vacancyMonths = clampVacancyMonths(value);
  const occupiedMonths = 12 - vacancyMonths;
  return { vacancyMonths, occupiedMonths, occupancyRate: occupiedMonths / 12, occupancyRatePercent: occupiedMonths / 12 * 100 };
}

export function vacancyMonthsFromOccupancyRate(rate: number | null | undefined): number {
  if (!Number.isFinite(rate)) return 1;
  const normalized = (rate as number) > 1 ? (rate as number) / 100 : rate as number;
  return clampVacancyMonths(12 * (1 - Math.min(1, Math.max(0, normalized))));
}

export function effectiveAnnualRent(monthlyRent: number, vacancyMonths: number): number {
  return Math.max(0, Number.isFinite(monthlyRent) ? monthlyRent : 0) * occupancyFromVacancyMonths(vacancyMonths).occupiedMonths;
}
