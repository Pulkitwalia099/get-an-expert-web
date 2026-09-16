import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Mark from '@/components/Mark';
import PlanArc from '@/components/PlanArc';
import PlanCarousel from '@/components/PlanCarousel';
import PlanChooser from '@/components/PlanChooser';
import { inter } from '@/app/fonts';
import { currentAccount } from '@/lib/accounts';
import { SESSION_COOKIE } from '@/lib/auth';
import { CONTACT_EMAIL } from '@/lib/contact';
import { OPERATOR_COOKIE, operatorCookieValid } from '@/lib/operatorAuth';
import { ownsPlan, planBySlug } from '@/lib/plans';

// A monthly plan, in the account of the one person it is for.
//
// Guarded twice and 404s a stranger. The session email has to match the
// plan's email, the same match /account uses to find orders, so the address an
// order was placed from is the address that sees its plan. An operator cookie
// opens any plan, because the only way to see what a customer will see used to
// be to sign in as them, and that is not a thing anyone should have to do.
//
// Wears `ord acct`, like /account, /orders and /dashboard. That class pair is
// what repoints the tokens at the marketplace's paper ground and violet accent,
// so this page and the homepage read as one product without a line of colour
// written here.

export const metadata: Metadata = {
  title: 'Your plan · midsesh',
  description: 'The monthly content plan for your brand, and the cadence you pick.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = planBySlug(slug);
  if (!plan) notFound();

  const store = await cookies();
  // A preview deploy shows the page to anyone who has the URL, so a draft can
  // be passed around for review without an operator secret changing hands.
  // Pulkit asked for this on 15 Sep: preview hostnames are unguessable and
  // the plan holds nothing a customer email does not already carry.
  // Production never takes this branch.
  const preview = process.env.VERCEL_ENV === 'preview';
  const operator = preview || operatorCookieValid(store.get(OPERATOR_COOKIE)?.value);
  const user = operator ? null : await currentAccount(store.get(SESSION_COOKIE)?.value);
  if (!operator) {
    if (!user) redirect(`/signin?next=/account/plan/${plan.slug}`);
    if (!ownsPlan(plan, user.email)) notFound();
  }
  const who = user?.email ?? (preview ? 'Preview' : 'Operator view');

  return (
    <main className={`ord acct plan ${inter.className}`}>
      <div className="paper" aria-hidden="true" />
      <header className="ord-bar">
        <Mark />
        <Link href="/account" className="ord-back">
          Your account
        </Link>
        <span className="ord-who">{who}</span>
      </header>

      <p className="ord-eyebrow">
        {plan.brand} · monthly plan
      </p>
      <h1>{plan.title}</h1>
      <p className="ord-lede">{plan.lede}</p>

      <section className="plan-sec">
        <p className="ord-eyebrow">The package</p>
        <h2 className="plan-h">Pick a cadence</h2>
        <p className="plan-sub">Start on 4. At the end of month 1 we set the cadence for the months after. Change it any month.</p>
        <PlanChooser slug={plan.slug} tiers={plan.tiers} chosen={null} live={false} />
      </section>

      <section className="plan-sec">
        <p className="ord-eyebrow">The ramp</p>
        <h2 className="plan-h">Months 1 and 2 are for finding out. Month 3 is when it works.</h2>
        <PlanArc />
        <ul className="plan-months">
          {plan.months.map((m) => (
            <li key={m.label}>
              <span className="plan-month-l">{m.label}</span>
              <span>{m.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="plan-sec">
        <p className="ord-eyebrow">Terms of the package</p>
        <h2 className="plan-h">What a month includes</h2>
        <ul className="plan-rules">
          {plan.rules.map((r) => (
            <li key={r.text}>
              <span>{r.text}</span>
              {r.right && <span className="plan-rule-r">{r.right}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="plan-sec">
        <p className="ord-eyebrow">Formats</p>
        <h2 className="plan-h">What we can make</h2>
        <PlanCarousel formats={plan.formats} />
        <p className="plan-sub">
          You have tested one of these. We add formats as they prove themselves and keep the ones that score for{' '}
          {plan.brand}.
        </p>
      </section>

      <section className="plan-sec">
        <p className="ord-eyebrow">Each video</p>
        <h2 className="plan-h">How it works</h2>
        <ol className="plan-steps">
          <li>
            <strong>We agree what to promote.</strong> Which service, which product, and what the month is for.
          </li>
          <li>
            <strong>We agree the video type and the script.</strong>
          </li>
          <li>
            <strong>We share the assets and frames.</strong> Or the storyboard, or the reference video, depending on the
            type.
          </li>
          <li>
            <strong>We share the first cut.</strong> One edit is included. We aim to get it right the first time.
          </li>
        </ol>
        <p className="plan-sub">If a call would help at any point, say so. In the first few months we are glad to do it on a call.</p>
      </section>

      <section className="plan-sec">
        <p className="ord-eyebrow">To start</p>
        <h2 className="plan-h">What we need from you</h2>
        <ul className="plan-needs">
          <li>
            <strong>Performance access to the Instagram account.</strong>{' '}
            Add midsesh as a partner in Meta Business Suite with &ldquo;View performance&rdquo; only. No password changes hands and you can remove us any time. We send
            the steps once you choose.
          </li>
          <li>
            <strong>The fitting offer as it stands.</strong> The booking link, the price, and the one thing a first time
            customer should know.
          </li>
          <li>
            <strong>A start date.</strong>
          </li>
        </ul>
        <p className="plan-sub">
          Posting stays with you unless you ask us to take it on. Paid promotion is not in the price. We report on the
          videos; we do not promise a follower count.
        </p>
      </section>

      <p className="acct-foot">
        Anything unclear? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will answer.
      </p>
    </main>
  );
}
