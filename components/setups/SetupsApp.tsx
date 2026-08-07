'use client';

import { useCallback, useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { ORDERED_SETUPS, getSetup } from '@/lib/setups';
import AskForm from './AskForm';
import AskSheet from './AskSheet';
import BookingSheet, { type BookingSource } from './BookingSheet';
import DetailSheet from './DetailSheet';
import Included from './Included';
import ReelCard from './ReelCard';
import { ArrowDown } from './icons';
import SeamMark from '@/components/SeamMark';
import s from './setups.module.css';

// The first screen used to open straight into the grid, which on a phone put
// eleven vertical videos where the offer should be. Arriving from Instagram
// that reads as more feed, so it got scrolled like feed. The hero now states
// the offer and points down; the grid starts below it.
export default function SetupsApp() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  // Slug and origin travel together: booking_opened reports which path was
  // taken, and that is only known at the click, not at the sheet's mount.
  const [booking, setBooking] = useState<{ slug: string; from: BookingSource } | null>(null);
  const [asking, setAsking] = useState(false);

  const openSetup = openSlug ? getSetup(openSlug) : undefined;
  const bookingSetup = booking ? getSetup(booking.slug) : undefined;

  // The top of the funnel. It fires from the client rather than the server so
  // it carries what brought the visit, which is the cut that says whether
  // Reddit or Instagram is doing the work.
  useEffect(() => {
    track('setups_viewed', {
      referrer: document.referrer || null,
      utm_source: new URLSearchParams(window.location.search).get('utm_source'),
    });
  }, []);

  // Straight from a card, or from the detail sheet. Either way one setup is
  // being booked, so the detail sheet closes as the booking sheet opens.
  const book = (slug: string, from: BookingSource) => {
    setOpenSlug(null);
    setBooking({ slug, from });
  };

  const closeAll = useCallback(() => {
    setOpenSlug(null);
    setBooking(null);
    setAsking(false);
  }, []);

  // Back should close the sheet, not leave the page. On a phone that is the
  // gesture people reach for first, and without this it threw them back to
  // Instagram.
  //
  // One history entry for "a sheet is open", owned here rather than by each
  // sheet. Per sheet it would break on the detail to booking hand off: the
  // first would pop its entry while the second pushed one, and the pop lands a
  // tick later and closes the sheet that just opened.
  const anySheetOpen = Boolean(openSlug || booking || asking);
  useEffect(() => {
    if (!anySheetOpen) return;
    window.history.pushState({ midseshSheet: true }, '');
    const onPop = () => closeAll();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Closing by any other route leaves our entry behind, so take it off.
      // After a real back press the entry is already gone and this is skipped.
      if (window.history.state?.midseshSheet) window.history.back();
    };
  }, [anySheetOpen, closeAll]);

  return (
    <div className={s.page}>
      <div className={s.bg} aria-hidden />
      <div className={s.frame}>
        <nav className={s.nav}>
          <div className={s.brand}>
            <SeamMark size={22} />
            midsesh
          </div>
          <button type="button" className={s.navBtn} onClick={() => setAsking(true)}>
            Request a setup
          </button>
        </nav>

        <header className={s.hero}>
          <h1>
            There are AI setups all over your feed that could save you hours.{' '}
            <em>Our agents set them up on your laptop.</em>
          </h1>
          <p className={s.heroSub}>
            Pick one, book a 15 minute call, and watch an agent set it up while you sit there.
          </p>
          {/* An anchor rather than a scroll handler: it works before hydration,
              it is focusable, and a middle click still does the sane thing. */}
          <a className={s.scrollCue} href="#setups">
            Choose your setup
            <ArrowDown className={s.scrollArrow} />
          </a>
          <p className={s.heroFine}>$0 to pay today</p>
        </header>

        <section className={s.pick} id="setups">
          <h2>Choose your first setup</h2>
          <p>Tap one to watch the video and see what is included.</p>
        </section>

        <section className={s.grid}>
          {ORDERED_SETUPS.map((setup, i) => (
            <ReelCard
              key={setup.slug}
              setup={setup}
              position={i}
              onGet={setOpenSlug}
              eager={i < 4}
            />
          ))}
          <article className={`${s.card} ${s.ask}`}>
            <AskForm />
          </article>
        </section>

        <Included />

        <footer className={s.foot}>
          <div className={s.brand}>
            <SeamMark size={19} />
            midsesh
          </div>
          <span>© 2026</span>
        </footer>
      </div>

      {openSetup ? (
        <DetailSheet
          setup={openSetup}
          onClose={() => setOpenSlug(null)}
          onBook={(slug) => book(slug, 'sheet')}
        />
      ) : null}
      {bookingSetup && booking ? (
        <BookingSheet
          setup={bookingSetup}
          from={booking.from}
          onClose={() => setBooking(null)}
        />
      ) : null}
      {asking ? <AskSheet onClose={() => setAsking(false)} /> : null}
    </div>
  );
}
