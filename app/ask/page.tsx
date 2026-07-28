import type { Metadata } from 'next';
import Examples from '@/components/Examples';
import HomeApp from '@/components/HomeApp';
import Setups from '@/components/Setups';

export const metadata: Metadata = {
  title: "midsesh · Tell us what you need done",
  description:
    'Say what you need in one sentence. We find someone who has done it before, send you a name and a price, and they take it off your plate.',
};

// Order is the hierarchy: the hero and its four steps, then the work we have
// actually done, then the wider range we cover. HowItWorks lives inside the
// hero rather than here, because the steps are the thing a first-time visitor
// needs before they will type anything.
export default function Ask() {
  return (
    <>
      <div className="bg" />
      <div className="grain" />
      {/* The wordmark and the privacy link live in the chat titlebar, which is
          only inside the overlay here, so without this the page would carry no
          brand and no route to the privacy page. */}
      <header className="sitebar">
        <span className="sitemark">
          <span className="worb">✳︎</span>midsesh
        </span>
        <a className="privacy-link" href="/privacy">
          Privacy
        </a>
      </header>
      <HomeApp />
      <div className="below">
        <Setups />
        <Examples />
      </div>
    </>
  );
}
