import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // The "session" table is created/owned by connect-pg-simple (server/auth.ts),
  // not by Drizzle — it has no definition in shared/schema.ts on purpose.
  // Without this, `db:push` sees it as an orphan and offers to DELETE it.
  tablesFilter: ["!session"],
});
