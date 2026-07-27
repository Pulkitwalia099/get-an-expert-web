'use client';

import { useEffect, useState } from 'react';
import { addToCart, removeFromCart } from '@/lib/cart';
import { MAIN_SETUPS, getSetup, isSetupSlug } from '@/lib/setups';
import AskForm from './AskForm';
import BookingSheet from './BookingSheet';
import DetailSheet from './DetailSheet';
import ReelCard from './ReelCard';
import { Icon, LogoMark } from './icons';
import s from './setups.module.css';
import sh from './sheets.module.css';

const CART_KEY = 'gae-cart';

export default function SetupsApp() {
  const [cart, setCart] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const saved: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(saved)) {
        setCart(saved.filter((x): x is string => typeof x === 'string' && isSetupSlug(x)));
      }
    } catch {
      // A broken localStorage value never blocks the page.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const add = (slug: string) => setCart((prev) => addToCart(prev, slug));
  const remove = (slug: string) => setCart((prev) => removeFromCart(prev, slug));
  const bookNow = (slug: string) => {
    add(slug);
    setOpenSlug(null);
    setBooking(true);
  };

  const openSetup = openSlug ? getSetup(openSlug) : undefined;

  return (
    <div className={s.page}>
      <div className={s.bg} aria-hidden />
      <div className={s.frame}>
        <nav className={s.nav}>
          <div className={s.brand}>
            <LogoMark />
            midsesh
          </div>
          <div className={s.navRight}>
            <button
              type="button"
              className={s.cartBtn}
              onClick={() => setBooking(true)}
              aria-label={`Open cart, ${cart.length} setups`}
            >
              <Icon name="bag" className={s.cartIcon} />
              {cart.length > 0 ? <b>{cart.length}</b> : null}
            </button>
            <button type="button" className={s.navBtn} onClick={() => setAsking(true)}>
              Request a setup
            </button>
          </div>
        </nav>

        <header className={s.hero}>
          <h1>
            The AI setups all over your feed, <em>installed for you.</em>
          </h1>
        </header>

        <section className={s.grid}>
          {MAIN_SETUPS.map((setup) => (
            <ReelCard key={setup.slug} setup={setup} onGet={setOpenSlug} />
          ))}
          <article className={`${s.card} ${s.ask}`}>
            <AskForm />
          </article>
        </section>

        <footer className={s.foot}>
          <div className={s.brand}>
            <LogoMark size={21} />
            midsesh
          </div>
          <span>© 2026</span>
        </footer>
      </div>

      {openSetup ? (
        <DetailSheet
          setup={openSetup}
          inCart={cart.includes(openSetup.slug)}
          onClose={() => setOpenSlug(null)}
          onAdd={add}
          onBook={bookNow}
        />
      ) : null}
      {booking ? (
        <BookingSheet
          cart={cart}
          onRemove={remove}
          onClose={() => setBooking(false)}
          onBooked={() => setCart([])}
        />
      ) : null}
      {asking ? (
        <div
          className={`${sh.overlay} ${sh.center}`}
          onClick={() => setAsking(false)}
          role="presentation"
        >
          <div
            className={sh.askSheet}
            role="dialog"
            aria-modal="true"
            aria-label="Request a setup"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={sh.x} onClick={() => setAsking(false)} aria-label="Close">
              ✕
            </button>
            <AskForm />
          </div>
        </div>
      ) : null}
    </div>
  );
}
