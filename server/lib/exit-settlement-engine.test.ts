import { describe, it, expect } from "vitest";
import {
  computeProposedLastWorkingDay,
  computeYearsOfService,
  computeGratuity,
  computeLeaveEncashment,
  computePendingSalary,
  computeNetSettlement,
} from "./exit-settlement-engine";

describe("computeProposedLastWorkingDay", () => {
  it("adds notice period days to the resignation date", () => {
    expect(computeProposedLastWorkingDay("2026-09-01", 30)).toBe("2026-10-01");
  });

  it("handles month/year rollover", () => {
    expect(computeProposedLastWorkingDay("2026-12-15", 30)).toBe("2027-01-14");
  });
});

describe("computeYearsOfService", () => {
  it("computes fractional years for a partial year", () => {
    const years = computeYearsOfService("2025-01-01", "2026-07-01");
    expect(years).toBeGreaterThan(1.4);
    expect(years).toBeLessThan(1.6);
  });
});

describe("computeGratuity", () => {
  it("is ineligible below the threshold and returns 0 amount", () => {
    const result = computeGratuity({
      basicPlusDaMonthly: 30000, dateOfJoining: "2024-01-01", lastWorkingDay: "2026-01-01",
    });
    expect(result.eligible).toBe(false);
    expect(result.amount).toBe(0);
  });

  it("is eligible at exactly 5 years and computes the standard formula", () => {
    const result = computeGratuity({
      basicPlusDaMonthly: 26000, dateOfJoining: "2020-01-01", lastWorkingDay: "2025-01-01",
    });
    expect(result.eligible).toBe(true);
    expect(result.roundedYears).toBe(5);
    // (26000 / 26) * 15 * 5 = 1000 * 15 * 5 = 75000
    expect(result.amount).toBe(75000);
  });

  it("rounds a >6-month remainder up to the next full year", () => {
    // ~5 years 8 months of service
    const result = computeGratuity({
      basicPlusDaMonthly: 26000, dateOfJoining: "2020-01-01", lastWorkingDay: "2025-09-01",
    });
    expect(result.roundedYears).toBe(6);
  });

  it("respects a custom eligibility threshold", () => {
    const result = computeGratuity({
      basicPlusDaMonthly: 26000, dateOfJoining: "2025-01-01", lastWorkingDay: "2026-06-01",
      eligibilityYears: 1,
    });
    expect(result.eligible).toBe(true);
  });
});

describe("computeLeaveEncashment", () => {
  it("only counts balances from encashable leave types", () => {
    const result = computeLeaveEncashment({
      balances: [
        { isEncashable: true, availableDays: 10 },
        { isEncashable: false, availableDays: 20 },
      ],
      perDayRate: 1000,
    });
    expect(result.days).toBe(10);
    expect(result.amount).toBe(10000);
  });

  it("ignores negative available balances", () => {
    const result = computeLeaveEncashment({
      balances: [{ isEncashable: true, availableDays: -5 }],
      perDayRate: 1000,
    });
    expect(result.days).toBe(0);
    expect(result.amount).toBe(0);
  });
});

describe("computePendingSalary", () => {
  it("pro-rates the final month for days actually worked", () => {
    expect(computePendingSalary({ monthlyGross: 26000, standardWorkingDays: 26, daysWorkedInFinalMonth: 10 })).toBe(10000);
  });

  it("clamps days worked to standardWorkingDays", () => {
    expect(computePendingSalary({ monthlyGross: 26000, standardWorkingDays: 26, daysWorkedInFinalMonth: 40 })).toBe(26000);
  });

  it("returns 0 when standardWorkingDays is not positive", () => {
    expect(computePendingSalary({ monthlyGross: 26000, standardWorkingDays: 0, daysWorkedInFinalMonth: 10 })).toBe(0);
  });
});

describe("computeNetSettlement", () => {
  it("sums earnings and subtracts deductions", () => {
    const net = computeNetSettlement({
      pendingSalaryAmount: 10000, leaveEncashmentAmount: 5000, gratuityAmount: 75000,
      otherEarnings: 2000, otherDeductions: 3000,
    });
    expect(net).toBe(89000);
  });
});
