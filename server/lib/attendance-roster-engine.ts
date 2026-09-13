// Attendance Roster — WFO/WFH resolution and swap-validation math.
//
// Deliberately pure — no imports from storage/db/express — so the logic can
// be reviewed and unit-tested in complete isolation from the rest of the app.

export type AttendanceDayType = "wfo" | "wfh" | "off";

/** Weekday index (0=Sunday..6=Saturday, matching JS Date#getUTCDay()) for a "YYYY-MM-DD" date. */
export function getWeekday(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d.getUTCDay();
}

/**
 * An employee's effective day-type for a given date is their normal weekly
 * roster type, UNLESS an accepted swap involving them exists for that exact
 * date — in which case they take over whatever the OTHER party's roster type
 * was, and vice versa. `ownRosterType` of null means no roster has been
 * configured for that weekday at all.
 */
export function resolveEffectiveDayType(params: {
  employeeId: number;
  ownRosterType: AttendanceDayType | null;
  acceptedSwap?: {
    requesterId: number;
    partnerId: number;
    requesterRosterType: AttendanceDayType;
    partnerRosterType: AttendanceDayType;
  } | null;
}): AttendanceDayType | null {
  const swap = params.acceptedSwap;
  if (!swap) return params.ownRosterType;
  if (params.employeeId === swap.requesterId) return swap.partnerRosterType;
  if (params.employeeId === swap.partnerId) return swap.requesterRosterType;
  return params.ownRosterType;
}

/**
 * A swap only makes sense when the two parties' normal day-types actually
 * differ on that date (otherwise there's nothing to exchange) and neither
 * side is scheduled "off" (a non-working day can't be swapped into a working
 * one this way). Returns an error message, or null if the swap is valid.
 */
export function validateSwapRequest(params: {
  requesterRosterType: AttendanceDayType | null;
  partnerRosterType: AttendanceDayType | null;
}): string | null {
  const { requesterRosterType, partnerRosterType } = params;
  if (!requesterRosterType || !partnerRosterType) {
    return "Both employees must have a roster configured for this day before it can be swapped";
  }
  if (requesterRosterType === "off" || partnerRosterType === "off") {
    return "A day that is off for either employee cannot be swapped";
  }
  if (requesterRosterType === partnerRosterType) {
    return "Both employees already have the same day type on this date — nothing to swap";
  }
  return null;
}
