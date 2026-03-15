import { db } from "./db";
import { roles } from "@shared/schema";
import { SYSTEM_ROLE_PERMISSIONS, ROLE_LABELS } from "@shared/schema";
import { eq } from "drizzle-orm";

const SYSTEM_ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Full system control — all users, settings, data",
  admin: "Manage users (except Super Admin), all accounting operations",
  auditor: "Read-only access with audit note capability",
  senior_accountant: "Create, edit, approve vouchers; manage ledgers; all reports",
  accountant: "Create and edit vouchers; view ledgers and reports",
  data_entry: "Create draft vouchers only; view own entries",
  viewer: "Read-only dashboard and summary access",
  sales_person: "Create quotations and manage customer parties",
  sales_manager: "Approve quotations; manage parties; create invoices",
};

export async function seedSystemRoles() {
  for (const [slug, permissions] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const existing = await db.select().from(roles).where(eq(roles.slug, slug));
    if (existing.length === 0) {
      await db.insert(roles).values({
        slug,
        label: ROLE_LABELS[slug] || slug,
        description: SYSTEM_ROLE_DESCRIPTIONS[slug] || null,
        permissions,
        isSystem: true,
      });
    }
  }
}
