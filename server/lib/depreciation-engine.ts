// Fixed Assets Register — depreciation calculation engine.
//
// ⚠️ CA REVIEW REQUIRED. This is a best-effort implementation of Companies Act
// 2013 Schedule II (SLM/WDV, day-based pro-ration for partial periods, the 5%
// residual-value cap under Part C note 4). It has NOT been reviewed by a
// Chartered Accountant. Do not rely on any figure this module produces for a
// statutory filing, audited financial statement, or tax computation until a
// CA has signed off on these formulas against the current text of Schedule II
// and any amendments.
//
// Deliberately pure — no imports from storage/db/express — so the math can be
// reviewed and unit-tested in complete isolation from the rest of the app.

export interface PeriodBoundary {
  periodStartDate: string; // "YYYY-MM-DD"
  periodEndDate: string;   // "YYYY-MM-DD"
  label: string;           // e.g. "FY 2024-25"
}

export interface DepreciationEntryResult {
  periodStartDate: string;
  periodEndDate: string;
  financialYearLabel: string;
  openingWdv: number;
  depreciationAmount: number;
  closingWdv: number;
  method: "slm" | "wdv";
  isProrated: boolean;
  daysInPeriod: number;
  daysUsed: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(dateStr: string): Date {
  // Parsed as UTC midnight so day-count math isn't affected by the server's
  // local timezone or DST transitions.
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d;
}

function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() > b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() < b.getTime() ? a : b;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Schedule II Part C, note 4: residual value cannot exceed 5% of the original
 * cost unless a documented technical justification is provided. Pure
 * validation only — the caller (server route) decides what to do on failure.
 */
export function validateResidualValue(input: {
  originalCost: number;
  residualValue: number;
  hasJustification: boolean;
}): { valid: boolean; capAmount: number; message?: string } {
  const { originalCost, residualValue, hasJustification } = input;
  const capAmount = round2(originalCost * 0.05);
  if (residualValue > capAmount && !hasJustification) {
    return {
      valid: false,
      capAmount,
      message: `Residual value (${residualValue}) exceeds 5% of original cost (${capAmount}) — a justification is required (Companies Act 2013 Schedule II Part C, note 4).`,
    };
  }
  return { valid: true, capAmount };
}

/**
 * WDV annual rate per Schedule II: rate = 1 - (residual / cost) ^ (1 / usefulLifeYears).
 * Requires 0 <= residualValue < originalCost and usefulLifeYears > 0.
 */
export function computeWdvAnnualRate(originalCost: number, residualValue: number, usefulLifeYears: number): number {
  if (originalCost <= 0) throw new Error("originalCost must be greater than 0");
  if (usefulLifeYears <= 0) throw new Error("usefulLifeYears must be greater than 0");
  if (residualValue < 0 || residualValue >= originalCost) throw new Error("residualValue must be between 0 and originalCost (exclusive)");
  return 1 - Math.pow(residualValue / originalCost, 1 / usefulLifeYears);
}

/**
 * SLM annual amount per Schedule II: constant every full year, based on
 * original cost (not declining opening WDV, unlike the WDV method).
 */
export function computeSlmAnnualAmount(originalCost: number, residualValue: number, usefulLifeYears: number): number {
  if (originalCost <= 0) throw new Error("originalCost must be greater than 0");
  if (usefulLifeYears <= 0) throw new Error("usefulLifeYears must be greater than 0");
  if (residualValue < 0 || residualValue > originalCost) throw new Error("residualValue must be between 0 and originalCost");
  return (originalCost - residualValue) / usefulLifeYears;
}

/**
 * Builds the full depreciation schedule for an asset across every financial
 * year it was in service, from acquisitionDate through asOfDate. Handles:
 *  - Backdated assets: iterates every intervening FY, so an asset bought
 *    years ago gets its full accumulated-depreciation history in one call,
 *    not just "from today forward."
 *  - Partial periods (acquisition mid-FY, or asOfDate mid-FY): pro-rated by
 *    calendar days actually in service within that FY — day-based, per
 *    current Schedule II, NOT the older Income Tax Act 180-day/50% rule.
 *  - Residual value floor: never depreciates below residualValue; the final
 *    period is truncated to land exactly on it, and no further periods are
 *    generated once the floor is reached.
 */
export function buildDepreciationSchedule(input: {
  acquisitionDate: string;
  originalCost: number;
  residualValue: number;
  usefulLifeYears: number;
  method: "slm" | "wdv";
  financialYearBoundaries: PeriodBoundary[];
  asOfDate: string;
}): DepreciationEntryResult[] {
  const { acquisitionDate, originalCost, residualValue, usefulLifeYears, method, asOfDate } = input;
  if (originalCost <= 0) throw new Error("originalCost must be greater than 0");
  if (usefulLifeYears <= 0) throw new Error("usefulLifeYears must be greater than 0");
  if (residualValue < 0 || residualValue >= originalCost) throw new Error("residualValue must be between 0 and originalCost (exclusive)");

  const acquisition = parseDate(acquisitionDate);
  const asOf = parseDate(asOfDate);
  if (asOf.getTime() < acquisition.getTime()) return [];

  const slmAnnualAmount = method === "slm" ? computeSlmAnnualAmount(originalCost, residualValue, usefulLifeYears) : 0;
  const wdvAnnualRate = method === "wdv" ? computeWdvAnnualRate(originalCost, residualValue, usefulLifeYears) : 0;

  const sortedBoundaries = [...input.financialYearBoundaries].sort(
    (a, b) => parseDate(a.periodStartDate).getTime() - parseDate(b.periodStartDate).getTime()
  );

  const entries: DepreciationEntryResult[] = [];
  let openingWdv = originalCost;

  for (const fy of sortedBoundaries) {
    const fyStart = parseDate(fy.periodStartDate);
    const fyEnd = parseDate(fy.periodEndDate);
    if (fyEnd.getTime() < acquisition.getTime()) continue; // asset not yet acquired
    if (fyStart.getTime() > asOf.getTime()) break;          // beyond the date we're computing to
    if (openingWdv <= residualValue) break;                 // already fully depreciated

    const effectiveStart = maxDate(fyStart, acquisition);
    const effectiveEnd = minDate(fyEnd, asOf);
    if (effectiveStart.getTime() > effectiveEnd.getTime()) continue;

    const daysInPeriod = daysBetweenInclusive(fyStart, fyEnd);
    const daysUsed = daysBetweenInclusive(effectiveStart, effectiveEnd);
    const isProrated = daysUsed < daysInPeriod;

    const fullYearAmount = method === "slm" ? slmAnnualAmount : openingWdv * wdvAnnualRate;
    let periodAmount = round2(fullYearAmount * (daysUsed / daysInPeriod));

    // Floor: never depreciate below residual value.
    if (openingWdv - periodAmount < residualValue) {
      periodAmount = round2(openingWdv - residualValue);
    }
    if (periodAmount < 0) periodAmount = 0;

    const closingWdv = round2(openingWdv - periodAmount);

    entries.push({
      periodStartDate: effectiveStart.toISOString().slice(0, 10),
      periodEndDate: effectiveEnd.toISOString().slice(0, 10),
      financialYearLabel: fy.label,
      openingWdv: round2(openingWdv),
      depreciationAmount: periodAmount,
      closingWdv,
      method,
      isProrated,
      daysInPeriod,
      daysUsed,
    });

    openingWdv = closingWdv;
    if (openingWdv <= residualValue) break;
  }

  return entries;
}

export function summarize(entries: DepreciationEntryResult[]): { accumulatedDepreciation: number; currentBookValue: number | null } {
  if (entries.length === 0) return { accumulatedDepreciation: 0, currentBookValue: null };
  const accumulatedDepreciation = round2(entries.reduce((sum, e) => sum + e.depreciationAmount, 0));
  const currentBookValue = entries[entries.length - 1].closingWdv;
  return { accumulatedDepreciation, currentBookValue };
}
