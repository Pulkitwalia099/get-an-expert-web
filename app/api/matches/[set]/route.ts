import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { redactExperts } from '@/lib/experts';
import { canReveal, parseSetId, readMatchSet } from '@/lib/matches';
import { withMetrics } from '@/lib/metrics';

// The other half of the gate: the read that hands back the names.
//
// /api/search never returns a name to a signed-out browser. This is where one
// comes from once there is a session, and it is a separate route rather than a
// flag on the search so that revealing is a thing that has to be asked for and
// checked, not a branch somebody can flip by editing a request body.

async function handleGet(
  req: NextRequest,
  ctx: { params: Promise<{ set: string }> },
): Promise<NextResponse> {
  const setId = parseSetId((await ctx.params).set);
  if (!setId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  const set = await readMatchSet(setId);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Signed out, or signed in as somebody else. Both answer the same way on
  // purpose: a 403 that distinguished them would confirm that a given set id
  // exists and belongs to a real account.
  if (!canReveal(set, user?.sub ?? null)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    setId: set.id,
    brief: set.brief,
    createdAt: set.createdAt,
    experts: redactExperts(set.records, false),
  });
}

export const GET = withMetrics('matches', handleGet);
