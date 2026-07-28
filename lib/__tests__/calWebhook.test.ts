import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  distinctIdFromNotes,
  parseCalBooking,
  setupSlugFromNotes,
  verifyCalSignature,
} from '@/lib/cal-webhook';

const SECRET = 'test-secret';
const sign = (body: string) => createHmac('sha256', SECRET).update(body).digest('hex');

// The notes string is written by BookingSheet. If that format ever changes,
// these are the tests that catch the slug quietly going null.
const notesFor = (slug: string) =>
  `Setup: Some title (${slug}), 60 min, $11 after the session.`;

const booking = (overrides: Record<string, unknown> = {}) => ({
  triggerEvent: 'BOOKING_CREATED',
  payload: {
    uid: 'cal-uid-1',
    startTime: '2026-08-03T18:00:00Z',
    additionalNotes: notesFor('openclaw'),
    attendees: [{ email: 'visitor@example.com', name: 'Visitor' }],
    ...overrides,
  },
});

describe('verifyCalSignature', () => {
  it('accepts a body signed with the configured secret', () => {
    const raw = JSON.stringify(booking());
    expect(verifyCalSignature(raw, sign(raw), SECRET)).toBe(true);
  });

  it('refuses a tampered body', () => {
    const raw = JSON.stringify(booking());
    expect(verifyCalSignature(`${raw} `, sign(raw), SECRET)).toBe(false);
  });

  it('refuses when no secret is configured, rather than trusting the caller', () => {
    const raw = JSON.stringify(booking());
    expect(verifyCalSignature(raw, sign(raw), undefined)).toBe(false);
  });

  it('refuses a missing or wrong-length signature without throwing', () => {
    const raw = JSON.stringify(booking());
    expect(verifyCalSignature(raw, null, SECRET)).toBe(false);
    expect(verifyCalSignature(raw, 'abc', SECRET)).toBe(false);
  });
});

describe('setupSlugFromNotes', () => {
  it('reads the slug the booking sheet wrote', () => {
    expect(setupSlugFromNotes(notesFor('vibe-coding'))).toBe('vibe-coding');
  });

  it('refuses a slug that is not in the catalog', () => {
    expect(setupSlugFromNotes(notesFor('not-a-real-setup'))).toBeNull();
  });

  it('returns null for notes with no slug, and for junk', () => {
    expect(setupSlugFromNotes('just a note')).toBeNull();
    expect(setupSlugFromNotes(null)).toBeNull();
    expect(setupSlugFromNotes(42)).toBeNull();
  });
});

describe('distinctIdFromNotes', () => {
  const PH_ID = '019fa64e-beec-7508-b061-13f7bfa845c5';
  const stitched = `${notesFor('openclaw')} [ph:${PH_ID}]`;

  it('reads the id the booking sheet appended', () => {
    expect(distinctIdFromNotes(stitched)).toBe(PH_ID);
  });

  it('leaves the slug readable in the same string', () => {
    // The two parsers share one notes field. Neither may eat the other.
    expect(setupSlugFromNotes(stitched)).toBe('openclaw');
  });

  it('returns null when the booking came from somewhere other than the page', () => {
    expect(distinctIdFromNotes(notesFor('openclaw'))).toBeNull();
    expect(distinctIdFromNotes('booked from the Cal link directly')).toBeNull();
  });

  it('returns null on anything that is not an id shaped string', () => {
    expect(distinctIdFromNotes(`${notesFor('openclaw')} [ph:]`)).toBeNull();
    expect(distinctIdFromNotes(`${notesFor('openclaw')} [ph:visitor@example.com]`)).toBeNull();
    expect(distinctIdFromNotes(`${notesFor('openclaw')} [ph:${'x'.repeat(65)}]`)).toBeNull();
    expect(distinctIdFromNotes(null)).toBeNull();
    expect(distinctIdFromNotes(42)).toBeNull();
  });
});

describe('parseCalBooking', () => {
  it('pulls uid, setup, attendee and start time out of a created booking', () => {
    const parsed = parseCalBooking(booking());
    expect(parsed).toMatchObject({
      calBookingUid: 'cal-uid-1',
      setupSlug: 'openclaw',
      attendeeEmail: 'visitor@example.com',
      attendeeName: 'Visitor',
      startsAt: '2026-08-03T18:00:00Z',
      status: 'booked',
    });
  });

  it('maps cancellations and reschedules to their own status', () => {
    expect(parseCalBooking({ ...booking(), triggerEvent: 'BOOKING_CANCELLED' })?.status)
      .toBe('cancelled');
    expect(parseCalBooking({ ...booking(), triggerEvent: 'BOOKING_RESCHEDULED' })?.status)
      .toBe('rescheduled');
  });

  it('keeps a booking made straight from the Cal link, with no setup attached', () => {
    const parsed = parseCalBooking(booking({ additionalNotes: undefined }));
    expect(parsed?.calBookingUid).toBe('cal-uid-1');
    expect(parsed?.setupSlug).toBeNull();
  });

  it('ignores triggers this route does not handle', () => {
    expect(parseCalBooking({ ...booking(), triggerEvent: 'MEETING_ENDED' })).toBeNull();
  });

  it('returns null rather than throwing on junk', () => {
    for (const junk of [null, 'text', 42, [], {}, { triggerEvent: 'BOOKING_CREATED' }]) {
      expect(parseCalBooking(junk)).toBeNull();
    }
  });

  it('survives a booking with no attendees array', () => {
    const parsed = parseCalBooking(booking({ attendees: undefined }));
    expect(parsed?.attendeeEmail).toBeNull();
    expect(parsed?.attendeeName).toBeNull();
  });
});
