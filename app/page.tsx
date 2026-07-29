import type { Metadata } from 'next';
import HomeApp from '@/components/HomeApp';
import ContactLink from '@/components/ContactLink';

// This page was at /ask until the front door changed. Asking for what you need
// is the offer we lead with now, so the domain opens on it and setups moved to
// /get. Both old paths still redirect, because the setups links are already out
// on Reddit and Instagram.
export const metadata: Metadata = {
  title: 'midsesh · Tell us what you need done',
  description:
    'Say what you need in one sentence. We find someone who has done it before, send you a name and a price, and they take it off your plate.',
};

// Order is the hierarchy: the hero and its four steps, then the work we have
// actually done, then the wider range we cover, then one last ask. HowItWorks
// lives inside the hero rather than here, because the steps are the thing a
// first-time visitor needs before they will type anything.
//
// That order is now HomeApp's, not this file's. Every card in those sections
// opens a layer over the page, so they need callbacks from the component that
// owns which layer is open, which rules out passing them down as children.
export default function Home() {
  return (
    <>
      <div className="bg" />
      <div className="grain" />
      {/* The wordmark and these links live in the chat titlebar, which is only
          inside the overlay here, so without this the page would carry no brand
          and no route to privacy or to a human. */}
      <header className="sitebar">
        <span className="sitemark">
          <span className="worb">✳︎</span>midsesh
        </span>
        <nav className="sitenav">
          <ContactLink />
          <a className="privacy-link" href="/privacy">
            Privacy
          </a>
        </nav>
      </header>
      <HomeApp />
    </>
  );
}
