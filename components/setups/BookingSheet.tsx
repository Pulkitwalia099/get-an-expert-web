'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import BookingEmbed from '@/components/BookingEmbed';
import { CAL_LINK } from '@/lib/operators';
import { currentPrice, type Setup } from '@/lib/setups';
import { useDialog } from './useDialog';
import sh from './sheets.module.css';

interface BookingSheetProps {
  setup: Setup;
  onClose: () => void;
}

// This used to be a hand built month grid, a slot list and an email field
// posting to /api/requests, which never sent the visitor a confirmation or a
// calendar invite. Cal does all of that, and it is the same embed the chat
// call card and the classic book page already use.
export default function BookingSheet({ setup, onClose }: BookingSheetProps) {
  const ref = useDialog<HTMLDivElement>(onClose);

  // BookingEmbed keys its mount effect on this object, so a fresh identity on
  // every render would remount the calendar mid-booking.
  const prefill = useMemo(
    () => ({
      calLink: CAL_LINK,
      name: null,
      email: null,
      notes: `Setup: ${setup.title} (${setup.slug}), ${setup.minutes} min, $${currentPrice(setup)} after the session.`,
    }),
    [setup],
  );

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
          <p className={sh.bookPay}>
            <b>$0 to pay today.</b> You pay ${currentPrice(setup)} once the setup is running on your
            laptop.
          </p>
        </div>

        <div className={sh.calWrap}>
          <BookingEmbed prefill={prefill} />
        </div>
      </div>
    </div>
  );
}
