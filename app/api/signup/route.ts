import { NextRequest, NextResponse } from 'next/server';
import { CONTACT_EMAIL } from '@/lib/contact';
import { isValidEmail, sendEmail } from '@/lib/email';
import { recordInsight } from '@/lib/insights';
import { withMetrics } from '@/lib/metrics';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin, scrubUntrusted } from '@/lib/sanitize';
import { recordMarketplaceOrder, type OrderKind } from '@/lib/marketplaceOrders';
import { notifyCustomer } from '@/lib/orderMail';
import { serviceBySlug } from '@/lib/services';
import { countRows, recordLead, selectRows } from '@/lib/supabase';
import { durableLimit } from '@/lib/usage';

// Two forms, one route: the contact card on the home page and the register at
// /register. They share every line of the guard, the storage and the
// notification, and differ only in which fields they carry, so splitting them
// into two routes would duplicate the whole file to vary a field list.
//
// Both write a lead and send one email. The email is what actually reaches a
// human, so it is awaited and its result is reported: a form that says "sent"
// when nothing was sent is worse than one that fails honestly. The Supabase
// write stays fire and forget like every other lead, because a person who has
// typed their details should not see an error over a row that did not land
// when their message is already on its way.

const MAX_FIELD = 400;
const MAX_MESSAGE = 2_000;
// Where the notification goes. BOOKING_NOTIFY_EMAIL is the address the setup
// bookings already use, so a deployment that can receive one can receive these.
const NOTIFY = process.env.BOOKING_NOTIFY_EMAIL || CONTACT_EMAIL;

/** Trim, scrub and cap one free text answer. Empty becomes null. */
function field(value: unknown, max = MAX_FIELD): string | null {
  if (typeof value !== 'string') return null;
  const clean = scrubUntrusted(value).trim().slice(0, max);
  return clean.length > 0 ? clean : null;
}

