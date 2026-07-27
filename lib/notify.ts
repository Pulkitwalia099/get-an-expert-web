import type { ConsultRequest } from '@/lib/setups-validate';
import { cartTotal } from '@/lib/cart';
import { getSetup } from '@/lib/setups';

// Emails Rohit when someone books a consultation. Uses Resend's REST API
// when RESEND_API_KEY and BOOKING_NOTIFY_EMAIL are set; otherwise it stays
// quiet and the insights webhook (INSIGHTS_WEBHOOK_URL) remains the signal.
// A notification failure must never fail the booking.
export async function notifyBooking(booking: ConsultRequest): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.BOOKING_NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  const items = booking.setups
    .map((slug) => {
      const setup = getSetup(slug);
      return setup ? `- ${setup.title}` : `- ${slug}`;
    })
    .join('\n');
  const text = [
    `Free consultation requested for ${booking.date} at ${booking.slot} PST.`,
    '',
    `Visitor: ${booking.email}`,
    booking.setups.length > 0 ? `Setups ($${cartTotal(booking.setups)} after consult):` : 'Cart was empty.',
    items,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.BOOKING_FROM_EMAIL || 'midsesh <bookings@laoh.ai>',
        to: [to],
        subject: `New booking: ${booking.date} ${booking.slot} PST (${booking.setups.length} setups)`,
        text,
      }),
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) console.error('[setups:notify] resend failed', res.status);
  } catch (err) {
    console.error('[setups:notify] resend failed', err);
  }
}
