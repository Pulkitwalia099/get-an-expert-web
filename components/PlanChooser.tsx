'use client';

import { useState } from 'react';
import { tierPrice, type PlanTier } from '@/lib/plans';

// The two cadences and one button.
//
// `chosen` is what the server already knows; `live` says whether a tap is
// recorded or only shown. The page ships first as a mock for feedback, so the
// button works the same either way and the difference is one fetch.
//
// Nothing here charges anything. A choice is a row and two emails, and the
// copy under the button says so, because "Choose" next to a price reads as
// "Pay" until told otherwise.

export default function PlanChooser({
  slug,
  tiers,
  chosen,
  live,
}: {
  slug: string;
  tiers: PlanTier[];
  chosen: number | null;
  live: boolean;
}) {
  const start = tiers.find((t) => t.start)?.videos ?? tiers[0]?.videos ?? 4;
  const [pick, setPick] = useState<number>(chosen ?? start);
  const [done, setDone] = useState<number | null>(chosen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose() {
    setError(null);
    if (!live) {
      setDone(pick);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/plan/choose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, videos: pick }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setDone(pick);
    } catch {
      setError('That did not save. Try once more, or reply to the email and we will set it by hand.');
    } finally {
      setBusy(false);
    }
  }

  if (done !== null) {
    return (
      <div className="plan-chosen" role="status">
        <p className="plan-chosen-h">Chosen: {done} videos a month.</p>
        <p>We will confirm by email and send the first month&rsquo;s scripts within two working days.</p>
        <button type="button" className="plan-change" onClick={() => setDone(null)}>
          Change the cadence
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
      <div className="plan-choose-foot">
        <button type="button" className="oa-btn oa-solid" onClick={choose} disabled={busy}>
          {busy ? 'Saving' : `Choose ${pick} videos a month`}
        </button>
        <span className="plan-choose-note">Nothing is charged now. You pay once the month&rsquo;s videos are delivered.</span>
      </div>
      {error && (
        <p className="oa-warn" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
