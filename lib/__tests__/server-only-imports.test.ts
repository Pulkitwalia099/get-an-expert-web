import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Client components must not import a server-only module.
//
// These modules throw on sight of a browser on purpose, so the failure is not
// a subtle one: the component throws while hydrating and the whole page dies.
// It shipped once. components/RequestList.tsx pulled STATUS_LABELS out of
// lib/quotes, which is server-only, and signing in landed everybody on a
// dashboard that would not load. Nothing caught it, because the server render
// is fine and every server-side check passes; only a real browser breaks.
//
// The fix is always the same split lib/credit-math.ts already demonstrates:
// move the shared value into a module that carries no secrets and touches
// nothing, and let the server-only file re-export it.

const COMPONENTS = join(process.cwd(), 'components');

// Modules that throw when they reach a browser. Kept as the bare specifier so
// both '@/lib/x' and relative forms are caught by the regex below.
const SERVER_ONLY = ['auth', 'credits', 'matches', 'quotes', 'supabase'];

function clientComponents(): string[] {
  return readdirSync(COMPONENTS)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .filter((f) => {
      const src = readFileSync(join(COMPONENTS, f), 'utf8');
      return /^\s*['"]use client['"]/m.test(src);
    });
}

describe('client components', () => {
  it('finds the client components to check', () => {
    expect(clientComponents().length).toBeGreaterThan(5);
  });

  it.each(clientComponents())('%s imports no server-only module', (file) => {
    const src = readFileSync(join(COMPONENTS, file), 'utf8');
    // Import lines only, so a mention inside a comment does not fail the test.
    const imports = src.match(/^\s*import[^;]*from\s*['"][^'"]+['"]/gm) ?? [];
    const offenders = imports.filter((line) =>
      SERVER_ONLY.some((m) => new RegExp(`from\\s*['"](@/lib|\\.\\./lib|\\./\\.\\./lib)/${m}['"]`).test(line)),
    );
    expect(offenders).toEqual([]);
  });
});
