import { describe, expect, it } from 'vitest';
import { AMBER_MS, PROMISE_MS, clockStartsAt, promiseFor, quoteClockStartsAt } from '@/lib/promise-clock';

// The arithmetic behind the colour on every row of the operator queue.
//
// Worth pinning hard, because every failure here is silent. A wrong colour is
// still a colour, and the whole point of the pill is that somebody trusts it
// instead of counting days themselves.

const HOUR = 60 * 60 * 1000;
// The two rows actually sitting at 'new' in mk_orders_current, read at the
// moment the cockpit was built.
const NOW = Date.parse('2026-08-14T15:30:00Z');

describe('clockStartsAt', () => {
  it('will not let an order buy another day by being marked working', () => {
    // The whole reason this function exists. status_at is the newest event, so
    // reading it here would restart a six day old order's clock the moment
    // somebody touched it, and it would go green while the customer waits.
    const created = '2026-08-08T01:42:12Z';
    expect(clockStartsAt('working', created, '2026-08-14T15:00:00Z')).toBe(created);
    expect(clockStartsAt('new', created, '2026-08-14T15:00:00Z')).toBe(created);
  });

  it('does not report a sample sent this morning as six days late', () => {
    // The other half. Once the sample is out the wait genuinely restarted, and
    // on their side, so created_at here would paint every long-running order
    // red forever.
    const created = '2026-08-08T01:42:12Z';
    const sent = '2026-08-14T10:14:40Z';
    expect(clockStartsAt('sample_sent', created, sent)).toBe(sent);
    expect(clockStartsAt('approved', created, sent)).toBe(sent);
  });

  it('falls back rather than handing null to new Date, which is 1970 and red', () => {
    // Every order with no events has a null status_at. That is all six rows
    // currently at 'new', so getting this wrong paints the board.
    const created = '2026-08-13T08:43:51Z';
    expect(clockStartsAt('sample_sent', created, null)).toBe(created);
    expect(clockStartsAt('new', created, null)).toBe(created);
  });
});

describe('quoteClockStartsAt', () => {
  it('does not restart when we start contacting people', () => {
    // The quote ladder has no handover. 'contacting' is still us working, so
    // nothing on it is allowed to reset the promise the customer was given.
    const created = '2026-08-04T19:11:02Z';
    expect(quoteClockStartsAt('contacting', created)).toBe(created);
    expect(quoteClockStartsAt('open', created)).toBe(created);
  });
});

describe('promiseFor', () => {
  it('holds the three bands at their edges, so amber is not a decoration', () => {
    const at = (hoursOld: number) => promiseFor(new Date(NOW - hoursOld * HOUR).toISOString(), NOW);
    expect(at(1).heat).toBe('green');
    expect(at(19.9).heat).toBe('green');
    // Amber starts exactly four hours out, which is AMBER_MS from the deadline.
    expect(at(20.1).heat).toBe('amber');
    expect(at(23.9).heat).toBe('amber');
    expect(at(24.1).heat).toBe('red');
    expect(PROMISE_MS - 20 * HOUR).toBe(AMBER_MS);
  });

  it('says how far past the promise it is, not how old it is', () => {
    // The oldest quote request, created 4 Aug, read at 14 Aug 15:30. It is
    // 9.85 days old and 8.85 days past a 24 hour promise, and the pill is
    // about the promise. The age goes on the meta line beside it, so both
    // numbers are on screen and neither has to be worked out.
    const p = promiseFor('2026-08-04T19:11:02Z', NOW);
    expect(p.late).toBe(true);
    expect(p.heat).toBe('red');
    expect(p.label).toBe('8d late');
    expect(p.age).toBe('9d');
  });

  it('counts down in the unit somebody can act on', () => {
    expect(promiseFor(new Date(NOW - 18 * HOUR).toISOString(), NOW).label).toBe('6h left');
    expect(promiseFor(new Date(NOW - 23.5 * HOUR).toISOString(), NOW).label).toBe('30m left');
  });

  it('will not paint a row green because its timestamp is unreadable', () => {
    // A row whose age cannot be computed is one somebody has to go and look
    // at. Green would hide it for good.
    const p = promiseFor('not a date', NOW);
    expect(p.heat).toBe('red');
    expect(p.label).toBe('unknown');
    // Not claimed as late, because we do not know that it is. It shows red so
    // it is seen, and stays out of a count that has to be true.
    expect(p.late).toBe(false);
  });

  it('does not report a negative age when a clock is ahead of Postgres', () => {
    const p = promiseFor(new Date(NOW + 10 * 60_000).toISOString(), NOW);
    expect(p.heat).toBe('green');
    expect(p.late).toBe(false);
    expect(p.msLeft).toBe(PROMISE_MS);
    expect(p.label).not.toContain('-');
  });
});
