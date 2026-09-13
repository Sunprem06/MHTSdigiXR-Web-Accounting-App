import { describe, it, expect } from "vitest";
import {
  getFinancialYearPeriods,
  computeMonthlyAccrualCredit,
  computeCarryForwardOpeningBalance,
  computeAvailableBalance,
} from "./leave-accrual-engine";

describe("getFinancialYearPeriods", () => {
  it("lists all 12 months of an Apr-Mar financial year", () => {
    const periods = getFinancialYearPeriods("2026-04-01", "2027-03-31");
    expect(periods).toEqual([
      "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
      "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03",
    ]);
  });

  it("handles a partial-year range", () => {
    expect(getFinancialYearPeriods("2026-10-01", "2027-03-31")).toEqual([
      "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03",
    ]);
  });
});

describe("computeMonthlyAccrualCredit", () => {
  const fyPeriods = getFinancialYearPeriods("2026-04-01", "2027-03-31");

  it("credits one month's worth on the first run of the year", () => {
    const result = computeMonthlyAccrualCredit({
      annualEntitlementDays: 18, fyPeriods, lastAccrualPeriod: null, throughPeriod: "2026-04",
    });
    expect(result.creditAmount).toBe(1.5);
    expect(result.newLastAccrualPeriod).toBe("2026-04");
    expect(result.periodsCredited).toBe(1);
  });

  it("is idempotent — re-running through the same period credits nothing more", () => {
    const result = computeMonthlyAccrualCredit({
      annualEntitlementDays: 18, fyPeriods, lastAccrualPeriod: "2026-04", throughPeriod: "2026-04",
    });
    expect(result.creditAmount).toBe(0);
    expect(result.periodsCredited).toBe(0);
  });

  it("catches up multiple missed months in one run", () => {
    const result = computeMonthlyAccrualCredit({
      annualEntitlementDays: 18, fyPeriods, lastAccrualPeriod: "2026-04", throughPeriod: "2026-07",
    });
    expect(result.periodsCredited).toBe(3);
    expect(result.creditAmount).toBe(4.5); // 3 * 1.5
    expect(result.newLastAccrualPeriod).toBe("2026-07");
  });

  it("credits the full entitlement across all 12 months of the year", () => {
    let lastAccrualPeriod: string | null = null;
    let total = 0;
    for (const period of fyPeriods) {
      const result = computeMonthlyAccrualCredit({ annualEntitlementDays: 18, fyPeriods, lastAccrualPeriod, throughPeriod: period });
      total += result.creditAmount;
      lastAccrualPeriod = result.newLastAccrualPeriod;
    }
    expect(total).toBe(18);
  });

  it("clamps a throughPeriod after the financial year end to the last period", () => {
    const result = computeMonthlyAccrualCredit({
      annualEntitlementDays: 18, fyPeriods, lastAccrualPeriod: null, throughPeriod: "2027-06",
    });
    expect(result.newLastAccrualPeriod).toBe("2027-03");
    expect(result.periodsCredited).toBe(12);
  });

  it("credits nothing for a throughPeriod before the financial year starts", () => {
    const result = computeMonthlyAccrualCredit({
      annualEntitlementDays: 18, fyPeriods, lastAccrualPeriod: null, throughPeriod: "2026-01",
    });
    expect(result.periodsCredited).toBe(0);
    expect(result.creditAmount).toBe(0);
  });
});

describe("computeCarryForwardOpeningBalance", () => {
  it("caps carry-forward at the leave type's configured maximum", () => {
    expect(computeCarryForwardOpeningBalance({ priorClosingBalance: 35, carryForwardCap: 30 })).toBe(30);
  });

  it("carries forward the full balance when under the cap", () => {
    expect(computeCarryForwardOpeningBalance({ priorClosingBalance: 12, carryForwardCap: 30 })).toBe(12);
  });

  it("lapses everything when the cap is 0", () => {
    expect(computeCarryForwardOpeningBalance({ priorClosingBalance: 12, carryForwardCap: 0 })).toBe(0);
  });

  it("carries forward the full balance uncapped when carryForwardCap is null", () => {
    expect(computeCarryForwardOpeningBalance({ priorClosingBalance: 99, carryForwardCap: null })).toBe(99);
  });

  it("floors a negative closing balance at 0 instead of carrying a debt", () => {
    expect(computeCarryForwardOpeningBalance({ priorClosingBalance: -5, carryForwardCap: null })).toBe(0);
  });
});

describe("computeAvailableBalance", () => {
  it("sums opening + accrued + adjustment - used", () => {
    expect(computeAvailableBalance({ openingBalance: 5, accruedYtd: 4.5, adjustmentYtd: 1, usedYtd: 2 })).toBe(8.5);
  });

  it("floors at 0 when used exceeds what was granted", () => {
    expect(computeAvailableBalance({ openingBalance: 0, accruedYtd: 1, adjustmentYtd: 0, usedYtd: 3 })).toBe(0);
  });
});
