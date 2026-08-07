import type { Metadata } from 'next';
import AccountLink from '@/components/AccountLink';
import HomeApp from '@/components/HomeApp';
import ContactLink from '@/components/ContactLink';
import SiteFooter from '@/components/SiteFooter';

// This is the expert search product, verbatim as it stood at the root until the
// marketplace took the front door. Nothing about it changed: same HomeApp, same
// overlays, same intake. Only its address did.
//
// It keeps its own route rather than being folded into the marketplace because
// it is a different offer. The marketplace sells a defined output at a stated
// price; this sells a person. A visitor who wants the second one is not served
// by the first, which is why the home page still links here in its own words.
//
// The root does NOT redirect here. Anyone landing on midsesh.com now gets the
// marketplace, which is the point of the change. What redirects is /ask, which
// pointed at the root while the root was this page, so it is repointed here to
// land where its links expect.
export const metadata: Metadata = {
  title: 'midsesh · Tell us what you want done',
  description:
    'Say what you need in one sentence. We find someone who has done it before, send you a name and a price, and they take it off your plate.',
};

export default function SearchExperts() {
  return (
    <>
      <div className="bg" />
      <div className="grain" />
      <header className="sitebar">
        <a className="sitemark" href="/" aria-label="midsesh home">
          <span className="worb">✳︎</span>midsesh
        </a>
        <nav className="sitenav">
          <ContactLink />
          <a className="privacy-link" href="/privacy">
            Privacy
          </a>
          <AccountLink />
        </nav>
      </header>
      <HomeApp />
      <SiteFooter />
    </>
  );
}
