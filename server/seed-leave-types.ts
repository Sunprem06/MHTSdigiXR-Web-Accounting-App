import { db } from "./db";
import { leaveTypes } from "@shared/schema";
import { eq } from "drizzle-orm";

// DRAFT defaults off common Karnataka Shops & Establishments Act practice —
// same standing rule as payroll's Sec 192/PF/ESI math: an HR policy / CA
// review must confirm these before a real leave cycle relies on them. Rows
// are editable afterward (via leave.manage), so this only seeds them once;
// it never overwrites a value an admin has since changed, unlike
// seedSystemRoles() which re-syncs on every boot.
const DEFAULT_LEAVE_TYPES: Array<{
  code: string;
  name: string;
  annualEntitlementDays: string | null;
  accrualFrequency: "annual" | "monthly" | "manual";
  carryForwardCap: string | null;
  isPaid: boolean;
  requiresApproval: boolean;
}> = [
  { code: "CL", name: "Casual Leave", annualEntitlementDays: "12", accrualFrequency: "annual", carryForwardCap: "0", isPaid: true, requiresApproval: true },
  { code: "SL", name: "Sick Leave", annualEntitlementDays: "12", accrualFrequency: "annual", carryForwardCap: "0", isPaid: true, requiresApproval: true },
  // Earned/Privilege Leave accrues monthly with a statutory-style 30-day carry-forward cap.
  { code: "EL", name: "Earned Leave", annualEntitlementDays: "18", accrualFrequency: "monthly", carryForwardCap: "30", isPaid: true, requiresApproval: true },
  // Maternity Benefit Act, 1961 — 26 weeks for the first two children. Tracked as an
  // entitlement ceiling, not auto-accrued; eligibility conditions are NOT enforced here.
  { code: "ML", name: "Maternity Leave", annualEntitlementDays: "182", accrualFrequency: "annual", carryForwardCap: "0", isPaid: true, requiresApproval: true },
  // No central statute; common company-policy default.
  { code: "PL", name: "Paternity Leave", annualEntitlementDays: "5", accrualFrequency: "annual", carryForwardCap: "0", isPaid: true, requiresApproval: true },
  // Earned per instance of approved extra work via a manual balance adjustment, not accrued.
  { code: "COMP_OFF", name: "Compensatory Off", annualEntitlementDays: null, accrualFrequency: "manual", carryForwardCap: "0", isPaid: true, requiresApproval: true },
  // Unpaid — always available (no entitlement ceiling) since it isn't a granted benefit.
  { code: "LOP", name: "Loss of Pay", annualEntitlementDays: null, accrualFrequency: "manual", carryForwardCap: null, isPaid: false, requiresApproval: true },
];

export async function seedLeaveTypes() {
  for (const type of DEFAULT_LEAVE_TYPES) {
    const existing = await db.select().from(leaveTypes).where(eq(leaveTypes.code, type.code));
    if (existing.length === 0) {
      await db.insert(leaveTypes).values(type);
    }
  }
}
