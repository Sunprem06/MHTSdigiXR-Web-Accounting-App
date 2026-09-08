#!/usr/bin/env node
/**
 * Starts a PRACTICE copy of this portal on your own PC, completely separate
 * from the real mhtsdigixr.com website. It never touches your real database
 * or your real website — it's a private sandbox for testing.
 *
 * What this does, in order:
 *   1. Starts a small practice database (using the `embedded-postgres`
 *      package — a real PostgreSQL database that lives entirely inside this
 *      folder, no separate install needed).
 *   2. Creates all the tables this app needs in that practice database.
 *   3. Starts the actual web server, exactly like the real site runs, but
 *      pointed at the practice database instead of the real one.
 *
 * A default staff login is created automatically the first time:
 *   Username: superadmin
 *   Password: admin123
 *
 * To run this: from the repo's root folder, type:
 *   npm run test:local-portal
 *
 * To stop it: press Ctrl+C in this window.
 *
 * Everything this creates lives under testing/.local-test-db, which is
 * git-ignored — deleting that folder gives you a completely fresh practice
 * database next time you run this.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '.local-test-db');
const port = 55432;
const dbName = 'mhts_local_test';

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'localtestpassword',
  port,
  persistent: true, // keep your test data between runs, so you don't lose test licenses every time
});

async function main() {
  console.log('Step 1/3: Starting the practice database (this can take 10-20 seconds the first time)...');
  try {
    await pg.initialise();
  } catch {
    // Already initialised on a previous run — that's fine, just start it.
  }
  await pg.start();
  try {
    await pg.createDatabase(dbName);
  } catch {
    // Already exists from a previous run — that's fine.
  }
  console.log('Step 1/3: Practice database is running.');

  const databaseUrl = `postgres://postgres:localtestpassword@localhost:${port}/${dbName}`;

  console.log('Step 2/3: Creating/updating tables in the practice database...');
  await runAndWait('npx', ['drizzle-kit', 'push', '--force'], { DATABASE_URL: databaseUrl });
  console.log('Step 2/3: Tables are ready.');

  console.log('Step 3/3: Starting the practice website...');
  console.log('');
  console.log('======================================================');
  console.log(' Practice portal starting at: http://localhost:5000');
  console.log(' Staff login page:            http://localhost:5000/accounting/login');
  console.log(' Username: superadmin   Password: admin123');
  console.log('======================================================');
  console.log('');
  console.log('Press Ctrl+C in this window to stop everything.');
  console.log('');

  const stop = async () => {
    console.log('\nStopping practice database...');
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  await runAndWait('npx', ['tsx', 'server/index.ts'], {
    NODE_ENV: 'development',
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: 'local-test-session-secret-not-for-real-use',
    // The real chat-assistant feature needs a real OpenAI key; this dummy value
    // only satisfies its startup check so the rest of the practice site works.
    AI_INTEGRATIONS_OPENAI_API_KEY: 'not-a-real-key-local-testing-only',
  });
}

function runAndWait(command, args, extraEnv) {
  return new Promise((resolve, reject) => {
    // On Windows, npx/node live behind a .cmd shim that needs a shell to resolve —
    // but combining shell:true with an args array is a Node-flagged foot-gun (it
    // can't safely escape array args through a shell), so build one command string
    // instead. Every argument here is a hardcoded literal, never user input.
    const useShell = process.platform === 'win32';
    const child = spawn(useShell ? [command, ...args].join(' ') : command, useShell ? undefined : args, {
      cwd: join(here, '..'),
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
      shell: useShell,
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`))));
    child.on('error', reject);
  });
}

main().catch((err) => {
  console.error('Something went wrong starting the practice portal:', err);
  process.exit(1);
});
