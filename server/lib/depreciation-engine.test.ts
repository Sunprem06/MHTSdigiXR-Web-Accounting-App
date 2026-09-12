import { describe, it, expect } from "vitest";
import {
  validateResidualValue,
  computeWdvAnnualRate,
  computeSlmAnnualAmount,
  buildDepreciationSchedule,
  summarize,
  type PeriodBoundary,
} from "./depreciation-engine";

const FY_2022_23: PeriodBoundary = { periodStartDate: "2022-04-01", periodEndDate: "2023-03-31", label: "FY 2022-23" };
const FY_2023_24: PeriodBoundary = { periodStartDate: "2023-04-01", periodEndDate: "2024-03-31", label: "FY 2023-24" };
const FY_2024_25: PeriodBoundary = { periodStartDate: "2024-04-01", periodEndDate: "2025-03-31", label: "FY 2024-25" };
const FY_2025_26: PeriodBoundary = { periodStartDate: "2025-04-01", periodEndDate: "2026-03-31", label: "FY 2025-26" };

describe("validateResidualValue", () => {
  it("passes when residual is within the 5% cap", () => {
    const result = validateResidualValue({ originalCost: 100000, residualValue: 5000, hasJustification: false });
    expect(result.valid).toBe(true);
  });

  it("fails when residual exceeds the 5% cap without justification", () => {
    const result = validateResidualValue({ originalCost: 100000, residualValue: 20000, hasJustification: false });
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/5%/);
  });

  it("passes when residual exceeds the 5% cap but a justification is provided", () => {
    const result = validateResidualValue({ originalCost: 100000, residualValue: 20000, hasJustification: true });
    expect(result.valid).toBe(true);
  });
});

describe("computeSlmAnnualAmount", () => {
  it("computes a constant annual amount based on original cost", () => {
    expect(computeSlmAnnualAmount(100000, 5000, 5)).toBe(19000);
  });
});

describe("computeWdvAnnualRate", () => {
  it("computes the Schedule II WDV rate", () => {
    // usefulLifeYears = 1 collapses the exponent, giving a clean rate to assert on.
    expect(computeWdvAnnualRate(1000, 100, 1)).toBeCloseTo(0.9, 10);
  });

  it("throws for zero or negative cost (divide-by-zero guard)", () => {
    expect(() => computeWdvAnnualRate(0, 0, 5)).toThrow();
  });

  it("throws for zero useful life", () => {
    expect(() => computeWdvAnnualRate(1000, 100, 0)).toThrow();
  });

  it("throws when residual value is not less than original cost", () => {
    expect(() => computeWdvAnnualRate(1000, 1000, 5)).toThrow();
  });
});

