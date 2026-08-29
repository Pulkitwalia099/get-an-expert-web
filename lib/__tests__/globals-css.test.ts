import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// One missing brace, and everything after it silently moves indoors.
//
// This exists because it already happened. A `@media (prefers-reduced-motion:
// reduce)` block near the operator tiles was never closed, so every rule after
// it, the whole /account section and then the cut chooser, was nested inside
// that query. The page shipped, the CSS parsed, nothing threw, and the styles
// simply were not there for anybody who had not turned reduced motion on.
//
// A browser closes an unclosed block at EOF, which is exactly why this is worth
// a test rather than a lint rule you would notice: the file is always "valid".

const CSS = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');

/** Braces inside comments and quoted strings are text, not structure. */
function structural(css: string): string {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return noComments.replace(/"[^"\n]*"|'[^'\n]*'/g, '""');
}

describe('app/globals.css', () => {
  it('closes every block it opens', () => {
    const src = structural(CSS);
    let depth = 0;
    const open: number[] = [];
    src.split('\n').forEach((line, i) => {
      for (const ch of line) {
        if (ch === '{') {
          depth += 1;
          open.push(i + 1);
        } else if (ch === '}') {
          depth -= 1;
          open.pop();
          // A stray closer is its own bug and worth naming separately.
          expect(depth, `unbalanced closing brace on line ${i + 1}`).toBeGreaterThanOrEqual(0);
        }
      }
    });
    expect(depth, `unclosed block opened on line ${open[0]}`).toBe(0);
  });

  it('keeps the rules a page needs out of a reduced-motion query', () => {
    // The failure mode is not "no styles anywhere", it is "styles only for
    // people with reduced motion on", which nobody testing normally would see.
    // Sampling one class per section that shipped broken is enough: they are
    // the tail of the file, so anything that swallows them swallows the rest.
    const src = structural(CSS);
    for (const selector of ['.cc-head', '.cc-grid', '.acct-row', '.acct-list']) {
      const at = src.indexOf(selector);
      expect(at, `${selector} is missing from globals.css`).toBeGreaterThan(-1);
      const before = src.slice(0, at);
      const depth =
        (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
      expect(depth, `${selector} is nested inside an at-rule instead of top level`).toBe(0);
    }
  });
});
