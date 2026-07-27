'use client';

import { useMemo, useState } from 'react';
import { cartTotal } from '@/lib/cart';
import { currentPrice, getSetup } from '@/lib/setups';
import { consultSlots, monthGrid, toDateKey } from '@/lib/slots';
import sh from './sheets.module.css';

interface BookingSheetProps {
  cart: string[];
  onRemove: (slug: string) => void;
  onClose: () => void;
  onBooked: () => void;
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SLOTS = consultSlots();

type Status = 'idle' | 'sending' | 'done' | 'error';

export default function BookingSheet({ cart, onRemove, onClose, onBooked }: BookingSheetProps) {
  const today = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const shown = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const grid = monthGrid(shown.getFullYear(), shown.getMonth());
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const items = cart.map(getSetup).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
      })
    : 'Pick a day';

  async function submit() {
    if (!selectedDate || !slot || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'consult', email, date: selectedDate, slot, setups: cart }),
      });
      const body = (await res.json()) as { ok?: boolean };
      if (body.ok) {
        setStatus('done');
        onBooked();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className={sh.overlay} onClick={onClose} role="presentation">
      <div
        className={sh.bookSheet}
        role="dialog"
        aria-modal="true"
        aria-label="Book your free consultation"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={sh.x} onClick={onClose} aria-label="Close">
          ✕
        </button>

        {status === 'done' ? (
          <div className={sh.doneBox}>
            <h3>Booked for {selectedLabel}, {slot} PST</h3>
            <p>
              Your free 15 minute consultation is requested. We confirm the time by email at{' '}
              <b>{email}</b> within a few hours.
            </p>
          </div>
        ) : (
          <>
            <div className={sh.cartCol}>
              <h3>Your setups</h3>
              {items.length === 0 ? (
                <p className={sh.cartEmpty}>
                  Nothing here yet. The consultation is still free, book it and bring questions.
                </p>
              ) : (
                items.map((item) => (
                  <div className={sh.cartItem} key={item.slug}>
                    {item.thumb ? <img src={item.thumb} alt="" /> : null}
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.minutes} min remote</p>
                    </div>
                    <div className={sh.amt}>${currentPrice(item)}</div>
                    <button
                      type="button"
                      className={sh.rm}
                      onClick={() => onRemove(item.slug)}
                      aria-label={`Remove ${item.title}`}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              {items.length > 0 ? (
                <div className={sh.total}>
                  <small>After your consult</small>${cartTotal(cart)}
                </div>
              ) : null}
              <div className={sh.freeChip}>
                <b>Free consultation · 15 min</b>
                <br />
                Meet your expert, plan the install, then pick your session time. Pay only after it
                works.
              </div>
            </div>

            <div className={sh.calCol}>
              <h3>Book your free consultation</h3>
              <div className={sh.calHead}>
                <h4>{grid.label}</h4>
                <div className={sh.arrows}>
                  <button
                    type="button"
                    onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                    disabled={monthOffset === 0}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthOffset((m) => Math.min(2, m + 1))}
                    disabled={monthOffset === 2}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div className={sh.dow}>
                {DOW.map((d, i) => (
                  <span key={`${d}${i}`}>{d}</span>
                ))}
              </div>
              <div className={sh.days} data-testid="cal-days">
                {grid.cells.map((day, i) => {
                  if (day === null) return <span key={`b${i}`} />;
                  const key = toDateKey(grid.year, grid.month, day);
                  const disabled = key < todayKey;
                  const cls = [
                    key === selectedDate ? sh.daySel : '',
                    key === todayKey ? sh.dayToday : '',
                    disabled ? sh.dayPast : sh.dayOpen,
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      type="button"
                      key={key}
                      className={cls}
                      disabled={disabled}
                      onClick={() => setSelectedDate(key)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className={sh.tz}>Pacific Time (PST) · 10:00 AM to 11:59 PM</p>
            </div>

            <div className={sh.slotCol}>
              <h4>{selectedLabel}</h4>
              <div className={sh.slots} data-testid="slots">
                {SLOTS.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={s === slot ? sh.slotSel : sh.slot}
                    onClick={() => setSlot(s)}
                    disabled={!selectedDate}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <input
                className={sh.emailField}
                type="email"
                inputMode="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email for the Meet link"
              />
              <button
                type="button"
                className={sh.bigCta}
                onClick={submit}
                disabled={!selectedDate || !slot || !email.includes('@') || status === 'sending'}
              >
                {status === 'sending' ? 'Booking…' : 'Book free consultation'}
              </button>
              <p className={sh.fine}>
                {status === 'error'
                  ? 'Hit a snag. Try again.'
                  : 'We confirm by email. No card needed.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
