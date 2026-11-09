import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(apiRoot, '.env.test');
const testEnv = parseEnv(readFileSync(envPath, 'utf8'));

function assertIsolatedDatabase(databaseUrl) {
  const url = new URL(databaseUrl);
  if (
    url.protocol !== 'postgresql:' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '5434' ||
    url.pathname !== '/brewlite_test'
  ) {
    throw new Error(
      'Refusing to reset database: .env.test must target localhost:5434/brewlite_test.',
    );
  }
}

if (!testEnv.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from apps/api/.env.test.');
}
assertIsolatedDatabase(testEnv.DATABASE_URL);
if (!testEnv.SEED_DEMO_PASSWORD || testEnv.SEED_DEMO_PASSWORD.length < 12) {
  throw new Error(
    'SEED_DEMO_PASSWORD in .env.test must be at least 12 characters.',
  );
}

const env = { ...process.env, ...testEnv };

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: apiRoot,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(
  'Resetting isolated PostgreSQL test database: localhost:5434/brewlite_test',
);
run([
  resolve(apiRoot, 'node_modules/prisma/build/index.js'),
  'migrate',
  'reset',
  '--force',
  '--skip-seed',
]);
run([resolve(apiRoot, 'prisma/seed.mjs'), '--initialize-inventory']);
