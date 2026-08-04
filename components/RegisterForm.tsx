'use client';

import { useState } from 'react';
import styles from '@/components/Register.module.css';
import { track as analytics } from '@/lib/analytics';
import { CONTACT_EMAIL } from '@/lib/contact';
import { isValidEmail } from '@/lib/email';

// One page, two paths. The first question is which one they are, because the
// answer changes every field after it and asking it as a field inside the form
// would mean showing everyone both sets and letting them work out which half to
// ignore.
type Track = 'expert' | 'agents';

const COPY: Record<Track, { label: string; blurb: string; ask: string; hint: string }> = {
  expert: {
    label: 'Register as an expert',
    blurb: 'You do the work yourself.',
    ask: 'What do you do?',
    hint: 'The work you want sent to you, the tools you use, and the kind of job you are best at.',
  },
  agents: {
    label: 'Register your agents',
    blurb: 'You have agents that do the work.',
    ask: 'What do your agents do?',
    hint: 'What each one is for, what it runs on, and what it needs access to.',
  },
};

// Three steps, told in enough detail that nobody has to guess what happens
// next. Vague next steps are why people fill a form and then email you anyway
// to ask whether it went through.
const NEXT_STEPS = [
  {
    when: 'Within two working days',
    what: 'We read it and reply',
    detail:
      'A person reads what you sent and answers by email, either with questions or with a time to talk. You get a reply whether or not it is a fit, because waiting to hear nothing is the worst version of this.',
  },
  {
    when: 'The call',
    what: 'Thirty minutes, and we see the work',
    detail:
      'We meet on video, go through what you have done before, and look at real samples. For agents we want to see one running. This is the same vetting every expert on the roster has been through, not a sales call.',
  },
  {
    when: 'Before your first job',
    what: 'NDA, then you are live',
    detail:
      'You sign an NDA covering anything a client shares with you. Then we match you against briefs as they come in and introduce you by name. You agree the price on each job before you start it.',
  },
];

export default function RegisterForm() {
  const [choice, setChoice] = useState<Track | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [work, setWork] = useState('');
  const [price, setPrice] = useState('');
  const [availability, setAvailability] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // See ContactBlock: the route says whether the notification actually left.
  // Promising a reply we have no way to send is worse than admitting it.
  const [delivered, setDelivered] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const track = choice ?? 'expert';
  const copy = COPY[track];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email.trim())) {
      setError('That email does not look right.');
      return;
    }
    if (!work.trim()) {
      setError(`Tell us ${track === 'agents' ? 'what your agents do' : 'what you do'}.`);
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'register',
          track,
          name,
          email,
          // The same box means different things on the two paths, so it is
          // sent under the name that matches what was asked.
          skills: track === 'expert' ? work : '',
          agents: track === 'agents' ? work : '',
          price,
          availability,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const out = (await res.json().catch(() => ({}))) as { notified?: boolean };
      analytics('register_submitted', { track, notified: out.notified !== false });
      setDelivered(out.notified !== false);
      setSent(true);
    } catch {
      setError('That did not send. Try again, or email us directly.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.done} role="status">
        <h2 className={styles.doneTitle}>
          {delivered ? 'Got it. We will get back to you.' : 'We could not confirm that sent.'}
        </h2>
        <p className={styles.doneBody}>
          {delivered ? (
            'A person reads every one of these. Expect a reply by email within two working days.'
          ) : (
            <>
              Send it to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> instead so it does
              not get lost, and we will pick it up from there.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <fieldset className={styles.tracks}>
        <legend className={styles.legend}>Which are you?</legend>
        {(Object.keys(COPY) as Track[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.track} ${choice === key ? styles.trackOn : ''}`}
            aria-pressed={choice === key}
            onClick={() => setChoice(key)}
          >
            <span className={styles.trackLabel}>{COPY[key].label}</span>
            <span className={styles.trackBlurb}>{COPY[key].blurb}</span>
          </button>
        ))}
      </fieldset>

      {choice && (
        <form className={styles.form} onSubmit={submit} noValidate>
          <label className={styles.field}>
            <span className={styles.label}>Your name</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.ask}</span>
            <span className={styles.hint}>{copy.hint}</span>
            <textarea
              className={styles.textarea}
              rows={5}
              value={work}
              onChange={(e) => setWork(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>What you want to charge</span>
            <span className={styles.hint}>Per hour, per job, per month, whatever you work in.</span>
            <input
              className={styles.input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Good times to meet</span>
            <span className={styles.hint}>Days, rough hours, and your timezone.</span>
            <input
              className={styles.input}
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={sending}>
            {sending ? 'Sending' : 'Send it'}
          </button>
          <p className={styles.note}>
            No calendar to pick from. We read this and come back to you by email.
          </p>
        </form>
      )}

      <section className={styles.steps} aria-labelledby="steps-title">
        <h2 id="steps-title" className={styles.stepsTitle}>
          What happens next
        </h2>
        <ol className={styles.stepList}>
          {NEXT_STEPS.map((s, i) => (
            <li key={s.what} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span className={styles.stepBody}>
                <span className={styles.stepWhen}>{s.when}</span>
                <span className={styles.stepWhat}>{s.what}</span>
                <span className={styles.stepDetail}>{s.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.terms} aria-labelledby="terms-title">
        <h2 id="terms-title" className={styles.termsTitle}>
          What it costs you
        </h2>
        <p className={styles.termsBody}>
          We take <strong>20%</strong> of what a client pays on work we bring you. Nothing else.
          No listing fee, no subscription, and nothing to pay to join. If we send you no work, we
          take nothing.
        </p>
        <p className={styles.termsBody}>
          You agree the price on every job before you start it, and you can turn down anything we
          send you.
        </p>
      </section>
    </>
  );
}
