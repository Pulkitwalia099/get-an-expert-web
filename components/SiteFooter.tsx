import Link from 'next/link';

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
        <Link href="/experts">Become an expert</Link>
        <Link href="/get">Setups</Link>
        {/* No email address here. A raw mailto in a footer reads as a personal
            inbox rather than a company, and the contact form above already
            routes to the same place with a name and a purpose attached. */}
        <Link href="/privacy">Privacy and security</Link>
      </nav>
    </footer>
  );
}
