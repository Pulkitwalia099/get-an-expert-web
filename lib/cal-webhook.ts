import { createHmac, timingSafeEqual } from 'node:crypto';
import { isSetupSlug } from '@/lib/setups';
import type { SetupBookingRow } from '@/lib/supabase';

// Cal.com posts here when a booking is made, cancelled or moved. Everything
// is parsed defensively: this is a public endpoint taking a body from a third
// party, so nothing is trusted to have the shape the docs describe.

const TRIGGER_STATUS: Record<string, SetupBookingRow['status']> = {
  BOOKING_CREATED: 'booked',
  BOOKING_CANCELLED: 'cancelled',
  BOOKING_RESCHEDULED: 'rescheduled',
  BOOKING_REQUESTED: 'booked',
};

/**
 * Cal signs the raw body with the secret from the webhook's own settings.
 * Without a secret configured we cannot tell a real delivery from anyone who
 * found the URL, so an unsigned request is refused rather than trusted.
 */
export function verifyCalSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const given = signature.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Whatever the booker had typed into the notes field, whichever of the two
 * names Cal chose to send it under. Defined once because two parsers read it.
 */
export function calNotes(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) return null;
  const payload = (body as Record<string, unknown>).payload;
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  return p.additionalNotes ?? p.description;
}

/**
 * The setup slug travels in the booking notes, which is what BookingSheet
 * writes: "Setup: <title> (<slug>), 60 min, $11 after the session." Reading it
 * back out is deliberately narrow, and the slug is checked against the catalog
 * so a booking cannot invent one.
 */
export function setupSlugFromNotes(notes: unknown): string | null {
  const text = str(notes);
  if (!text) return null;
  const match = /\(([a-z0-9-]{2,64})\)/i.exec(text);
  if (!match) return null;
  const slug = match[1].toLowerCase();
  return isSetupSlug(slug) ? slug : null;
}

/**
 * The visitor's PostHog id, which BookingSheet appends to the same notes as
 * "[ph:<id>]". Cal runs in a cross-origin iframe, so this is the only thread
 * back to the person who walked the funnel.
 *
 * Narrow on purpose, like the slug above. Anything that is not a plain id
 * shaped token comes back null, and null means "no stitch": the booking is
 * recorded, and no funnel event is filed against a guess.
 */
export function distinctIdFromNotes(notes: unknown): string | null {
  const text = str(notes);
  if (!text) return null;
  const match = /\[ph:([A-Za-z0-9_-]{8,64})\]/.exec(text);
  return match ? match[1] : null;
}

export function parseCalBooking(body: unknown): SetupBookingRow | null {
  if (typeof body !== 'object' || body === null) return null;
  const root = body as Record<string, unknown>;

  const trigger = str(root.triggerEvent);
  const status = trigger ? TRIGGER_STATUS[trigger] : undefined;
  if (!status) return null;

  const payload = root.payload;
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;

  const uid = str(p.uid) ?? str(p.bookingId);
  if (!uid) return null;

  // Cal sends attendees as an array; the first is the person who booked.
  const attendees = Array.isArray(p.attendees) ? p.attendees : [];
  const first =
    typeof attendees[0] === 'object' && attendees[0] !== null
      ? (attendees[0] as Record<string, unknown>)
      : {};

  return {
    calBookingUid: uid,
    setupSlug: setupSlugFromNotes(calNotes(body)),
    attendeeEmail: str(first.email),
    attendeeName: str(first.name),
    startsAt: str(p.startTime),
    status,
    payload: body,
  };
}
