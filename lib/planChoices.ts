import { insertRows, selectRows } from '@/lib/supabase';

// The one thing a customer writes on their plan page: a cadence and a start
// date. One row per plan per address, replaced on every confirmation, so the
// current answer is the row and nothing has to be sorted.
//
// Server only. The page reads the choice back to show it; the route writes
// it. Nothing in a browser talks to this table.

if (typeof window !== 'undefined') {
  throw new Error('lib/planChoices is server-only and must never reach the client');
}

export interface PlanChoice {
  cadence: number;
  startOn: string;
  actor: string;
  updatedAt: string;
}

interface Row {
  cadence: number;
  start_on: string;
  actor: string;
  updated_at: string;
}

/**
 * The customer's current choice on a plan, null when there is none or
 * Supabase did not answer.
 *
 * Only a row the customer wrote counts. An operator or a preview viewer
 * pressing Confirm files a row too, with `actor` saying so, and that row
 * must not open the customer's page on "Confirmed" for a choice they never
 * made. The test rows are for the alert email and the table, not the page.
 */
export async function readChoice(planSlug: string, email: string): Promise<PlanChoice | null> {
  const rows = await selectRows<Row>(
    'plan_choices',
    `select=cadence,start_on,actor,updated_at&plan_slug=eq.${encodeURIComponent(planSlug)}&email=eq.${encodeURIComponent(email)}&actor=like.customer:*&limit=1`,
  );
  const row = rows?.[0];
  if (!row) return null;
  return { cadence: row.cadence, startOn: row.start_on, actor: row.actor, updatedAt: row.updated_at };
}

/**
 * Record a choice. True when the row landed.
 *
 * Upserts on (plan_slug, email, actor), so a second confirmation by the same
 * hand overwrites the first rather than sitting beside it, and a test press
 * by us can never overwrite the customer's own row. `updated_at` is set here
 * rather than by a trigger, because the merge writes every column it is
 * handed and a trigger is one more thing to apply by hand.
 */
export async function recordChoice(input: {
  planSlug: string;
  email: string;
  cadence: number;
  startOn: string;
  actor: string;
}): Promise<boolean> {
  const res = await insertRows(
    'plan_choices',
    {
      plan_slug: input.planSlug,
      email: input.email,
      cadence: input.cadence,
      start_on: input.startOn,
      actor: input.actor,
      updated_at: new Date().toISOString(),
    },
    { resolveOn: 'plan_slug,email,actor' },
  );
  return res.ok;
}
