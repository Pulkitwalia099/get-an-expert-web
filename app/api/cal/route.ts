import { NextRequest, NextResponse } from 'next/server';
import { parseCalBooking, verifyCalSignature } from '@/lib/cal-webhook';
import { recordInsight } from '@/lib/insights';
import { recordSetupBooking } from '@/lib/supabase';

export const runtime = 'nodejs';

// Cal.com posts booking events here. Set the webhook up in Cal against
// https://midsesh.com/api/cal with a secret, and put the same secret in
// CAL_WEBHOOK_SECRET. Until both exist this route refuses everything, which
// is the right default for a public endpoint that writes to the database.
export async function POST(req: NextRequest) {
  // The signature covers the raw bytes, so the body has to be read as text
  // and parsed afterwards. Parsing first and re-serialising would change the
  // whitespace and never match.
  const raw = await req.text();
  const signature = req.headers.get('x-cal-signature-256');

  if (!verifyCalSignature(raw, signature, process.env.CAL_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const booking = parseCalBooking(body);
  if (!booking) {
    // A trigger this route does not care about, such as a meeting ending.
    // 200 on purpose: a 4xx makes Cal retry something that will never parse.
    return NextResponse.json({ ok: true, ignored: true });
  }

  await recordSetupBooking(booking);
  await recordInsight('custom', {
    form: 'setup_booking',
    setup: booking.setupSlug,
    status: booking.status,
  });

  return NextResponse.json({ ok: true });
}
