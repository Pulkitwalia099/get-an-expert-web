'use client';

import { useState } from 'react';
import form from '@/components/Register.module.css';
import { track as analytics } from '@/lib/analytics';
import { CONTACT_EMAIL } from '@/lib/contact';
import { isValidEmail } from '@/lib/email';
import styles from '@/app/services/service.module.css';

// One field, for a service nobody can buy yet. Asking for a name, a company and
// a message to be told when something launches is a form people abandon, and
// every answer past the address would be worthless anyway: the only thing this
// row has to do is carry an email to a send list.
//
// It posts to /api/signup as a contact, the same route and the same `leads`
// table the contact panel uses. That matters for two reasons. The privacy
// policy says `leads` is the only table holding personal data and the deletion
// path depends on it, so a second table of addresses would make that sentence
// false. And /api/signup already has the rate limiting, the validation and the
// notification email, none of which is worth writing twice.
//
// The route requires a message, so this generates one naming the service rather
// than asking the visitor to write it. The person types an address and nothing
// else, which is what was asked for.
export default function NotifyForm({ service }: { service: string }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // The route reports whether the notification email actually left. If it did
  // not, saying "you are on the list" would be a promise we have not kept, so
  // the fallback address is offered instead.
  const [delivered, setDelivered] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    if (!isValidEmail(email.trim())) {
      setError('That email does not look right.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          name: '',
          email: email.trim(),
          purpose: 'Launch notification',
          message: `Notify me when ${service} launches.`,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json().catch(() => ({}));
      setDelivered(data?.notified !== false);
      setSent(true);
      analytics('notify_signup', { service });
    } catch {
      setError('That did not send. Try again, or email us directly.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.notifyDone}>
        <b>You are on the list.</b>
        <span>
          {delivered
            ? `We will email you when ${service} opens. Nothing else.`
            : `Your address is saved, but our own alert did not send. If you hear nothing, email ${CONTACT_EMAIL}.`}
        </span>
      </div>
    );
  }

  return (
    <form className={styles.notify} onSubmit={submit} noValidate>
      <label className={styles.notifyLabel} htmlFor="notify-email">
        Email
      </label>
      <div className={styles.notifyRow}>
        <input
          id="notify-email"
          className={form.input}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        <button className={styles.btn} type="submit" disabled={sending}>
          {sending ? 'Adding' : 'Get notified'}
        </button>
      </div>
      {error ? (
        <p className={styles.notifyError}>{error}</p>
      ) : (
        <p className={styles.notifyNote}>
          One email when {service} opens. We do not add you to anything else.
        </p>
      )}
    </form>
  );
}
