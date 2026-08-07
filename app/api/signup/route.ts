import { NextRequest, NextResponse } from 'next/server';
import { CONTACT_EMAIL } from '@/lib/contact';
import { isValidEmail, sendEmail } from '@/lib/email';
import { recordInsight } from '@/lib/insights';
import { withMetrics } from '@/lib/metrics';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin, scrubUntrusted } from '@/lib/sanitize';
import { recordLead } from '@/lib/supabase';
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

  return NextResponse.json({ ok: true, notified: sent });
}

export const POST = withMetrics('signup', handleSignup);