/** The email body. Plain text, one label per line, so it is readable on a phone. */
function lines(rows: [string, string | null][]): string {
  return rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/**
 * Mirror the submission into `mk_orders`, the marketplace order table.
 *
 * This runs alongside `recordLead`, not instead of it. `leads` is what the
 * privacy policy names and what its deletion path walks, so every piece of
 * personal data still lands there. `mk_orders` is the operational copy: the
 * same submission with a service slug, a price and a status, which is what
 * makes "which orders are still open" a query rather than a read of prose.
 *
 * Never throws and never blocks the response. The email has already gone by
 * the time this is called, so a failed row must not turn a delivered brief
 * into an error page for somebody who did nothing wrong. It is logged instead,
 * which is what the daily report reads.
 */
async function mirrorOrder(
  kind: OrderKind,
  input: {
    email: string;
    name: string | null;
    slug?: string | null;
    serviceName?: string | null;
    brief: string | null;
    fields?: Record<string, string>;
    req: NextRequest;
  },
): Promise<void> {
  const service = input.slug ? serviceBySlug(input.slug) : undefined;
  try {
    const written = await recordMarketplaceOrder({
      kind,
      email: input.email,
      name: input.name,
      // Only a slug the catalogue actually knows is stored. An unknown one is
      // dropped rather than written, because a typo becoming a service name is
      // how a queue quietly grows a category nobody delivers.
      serviceSlug: service?.slug ?? null,
      serviceName: service?.name ?? input.serviceName ?? null,
      brief: input.brief,
      fields: input.fields,
      priceCents: service?.priceCents ?? null,
      referrer: input.req.headers.get('referer'),
      userAgent: input.req.headers.get('user-agent'),
    });
    if (!written.ok) {
      console.error('[midsesh:orders] mk_orders write failed', kind, written.ref);
      return;
    }
    // A waitlist signup is not an order and has nothing to confirm.
    if (kind !== 'order') return;

    // The confirmation. It needs the row's id, which the insert does not hand
    // back: this repo asks PostgREST for `return=minimal`, so the id is read
    // by the ref that was just written. One extra round trip, and it buys a
    // link that opens their order rather than a list they have to search.
    const rows = await selectRows<{ id: string }>(
      'mk_orders',
      `ref=eq.${encodeURIComponent(written.ref)}&select=id&limit=1`,
    );
    const orderId = rows?.[0]?.id;
    if (!orderId) {
      console.error('[midsesh:orders] wrote an order and could not read it back', written.ref);
      return;
    }

    // Their first order, counted after this one exists, so one row means new.
    // Null when it cannot be read, and null is not 1, so an unreadable count
    // simply leaves the thank you out.
    const orders = await countRows(
      'mk_orders',
      `kind=eq.order&email=eq.${encodeURIComponent(input.email.trim().toLowerCase())}`,
    );

    const told = await notifyCustomer({
      orderId,
      email: input.email,
      status: 'new',
      serviceName: service?.name ?? input.serviceName ?? null,
      name: input.name,
      brief: input.brief,
      firstOrder: orders === 1,
    });
    if (told === 'failed') {
      console.error('[midsesh:orders] order confirmation failed to send', orderId);
    }
  } catch (err) {
    console.error('[midsesh:orders] mk_orders threw', kind, err);
  }
}

async function handleSignup(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const ip = clientId(req);
  if (!rateLimit(ip, 10)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if ((await durableLimit('signup', ip, 10)) !== 'ok') {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const name = field(body.name, 120);

  // Anything that is not the register is treated as the contact card. An
  // unrecognised type must not fall through into the branch that stores less.
  const isRegister = body.type === 'register';

  if (isRegister) {
    // 'agents' means they are listing agents they built; 'expert' means they
    // are offering their own hands. The form asks first, so this is a choice
    // the visitor made rather than something inferred from what they typed.
    const track = body.track === 'agents' ? 'agents' : 'expert';
    const details: Record<string, string> = {};
    const skills = field(body.skills, MAX_MESSAGE);
    const agents = field(body.agents, MAX_MESSAGE);
    const price = field(body.price);
    const availability = field(body.availability);
    if (skills) details.skills = skills;
    if (agents) details.agents = agents;
    if (price) details.price = price;
    if (availability) details.availability = availability;
    details.track = track;

    const summary = lines([
      ['Name', name],
      ['Email', email],
      ['Applying as', track === 'agents' ? 'Agent builder' : 'Expert'],
      ['Skills', skills],
      ['Agents', agents],
      ['Price wanted', price],
      ['Good times to meet', availability],
    ]);

    await recordInsight('register', { email, name, track, details });
    await recordLead(null, {
      email,
      name,
      kind: 'register',
      selected: [],
      need: null,
      brief: null,
      consent: true,
      details,
    });
    const sent = await sendEmail({
      to: NOTIFY,
      subject: `Register: ${track === 'agents' ? 'agents' : 'expert'} from ${name || email}`,
      text: summary,
    });
    // Somebody offering to do the work is not an order, but it is the same
    // shape of thing: a person, an address, and something a human has to act
    // on. It goes in the same queue under kind 'expert' so there is one place
    // to look rather than four.
    await mirrorOrder('expert', {
      email,
      name,
      serviceName: track === 'agents' ? 'Agent builder' : 'Expert',
      brief: summary,
      fields: details,
      req,
    });
    return NextResponse.json({ ok: true, notified: sent });
  }

  const purpose = field(body.purpose, 200);
  const message = field(body.message, MAX_MESSAGE);
  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  const summary = lines([
    ['Name', name],
    ['Email', email],
    ['Purpose', purpose],
    ['Message', message],
  ]);

  await recordInsight('contact', { email, name, purpose, message });
  await recordLead(null, {
    email,
    name,
    kind: 'contact',
    selected: [],
    // The message is the need. It goes in the existing column rather than in
    // details, so a contact row reads the same as every other lead.
    need: purpose ? `${purpose}: ${message}` : message,
    brief: null,
    consent: true,
  });
  const sent = await sendEmail({
    to: NOTIFY,
    subject: `Contact: ${purpose || 'message'} from ${name || email}`,
    text: summary,
  });

  // Three different things arrive on this branch and they are not the same
  // thing to work. A brief from a service page is an order. An address left on
  // a page that is not open yet is a waitlist entry that must never sit in the
  // queue looking like work. Anything else is the contact card.
  //
  // The slug and the kind are sent by the form rather than guessed from the
  // page title, because a title is copy and copy gets rewritten, and a queue
  // that silently reclassifies itself when somebody edits a heading is worse
  // than one that was never wired at all.
  const slug = field(body.serviceSlug, 60);
  const declared = body.orderKind;
  const kind: OrderKind = !slug
    ? 'contact'
    : declared === 'notify'
      ? 'notify'
      : 'order';

  await mirrorOrder(kind, {
    email,
    name,
    slug,
    serviceName: purpose,
    brief: message,
    req,
  });

  return NextResponse.json({ ok: true, notified: sent });
}

export const POST = withMetrics('signup', handleSignup);
