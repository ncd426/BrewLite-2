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
      'Refusing to run isolated tests: .env.test must target localhost:5434/brewlite_test.',
    );
  }
}

if (!testEnv.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from apps/api/.env.test.');
}
assertIsolatedDatabase(testEnv.DATABASE_URL);

const mode = process.argv[2];
const jestArgs =
  mode === 'e2e'
    ? [
        '--config',
        resolve(apiRoot, process.argv[3] ?? '../../tests/e2e/jest-e2e.json'),
        '--runInBand',
      ]
    : mode === 'unit'
      ? ['--runInBand']
      : null;

if (!jestArgs) {
  throw new Error('Expected test mode "unit" or "e2e".');
}

const result = spawnSync(
  process.execPath,
  [
    '--experimental-vm-modules',
    resolve(apiRoot, 'node_modules/jest/bin/jest.js'),
    ...jestArgs,
    ...process.argv.slice(mode === 'e2e' ? 4 : 3),
  ],
  {
    cwd: apiRoot,
    env: { ...process.env, ...testEnv },
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
