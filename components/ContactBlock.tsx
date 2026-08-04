'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import form from '@/components/Register.module.css';
import styles from '@/components/Sections.module.css';
import { track as analytics } from '@/lib/analytics';
import { CONTACT_EMAIL } from '@/lib/contact';
import { isValidEmail } from '@/lib/email';

// The three blocks that close the home page: a contact card, a demo ask, and
// the way in for people who want to work with us rather than hire through us.
//
// The demo does not open a calendar. Picking a slot with a company you have
// not spoken to is a commitment made before there is anything to commit to,
// and the Cal picker already exists for people who have. The demo button
// fills this same form with its purpose set, so one form serves both and
// there is one inbox to answer.
//
// Form controls come from Register.module.css. Both forms on the site want the
// same inputs, and a second copy of those rules is a second place for them to
// drift.

const PURPOSES = ['Book a demo', 'A question about a job', 'Partnership', 'Something else'];

export default function ContactBlock() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // The route reports whether the notification email actually went out. When
  // it did not, saying "we will get back to you" is a promise nothing behind
  // this form can keep, so the confirmation tells them the truth and gives
  // them an address instead. Never let a form swallow a message quietly.
  const [delivered, setDelivered] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Closed until asked for. A form sitting open on a page nobody asked to fill
  // reads as a demand, and it pushes everything below it down for the majority
  // who were never going to type in it.
  const [open, setOpen] = useState(false);

  // Both buttons open the same form. The only difference is what it already
  // knows about why they came, so a second form would exist to vary one
  // preset field.
  function openForm(reason: string, source: string) {
    setPurpose(reason);
    setOpen(true);
    analytics('contact_opened', { source });
  }

  // Scroll and focus live here rather than in the click handler. The panel is
  // mounted by the state change above, and a requestAnimationFrame queued in
  // the handler can still run before React has committed it, which sent focus
  // to whatever happened to hold it (the founder video, in testing). An effect
  // keyed on `open` cannot run before the panel exists.
  useEffect(() => {
    if (!open || sent) return;
    panelRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    messageRef.current?.focus({ preventScroll: true });
  }, [open, sent]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email.trim())) {
      setError('That email does not look right.');
      return;
    }
    if (!message.trim()) {
      setError('Tell us what you need.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', name, email, purpose, message }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const out = (await res.json().catch(() => ({}))) as { notified?: boolean };
      analytics('contact_submitted', { purpose: purpose || null, notified: out.notified !== false });
      setDelivered(out.notified !== false);
      setSent(true);
    } catch {
      setError('That did not send. Try again, or email us directly.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <section className={styles.section} aria-labelledby="demo-title">
        <header className={styles.head}>
          <h2 id="demo-title" className={styles.title}>
            Book a demo with us
          </h2>
          <p className={styles.sub}>
            Fifteen minutes. We walk through a real brief, show you how an expert is matched, and
            answer whatever you want to ask. No calendar to wrestle with: tell us roughly when
            suits and we will send a time.
          </p>
        </header>
        <div className={form.actions}>
          <button
            type="button"
            className={form.submit}
            onClick={() => openForm('Book a demo', 'demo')}
            aria-expanded={open}
            aria-controls="contact-panel"
          >
            Ask for a demo
          </button>
          <button
            type="button"
            className={form.ghost}
            onClick={() => openForm('', 'contact')}
            aria-expanded={open}
            aria-controls="contact-panel"
          >
            Or just send a message
          </button>
        </div>
      </section>

      {/* Mounted only once asked for, so the entrance below has something to
          animate and the closed state costs the page nothing. */}
      {(open || sent) && (
      <section
        className={`${styles.section} ${form.panel}`}
        aria-labelledby="contact-title"
        id="contact-panel"
        ref={panelRef}
      >
        <header className={styles.head}>
          <h2 id="contact-title" className={styles.title}>
            Talk to us
          </h2>
          <p className={styles.sub}>We answer by email, usually the same day.</p>
        </header>

        {sent ? (
          <div className={form.done} role="status">
            <h3 className={form.doneTitle}>
              {delivered ? 'Sent. We will get back to you.' : 'We could not confirm that sent.'}
            </h3>
            <p className={form.doneBody}>
              {delivered ? (
                'Check the inbox you gave us. If it is urgent, say so in a reply and we will move it up.'
              ) : (
                <>
                  Rather than leave you guessing, email us directly at{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will pick it up
                  from there.
                </>
              )}
            </p>
          </div>
        ) : (
          <form className={form.form} onSubmit={submit} noValidate>
            <label className={form.field}>
              <span className={form.label}>Your name</span>
              <input
                className={form.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>

            <label className={form.field}>
              <span className={form.label}>Email</span>
              <input
                className={form.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className={form.field}>
              <span className={form.label}>What is this about?</span>
              <select
                className={form.input}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="">Pick one</option>
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className={form.field}>
              <span className={form.label}>Your message</span>
              <textarea
                ref={messageRef}
                className={form.textarea}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </label>

            {error && (
              <p className={form.error} role="alert">
                {error}
              </p>
            )}

            <button type="submit" className={form.submit} disabled={sending}>
              {sending ? 'Sending' : 'Send'}
            </button>
          </form>
        )}
      </section>
      )}

      <section className={styles.section} aria-labelledby="join-title">
        <header className={styles.head}>
          <h2 id="join-title" className={styles.title}>
            Register yourself and your agents
          </h2>
          <p className={styles.sub}>
            If you do the work rather than buy it, this is your way in. Experts join the roster we
            match against. Agent builders list what their agents do and we put them in front of
            the briefs they fit. Nothing to pay to join.
          </p>
        </header>
        <Link
          href="/register"
          className={form.submit}
          onClick={() => analytics('register_opened', { source: 'home' })}
        >
          Register as an expert or list your agents
        </Link>
      </section>
    </>
  );
}
