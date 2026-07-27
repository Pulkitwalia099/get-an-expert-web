'use client';

import { useState } from 'react';
import { MAIN_SETUPS, getSetup } from '@/lib/setups';
import AskForm from './AskForm';
import AskSheet from './AskSheet';
import BookingSheet from './BookingSheet';
import DetailSheet from './DetailSheet';
import Included from './Included';
import ReelCard from './ReelCard';
import { ArrowDown, LogoMark } from './icons';
import s from './setups.module.css';

// The first screen used to open straight into the grid, which on a phone put
// eleven vertical videos where the offer should be. Arriving from Instagram
// that reads as more feed, so it got scrolled like feed. The hero now states
// the offer and points down; the grid starts below it.
export default function SetupsApp() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [bookingSlug, setBookingSlug] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const openSetup = openSlug ? getSetup(openSlug) : undefined;
  const bookingSetup = bookingSlug ? getSetup(bookingSlug) : undefined;

  // Straight from a card, or from the detail sheet. Either way one setup is
  // being booked, so the detail sheet closes as the booking sheet opens.
  const book = (slug: string) => {
    setOpenSlug(null);
    setBookingSlug(slug);
  };

  return (
    <div className={s.page}>
      <div className={s.bg} aria-hidden />
      <div className={s.frame}>
        <nav className={s.nav}>
          <div className={s.brand}>
            <LogoMark />
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
          {MAIN_SETUPS.map((setup, i) => (
            <ReelCard key={setup.slug} setup={setup} onGet={setOpenSlug} eager={i < 4} />
          ))}
          <article className={`${s.card} ${s.ask}`}>
            <AskForm />
          </article>
        </section>

        <Included />

        <footer className={s.foot}>
          <div className={s.brand}>
            <LogoMark size={21} />
            midsesh
          </div>
          <span>© 2026</span>
        </footer>
      </div>

      {openSetup ? (
        <DetailSheet setup={openSetup} onClose={() => setOpenSlug(null)} onBook={book} />
      ) : null}
      {bookingSetup ? (
        <BookingSheet setup={bookingSetup} onClose={() => setBookingSlug(null)} />
      ) : null}
      {asking ? <AskSheet onClose={() => setAsking(false)} /> : null}
    </div>
  );
}
