// CLI password reset — no direct SQL required.
// Usage:
//   npm run reset-admin-password -- --username=superadmin
//   npm run reset-admin-password -- --username=superadmin --password="NewStrongPass123!"
import crypto from "crypto";
import bcrypt from "bcryptjs";
import path from "path";
import { existsSync } from "fs";
import { pathToFileURL } from "url";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const raw of argv) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

// On servers where PM2 supplies settings via ecosystem.config.cjs (rather than
// a .env file loaded with --env-file), running this script directly wouldn't
// otherwise see DATABASE_URL etc. Fall back to that file's env_production
// block so the script works the same way the live app does.
async function loadEnvFallback() {
  if (process.env.DATABASE_URL) return;
  const ecosystemPath = path.resolve(process.cwd(), "ecosystem.config.cjs");
  if (!existsSync(ecosystemPath)) return;
  try {
    const mod: any = await import(pathToFileURL(ecosystemPath).href);
    const cfg = mod.default ?? mod;
    const envBlock = cfg?.apps?.[0]?.env_production || cfg?.apps?.[0]?.env;
    if (envBlock) {
      for (const [key, value] of Object.entries(envBlock)) {
        if (process.env[key] === undefined) process.env[key] = String(value);
      }
    }
  } catch {
    // Ignore — fall through to the normal "DATABASE_URL must be set" error.
  }
}

async function main() {
  await loadEnvFallback();
  const { storage } = await import("../server/storage");
  const { pool } = await import("../server/db");

  try {
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
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed to reset password:", err);
  process.exitCode = 1;
});
