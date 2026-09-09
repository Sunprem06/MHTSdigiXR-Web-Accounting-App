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
  // "session" is created/owned by connect-pg-simple (server/auth.ts); "sessions"
  // (plural) is a separate pre-existing table this app's DB role doesn't even own.
  // Neither has a definition in shared/schema.ts on purpose — without this filter,
  // `db:push` treats them as orphans and tries to delete/alter them.
  tablesFilter: ["!session", "!sessions"],
});
