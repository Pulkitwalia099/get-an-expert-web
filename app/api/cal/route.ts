import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PostHog } from 'posthog-node';
import { calNotes, distinctIdFromNotes, parseCalBooking, verifyCalSignature } from '@/lib/cal-webhook';
import { accountByEmail } from '@/lib/credits';
import { recordInsight } from '@/lib/insights';
import { placeOrder } from '@/lib/orders';
import { getSetup } from '@/lib/setups';
import { recordSetupBooking, type SetupBookingRow } from '@/lib/supabase';

export const runtime = 'nodejs';

// Cal retries any delivery it did not get a 2xx for, so the same booking can
// arrive twice. Deriving the event id from the booking's own uid gives both
// copies the same id, which is what lets PostHog collapse them and what makes
// a duplicate obvious in a query rather than invisible.
//
// It is not a hard guarantee, and it does not need to be: a retry was measured
// landing as a second row. The funnel counts people, not events, so one person
// still converts once. Only a raw count of booking_completed can be inflated
// by a retry, and setup_bookings, upserted on this same uid, is the honest
// source for that number.
function eventUuid(calBookingUid: string): string {
  const h = createHash('sha256').update(`booking_completed:${calBookingUid}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * The last step of the /setups funnel, and the only one the browser cannot
 * send. Cal runs in a cross-origin iframe, so the page never learns a time was
 * picked: booking_opened is the last thing it sees. This closes the funnel
 * from the server instead, against the id BookingSheet wrote into the notes.
 *
 * captureImmediate rather than capture, because the function can be frozen
 * the moment the response goes out and a queued event would never leave.
 */
async function captureBookingCompleted(
  distinctId: string,
  slug: string | null,
  calBookingUid: string,
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  });
  try {
    await client.captureImmediate({
      distinctId,
      event: 'booking_completed',
      uuid: eventUuid(calBookingUid),
      properties: {
        slug,
        category: (slug && getSetup(slug)?.category) || null,
      },
    });
  } catch (err) {
    // Same rule as the writes below: recording never breaks the webhook.
    console.error('[midsesh:posthog] booking_completed failed', err);
  } finally {
    await client.shutdown();
  }
}

/**
 * Turn a confirmed booking into an order, when we can tell whose it is.
 *
 * This is the honest commitment point in the whole flow. The browser cannot
 * see it, so an order written when the sheet opened would count everyone who
 * glanced at the calendar and left.
 *
 * Three ways this correctly does nothing: a booking with no setup in the
 * notes, which came through the bare Cal link; an address that has never
 * signed in, so there is no account to spend credit from; and a redelivery,
 * which lands on the same ref and is dropped by a unique index rather than by
 * a check that two deliveries could race past.
 *
 * Failures are logged and swallowed, like every other write in this route. Cal
 * retries anything that is not a 2xx, and a retry loop over a booking that is
 * already recorded helps nobody.
 */
async function placeOrderForBooking(booking: SetupBookingRow): Promise<void> {
  if (!booking.setupSlug || !booking.attendeeEmail) return;
  const setup = getSetup(booking.setupSlug);
  if (!setup) return;

  try {
    const account = await accountByEmail(booking.attendeeEmail);
    if (!account) return;

    const placed = await placeOrder({
      sub: account.sub,
      setup,
      ref: `cal:${booking.calBookingUid}`,
    });

    await recordInsight('order', {
      email: booking.attendeeEmail,
      slug: setup.slug,
      priceCents: placed.priceCents,
      creditCents: placed.creditCents,
      dueCents: placed.dueCents,
      stored: placed.stored,
      from: 'cal',
    });
  } catch (err) {
    console.error('[midsesh:cal] order for booking failed', err);
  }
}

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
    // A trigger this route does not care about, such as a meeting ending, or a
    // payload that does not have the shape the parser expects. Both look
    // identical from here, and the second one is a booking silently going
    // unrecorded, so the trigger is logged rather than dropped. A ping shows up
    // here too, which is how you tell the secret matched.
    //
    // 200 on purpose either way: a 4xx makes Cal retry something that will
    // never parse.
    const trigger = (body as { triggerEvent?: unknown })?.triggerEvent;
    console.log('[midsesh:cal] ignored', typeof trigger === 'string' ? trigger : 'no trigger');
    return NextResponse.json({ ok: true, ignored: true });
  }

  await recordSetupBooking(booking);
  await recordInsight('custom', {
    form: 'setup_booking',
    setup: booking.setupSlug,
    status: booking.status,
  });

  // Only a new booking is a conversion. A cancellation or a reschedule is a
  // change to one that already counted.
  //
  // No id in the notes means the booking did not come through /setups at all,
  // usually the bare Cal link. It is still recorded above; it just gets no
  // funnel event, because an anonymous one would land on a person the funnel
  // has never seen and read as a conversion out of nowhere.
  if (booking.status === 'booked') {
    const visitor = distinctIdFromNotes(calNotes(body));
    if (visitor) await captureBookingCompleted(visitor, booking.setupSlug, booking.calBookingUid);
    await placeOrderForBooking(booking);
  }

  return NextResponse.json({ ok: true });
}
