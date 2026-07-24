'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { capturePageview, initAnalytics } from '@/lib/analytics';

// Fires a pageview whenever the App Router path or query changes. Split out and
// wrapped in Suspense because useSearchParams opts a subtree into client-side
// rendering, and we do not want that to reach the whole page.
function Pageview() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = search?.toString();
    capturePageview(window.location.origin + pathname + (query ? `?${query}` : ''));
  }, [pathname, search]);

  return null;
}

// Starts PostHog once on mount, then keeps pageviews flowing. Renders nothing
// of its own; children pass straight through. With no key configured this is
// inert, so it is safe to keep in the tree in every environment.
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <Pageview />
      </Suspense>
      {children}
    </>
  );
}
