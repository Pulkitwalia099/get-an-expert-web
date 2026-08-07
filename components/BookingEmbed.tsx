'use client';

import { useEffect, useRef, useState } from 'react';
import type { CalPrefill } from '@/lib/calLink';

// Cal.com inline embed, rendered inside the call card so the visitor never
// leaves the chat.
//
// Cal ship a minified snippet you are meant to paste into a script tag.
// embed.js does NOT define window.Cal on its own: it augments the stub the
// snippet creates, and queues any call made before it lands. So the stub is
// required. It is written out here as real TypeScript rather than injected
// as a string, which means the compiler checks it and there is nothing to
// mis-transcribe.

type CalFn = ((...args: unknown[]) => void) & {
  q?: unknown[][];
  ns?: Record<string, CalFn>;
  loaded?: boolean;
};

const EMBED_SRC = 'https://app.cal.com/embed/embed.js';
const NAMESPACE = 'callcard';
const RENDER_TIMEOUT_MS = 12_000;

function push(target: CalFn, args: unknown[]): void {
  target.q = target.q ?? [];
  target.q.push(args);
}

function ensureCal(): CalFn {
  const w = window as Window & { Cal?: CalFn };
  if (w.Cal) return w.Cal;

  const cal = function (...args: unknown[]): void {
    const self = w.Cal as CalFn;

    // First call loads the real script, which drains self.q on arrival.
    if (!self.loaded) {
      self.ns = {};
      self.q = self.q ?? [];
      const script = document.createElement('script');
      script.src = EMBED_SRC;
      script.async = true;
      document.head.appendChild(script);
      self.loaded = true;
    }

    if (args[0] === 'init') {
      const namespace = args[1];
      const api = function (...inner: unknown[]): void {
        push(api as CalFn, inner);
      } as CalFn;
      api.q = api.q ?? [];

      if (typeof namespace === 'string') {
        self.ns = self.ns ?? {};
        self.ns[namespace] = self.ns[namespace] ?? api;
        push(self.ns[namespace], args);
        push(self, ['initNamespace', namespace]);
      } else {
        push(self, args);
      }
      return;
    }

    push(self, args);
  } as CalFn;

  w.Cal = cal;
  return cal;
}

export default function BookingEmbed({ prefill }: { prefill: CalPrefill }) {
  const ref = useRef<HTMLDivElement>(null);
  // Cal mutates the container, so mounting twice stacks two calendars.
  const mounted = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (mounted.current || !ref.current) return;
    mounted.current = true;
    const target = ref.current;

    try {
      const cal = ensureCal();
      cal('init', NAMESPACE, { origin: 'https://app.cal.com' });
      cal.ns?.[NAMESPACE]?.('inline', {
        elementOrSelector: target,
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
      setFailed(true);
    }
  }, [prefill]);

  // The watchdog gets its own mount-only effect on purpose. Living beside
  // the mount effect made it depend on `prefill`, whose identity changes on
  // every render, so each render cancelled the pending timer and then hit
  // the mounted guard before setting a new one. It could never fire.
  useEffect(() => {
    const timer = setTimeout(() => {
      // Cal fails quietly: a blocked script, an ad blocker, a bad link. A
      // blank rectangle is the worst outcome here, because they came to book.
      if (!ref.current?.querySelector('iframe')) {
        console.error('[midsesh:booking] embed produced no iframe');
        setFailed(true);
      }
    }, RENDER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (failed) {
    return (
      <a
        className="call-cta"
        href={`https://cal.com/${prefill.calLink}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Pick a time
      </a>
    );
  }

  return <div className="booking-embed" ref={ref} />;
}
