// One-off backfill for the new employees.employee_code column (migrations/0002_add_employee_code.sql).
// Purely additive — only ever sets employee_code where it is currently NULL, never
// touches username/email/password/role, so no existing row can be lost or duplicated.
// Safe to re-run: rows that already have a code are skipped.
//
// Usage:
//   npm run backfill-employee-codes            (dry run — prints what would change)
//   npm run backfill-employee-codes -- --apply  (actually writes the codes)
import path from "path";
import { existsSync } from "fs";
import { pathToFileURL } from "url";

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
  const apply = process.argv.includes("--apply");
  const { storage } = await import("../server/storage");
  const { pool } = await import("../server/db");

  try {
    const employees = await storage.getEmployees();
    const missing = employees.filter(e => !e.employeeCode);
    if (missing.length === 0) {
      console.log("All employees already have an employee_code. Nothing to do.");
      return;
    }

    // Oldest account gets the lowest number, matching getNextEmployeeCode()'s shape.
    missing.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const year = new Date().getFullYear();
    console.log(`${missing.length} employee(s) missing employee_code:\n`);
    for (let i = 0; i < missing.length; i++) {
      const code = `${year}${String(i + 1).padStart(3, "0")}`;
      console.log(`  ${missing[i].username.padEnd(20)} -> ${code}`);
      if (apply) {
        await storage.updateEmployee(missing[i].id, { employeeCode: code });
      }
    }

    console.log(apply ? "\nApplied." : "\nDry run only — re-run with --apply to write these codes.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exitCode = 1;
});