describe("buildDepreciationSchedule", () => {
  it("computes SLM depreciation for a fresh asset over one full financial year", () => {
    const entries = buildDepreciationSchedule({
      acquisitionDate: "2024-04-01",
      originalCost: 100000,
      residualValue: 5000,
      usefulLifeYears: 5,
      method: "slm",
      financialYearBoundaries: [FY_2024_25],
      asOfDate: "2025-03-31",
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].isProrated).toBe(false);
    expect(entries[0].openingWdv).toBe(100000);
    expect(entries[0].depreciationAmount).toBe(19000);
    expect(entries[0].closingWdv).toBe(81000);
  });

  it("computes WDV depreciation for a fresh asset over one full financial year", () => {
    const entries = buildDepreciationSchedule({
      acquisitionDate: "2024-04-01",
      originalCost: 1000,
      residualValue: 100,
      usefulLifeYears: 1,
      method: "wdv",
      financialYearBoundaries: [FY_2024_25],
      asOfDate: "2025-03-31",
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].depreciationAmount).toBe(900);
    expect(entries[0].closingWdv).toBe(100);
  });

  it("catches up multiple financial years for a backdated asset", () => {
    const entries = buildDepreciationSchedule({
      acquisitionDate: "2022-04-01",
      originalCost: 100000,
      residualValue: 5000,
      usefulLifeYears: 5,
      method: "wdv",
      financialYearBoundaries: [FY_2022_23, FY_2023_24, FY_2024_25],
      asOfDate: "2025-03-31",
    });
    expect(entries).toHaveLength(3);
    // Declining balance: each year's opening WDV equals the prior year's closing WDV.
    expect(entries[1].openingWdv).toBe(entries[0].closingWdv);
    expect(entries[2].openingWdv).toBe(entries[1].closingWdv);
    // Declining balance means each year's depreciation amount is smaller than the last.
    expect(entries[1].depreciationAmount).toBeLessThan(entries[0].depreciationAmount);
    expect(entries[2].depreciationAmount).toBeLessThan(entries[1].depreciationAmount);
    expect(entries.every(e => !e.isProrated)).toBe(true);

    const summary = summarize(entries);
    expect(summary.currentBookValue).toBe(entries[2].closingWdv);
    expect(summary.accumulatedDepreciation).toBeCloseTo(100000 - entries[2].closingWdv, 2);
  });

  it("pro-rates depreciation for a mid-year acquisition", () => {
    const entries = buildDepreciationSchedule({
      acquisitionDate: "2024-10-01",
      originalCost: 36600,
      residualValue: 0,
      usefulLifeYears: 1,
      method: "slm",
      financialYearBoundaries: [FY_2024_25],
      asOfDate: "2025-03-31",
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].isProrated).toBe(true);

    const daysInPeriod = Math.round((new Date("2025-03-31T00:00:00Z").getTime() - new Date("2024-04-01T00:00:00Z").getTime()) / 86400000) + 1;
    const daysUsed = Math.round((new Date("2025-03-31T00:00:00Z").getTime() - new Date("2024-10-01T00:00:00Z").getTime()) / 86400000) + 1;
    const expectedAmount = Math.round(36600 * (daysUsed / daysInPeriod) * 100) / 100;
    expect(entries[0].depreciationAmount).toBeCloseTo(expectedAmount, 2);
  });

  it("floors at residual value and stops generating further periods once fully depreciated", () => {
    const entries = buildDepreciationSchedule({
      acquisitionDate: "2023-04-01",
      originalCost: 10000,
      residualValue: 1000,
      usefulLifeYears: 2,
      method: "slm",
      // Three FY boundaries supplied, but the asset is fully depreciated after 2.
      financialYearBoundaries: [FY_2023_24, FY_2024_25, FY_2025_26],
      asOfDate: "2026-03-31",
    });
    expect(entries).toHaveLength(2);
    expect(entries[1].closingWdv).toBe(1000);

    const summary = summarize(entries);
    expect(summary.currentBookValue).toBe(1000);
    expect(summary.accumulatedDepreciation).toBe(9000);
  });

  it("returns an empty schedule when asOfDate is before acquisition", () => {
    const entries = buildDepreciationSchedule({
      acquisitionDate: "2025-04-01",
      originalCost: 10000,
      residualValue: 500,
      usefulLifeYears: 5,
      method: "wdv",
      financialYearBoundaries: [FY_2024_25],
      asOfDate: "2024-06-01",
    });
    expect(entries).toHaveLength(0);
    expect(summarize(entries)).toEqual({ accumulatedDepreciation: 0, currentBookValue: null });
  });

  it("throws for zero useful life (divide-by-zero guard)", () => {
    expect(() =>
      buildDepreciationSchedule({
        acquisitionDate: "2024-04-01",
        originalCost: 10000,
        residualValue: 500,
        usefulLifeYears: 0,
        method: "slm",
        financialYearBoundaries: [FY_2024_25],
        asOfDate: "2025-03-31",
      })
    ).toThrow();
  });

  it("throws for zero original cost (divide-by-zero guard)", () => {
    expect(() =>
      buildDepreciationSchedule({
        acquisitionDate: "2024-04-01",
        originalCost: 0,
        residualValue: 0,
        usefulLifeYears: 5,
        method: "wdv",
        financialYearBoundaries: [FY_2024_25],
        asOfDate: "2025-03-31",
      })
    ).toThrow();
  });
});
