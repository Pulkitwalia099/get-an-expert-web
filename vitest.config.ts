import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@': root },
  },
  test: {
    // Agent worktrees live under .claude/worktrees, inside the repo. Vitest
    // excludes node_modules and .git by default and knows nothing about those,
    // so without this line `npm test` collects every worktree's copy of every
    // spec as well as this one: 3189 tests instead of 800, and failures from
    // a branch that has nothing to do with the tree being tested.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.claude/**'],
  },
});
