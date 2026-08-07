import type { Metadata } from 'next';
import AccountLink from '@/components/AccountLink';
import Backing from '@/components/Backing';
import ContactLink from '@/components/ContactLink';
import ServiceCard from '@/components/ServiceCard';
import SiteFooter from '@/components/SiteFooter';
import { LIVE_SERVICES, SOON_SERVICES } from '@/lib/services';
import styles from './marketplace.module.css';

// The marketplace is the front door now. The expert search that used to live
// here is unchanged and moved to /search-experts, linked from the strip at the
// bottom of this page in its own words. /ask, which pointed at this root while
// this root was the search, now points there instead.
//
// Backing and SiteFooter are the live site's own components, not copies. That is
// the whole reason this page can change the offer without the site stopping
// looking like itself.
export const metadata: Metadata = {
  title: 'midsesh · Work, delivered',
  description:
    'Pick a service. An agent does the work, a human expert owns the outcome. Fixed scope, stated price, defined output.',
};

const STEPS = [
  {
    n: '01',
    h: 'Pick a service',
    p: 'Each one has a fixed scope, a stated price, and a defined output.',
  },
  {
    n: '02',
    h: 'Give the input',
    p: 'A short structured form. Links, files, a brief. Two minutes, not a project setup.',
  },
  {
    n: '03',
    h: 'Agent and expert deliver',
    p: 'The agent does the work. A human expert reviews it and owns the outcome.',
  },
  {
    n: '04',
    h: 'Approve, then pay',
    p: 'You see the output first. Nothing is charged on click.',
  },
];

export default function Home() {
  return (
    <>
      <div className="bg" />
      <div className="grain" />

      <header className="sitebar">
        {/* Not a link here: it would only point at itself. */}
        <span className="sitemark">
          <span className="worb">✳︎</span>midsesh
        </span>
        <nav className="sitenav">
          <ContactLink />
          <a className="privacy-link" href="/privacy">
            Privacy
          </a>
          {/* Renders nothing at all when Google credentials are unset, so a
              deployment without them shows no dead button. */}
          <AccountLink />
        </nav>
      </header>

      <section className={styles.hero}>
        <h1>Work, delivered.</h1>
        <p>
          Pick a service. An agent does the work, a human expert owns the outcome. You approve
          before you pay.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.shead}>
            <span className={styles.eyebrow}>AI plus expert</span>
            <h2>What our agents and experts deliver</h2>
          </div>

          <div className={styles.grid}>
            {LIVE_SERVICES.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>

          <div className={styles.soonHead}>
            <b>Launching soon</b>
          </div>
          <div className={styles.soonGrid}>
            {SOON_SERVICES.map((s) => (
              <ServiceCard key={s.slug} service={s} dim />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <div className={styles.shead}>
            <span className={styles.eyebrow}>How it works</span>
            <h2>You approve. Then you pay.</h2>
          </div>
          <div className={styles.steps}>
            {STEPS.map((s) => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.strip}`}>
        <div className={styles.wrap}>
          <h2>Not another tool to learn. Not a subscription to figure out.</h2>
          <p>
            You do your work best. We handle the rest, and we get paid for outputs, not access.
          </p>
          <div className={styles.btnrow}>
            {/* The expert search, in its own words. It is a different offer, not
                a fallback, so it gets a sentence rather than a nav item. */}
            <a className={styles.btnGhost} href="/search-experts">
              Looking for a human AI expert instead? &rarr;
            </a>
          </div>
        </div>
      </section>

      <Backing />
      <SiteFooter />
    </>
  );
}
