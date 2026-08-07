import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { withMetrics } from '@/lib/metrics';

// Signing out matters on a shared or borrowed laptop. POST rather than GET, so
// no image tag or prefetch can sign somebody out by accident.

async function handlePost(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

export const POST = withMetrics('auth-signout', handlePost);
