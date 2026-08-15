import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, authConfigured } from '@/lib/auth';
import { currentAccount } from '@/lib/accounts';
import { balanceFor, formatCents } from '@/lib/credits';
import { withMetrics } from '@/lib/metrics';

// Who the browser is, and what they have left. The one endpoint the account
// menu in the site bar reads.
//
// Signed out is a 200 with signedIn false, not a 401. Being signed out is the
// normal state of this page, not an error, and a 401 in the console on every
// first visit trains everyone to ignore the console.

async function handleGet(req: NextRequest): Promise<NextResponse> {
  const user = await currentAccount(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ signedIn: false, available: authConfigured() });
  }

  const balance = await balanceFor(user.sub);
  return NextResponse.json({
    signedIn: true,
    available: true,
    email: user.email,
    name: user.name,
    picture: user.picture,
    // known false means Supabase could not answer. The UI says so rather than
    // showing a confident $0, which would read as "your credit is gone".
    creditKnown: balance.known,
    creditCents: balance.cents,
    credit: formatCents(balance.cents),
  });
}

export const GET = withMetrics('me', handleGet);
