'use client';

import { useState } from 'react';
import { labelFor, startOptions, type StartOption } from '@/lib/plan-dates';
import { tierPrice, type PlanTier } from '@/lib/plans';

// Two cadences, four start dates, one button.
//
// `chosen` is what the server already holds, so a customer coming back sees
// their answer rather than the question. The dates are computed here from
// the browser's clock and checked again on the server with a day of slack,
// so the list somebody picked from is the list that is accepted.
//
// Nothing here charges anything. A confirmation is a row and two emails, and
// the copy under the button says so, because "Confirm" next to a price reads
// as "Pay" until told otherwise.

export interface Chosen {
  cadence: number;
  startOn: string;
}

export default function PlanChooser({
  slug,
  tiers,
  chosen,
}: {
  slug: string;
  tiers: PlanTier[];
  chosen: Chosen | null;
}) {
  const start = tiers.find((t) => t.start)?.videos ?? tiers[0]?.videos ?? 4;
  const [options] = useState<StartOption[]>(() => startOptions());
  const [pick, setPick] = useState<number>(chosen?.cadence ?? start);
  const [startOn, setStartOn] = useState<string>(chosen?.startOn ?? options[0]?.iso ?? '');
  const [done, setDone] = useState<Chosen | null>(chosen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/plan/choose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, videos: pick, startOn }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setDone({ cadence: pick, startOn });
    } catch {
      setError('That did not go through. Try once more, or reply to the email and we will set it by hand.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="plan-chosen" role="status">
        <p className="plan-chosen-h">
          Confirmed: {done.cadence} videos a month, starting {labelFor(done.startOn)}.
        </p>
        <p>
          <strong>What happens next.</strong> We send you the first video type we recommend, with the script. From
          there we get going.
        </p>
        <p>Nothing is charged now. You pay once the month&rsquo;s videos are delivered.</p>
        <button type="button" className="plan-change" onClick={() => setDone(null)}>
          Change this
        </button>
      </div>
    );
  }

  return (
    <div className="plan-choose">
      <div className="plan-tiers" role="radiogroup" aria-label="Videos a month">
        {tiers.map((t) => {
          const on = t.videos === pick;
          return (
            <button
              key={t.videos}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${t.videos} videos a month, ${tierPrice(t)} a month`}
              className={on ? 'plan-tier plan-tier-on' : 'plan-tier'}
              onClick={() => setPick(t.videos)}
            >
              {t.start && <span className="plan-tier-tag">Start here</span>}
              <span className="plan-tier-n">
                {t.videos}
                <small> videos a month</small>
              </span>
              <span className="plan-tier-p">
                {tierPrice(t)}
                <small> a month</small>
              </span>
            </button>
          );
        })}
      </div>
      <label className="plan-start">
        <span className="plan-start-l">Start date</span>
        <select
          id="plan-start-on"
          className="plan-start-sel"
          value={startOn}
          onChange={(e) => setStartOn(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.iso} value={o.iso}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="plan-choose-foot">
        <button type="button" className="oa-btn oa-solid" onClick={confirm} disabled={busy || !startOn}>
          {busy ? 'Sending' : 'Confirm'}
        </button>
        <span className="plan-choose-note">
          {pick} videos a month from {startOn ? labelFor(startOn) : 'the date you pick'}. Nothing is charged now.
        </span>
      </div>
      {error && (
        <p className="oa-warn" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
