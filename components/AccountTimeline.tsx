import Link from 'next/link';
import { ago } from '@/lib/order-status';
import type { TimelineItem } from '@/lib/timeline';

// Everything this account has with us, in one list.
//
// Deliberately a server component with no state. It needs none, and keeping it
// on the server means it can never quietly acquire a server-only import and
// repeat the hydration failure that lib/__tests__/server-only-imports.test.ts
// exists to catch.
//
// `ago` comes from lib/order-status, which is browser safe and already holds
// the one this page wants. components/RequestList.tsx has a second copy of the
// same function; this is not a third.

export default function AccountTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ul className="acct-list">
      {items.map((item, i) => (
        <li key={`${item.kind}-${item.id}`} style={{ '--i': i } as React.CSSProperties}>
          {/* data-kind rather than a word in the copy. Which of the two things
              a row is matters at a glance and does not need saying twice. */}
          <Link href={item.href} className="acct-row" data-kind={item.kind}>
            <span className="acct-row-top">
              <span className="acct-row-title">{item.title}</span>
              <span className="acct-row-when">{ago(item.at)}</span>
            </span>
            <span className="acct-row-foot">
              <span className="acct-state">{item.state}</span>
              <span className="acct-kind">
                {item.kind === 'order' ? 'Order' : 'Request for quotes'}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
