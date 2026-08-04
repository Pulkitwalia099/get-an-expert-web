import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/contact';

// The bottom of the page. Everything here is a link someone goes looking for
// rather than something we are asking them to do, which is the whole reason it
// sits below the closing ask instead of competing with it.
//
// The page used to end on three sections in a row, each with a heading, a
// subtitle and a button: book a demo, register, and the closing ask. Three
// requests stacked at the bottom read as a menu rather than a close. The two
// secondary routes are now one quiet row above the closer, and the utility
// links live down here where they belong.
export default function SiteFooter() {
  return (
    <footer className="sitefoot">
      <span className="sitefoot-mark">midsesh</span>
      <nav className="sitefoot-links" aria-label="Footer">
        <Link href="/register">Register as an expert</Link>
        <Link href="/get">Setups</Link>
        <Link href="/privacy">Privacy and security</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </nav>
    </footer>
  );
}
