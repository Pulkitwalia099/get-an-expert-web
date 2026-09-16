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
import { labelFor } from '@/lib/plan-dates';
import { readChoice } from '@/lib/planChoices';
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

  // What they already answered, if anything, so a return visit opens on the
  // confirmation rather than the question.
  const choice = await readChoice(plan.slug, plan.email);
  const chosen = choice ? { cadence: choice.cadence, startOn: choice.startOn } : null;

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
      {chosen && (
        <p className="plan-status">
          Confirmed: {chosen.cadence} videos a month, starting {labelFor(chosen.startOn)}.{' '}
          <a href="#package">Change</a>
        </p>
      )}

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
        <p className="ord-eyebrow">Why midsesh</p>
        <h2 className="plan-h">An engine that works for you, and keeps getting better</h2>
        <div className="plan-why">
          <div className="plan-why-tile">
            <span className="plan-why-ic" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l9 5-9 5-9-5 9-5z" />
                <path d="M3 12l9 5 9-5" />
                <path d="M3 16l9 5 9-5" />
              </svg>
            </span>
            <span className="plan-why-k">Tech and execution</span>
            <h3>The mix that works right now</h3>
            <p>
              The right models and the right workflow, and both change every four to six weeks. Our team keeps on top
              of it, so your videos are made the way that is working now.
            </p>
          </div>
          <div className="plan-why-tile">
            <span className="plan-why-ic" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
              </svg>
            </span>
            <span className="plan-why-k">Energy and dollars</span>
            <h3>No credits burned on attempts</h3>
            <p>
              Self-serve tools spend most of their credits on regenerations. We charge for the finished video, not the
              tries, so your time and money stay on your business.
            </p>
          </div>
          <div className="plan-why-tile">
            <span className="plan-why-ic" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </span>
            <span className="plan-why-k">Engine that scales</span>
            <h3>It learns your brand</h3>
            <p>
              Our systems keep track of what works for {plan.brand} and what does not. An intelligence layer that
              plans creative across paid and organic is launching soon.
            </p>
          </div>
        </div>
        <p className="plan-sub">
          Execution at scale, experts for judgment and taste, and data for what to make next. That is what we are
          building, and this plan is where it starts.
        </p>
      </section>

      <section className="plan-sec">
        <p className="ord-eyebrow">The ramp</p>
        <h2 className="plan-h">Month 1 sets up quality. Month 2 experiments. Month 3 doubles down.</h2>
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
            the steps once you confirm.
          </li>
          <li>
            <strong>The fitting offer as it stands.</strong> The booking link, the price, and the one thing a first time
            customer should know.
          </li>
        </ul>
        <p className="plan-sub">
          Posting stays with you unless you ask us to take it on. Paid promotion is not in the price. With performance
          access in place, every video comes back with its numbers each month, so the plan is judged on what it
          produces.
        </p>
      </section>

      <section className="plan-sec" id="package">
        <p className="ord-eyebrow">The package</p>
        <h2 className="plan-h">Pick a cadence and a start date</h2>
        <p className="plan-sub">Start on the starter pack. At the end of month 1 we set the cadence for the months after. Change it any month.</p>
        <PlanChooser
          slug={plan.slug}
          brand={plan.brand}
          startFrom={plan.startFrom}
          tiers={plan.tiers}
          rules={plan.rules}
          chosen={chosen}
        />
      </section>

      <p className="acct-foot">
        Anything unclear? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will answer.
      </p>
    </main>
  );
}
