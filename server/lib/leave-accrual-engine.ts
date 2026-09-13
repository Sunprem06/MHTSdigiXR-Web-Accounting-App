// Leave Management — accrual and carry-forward calculation engine.
//
// The entitlement/carry-forward NUMBERS this feature ships with are a DRAFT
// baseline (see server/seed-leave-types.ts) that needs HR/CA review before a
// real leave cycle relies on them. This module's MATH (equal monthly
// installments, capped/uncapped carry-forward) is independent of those
// numbers and works correctly regardless of what a reviewed policy sets them
// to — the numbers live in editable leave_types rows, not here.
//
// Deliberately pure — no imports from storage/db/express — so the math can be
// reviewed and unit-tested in complete isolation from the rest of the app.

export function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/**
 * All "YYYY-MM" periods in a financial year, in order, from its start month
 * through its end month inclusive (e.g. "2026-04" .. "2027-03" for an Apr-Mar FY).
 */
export function getFinancialYearPeriods(fyStartDate: string, fyEndDate: string): string[] {
  const [startYear, startMonth] = fyStartDate.split("-").slice(0, 2).map(Number);
  const [endYear, endMonth] = fyEndDate.split("-").slice(0, 2).map(Number);
  const periods: string[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    periods.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return periods;
}

export interface MonthlyAccrualResult {
  creditAmount: number;
  newLastAccrualPeriod: string | null;
  periodsCredited: number;
}

/**
 * Computes the monthly-accrual credit due between the last period already
 * credited (exclusive) and `throughPeriod` (inclusive), both within the same
 * financial year. Idempotent: calling this again with the same
 * `lastAccrualPeriod` and `throughPeriod` yields a zero credit the second time
 * once the caller has persisted `newLastAccrualPeriod`.
 */
export function computeMonthlyAccrualCredit(params: {
  annualEntitlementDays: number;
  fyPeriods: string[]; // from getFinancialYearPeriods, ordered
  lastAccrualPeriod: string | null;
  throughPeriod: string; // "YYYY-MM"
}): MonthlyAccrualResult {
  const { annualEntitlementDays, fyPeriods, lastAccrualPeriod, throughPeriod } = params;
  if (fyPeriods.length === 0) {
    return { creditAmount: 0, newLastAccrualPeriod: lastAccrualPeriod, periodsCredited: 0 };
  }
  const lastIndex = lastAccrualPeriod ? fyPeriods.indexOf(lastAccrualPeriod) : -1;
  let throughIndex = fyPeriods.indexOf(throughPeriod);
  if (throughIndex === -1) {
    // throughPeriod outside this FY (before start or after end) — clamp to the
    // nearest boundary rather than crediting nothing or throwing.
    throughIndex = throughPeriod < fyPeriods[0] ? -1 : fyPeriods.length - 1;
  }
  const periodsCredited = Math.max(0, throughIndex - lastIndex);
  if (periodsCredited === 0) {
    return { creditAmount: 0, newLastAccrualPeriod: lastAccrualPeriod, periodsCredited: 0 };
  }
  const perMonth = annualEntitlementDays / fyPeriods.length;
  return {
    creditAmount: round1(perMonth * periodsCredited),
    newLastAccrualPeriod: fyPeriods[throughIndex],
    periodsCredited,
  };
}

/**
 * Applies a leave type's carry-forward rule to a prior financial year's
 * closing balance, producing the new year's opening balance.
 * null cap = unlimited carry-forward; 0 = lapses entirely; >0 = capped.
 * A negative closing balance (shouldn't normally occur, but a manual
 * adjustment could produce one) floors to 0 rather than carrying a debt.
 */
export function computeCarryForwardOpeningBalance(params: {
  priorClosingBalance: number;
  carryForwardCap: number | null;
}): number {
  const clamped = Math.max(0, params.priorClosingBalance);
  if (params.carryForwardCap === null) return round1(clamped);
  return round1(Math.min(clamped, params.carryForwardCap));
}

/** opening + accrued + adjustment - used, floored at 0 for display purposes. */
export function computeAvailableBalance(params: {
  openingBalance: number;
  accruedYtd: number;
  adjustmentYtd: number;
  usedYtd: number;
}): number {
  return round1(Math.max(0, params.openingBalance + params.accruedYtd + params.adjustmentYtd - params.usedYtd));
}
