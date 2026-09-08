// CLI password reset — no direct SQL required.
// Usage:
//   npm run reset-admin-password -- --username=superadmin
//   npm run reset-admin-password -- --username=superadmin --password="NewStrongPass123!"
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "../server/storage";
import { pool } from "../server/db";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const raw of argv) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const username = args.username || process.env.INITIAL_ADMIN_USERNAME || "superadmin";

  const employee = await storage.getEmployeeByUsername(username);
  if (!employee) {
    console.error(`No employee found with username "${username}".`);
    process.exitCode = 1;
    return;
  }

  let newPassword = args.password;
  if (!newPassword) {
    newPassword = crypto.randomBytes(12).toString("base64url");
  } else if (newPassword.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exitCode = 1;
    return;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await storage.updateEmployeePassword(employee.id, hashedPassword);

  console.log(`\nPassword reset for "${employee.username}" (${employee.email}).`);
  if (!args.password) {
    console.log(`New password: ${newPassword}`);
    console.log("This is shown once and not stored anywhere. Log in and change it.\n");
  } else {
    console.log("New password set as provided.\n");
  }
}

main()
  .catch((err) => {
    console.error("Failed to reset password:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
