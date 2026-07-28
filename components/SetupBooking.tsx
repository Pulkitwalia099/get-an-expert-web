'use client';

import { useEffect, useMemo } from 'react';
import BookingEmbed from '@/components/BookingEmbed';
import type { CalPrefill } from '@/lib/calLink';
import { distinctId, track } from '@/lib/analytics';
import { CAL_LINK } from '@/lib/operators';
import { currentPrice, type Setup } from '@/lib/setups';
import st from './SetupDetail.module.css';

// Step two of the same flow: the Cal embed for one setup, in the same window
// chrome as the detail screen it came from. Overlay owns the layer and the
// scrim; this renders only the window.
//
// Back and close are two different promises, so they are two different
// controls. Back returns to the detail screen with the overlay still open.
// Close ends the whole thing.

export interface SetupBookingProps {
  setup: Setup;
  onBack: () => void;
  onClose: () => void;
}

export default function SetupBooking({ setup, onBack, onClose }: SetupBookingProps) {
  // The last thing this page can see. Cal runs in a cross-origin iframe, so
  // whether a time was actually picked comes back through the webhook.
  useEffect(() => {
    track('setup_booking_opened', { slug: setup.slug, price: currentPrice(setup) });
  }, [setup]);

  // BookingEmbed keys its mount effect on this object, so a fresh identity on
  // every render would remount the calendar mid-booking.
  //
  // The note format is load-bearing and matches what BookingSheet writes.
  // lib/cal-webhook.ts reads the slug back out of the first parenthesised group
  // and the PostHog id out of the [ph:...] token, which is the only thread from
  // a booking back to the person who walked the funnel.
  const prefill = useMemo<CalPrefill>(() => {
    const notes = `Setup: ${setup.title} (${setup.slug}), ${setup.minutes} min, $${currentPrice(setup)} after the session.`;
    const id = distinctId();
    return {
      calLink: CAL_LINK,
      name: null,
      email: null,
      notes: id ? `${notes} [ph:${id}]` : notes,
    };
  }, [setup]);

  return (
    <section className="window window-overlay" data-cat={setup.category} aria-label="Pick a time">
      <div className="titlebar">
        <button type="button" className={st.back} onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
            <path
              d="M9.2 3.2 L4.9 7.5 L9.2 11.8"
              stroke="currentColor"
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
        <div className="wordmark">
          <span className="worb">✳︎</span>midsesh
        </div>
        <button type="button" className={st.close} aria-label="Close" onClick={onClose}>
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
            <path
              d="M3.4 3.4 L11.6 11.6 M11.6 3.4 L3.4 11.6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className={st.bookHead}>
        <h2 className={st.bookTitle}>{setup.title}</h2>
        <p className={st.bookMeta}>{setup.minutes} min on your laptop</p>
        <p className={st.bookPay}>
          <b>Nothing is charged today.</b> You pay ${currentPrice(setup)} once it is running on
          your laptop.
        </p>
      </div>

      <div className={st.calWrap}>
        <BookingEmbed prefill={prefill} />
      </div>
    </section>
  );
}
