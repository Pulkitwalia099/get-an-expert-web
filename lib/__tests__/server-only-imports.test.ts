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
const APP = join(process.cwd(), 'app');

// Modules that throw when they reach a browser. Kept as the bare specifier so
// both '@/lib/x' and relative forms are caught by the regex below.
const SERVER_ONLY = [
  'auth',
  'credits',
  'matches',
  'quotes',
  'supabase',
  'operatorOrders',
  'operatorQuotes',
  'orderDrafts',
  'watermark',
  'accounts',
  // Server-only by inheritance rather than by its own guard: it imports
  // safeNext from lib/auth, which throws on sight of a browser.
  'signinBack',
];

/** Every `use client` file under a directory, however deep. */
function clientFilesIn(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...clientFilesIn(path));
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/^\s*['"]use client['"]/m.test(readFileSync(path, 'utf8'))) found.push(path);
  }
  return found;
}

// The pages under app/ are checked too, not just components/. The operator
// dashboard is a client component that lives there and sits one import away
// from lib/watermark and lib/operatorOrders, which both spawn or query things
// a browser has no business reaching. Checking only components/ would have
// watched the wrong directory for exactly the file most at risk.
function clientComponents(): string[] {
  // Relative to the repo root, so a failure names components/Chat.tsx rather
  // than somebody's home directory.
  return [...clientFilesIn(COMPONENTS), ...clientFilesIn(APP)].map((p) =>
    p.slice(process.cwd().length + 1),
  );
}

describe('client components', () => {
  it('finds the client components to check', () => {
    expect(clientComponents().length).toBeGreaterThan(5);
  });

  it('checks the operator dashboard, which is the one most able to break this', () => {
    expect(clientComponents()).toContain('app/operator/orders/page.tsx');
  });

  it.each(clientComponents())('%s imports no server-only module', (file) => {
    const src = readFileSync(join(process.cwd(), file), 'utf8');
    // Import lines only, so a mention inside a comment does not fail the test.
    const imports = src.match(/^\s*import[^;]*from\s*['"][^'"]+['"]/gm) ?? [];
    const offenders = imports.filter((line) =>
      SERVER_ONLY.some((m) => new RegExp(`from\\s*['"](@/lib|\\.\\./lib|\\./\\.\\./lib)/${m}['"]`).test(line)),
    );
    expect(offenders).toEqual([]);
  });
});
