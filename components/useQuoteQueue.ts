'use client';

import { useCallback, useState } from 'react';
import type { QuoteRow } from '@/components/OperatorQuoteRow';
import type { QuoteStatus } from '@/lib/quote-status';

// The quote requests on the operator dashboard: reading them, and moving one.
//
// A hook rather than more state on the page, because that page is over the 400
// line rule and this is the one part of it that is genuinely separable: a
// different table, a different endpoint, and a failure that must not be
// confused with the orders failing.
//
// Nothing here can lock the page. A request read that comes back wrong is one
// section saying so, never a password box in front of the orders somebody
// opened this to work.

export interface QuoteQueue {
  quotes: QuoteRow[];
  error: string;
  /** The id currently being moved, so one row disables rather than all of them. */
  busy: string;
  load: () => Promise<void>;
  move: (id: string, status: QuoteStatus) => Promise<void>;
}

const UNREADABLE = 'Quote requests could not be read.';

export function useQuoteQueue(): QuoteQueue {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  /** Reads and stores. Returns whether it worked, and touches no error state. */
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/operator/quotes');
      if (!res.ok) return false;
      const body = (await res.json()) as { requests?: QuoteRow[] };
      setQuotes(body.requests ?? []);
      return true;
    } catch {
      return false;
    }
  }, []);

  const load = useCallback(async () => {
    setError((await refresh()) ? '' : UNREADABLE);
  }, [refresh]);

  /**
   * Optimistic, the same shape as the presence switches on /operator.
   *
   * A picker that waits for a round trip before it changes reads as broken on
   * a phone. So it changes now, and a refusal re-reads the table rather than
   * undoing the one field: the server is the only thing that knows what the
   * status actually is, and a hand-rolled undo is how a screen ends up
   * disagreeing with the database.
   *
   * That re-read must not clear the message it was caused by, which is why it
   * goes through refresh rather than load.
   */
  const move = useCallback(
    async (id: string, status: QuoteStatus) => {
      setBusy(id);
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
      try {
        const res = await fetch('/api/operator/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error ?? 'That did not save.');
          await refresh();
          return;
        }
        setError('');
      } catch {
        setError('That did not save.');
        await refresh();
      } finally {
        setBusy('');
      }
    },
    [refresh],
  );

  return { quotes, error, busy, load, move };
}
