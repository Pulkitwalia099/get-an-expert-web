import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// `npm run eval` should work with the same .env.local the dev server uses,
// without extra tooling. Values never get logged.
try {
  for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch {
  // No .env.local is fine; the suite skips itself without a key.
}

export default defineConfig({
  resolve: {
    alias: { '@': root },
  },
  test: {
    include: ['evals/**/*.eval.ts'],
    maxConcurrency: 2,
    testTimeout: 300_000,
    // One retry absorbs run-to-run LLM variance; persistent failures stay red.
    retry: 1,
  },
});
