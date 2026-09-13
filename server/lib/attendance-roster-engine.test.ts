import { describe, it, expect } from "vitest";
import { getWeekday, resolveEffectiveDayType, validateSwapRequest } from "./attendance-roster-engine";

describe("getWeekday", () => {
  it("returns 0 for a Sunday", () => {
    expect(getWeekday("2026-09-13")).toBe(0);
  });

  it("returns 6 for a Saturday", () => {
    expect(getWeekday("2026-09-19")).toBe(6);
  });

  it("returns 2 for a Tuesday", () => {
    expect(getWeekday("2026-09-15")).toBe(2);
  });
});

describe("resolveEffectiveDayType", () => {
  it("returns the own roster type when there is no accepted swap", () => {
    expect(resolveEffectiveDayType({ employeeId: 1, ownRosterType: "wfo", acceptedSwap: null })).toBe("wfo");
  });

  it("gives the requester the partner's original type", () => {
    const result = resolveEffectiveDayType({
      employeeId: 1, ownRosterType: "wfo",
      acceptedSwap: { requesterId: 1, partnerId: 2, requesterRosterType: "wfo", partnerRosterType: "wfh" },
    });
    expect(result).toBe("wfh");
  });

  it("gives the partner the requester's original type", () => {
    const result = resolveEffectiveDayType({
      employeeId: 2, ownRosterType: "wfh",
      acceptedSwap: { requesterId: 1, partnerId: 2, requesterRosterType: "wfo", partnerRosterType: "wfh" },
    });
    expect(result).toBe("wfo");
  });

  it("leaves an unrelated third employee's type untouched", () => {
    const result = resolveEffectiveDayType({
      employeeId: 3, ownRosterType: "wfo",
      acceptedSwap: { requesterId: 1, partnerId: 2, requesterRosterType: "wfo", partnerRosterType: "wfh" },
    });
    expect(result).toBe("wfo");
  });

  it("returns null when no roster is configured and there is no swap", () => {
    expect(resolveEffectiveDayType({ employeeId: 1, ownRosterType: null })).toBeNull();
  });
});

describe("validateSwapRequest", () => {
  it("allows a swap between a WFO day and a WFH day", () => {
    expect(validateSwapRequest({ requesterRosterType: "wfo", partnerRosterType: "wfh" })).toBeNull();
  });

  it("rejects a swap when both sides already have the same type", () => {
    expect(validateSwapRequest({ requesterRosterType: "wfo", partnerRosterType: "wfo" })).toMatch(/nothing to swap/);
  });

  it("rejects a swap when either side is off", () => {
    expect(validateSwapRequest({ requesterRosterType: "off", partnerRosterType: "wfh" })).toMatch(/off/);
    expect(validateSwapRequest({ requesterRosterType: "wfo", partnerRosterType: "off" })).toMatch(/off/);
  });

  it("rejects a swap when either side has no roster configured", () => {
    expect(validateSwapRequest({ requesterRosterType: null, partnerRosterType: "wfh" })).toMatch(/must have a roster/);
  });
});
