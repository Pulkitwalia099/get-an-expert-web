import { redact } from '@/lib/redact';
import { NextRequest, NextResponse } from 'next/server';
import { recordEvent } from '@/lib/supabase';

// Generic over the trailing arguments so a dynamic route can be wrapped too:
// Next hands those handlers a second context argument holding the path params,
// and a signature of exactly one argument would silently drop it.
type Handler<C extends unknown[] = []> = (
  req: NextRequest,
  ...ctx: C
) => Promise<NextResponse>;

// Wraps a route handler so every request lands in api_events with its
// status and latency, and an uncaught error becomes a clean 500 instead of
// anything resembling a stack trace.
export function withMetrics<C extends unknown[]>(
  route: string,
  handler: Handler<C>,
): Handler<C> {
  return async (req, ...ctx) => {
    const started = Date.now();
    try {
      const res = await handler(req, ...ctx);
      await recordEvent(route, res.status, Date.now() - started);
      return res;
    } catch (err) {
      console.error(`[midsesh:${route}] unhandled`, redact(err));
      await recordEvent(route, 500, Date.now() - started, redact(err));
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
  };
}
