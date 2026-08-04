'use client';

import Image from 'next/image';
import { useEffect, useMemo } from 'react';
import BookingEmbed from '@/components/BookingEmbed';
import { distinctId, track } from '@/lib/analytics';
import { CAL_LINK } from '@/lib/operators';
import { currentPrice, type Setup } from '@/lib/setups';
import { SIGNUP_CREDIT_CENTS, splitPrice } from '@/lib/credit-math';
import { useMe } from '@/components/useMe';
import { useDialog } from './useDialog';
import sh from './sheets.module.css';

/** Which route reached the calendar. Only the detail sheet can today, but the
    card may get its own Book a time, and by then the funnel needs to have been
    telling the two apart all along. */
export type BookingSource = 'card' | 'sheet';

interface BookingSheetProps {
  setup: Setup;
  from: BookingSource;
  onClose: () => void;
}

// This used to be a hand built month grid, a slot list and an email field
// posting to /api/requests, which never sent the visitor a confirmation or a
// calendar invite. Cal does all of that, and it is the same embed the chat
// call card and the classic book page already use.
export default function BookingSheet({ setup, from, onClose }: BookingSheetProps) {
  const ref = useDialog<HTMLDivElement>(onClose);
  // Null until /api/me answers, so the line settles with the answer rather
  // than promising free and then taking it back.
  const me = useMe();
  const firstFree =
    Boolean(me?.available && !me.signedIn) &&
    splitPrice(currentPrice(setup) * 100, SIGNUP_CREDIT_CENTS).dueCents === 0;

  // The last thing the page can see. Cal runs in a cross-origin iframe, so
  // from here on the browser learns nothing: whether a time was picked comes
  // back through the webhook, not from this component.
  useEffect(() => {
    track('booking_opened', {
      slug: setup.slug,
      category: setup.category,
      price: currentPrice(setup),
      from,
    });
  }, [setup, from]);

  // BookingEmbed keys its mount effect on this object, so a fresh identity on
  // every render would remount the calendar mid-booking.
  const prefill = useMemo(() => {
    const notes = `Setup: ${setup.title} (${setup.slug}), ${setup.minutes} min, $${currentPrice(setup)} after the session.`;
    // The visitor's PostHog id rides out with the booking so the webhook can
    // file booking_completed against the person who got this far, rather than
    // against a stranger the funnel has never seen. Appended, and with no
    // brackets of the round kind, because the slug is read back out of the
    // first (parenthesised) group in this same string.
    const id = distinctId();
    return {
      calLink: CAL_LINK,
      name: null,
      email: null,
      notes: id ? `${notes} [ph:${id}]` : notes,
    };
  }, [setup]);

  return (
    <div className={sh.overlay} onClick={onClose} role="presentation">
      <div
        ref={ref}
        tabIndex={-1}
        className={sh.bookSheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Book a time for ${setup.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={sh.x} onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className={sh.bookHead}>
          <h3>Book a time for our agents to set it up</h3>
          <div className={sh.bookPicked}>
            <Image src={setup.thumb} alt="" width={42} height={54} />
            <div>
              <h4>{setup.title}</h4>
              <p>{setup.minutes} min on a call, on your laptop</p>
            </div>
          </div>
          {/* The decision happens here, so the offer is repeated here. A
              visitor who has opened the calendar has already chosen; telling
              them at this point that it is free is worth more than any number
              of nudges further up the page.

              Only for somebody without an account. Signed in, the honest line
              depends on a balance this component cannot see, and a confident
              "free" over a spent balance would be a lie at the worst possible
              moment. They get the plain price instead. */}
          {firstFree ? (
            <p className={sh.bookPay}>
              <b>Free on your first setup.</b> Sign in when you book and your welcome credit
              covers all ${currentPrice(setup)} of it. Nothing to pay today either way.
            </p>
          ) : (
            <p className={sh.bookPay}>
              <b>$0 to pay today.</b> You pay ${currentPrice(setup)} once the setup is running on
              your laptop.
            </p>
          )}
        </div>

        <div className={sh.calWrap}>
          <BookingEmbed prefill={prefill} />
        </div>
      </div>
    </div>
  );
}
