import Link from 'next/link';

// The wordmark, as the marketplace draws it.
//
// Five divs and no asset: a 32px black squircle holding an 18x12 white lozenge
// with two dots inside it, 4px black and 2.5px violet, three apart. Human and
// agent, side by side. Copied from agon-agent src/App.tsx:454-459, where it is
// written out twice; here it is written once.
//
// A component rather than a copy on each page, because the account pages and
// the marketplace being visibly the same product is the whole point, and three
// hand copies of a five div mark drift on the first edit.
export default function Mark({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="mk">
      <span className="mk-tile" aria-hidden="true">
        <span className="mk-loz">
          <span className="mk-dot" />
          <span className="mk-dot-2" />
        </span>
      </span>
      <span className="mk-word">midsesh</span>
    </Link>
  );
}
