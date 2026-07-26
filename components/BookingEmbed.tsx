'use client';

import { useEffect, useRef } from 'react';
import type { CalPrefill } from '@/lib/calLink';

// Cal.com inline embed, rendered inside the call card so the visitor never
// leaves the chat. The loader is the snippet Cal ships; it injects their
// script once and queues calls until it lands.

declare global {
  interface Window {
    Cal?: ((...args: unknown[]) => void) & {
      ns?: Record<string, (...args: unknown[]) => void>;
      loaded?: boolean;
    };
  }
}

const LOADER = `(function(C,A,L){let p=function(a,ar){a.q.push(ar)};let d=C.document;C.Cal=C.Cal||function(){let cal=C.Cal;let ar=arguments;if(!cal.loaded){cal.ns={};cal.q=cal.q||[];d.head.appendChild(d.createElement("script")).src=A;cal.loaded=true}if(ar[0]===L){const api=function(){p(api,arguments)};const namespace=ar[1];api.q=api.q||[];typeof namespace==="string"?(cal.ns[namespace]=api)&&p(api,ar):p(cal,ar);return}p(cal,ar)})(window,"https://app.cal.com/embed/embed.js","init");`;

const NAMESPACE = 'callcard';

export default function BookingEmbed({ prefill }: { prefill: CalPrefill }) {
  const ref = useRef<HTMLDivElement>(null);
  // Cal mutates the container itself, so mounting twice stacks two
  // calendars. A ref guard is more reliable here than an effect dependency.
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current || !ref.current) return;
    mounted.current = true;

    if (!window.Cal) {
      const script = document.createElement('script');
      script.textContent = LOADER;
      document.head.appendChild(script);
    }

    const cal = window.Cal;
    if (!cal) return;

    try {
      cal('init', NAMESPACE, { origin: 'https://app.cal.com' });
      cal.ns?.[NAMESPACE]?.('inline', {
        elementOrSelector: ref.current,
        calLink: prefill.calLink,
        config: {
          layout: 'month_view',
          ...(prefill.name ? { name: prefill.name } : {}),
          ...(prefill.email ? { email: prefill.email } : {}),
          notes: prefill.notes,
        },
      });
    } catch (err) {
      console.error('[midsesh:booking] embed failed', err);
    }
  }, [prefill]);

  return (
    <div className="booking-embed">
      <div ref={ref} />
      <noscript>
        <a href={`https://cal.com/${prefill.calLink}`}>Pick a time</a>
      </noscript>
    </div>
  );
}
