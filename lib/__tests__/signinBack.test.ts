import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SIGNIN_BACK } from '@/lib/signinBack';
import { safeNext } from '@/lib/auth';

// The way out of /signin.
//
// This started as a function that derived a destination from `?next=`, and
// review killed it: every candidate destination renders a sign in prompt to a
// signed out browser, so the derived control led back to where it started. The
// tests below are therefore not about branching. They are about the one claim
// the constant makes, which is that it points somewhere a signed out person
// can actually read.

describe('the back control', () => {
  it('goes to the marketplace and says so', () => {
    expect(SIGNIN_BACK.href).toBe('/');
    expect(SIGNIN_BACK.label).toBe('Back to midsesh');
  });

  it('is deliberately not a destination the allowlist would sign somebody into', () => {
    // `safeNext('/')` is null on purpose: the apex is the marketplace, a
    // different app, and a post sign in redirect there lands on a page that
    // never reads the cookie, which is how a working Google sign in looked
    // broken for days. That is the whole distinction this constant rests on.
    // "Where may we land somebody after they sign in" and "where can somebody
    // who changed their mind get to" are different questions, and `/` is the
    // right answer to the second and the wrong answer to the first.
    expect(safeNext(SIGNIN_BACK.href)).toBeNull();
  });

  it('never points at a page that answers a signed out browser with a sign in form', () => {
    // The blocker this replaced, pinned so it cannot come back. /orders and
    // /dashboard both render doors or redirect when there is no session, so
    // either one as an href makes the exit from sign in another sign in.
    const doors = ['/orders', '/dashboard', '/signin'];
    expect(doors).not.toContain(SIGNIN_BACK.href);
  });

  it('cannot be rewritten for everybody by one stray assignment', () => {
    expect(Object.isFrozen(SIGNIN_BACK)).toBe(true);
  });

  it('reads as English, with no em dash', () => {
    expect(SIGNIN_BACK.label).not.toContain('—');
    expect(SIGNIN_BACK.label.length).toBeLessThan(30);
  });
});

describe('the page that renders it', () => {
  const source = readFileSync(join(process.cwd(), 'app/signin/page.tsx'), 'utf8');

  it('renders the control rather than only importing it', () => {
    expect(source).toContain('SIGNIN_BACK.href');
    expect(source).toContain('SIGNIN_BACK.label');
  });

  it('keeps the exit off the mark, which points at the same place', () => {
    expect(source).toContain('ord-back-exit');
  });
});
