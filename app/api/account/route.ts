import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { cleanDisplayName, currentAccount, eraseAccount, setAccountName } from '@/lib/accounts';
import { withMetrics } from '@/lib/metrics';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';

// The two things a person can do to their own account row: rename it, or end
// it.
//
// Signing out everywhere is next door in ./sessions rather than a third verb
// here, for the same reason app/api/marketplace/[id]/draft sits beside
// app/api/marketplace/[id]: three actions with three different blast radii
// folded into one handler is how the wrong one ends up running.

/** Typed by hand, compared as a literal. Nothing else opens the delete. */
const CONFIRM = 'DELETE';

/** Clears this browser's session on the way out of a delete. */
function signedOut(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

async function handlePatch(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!rateLimit(`${clientId(req)}:account`, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // An empty field is a real answer: it clears the name and the next order
  // email opens "Hi," rather than with somebody else's idea of who they are.
  const name = cleanDisplayName(payload.name);

  const saved = await setAccountName(user.sub, name);
  if (!saved) {
    return NextResponse.json(
      { error: 'That did not save. Try again in a moment.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, name });
}

async function handleDelete(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Harder than the rest of this file. There is no legitimate reason to reach
  // this more than a few times, and every attempt is irreversible.
  if (!rateLimit(`${clientId(req)}:account-delete`, 3)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Checked before anything is read or written. A missing or misspelled value
  // is a 400 that says what to type, never a quiet success.
  if (payload.confirm !== CONFIRM) {
    return NextResponse.json(
      { error: `Type ${CONFIRM} to confirm.` },
      { status: 400 },
    );
  }

  const report = await eraseAccount(user.sub, user.email);
  if (!report.ok) {
    // Named in the log, not in the response. Somebody reading this needs to
    // know it did not finish and that trying again is safe, and a list of
    // table names on screen tells them nothing they can act on.
    console.error('[midsesh:account] erase incomplete', report.steps);
    return NextResponse.json(
      {
        error:
          'We could not remove everything just now, so nothing is confirmed deleted. Try again in a minute.',
      },
      { status: 502 },
    );
  }

  return signedOut(NextResponse.json({ ok: true }));
}

export const PATCH = withMetrics('account', handlePatch);
export const DELETE = withMetrics('account-delete', handleDelete);
