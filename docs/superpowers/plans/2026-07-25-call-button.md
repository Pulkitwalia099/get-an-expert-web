# Call Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a "Talk to a human" pill in the midsesh chat that connects a visitor to Pulkit or Rohit on a live audio call when one of them is switched on, and opens a prefilled Cal.com booking picker when neither is.

**Architecture:** Presence is two rows in Supabase, flipped by hand from a secret-guarded `/operator` page, and read once when the visitor taps the pill rather than polled. A keyword sweep over the brief the intake agent already built picks which person is offered and which credential tag their card shows. The live call is a Daily.co audio room embedded in the chat panel; the fallback is a Cal.com inline embed prefilled from the session.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Supabase via PostgREST, Daily.co REST + `@daily-co/daily-js`, Cal.com embed, Telegram Bot API.

**Spec:** `docs/superpowers/specs/2026-07-25-call-button-design.md`

## Global Constraints

- **No em dashes** anywhere in user-facing copy or prose. Use periods, commas, colons, or pipes.
- **No AI-sounding language.** No "delve", "seamless", "unlock", "elevate", "empower", "isn't just X, it's Y".
- **Never describe the call as AI.** A human answers it. The chat agent is AI and keeps saying so.
- **Files stay under 400 lines.** Split when they grow.
- **Immutable updates.** Return new objects instead of mutating.
- **Validate at every API boundary.** Schemas live in `lib/validate.ts`.
- **`lib/supabase.ts` and anything importing it are server-only** and must never reach a client component.
- **Do not run `npm run eval`, and do not add scenarios to `evals/scenarios.ts`.** Nothing in this plan touches `lib/prompts.ts`, the model, `sanitizeReply`, or the question budget, which are the only triggers for the eval gate in `CLAUDE.md`. Running them spends Anthropic credits re-proving unchanged behaviour.
- **Branch is `feat/call-button` in the `gae-call-button` worktree.** Never commit to `master`; pushing it deploys midsesh.com instantly.
- Every task ends with `npm test` passing. Before the final PR, `npm run build` passes too.

## Copy, verbatim

Use these strings exactly. They are the output of CTA research recorded in the spec.

| Where | String |
| --- | --- |
| Titlebar pill | `Talk to a human` |
| Card button, someone on | `Get connected now` |
| Under it | `First call is free · audio only · about 15 min · no signup` |
| Card button, nobody on | `Pick a time` |
| Under it | `First call is free · about 15 min · they read your chat first` |
| Live badge | `Live right now` |
| Ringing button | `Ringing… {n}s` |

The separator is `·` (U+00B7 middle dot), not a hyphen and not an em dash.

## File Structure

| File | Responsibility |
| --- | --- |
| `supabase/migrations/20260725000000_presence_calls.sql` | `operator_presence` and `calls` tables, RLS on, two seed rows |
| `lib/operators.ts` | Static roster: names, roles, photos, companies, LinkedIn, tag sets with keywords, Telegram chat id env names, Cal link. Pure data plus the matching functions. No I/O. |
| `lib/presence.ts` | Server-only. Read and write `operator_presence`, apply the expiry rule. |
| `lib/callSummary.ts` | Pure. Brief plus last user message into two lines. |
| `lib/daily.ts` | Server-only. Create an audio room through Daily's REST API. |
| `lib/telegram.ts` | Server-only. Send and edit the ring push. |
| `lib/calLink.ts` | Pure. Build the prefilled Cal.com embed config. |
| `app/api/presence/route.ts` | Public POST. Takes a brief, returns the matched card and whether that person is on. |
| `app/api/operator/route.ts` | POST toggle, guarded by `OPERATOR_SECRET`. |
| `app/api/call/route.ts` | POST ring, GET status, POST answer, POST end. |
| `app/operator/page.tsx` | Both switches, countdown, extend, ringtone, Answer button. |
| `components/CallCard.tsx` | The three state card in the chat. |
| `components/BookingEmbed.tsx` | Cal.com inline embed. |
| `components/CallPill.tsx` | The titlebar pill. |
| `public/team/*.jpg` | Two headshots, five company logos. |

Modified: `components/Titlebar.tsx` (accept and render the pill), `components/Chat.tsx` (own the call state), `app/globals.css` (card and pill styles), `.env.example`, `CLAUDE.md`.

---

### Task 1: Roster and matching

The pure core everything else reads. No database, no network, so it is the easiest thing to get right and the cheapest to test.

**Files:**
- Create: `lib/operators.ts`
- Test: `lib/__tests__/operators.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type OperatorId = 'pulkit' | 'rohit'`
  - `interface OperatorTag { label: string; keywords: string[] }`
  - `interface Operator { id: OperatorId; name: string; role: string; photo: string; location: string; linkedin: string; companies: { logo: string; label: string }[]; rating: number; fixes: number; tags: OperatorTag[]; fallbackTag: string; telegramEnv: string; calLink: string }`
  - `const OPERATORS: Record<OperatorId, Operator>`
  - `const MATCH_ORDER: OperatorId[]` (Rohit first)
  - `function matchOperator(text: string): { id: OperatorId; tag: string }`, which always returns someone
  - `function tagFor(id: OperatorId, text: string): string`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/operators.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { matchOperator, OPERATORS, tagFor } from '../operators';

describe('matchOperator', () => {
  it('sends a payments question to Rohit with the payments tag', () => {
    expect(matchOperator('our stripe webhooks are dropping events')).toEqual({
      id: 'rohit',
      tag: 'Payments & APIs',
    });
  });

  it('sends an automation question to Pulkit', () => {
    expect(matchOperator('rebuild our clay to n8n handoff')).toEqual({
      id: 'pulkit',
      tag: 'Workflow automation',
    });
  });

  it('sends an outbound question to Pulkit', () => {
    expect(matchOperator('2% reply rates on cold email')).toEqual({
      id: 'pulkit',
      tag: 'Outbound & GTM',
    });
  });

  it('is case insensitive', () => {
    expect(matchOperator('STRIPE WEBHOOK').id).toBe('rohit');
  });

  it('falls back to Rohit and his fallback tag when nothing matches', () => {
    expect(matchOperator('i want to talk about something else')).toEqual({
      id: 'rohit',
      tag: 'Code & engineering',
    });
  });

  it('prefers the earlier tag when two match, so order is the priority', () => {
    // 'api' is in Payments & APIs, 'database' is in Backend & databases.
    expect(matchOperator('an api that reads the database').tag).toBe('Payments & APIs');
  });

  it('does not match a keyword inside a longer word', () => {
    // 'make' is a Pulkit keyword; 'makefile' must not trigger it.
    expect(matchOperator('my makefile is broken').id).toBe('rohit');
  });
});

describe('tagFor', () => {
  it('returns the operator fallback when their own keywords miss', () => {
    expect(tagFor('pulkit', 'stripe webhooks')).toBe('GTM & automations');
  });

  it('returns the matching tag for that operator', () => {
    expect(tagFor('rohit', 'the vercel deploy is broken')).toBe('Debugging & deploys');
  });
});

describe('OPERATORS', () => {
  it('has no em dashes in any copy', () => {
    expect(JSON.stringify(OPERATORS)).not.toContain('—');
  });

  it('puts both of them in San Francisco', () => {
    expect(OPERATORS.pulkit.location).toBe('San Francisco');
    expect(OPERATORS.rohit.location).toBe('San Francisco');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/__tests__/operators.test.ts
```

Expected: FAIL, cannot resolve `../operators`.

- [ ] **Step 3: Write the implementation**

Create `lib/operators.ts`:

```typescript
// The roster. Names, credential copy and tags live here rather than in the
// database: they change when copy is rewritten, not when a switch is
// flipped, so they belong in reviewed code.
//
// Order matters twice. MATCH_ORDER decides who gets first refusal on a
// brief, and each operator's tags array is a priority list because the
// first keyword hit wins.

export type OperatorId = 'pulkit' | 'rohit';

export interface OperatorTag {
  label: string;
  keywords: string[];
}

export interface Operator {
  id: OperatorId;
  name: string;
  role: string;
  photo: string;
  location: string;
  linkedin: string;
  companies: { logo: string; label: string }[];
  rating: number;
  fixes: number;
  tags: OperatorTag[];
  fallbackTag: string;
  /** Name of the env var holding this person's Telegram chat id. */
  telegramEnv: string;
  calLink: string;
}

const CAL_LINK = 'pulkit-walia-plcgb7/15min';

export const OPERATORS: Record<OperatorId, Operator> = {
  rohit: {
    id: 'rohit',
    name: 'Rohit J.',
    role: 'Senior software engineer',
    photo: '/team/rohit.jpg',
    location: 'San Francisco',
    linkedin: 'https://www.linkedin.com/in/rohit-jain-343437187/',
    companies: [
      { logo: '/team/amazon.jpg', label: 'Amazon' },
      { logo: '/team/square.jpg', label: 'Square' },
    ],
    rating: 4.8,
    fixes: 12,
    tags: [
      {
        label: 'Payments & APIs',
        keywords: ['stripe', 'payments', 'billing', 'webhook', 'api', 'integration'],
      },
      {
        label: 'Debugging & deploys',
        keywords: ['bug', 'crash', 'error', 'broken', 'vercel', 'deploy', 'build'],
      },
      {
        label: 'Backend & databases',
        keywords: ['backend', 'server', 'database', 'postgres', 'supabase', 'query'],
      },
      {
        label: 'AI agents & LLM apps',
        keywords: ['agent', 'llm', 'claude', 'openai', 'rag', 'prompt', 'mcp'],
      },
    ],
    fallbackTag: 'Code & engineering',
    telegramEnv: 'TELEGRAM_CHAT_ID_ROHIT',
    calLink: CAL_LINK,
  },
  pulkit: {
    id: 'pulkit',
    name: 'Pulkit W.',
    role: 'Founder, growth & automation',
    photo: '/team/pulkit.jpg',
    location: 'San Francisco',
    linkedin: 'https://www.linkedin.com/in/pulkitwalia/',
    companies: [
      { logo: '/team/uc.jpg', label: 'Urban Company' },
      { logo: '/team/bessemer.jpg', label: 'Bessemer' },
      { logo: '/team/hbs.jpg', label: 'Harvard Business School' },
    ],
    rating: 4.7,
    fixes: 10,
    tags: [
      {
        label: 'Workflow automation',
        keywords: ['n8n', 'zapier', 'make', 'clay', 'automation', 'workflow', 'scrape'],
      },
      {
        label: 'Outbound & GTM',
        keywords: ['outbound', 'cold email', 'prospect', 'pipeline', 'sales', 'leads'],
      },
      {
        label: 'Landing pages & frontend',
        keywords: ['landing page', 'website', 'copy', 'frontend', 'design', 'conversion'],
      },
      {
        label: 'AI workflows',
        keywords: ['ai workflow', 'agent', 'automate with ai', 'claude', 'gpt'],
      },
    ],
    fallbackTag: 'GTM & automations',
    telegramEnv: 'TELEGRAM_CHAT_ID_PULKIT',
    calLink: CAL_LINK,
  },
};

// Rohit is swept first: a technical brief is the more expensive one to
// misroute, and his keywords are the more specific set.
export const MATCH_ORDER: OperatorId[] = ['rohit', 'pulkit'];

// Word boundaries on both sides, so 'make' does not fire on 'makefile'.
// Keywords may contain spaces, which is why this is a regex and not a split.
function hasKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

function findTag(op: Operator, text: string): string | null {
  for (const tag of op.tags) {
    if (tag.keywords.some((k) => hasKeyword(text, k))) return tag.label;
  }
  return null;
}

/** The tag for a specific person, falling back to their general one. */
export function tagFor(id: OperatorId, text: string): string {
  const op = OPERATORS[id];
  return findTag(op, text) ?? op.fallbackTag;
}

/**
 * Who to offer for this brief, and which tag their card shows. Always
 * returns someone: an unmatched brief goes to the head of MATCH_ORDER with
 * their fallback tag rather than showing nothing.
 */
export function matchOperator(text: string): { id: OperatorId; tag: string } {
  const lower = text.toLowerCase();
  for (const id of MATCH_ORDER) {
    const tag = findTag(OPERATORS[id], lower);
    if (tag) return { id, tag };
  }
  const first = MATCH_ORDER[0];
  return { id: first, tag: OPERATORS[first].fallbackTag };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/__tests__/operators.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/operators.ts lib/__tests__/operators.test.ts
git commit -m "Add the operator roster and brief matching"
```

---

### Task 2: Presence table and expiry rule

**Files:**
- Create: `supabase/migrations/20260725000000_presence_calls.sql`
- Create: `lib/presence.ts`
- Test: `lib/__tests__/presence.test.ts`

**Interfaces:**
- Consumes: `OperatorId` from `lib/operators.ts`; `selectRows` from `lib/supabase.ts`.
- Produces:
  - `const PRESENCE_HOURS = 4`
  - `interface PresenceRow { id: OperatorId; online: boolean; expires_at: string | null }`
  - `function isAvailable(row: PresenceRow | null, now?: Date): boolean`
  - `async function readPresence(): Promise<Record<OperatorId, boolean>>`, all false on any failure
  - `async function setPresence(id: OperatorId, online: boolean): Promise<void>`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260725000000_presence_calls.sql`:

```sql
-- Presence and calls for the "Talk to a human" pill in the chat.
--
-- Same posture as every other table here: RLS on with no policies, so the
-- publishable key can neither read nor write. All access goes through
-- server routes with the secret key.

-- One row per operator. Available means online = true AND expires_at >
-- now(); the expiry is what stops a switch left on overnight from ringing
-- someone at 3am.
create table operator_presence (
  id          text primary key,
  online      boolean not null default false,
  expires_at  timestamptz,
  updated_at  timestamptz not null default now()
);

insert into operator_presence (id) values ('pulkit'), ('rohit');

alter table operator_presence enable row level security;

-- One row per attempt to reach a human, answered or not. The missed rows
-- are the interesting ones: they say how often someone wanted to talk and
-- nobody was there.
create table calls (
  id            uuid primary key,
  session_id    uuid,
  operator_id   text,
  room_url      text,
  status        text not null check (status in ('ringing', 'answered', 'missed', 'ended')),
  summary       text,
  visitor_name  text,
  created_at    timestamptz not null default now(),
  answered_at   timestamptz,
  ended_at      timestamptz
);

create index calls_status_idx on calls (status);
create index calls_session_id_idx on calls (session_id);

alter table calls enable row level security;
```

- [ ] **Step 2: Write the failing test**

Create `lib/__tests__/presence.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAvailable, readPresence, setPresence } from '../presence';

const NOW = new Date('2026-07-25T12:00:00Z');
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isAvailable', () => {
  it('is true when online and the expiry is in the future', () => {
    const row = { id: 'pulkit' as const, online: true, expires_at: '2026-07-25T13:00:00Z' };
    expect(isAvailable(row, NOW)).toBe(true);
  });

  it('is false one second after the expiry', () => {
    const row = { id: 'pulkit' as const, online: true, expires_at: '2026-07-25T11:59:59Z' };
    expect(isAvailable(row, NOW)).toBe(false);
  });

  it('is false when online is false even with a future expiry', () => {
    const row = { id: 'pulkit' as const, online: false, expires_at: '2026-07-25T13:00:00Z' };
    expect(isAvailable(row, NOW)).toBe(false);
  });

  it('is false when the expiry is missing', () => {
    const row = { id: 'pulkit' as const, online: true, expires_at: null };
    expect(isAvailable(row, NOW)).toBe(false);
  });

  it('is false for a missing row', () => {
    expect(isAvailable(null, NOW)).toBe(false);
  });
});

describe('readPresence', () => {
  it('maps rows to availability', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 'pulkit', online: true, expires_at: '2999-01-01T00:00:00Z' },
          { id: 'rohit', online: false, expires_at: null },
        ]),
        { status: 200 },
      ),
    );
    expect(await readPresence()).toEqual({ pulkit: true, rohit: false });
  });

  it('returns everyone offline when Supabase fails', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    expect(await readPresence()).toEqual({ pulkit: false, rohit: false });
  });

  it('returns everyone offline when Supabase is unconfigured', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    expect(await readPresence()).toEqual({ pulkit: false, rohit: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('setPresence', () => {
  it('sends an expiry four hours out when switching on', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await setPresence('rohit', true);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.online).toBe(true);
    expect(body.expires_at).toBe('2026-07-25T16:00:00.000Z');
    vi.useRealTimers();
  });

  it('clears the expiry when switching off', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await setPresence('rohit', false);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body).toMatchObject({ online: false, expires_at: null });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run lib/__tests__/presence.test.ts
```

Expected: FAIL, cannot resolve `../presence`.

- [ ] **Step 4: Write the implementation**

Create `lib/presence.ts`:

```typescript
import { MATCH_ORDER, type OperatorId } from '@/lib/operators';
import { selectRows } from '@/lib/supabase';

// Server-only reader and writer for operator_presence. Availability is
// computed in exactly one place, so the operator page and the chat can
// never disagree about who is around.

if (typeof window !== 'undefined') {
  throw new Error('lib/presence is server-only and must never reach the client');
}

export const PRESENCE_HOURS = 4;

const TIMEOUT_MS = 3_000;

export interface PresenceRow {
  id: OperatorId;
  online: boolean;
  expires_at: string | null;
}

/**
 * The whole rule. A switch left on is only meaningful until its expiry,
 * which is what stops a forgotten toggle from ringing at 3am.
 */
export function isAvailable(row: PresenceRow | null, now: Date = new Date()): boolean {
  if (!row || !row.online || !row.expires_at) return false;
  const expires = Date.parse(row.expires_at);
  return Number.isFinite(expires) && expires > now.getTime();
}

function allOffline(): Record<OperatorId, boolean> {
  return { pulkit: false, rohit: false };
}

/**
 * Availability for everyone. Any failure returns all false: showing a
 * booking link we can honour beats a call button we cannot.
 */
export async function readPresence(): Promise<Record<OperatorId, boolean>> {
  const rows = await selectRows<PresenceRow>(
    'operator_presence',
    'select=id,online,expires_at',
  );
  if (!rows) return allOffline();
  const out = allOffline();
  for (const id of MATCH_ORDER) {
    out[id] = isAvailable(rows.find((r) => r.id === id) ?? null);
  }
  return out;
}

export async function setPresence(id: OperatorId, online: boolean): Promise<void> {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  const expiresAt = online
    ? new Date(Date.now() + PRESENCE_HOURS * 3_600_000).toISOString()
    : null;
  try {
    const res = await fetch(`${url}/rest/v1/operator_presence?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        online,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[midsesh:presence] toggle failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('[midsesh:presence] toggle failed', err);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run lib/__tests__/presence.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260725000000_presence_calls.sql lib/presence.ts lib/__tests__/presence.test.ts
git commit -m "Add presence and calls tables with the four hour expiry rule"
```

---

### Task 3: Call summary and Cal.com prefill

Two pure builders. Both feed the ring and the booking fallback.

**Files:**
- Create: `lib/callSummary.ts`
- Create: `lib/calLink.ts`
- Test: `lib/__tests__/callSummary.test.ts`
- Test: `lib/__tests__/calLink.test.ts`

**Interfaces:**
- Consumes: `Brief` from `lib/types.ts`; `OPERATORS`, `OperatorId` from `lib/operators.ts`.
- Produces:
  - `function buildSummary(brief: Brief | null, lastMessage: string): string`
  - `interface CalPrefill { calLink: string; name: string | null; email: string | null; notes: string }`
  - `function buildCalPrefill(id: OperatorId, brief: Brief | null, lastMessage: string, contact: { name?: string | null; email?: string | null }): CalPrefill`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/callSummary.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildSummary } from '../callSummary';
import type { Brief } from '../types';

const BRIEF: Brief = {
  expert_type: 'Backend engineer',
  domain: 'fintech',
  specifics: 'Stripe webhooks dropping events under load',
  engagement: 'one off fix',
  budget: '$500',
  timeline: 'this week',
  search_query: 'stripe webhook reliability engineer',
};

describe('buildSummary', () => {
  it('leads with the need and the specifics', () => {
    const out = buildSummary(BRIEF, 'it started yesterday');
    expect(out).toContain('Backend engineer');
    expect(out).toContain('Stripe webhooks dropping events under load');
  });

  it('includes the last message', () => {
    expect(buildSummary(BRIEF, 'it started yesterday')).toContain('it started yesterday');
  });

  it('is two lines', () => {
    expect(buildSummary(BRIEF, 'it started yesterday').split('\n')).toHaveLength(2);
  });

  it('falls back to the message alone when there is no brief', () => {
    expect(buildSummary(null, 'my build is broken')).toBe('No brief yet.\nmy build is broken');
  });

  it('truncates a very long message', () => {
    const out = buildSummary(BRIEF, 'x'.repeat(500));
    expect(out.length).toBeLessThan(500);
    expect(out).toContain('…');
  });

  it('never emits an em dash', () => {
    expect(buildSummary(BRIEF, 'a — b')).not.toContain('—');
  });
});
```

Create `lib/__tests__/calLink.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildCalPrefill } from '../calLink';
import type { Brief } from '../types';

const BRIEF: Brief = {
  expert_type: 'Backend engineer',
  domain: 'fintech',
  specifics: 'Stripe webhooks dropping events',
  engagement: 'one off fix',
  budget: '$500',
  timeline: 'this week',
  search_query: 'stripe webhook engineer',
};

describe('buildCalPrefill', () => {
  it('uses the operator cal link', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'help', {});
    expect(out.calLink).toBe('pulkit-walia-plcgb7/15min');
  });

  it('passes name and email through when present', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'help', { name: 'Ada', email: 'a@b.co' });
    expect(out.name).toBe('Ada');
    expect(out.email).toBe('a@b.co');
  });

  it('leaves name and email null when absent', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'help', {});
    expect(out.name).toBeNull();
    expect(out.email).toBeNull();
  });

  it('puts the summary in the notes', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'it broke today', {});
    expect(out.notes).toContain('Stripe webhooks dropping events');
    expect(out.notes).toContain('it broke today');
  });

  it('never emits an em dash', () => {
    const out = buildCalPrefill('rohit', BRIEF, 'a — b', { name: 'x — y' });
    expect(JSON.stringify(out)).not.toContain('—');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/__tests__/callSummary.test.ts lib/__tests__/calLink.test.ts
```

Expected: FAIL, cannot resolve the modules.

- [ ] **Step 3: Write the implementations**

Create `lib/callSummary.ts`:

```typescript
import { stripEmDashes } from '@/lib/humanize';
import type { Brief } from '@/lib/types';

// Two lines, because that is what fits in a Telegram notification without
// being expanded. Line one is what they need, line two is what they just
// said, which is usually the detail that decides whether to pick up.

const MAX_LINE = 180;

function clip(text: string, max = MAX_LINE): string {
  const clean = stripEmDashes(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function buildSummary(brief: Brief | null, lastMessage: string): string {
  const message = clip(lastMessage) || 'No message.';
  if (!brief) return `No brief yet.\n${message}`;
  const need = [brief.expert_type, brief.specifics].filter(Boolean).join(': ');
  return `${clip(need) || 'No brief yet.'}\n${message}`;
}
```

Create `lib/calLink.ts`:

```typescript
import { buildSummary } from '@/lib/callSummary';
import { OPERATORS, type OperatorId } from '@/lib/operators';
import { stripEmDashes } from '@/lib/humanize';
import type { Brief } from '@/lib/types';

// Everything the Cal.com inline embed needs. Kept pure and separate from
// the component so the prefill can be tested without a browser.

export interface CalPrefill {
  calLink: string;
  name: string | null;
  email: string | null;
  notes: string;
}

export function buildCalPrefill(
  id: OperatorId,
  brief: Brief | null,
  lastMessage: string,
  contact: { name?: string | null; email?: string | null },
): CalPrefill {
  return {
    calLink: OPERATORS[id].calLink,
    name: contact.name ? stripEmDashes(contact.name) : null,
    email: contact.email ?? null,
    notes: buildSummary(brief, lastMessage),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/callSummary.test.ts lib/__tests__/calLink.test.ts
```

Expected: PASS, 11 tests. If `stripEmDashes` is not exported from `lib/humanize.ts`, read that file and use whatever the equivalent export is called.

- [ ] **Step 5: Commit**

```bash
git add lib/callSummary.ts lib/calLink.ts lib/__tests__/callSummary.test.ts lib/__tests__/calLink.test.ts
git commit -m "Add the call summary and Cal.com prefill builders"
```

---

### Task 4: Daily room and Telegram push

Both are thin wrappers over one HTTP call each, and both fail soft. Grouped because neither is worth its own review gate.

**Files:**
- Create: `lib/daily.ts`
- Create: `lib/telegram.ts`
- Test: `lib/__tests__/daily.test.ts`
- Test: `lib/__tests__/telegram.test.ts`

**Interfaces:**
- Consumes: `OPERATORS`, `OperatorId` from `lib/operators.ts`.
- Produces:
  - `async function createAudioRoom(callId: string): Promise<string | null>`
  - `async function sendRing(id: OperatorId, summary: string, joinUrl: string): Promise<number | null>` returns the Telegram message id
  - `async function editRing(id: OperatorId, messageId: number, text: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/daily.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudioRoom } from '../daily';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('DAILY_API_KEY', 'test-key');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createAudioRoom', () => {
  it('returns the room url', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://x.daily.co/abc' }), { status: 200 }),
    );
    expect(await createAudioRoom('abc')).toBe('https://x.daily.co/abc');
  });

  it('asks for a room with video off on both sides', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://x.daily.co/abc' }), { status: 200 }),
    );
    await createAudioRoom('abc');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.properties.start_video_off).toBe(true);
    expect(body.properties.start_audio_off).toBe(false);
  });

  it('returns null when Daily errors', async () => {
    fetchMock.mockResolvedValue(new Response('bad', { status: 500 }));
    expect(await createAudioRoom('abc')).toBeNull();
  });

  it('returns null without an api key and makes no request', async () => {
    vi.stubEnv('DAILY_API_KEY', '');
    expect(await createAudioRoom('abc')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the request throws', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    expect(await createAudioRoom('abc')).toBeNull();
  });
});
```

Create `lib/__tests__/telegram.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editRing, sendRing } from '../telegram';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'bot-token');
  vi.stubEnv('TELEGRAM_CHAT_ID_ROHIT', '111');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendRing', () => {
  it('returns the message id', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 }),
    );
    expect(await sendRing('rohit', 'needs help', 'https://x.daily.co/a')).toBe(42);
  });

  it('sends to that operator chat id with a join button', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 }),
    );
    await sendRing('rohit', 'needs help', 'https://x.daily.co/a');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.chat_id).toBe('111');
    expect(body.text).toContain('needs help');
    expect(JSON.stringify(body.reply_markup)).toContain('https://x.daily.co/a');
  });

  it('returns null when that operator has no chat id configured', async () => {
    vi.stubEnv('TELEGRAM_CHAT_ID_ROHIT', '');
    expect(await sendRing('rohit', 'x', 'https://x.daily.co/a')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when Telegram errors', async () => {
    fetchMock.mockResolvedValue(new Response('bad', { status: 500 }));
    expect(await sendRing('rohit', 'x', 'https://x.daily.co/a')).toBeNull();
  });
});

describe('editRing', () => {
  it('edits the message in place', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await editRing('rohit', 42, 'They left.');
    expect(String(fetchMock.mock.calls[0][0])).toContain('editMessageText');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.message_id).toBe(42);
    expect(body.text).toBe('They left.');
  });

  it('does nothing without a token', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    await editRing('rohit', 42, 'x');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/__tests__/daily.test.ts lib/__tests__/telegram.test.ts
```

Expected: FAIL, cannot resolve the modules.

- [ ] **Step 3: Write the implementations**

Create `lib/daily.ts`:

```typescript
// Creates the audio room a call runs in. Returns null on every failure so
// the caller can fall back to booking instead of showing a broken call.

if (typeof window !== 'undefined') {
  throw new Error('lib/daily is server-only and must never reach the client');
}

const TIMEOUT_MS = 5_000;
const ROOM_MINUTES = 60;

export async function createAudioRoom(callId: string): Promise<string | null> {
  const key = process.env.DAILY_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `midsesh-${callId}`,
        privacy: 'public',
        properties: {
          // Audio only. Both sides join muted-video; nobody has to think
          // about whether they are camera ready.
          start_video_off: true,
          start_audio_off: false,
          enable_chat: false,
          enable_screenshare: false,
          exp: Math.floor(Date.now() / 1000) + ROOM_MINUTES * 60,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[midsesh:daily] room create failed', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { url?: string };
    return data.url ?? null;
  } catch (err) {
    console.error('[midsesh:daily] room create failed', err);
    return null;
  }
}
```

Create `lib/telegram.ts`:

```typescript
import { OPERATORS, type OperatorId } from '@/lib/operators';

// The ring that reaches a pocket. Fire and forget: a Telegram outage must
// never break a call, because the operator page rings too.

if (typeof window !== 'undefined') {
  throw new Error('lib/telegram is server-only and must never reach the client');
}

const TIMEOUT_MS = 4_000;

function chatId(id: OperatorId): string | null {
  return process.env[OPERATORS[id].telegramEnv] || null;
}

async function call(method: string, body: object): Promise<unknown | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[midsesh:telegram] ${method} failed`, res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[midsesh:telegram] ${method} failed`, err);
    return null;
  }
}

/** Returns the message id so it can be edited when the call resolves. */
export async function sendRing(
  id: OperatorId,
  summary: string,
  joinUrl: string,
): Promise<number | null> {
  const chat = chatId(id);
  if (!chat) return null;
  const data = (await call('sendMessage', {
    chat_id: chat,
    text: `Someone wants to talk.\n\n${summary}`,
    reply_markup: {
      inline_keyboard: [[{ text: 'Join the call', url: joinUrl }]],
    },
  })) as { result?: { message_id?: number } } | null;
  return data?.result?.message_id ?? null;
}

export async function editRing(
  id: OperatorId,
  messageId: number,
  text: string,
): Promise<void> {
  const chat = chatId(id);
  if (!chat) return;
  await call('editMessageText', { chat_id: chat, message_id: messageId, text });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/daily.test.ts lib/__tests__/telegram.test.ts
```

Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/daily.ts lib/telegram.ts lib/__tests__/daily.test.ts lib/__tests__/telegram.test.ts
git commit -m "Add the Daily audio room and the Telegram ring"
```

---

### Task 5: The presence API route

What the pill calls on tap. Returns the card to show and whether that person is on. Never returns a Telegram id, a Cal secret, or anything about who is off.

**Files:**
- Create: `app/api/presence/route.ts`
- Test: `lib/__tests__/presenceRoute.test.ts`

**Interfaces:**
- Consumes: `matchOperator`, `tagFor`, `OPERATORS` from `lib/operators.ts`; `readPresence` from `lib/presence.ts`; `coerceBrief`, `parseSessionId` from `lib/validate.ts`; `clientId`, `rateLimit` from `lib/ratelimit.ts`; `matchesOrigin` from `lib/sanitize.ts`; `withMetrics` from `lib/metrics.ts`.
- Produces the response shape every client component reads:
  ```typescript
  interface PresenceReply {
    online: boolean;
    card: {
      id: 'pulkit' | 'rohit';
      name: string;
      role: string;
      photo: string;
      location: string;
      linkedin: string;
      companies: { logo: string; label: string }[];
      rating: number;
      fixes: number;
      tag: string;
    };
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/presenceRoute.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/presence', () => ({ readPresence: vi.fn() }));
vi.mock('@/lib/metrics', () => ({
  withMetrics: (_route: string, fn: unknown) => fn,
}));

import { readPresence } from '@/lib/presence';
import { POST } from '@/app/api/presence/route';
import type { NextRequest } from 'next/server';

function request(body: object): NextRequest {
  return {
    headers: new Headers({ origin: 'https://midsesh.com', host: 'midsesh.com' }),
    json: async () => body,
  } as unknown as NextRequest;
}

const BRIEF = {
  expert_type: 'Backend engineer',
  domain: 'fintech',
  specifics: 'stripe webhooks dropping events',
  engagement: 'fix',
  budget: '$500',
  timeline: 'now',
  search_query: 'stripe engineer',
};

beforeEach(() => {
  vi.mocked(readPresence).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/presence', () => {
  it('offers the matched person when they are on', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe is broken' }));
    const data = await res.json();
    expect(data.online).toBe(true);
    expect(data.card.id).toBe('rohit');
    expect(data.card.tag).toBe('Payments & APIs');
  });

  it('offers the other person, with their own tag, when the match is off', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: true, rohit: false });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe is broken' }));
    const data = await res.json();
    expect(data.online).toBe(true);
    expect(data.card.id).toBe('pulkit');
    expect(data.card.tag).toBe('GTM & automations');
  });

  it('still returns the matched card when nobody is on', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: false });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe is broken' }));
    const data = await res.json();
    expect(data.online).toBe(false);
    expect(data.card.id).toBe('rohit');
  });

  it('never leaks the telegram env name or the cal link', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
    const res = await POST(request({ brief: BRIEF, lastMessage: 'stripe' }));
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('TELEGRAM');
    expect(text).not.toContain('pulkit-walia-plcgb7');
  });

  it('rejects a cross origin request', async () => {
    const req = {
      headers: new Headers({ origin: 'https://evil.com', host: 'midsesh.com' }),
      json: async () => ({}),
    } as unknown as NextRequest;
    expect((await POST(req)).status).toBe(403);
  });

  it('works with no brief, matching on the message alone', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: true, rohit: false });
    const res = await POST(request({ lastMessage: 'my n8n workflow keeps failing' }));
    const data = await res.json();
    expect(data.card.id).toBe('pulkit');
    expect(data.card.tag).toBe('Workflow automation');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/__tests__/presenceRoute.test.ts
```

Expected: FAIL, cannot resolve `@/app/api/presence/route`.

- [ ] **Step 3: Write the implementation**

Create `app/api/presence/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { MATCH_ORDER, matchOperator, OPERATORS, tagFor } from '@/lib/operators';
import { readPresence } from '@/lib/presence';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { coerceBrief } from '@/lib/validate';

const MAX_MESSAGE_CHARS = 600;

// Asked once, when the visitor taps the pill. Nothing is polled, so the
// chat never advertises an empty room.
async function handlePresence(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!rateLimit(clientId(req), 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const brief = coerceBrief(body.brief);
  const lastMessage =
    typeof body.lastMessage === 'string' ? body.lastMessage.slice(0, MAX_MESSAGE_CHARS) : '';
  const haystack = [
    brief?.expert_type,
    brief?.domain,
    brief?.specifics,
    brief?.search_query,
    lastMessage,
  ]
    .filter(Boolean)
    .join(' ');

  const matched = matchOperator(haystack);
  const presence = await readPresence();

  // If the matched person is off but the other is on, offer the one who is
  // on, with their own tag. The card never shows someone who will not answer.
  let id = matched.id;
  let tag = matched.tag;
  if (!presence[id]) {
    const other = MATCH_ORDER.find((o) => o !== id && presence[o]);
    if (other) {
      id = other;
      tag = tagFor(other, haystack);
    }
  }

  const op = OPERATORS[id];
  return NextResponse.json({
    online: presence[id],
    card: {
      id: op.id,
      name: op.name,
      role: op.role,
      photo: op.photo,
      location: op.location,
      linkedin: op.linkedin,
      companies: op.companies,
      rating: op.rating,
      fixes: op.fixes,
      tag,
    },
  });
}

export const POST = withMetrics('presence', handlePresence);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/__tests__/presenceRoute.test.ts
```

Expected: PASS, 6 tests. If `withMetrics` has a different signature, read `lib/metrics.ts` and match the shape used in `app/api/intros/route.ts`.

- [ ] **Step 5: Commit**

```bash
git add app/api/presence/route.ts lib/__tests__/presenceRoute.test.ts
git commit -m "Add the presence route that resolves the card on tap"
```

---

### Task 6: The call route

Ring, poll, answer, end. The state machine lives here.

**Files:**
- Create: `app/api/call/route.ts`
- Test: `lib/__tests__/callRoute.test.ts`

**Interfaces:**
- Consumes: `createAudioRoom` from `lib/daily.ts`; `sendRing`, `editRing` from `lib/telegram.ts`; `buildSummary` from `lib/callSummary.ts`; `readPresence` from `lib/presence.ts`; `OPERATORS` from `lib/operators.ts`.
- Produces:
  - `POST /api/call` with `{ action: 'ring', operatorId, sessionId, brief, lastMessage }` returns `{ callId, roomUrl }` or `{ error }` with 503
  - `GET /api/call?id=<uuid>` returns `{ status, roomUrl }`
  - `POST /api/call` with `{ action: 'answer', callId }` returns `{ ok, alreadyAnswered }`
  - `POST /api/call` with `{ action: 'end', callId }` returns `{ ok: true }`
  - `const RING_SECONDS = 60`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/callRoute.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/daily', () => ({ createAudioRoom: vi.fn() }));
vi.mock('@/lib/telegram', () => ({ sendRing: vi.fn(), editRing: vi.fn() }));
vi.mock('@/lib/presence', () => ({ readPresence: vi.fn() }));
vi.mock('@/lib/callStore', () => ({
  createCall: vi.fn(),
  readCall: vi.fn(),
  answerCall: vi.fn(),
  endCall: vi.fn(),
}));
vi.mock('@/lib/metrics', () => ({ withMetrics: (_r: string, fn: unknown) => fn }));

import { createAudioRoom } from '@/lib/daily';
import { sendRing } from '@/lib/telegram';
import { readPresence } from '@/lib/presence';
import { answerCall, createCall, endCall, readCall } from '@/lib/callStore';
import { GET, POST, RING_SECONDS } from '@/app/api/call/route';
import type { NextRequest } from 'next/server';

const SESSION = '3b241101-e2bb-4255-8caf-4136c566a962';

function post(body: object): NextRequest {
  return {
    headers: new Headers({ origin: 'https://midsesh.com', host: 'midsesh.com' }),
    json: async () => body,
  } as unknown as NextRequest;
}

function get(id: string): NextRequest {
  return {
    headers: new Headers({ origin: 'https://midsesh.com', host: 'midsesh.com' }),
    nextUrl: new URL(`https://midsesh.com/api/call?id=${id}`),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
  vi.mocked(createAudioRoom).mockResolvedValue('https://x.daily.co/abc');
  vi.mocked(sendRing).mockResolvedValue(7);
  vi.mocked(createCall).mockResolvedValue(undefined);
  vi.mocked(answerCall).mockResolvedValue(true);
  vi.mocked(endCall).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ring', () => {
  it('rings for 60 seconds', () => {
    expect(RING_SECONDS).toBe(60);
  });

  it('creates a room and returns it', async () => {
    const res = await POST(
      post({ action: 'ring', operatorId: 'rohit', sessionId: SESSION, lastMessage: 'stripe' }),
    );
    const data = await res.json();
    expect(data.roomUrl).toBe('https://x.daily.co/abc');
    expect(data.callId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('pushes to Telegram with the summary', async () => {
    await POST(
      post({ action: 'ring', operatorId: 'rohit', sessionId: SESSION, lastMessage: 'stripe' }),
    );
    expect(sendRing).toHaveBeenCalledWith('rohit', expect.stringContaining('stripe'), 'https://x.daily.co/abc');
  });

  it('refuses when that operator is not on', async () => {
    vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: false });
    const res = await POST(
      post({ action: 'ring', operatorId: 'rohit', sessionId: SESSION, lastMessage: 'x' }),
    );
    expect(res.status).toBe(503);
    expect(createAudioRoom).not.toHaveBeenCalled();
  });

  it('refuses when Daily cannot make a room', async () => {
    vi.mocked(createAudioRoom).mockResolvedValue(null);
    const res = await POST(
      post({ action: 'ring', operatorId: 'rohit', sessionId: SESSION, lastMessage: 'x' }),
    );
    expect(res.status).toBe(503);
    expect(sendRing).not.toHaveBeenCalled();
  });

  it('rejects an unknown operator id', async () => {
    const res = await POST(
      post({ action: 'ring', operatorId: 'mallory', sessionId: SESSION, lastMessage: 'x' }),
    );
    expect(res.status).toBe(400);
  });

  it('rate limits a session to one ring every five minutes', async () => {
    const body = { action: 'ring', operatorId: 'rohit', sessionId: SESSION, lastMessage: 'x' };
    expect((await POST(post(body))).status).toBe(200);
    expect((await POST(post(body))).status).toBe(429);
  });
});

describe('status', () => {
  it('reports the current status', async () => {
    vi.mocked(readCall).mockResolvedValue({
      id: 'abc',
      status: 'answered',
      room_url: 'https://x.daily.co/abc',
      operator_id: 'rohit',
    });
    const res = await GET(get('abc'));
    expect(await res.json()).toMatchObject({ status: 'answered' });
  });

  it('404s an unknown call', async () => {
    vi.mocked(readCall).mockResolvedValue(null);
    expect((await GET(get('nope'))).status).toBe(404);
  });
});

describe('end', () => {
  it('edits the Telegram message when the call was missed', async () => {
    const { editRing } = await import('@/lib/telegram');
    vi.mocked(editRing).mockClear();
    await POST(
      post({ action: 'end', callId: 'abc', missed: true, messageId: 7, operatorId: 'rohit' }),
    );
    expect(editRing).toHaveBeenCalledWith('rohit', 7, expect.stringContaining('booked'));
  });

  it('does not edit anything on a normal hang up', async () => {
    const { editRing } = await import('@/lib/telegram');
    vi.mocked(editRing).mockClear();
    await POST(post({ action: 'end', callId: 'abc' }));
    expect(editRing).not.toHaveBeenCalled();
  });
});

describe('answer', () => {
  it('reports the first answer as taken', async () => {
    const res = await POST(post({ action: 'answer', callId: 'abc' }));
    expect(await res.json()).toEqual({ ok: true, alreadyAnswered: false });
  });

  it('reports a second answer as already taken', async () => {
    vi.mocked(answerCall).mockResolvedValue(false);
    const res = await POST(post({ action: 'answer', callId: 'abc' }));
    expect(await res.json()).toEqual({ ok: true, alreadyAnswered: true });
  });
});
```

- [ ] **Step 2: Write `lib/callStore.ts` first**

The test mocks it, so it must exist with these exact exports. Create `lib/callStore.ts`:

```typescript
import type { OperatorId } from '@/lib/operators';
import { selectRows } from '@/lib/supabase';

// Reads and writes to the calls table. Split out from the route so the
// route can be tested without Supabase, and so the conditional answer
// update lives in one place.

if (typeof window !== 'undefined') {
  throw new Error('lib/callStore is server-only and must never reach the client');
}

const TIMEOUT_MS = 3_000;

export interface CallRow {
  id: string;
  status: 'ringing' | 'answered' | 'missed' | 'ended';
  room_url: string | null;
  operator_id: string | null;
}

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string, prefer: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

export async function createCall(row: {
  id: string;
  sessionId: string | null;
  operatorId: OperatorId;
  roomUrl: string;
  summary: string;
}): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/rest/v1/calls`, {
      method: 'POST',
      headers: headers(cfg.key, 'return=minimal'),
      body: JSON.stringify({
        id: row.id,
        session_id: row.sessionId,
        operator_id: row.operatorId,
        room_url: row.roomUrl,
        summary: row.summary,
        status: 'ringing',
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[midsesh:calls] create failed', err);
  }
}

export async function readCall(id: string): Promise<CallRow | null> {
  const rows = await selectRows<CallRow>(
    'calls',
    `id=eq.${encodeURIComponent(id)}&select=id,status,room_url,operator_id&limit=1`,
  );
  return rows?.[0] ?? null;
}

/**
 * Flips ringing to answered. Filtering on status=eq.ringing makes this a
 * compare-and-set: the Telegram tap and the operator page tap race, and
 * whichever lands second gets an empty result and learns it lost.
 */
export async function answerCall(id: string): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/calls?id=eq.${encodeURIComponent(id)}&status=eq.ringing`,
      {
        method: 'PATCH',
        headers: headers(cfg.key, 'return=representation'),
        body: JSON.stringify({ status: 'answered', answered_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) return false;
    const rows = (await res.json()) as unknown[];
    return rows.length > 0;
  } catch (err) {
    console.error('[midsesh:calls] answer failed', err);
    return false;
  }
}

export async function endCall(
  id: string,
  status: 'ended' | 'missed' = 'ended',
): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/rest/v1/calls?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: headers(cfg.key, 'return=minimal'),
      body: JSON.stringify({ status, ended_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[midsesh:calls] end failed', err);
  }
}
```


- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run lib/__tests__/callRoute.test.ts
```

Expected: FAIL, cannot resolve `@/app/api/call/route`.

- [ ] **Step 4: Write the route**

Create `app/api/call/route.ts`:

```typescript
import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildSummary } from '@/lib/callSummary';
import { answerCall, createCall, endCall, readCall } from '@/lib/callStore';
import { createAudioRoom } from '@/lib/daily';
import { withMetrics } from '@/lib/metrics';
import { OPERATORS, type OperatorId } from '@/lib/operators';
import { readPresence } from '@/lib/presence';
import { clientId, rateLimit } from '@/lib/ratelimit';
import { matchesOrigin } from '@/lib/sanitize';
import { editRing, sendRing } from '@/lib/telegram';
import { coerceBrief, parseSessionId } from '@/lib/validate';

export const RING_SECONDS = 60;

const RING_WINDOW_MS = 5 * 60_000;
const MAX_MESSAGE_CHARS = 600;

// One ring per session every five minutes. Presence already gates who can
// be reached at all; this stops a single visitor from ringing on a loop.
const lastRing = new Map<string, number>();

function isOperatorId(v: unknown): v is OperatorId {
  return v === 'pulkit' || v === 'rohit';
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) return forbidden();
  if (!rateLimit(clientId(req), 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action === 'answer') {
    const id = typeof body.callId === 'string' ? body.callId : '';
    if (!id) return NextResponse.json({ error: 'Missing callId' }, { status: 400 });
    const won = await answerCall(id);
    return NextResponse.json({ ok: true, alreadyAnswered: !won });
  }

  if (body.action === 'end') {
    const id = typeof body.callId === 'string' ? body.callId : '';
    if (!id) return NextResponse.json({ error: 'Missing callId' }, { status: 400 });
    const missed = body.missed === true;
    await endCall(id, missed ? 'missed' : 'ended');
    // A missed call leaves a Telegram message inviting you into a room
    // nobody is in. Edit it so a late tap does not land in an empty call.
    if (missed) {
      const messageId = typeof body.messageId === 'number' ? body.messageId : null;
      if (messageId !== null && isOperatorId(body.operatorId)) {
        await editRing(body.operatorId, messageId, 'They gave up waiting and booked a time instead.');
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action !== 'ring') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const operatorId = body.operatorId;
  if (!isOperatorId(operatorId)) {
    return NextResponse.json({ error: 'Unknown operator' }, { status: 400 });
  }

  const sessionId = parseSessionId(body.sessionId);
  const ringKey = sessionId ?? clientId(req);
  const previous = lastRing.get(ringKey) ?? 0;
  if (Date.now() - previous < RING_WINDOW_MS) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Presence is rechecked here rather than trusted from the client. The tap
  // and the ring are seconds apart, and a switch can flip in between.
  const presence = await readPresence();
  if (!presence[operatorId]) {
    return NextResponse.json({ error: 'Nobody is available' }, { status: 503 });
  }

  const callId = randomUUID();
  const roomUrl = await createAudioRoom(callId);
  if (!roomUrl) {
    return NextResponse.json({ error: 'Could not start the call' }, { status: 503 });
  }

  lastRing.set(ringKey, Date.now());
  if (lastRing.size > 5_000) lastRing.clear();

  const lastMessage =
    typeof body.lastMessage === 'string' ? body.lastMessage.slice(0, MAX_MESSAGE_CHARS) : '';
  const summary = buildSummary(coerceBrief(body.brief), lastMessage);

  await createCall({ id: callId, sessionId, operatorId, roomUrl, summary });
  const messageId = await sendRing(operatorId, summary, roomUrl);

  return NextResponse.json({
    callId,
    roomUrl,
    messageId,
    operator: OPERATORS[operatorId].name,
  });
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!matchesOrigin(req.headers.get('origin'), req.headers.get('host'))) return forbidden();
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const row = await readCall(id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ status: row.status, roomUrl: row.room_url });
}

export const POST = withMetrics('call', handlePost);
export const GET = withMetrics('call', handleGet);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run lib/__tests__/callRoute.test.ts
```

Expected: PASS, 11 tests. The rate limit test relies on module-level state, so it must run after the successful ring tests in the same file. If it fails because of ordering, give it its own `describe` with a fresh `vi.resetModules()` and re-import.

- [ ] **Step 6: Commit**

```bash
git add lib/callStore.ts app/api/call/route.ts lib/__tests__/callRoute.test.ts
git commit -m "Add the call route: ring, status, answer, end"
```

---

### Task 7: The operator page and its toggle route

Where the two switches live. Guarded by a secret in the query string, because it is one page for two people and a login is more machinery than it earns.

**Files:**
- Create: `app/api/operator/route.ts`
- Create: `app/operator/page.tsx`
- Test: `lib/__tests__/operatorRoute.test.ts`

**Interfaces:**
- Consumes: `setPresence`, `readPresence` from `lib/presence.ts`; `OPERATORS` from `lib/operators.ts`.
- Produces: `POST /api/operator` with `{ secret, operatorId, online }` returns `{ ok: true, presence }` or 401. `GET /api/operator?secret=…` returns `{ presence }`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/operatorRoute.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/presence', () => ({ setPresence: vi.fn(), readPresence: vi.fn() }));
vi.mock('@/lib/metrics', () => ({ withMetrics: (_r: string, fn: unknown) => fn }));

import { readPresence, setPresence } from '@/lib/presence';
import { POST } from '@/app/api/operator/route';
import type { NextRequest } from 'next/server';

function post(body: object): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.stubEnv('OPERATOR_SECRET', 'let-me-in');
  vi.mocked(readPresence).mockResolvedValue({ pulkit: false, rohit: true });
  vi.mocked(setPresence).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/operator', () => {
  it('flips a switch with the right secret', async () => {
    const res = await POST(post({ secret: 'let-me-in', operatorId: 'pulkit', online: true }));
    expect(res.status).toBe(200);
    expect(setPresence).toHaveBeenCalledWith('pulkit', true);
  });

  it('returns the presence map so the page can render', async () => {
    const res = await POST(post({ secret: 'let-me-in', operatorId: 'pulkit', online: true }));
    expect(await res.json()).toMatchObject({ presence: { pulkit: false, rohit: true } });
  });

  it('401s a wrong secret and changes nothing', async () => {
    const res = await POST(post({ secret: 'nope', operatorId: 'pulkit', online: true }));
    expect(res.status).toBe(401);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('401s when no secret is configured, rather than allowing everyone', async () => {
    vi.stubEnv('OPERATOR_SECRET', '');
    const res = await POST(post({ secret: '', operatorId: 'pulkit', online: true }));
    expect(res.status).toBe(401);
    expect(setPresence).not.toHaveBeenCalled();
  });

  it('400s an unknown operator', async () => {
    const res = await POST(post({ secret: 'let-me-in', operatorId: 'mallory', online: true }));
    expect(res.status).toBe(400);
    expect(setPresence).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/__tests__/operatorRoute.test.ts
```

Expected: FAIL, cannot resolve `@/app/api/operator/route`.

- [ ] **Step 3: Write the route**

Create `app/api/operator/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import type { OperatorId } from '@/lib/operators';
import { readPresence, setPresence } from '@/lib/presence';

// One shared secret for one shared device. An unset secret denies
// everyone: an unguarded switch is worse than an unreachable one.

function isOperatorId(v: unknown): v is OperatorId {
  return v === 'pulkit' || v === 'rohit';
}

function authorised(secret: unknown): boolean {
  const expected = process.env.OPERATOR_SECRET;
  return Boolean(expected) && typeof secret === 'string' && secret === expected;
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!authorised(body.secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isOperatorId(body.operatorId)) {
    return NextResponse.json({ error: 'Unknown operator' }, { status: 400 });
  }
  await setPresence(body.operatorId, body.online === true);
  return NextResponse.json({ ok: true, presence: await readPresence() });
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!authorised(req.nextUrl.searchParams.get('secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ presence: await readPresence() });
}

export const POST = withMetrics('operator', handlePost);
export const GET = withMetrics('operator', handleGet);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/__tests__/operatorRoute.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Write the operator page**

Create `app/operator/page.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Both switches on one screen, because both people share a device. The
// secret comes from the query string: /operator?secret=…
//
// This page also rings. It polls for a ringing call every five seconds so
// whoever has it open hears the call even if Telegram is muted.

type Presence = { pulkit: boolean; rohit: boolean };

const NAMES: Record<keyof Presence, string> = { pulkit: 'Pulkit', rohit: 'Rohit' };

export default function OperatorPage() {
  const [secret, setSecret] = useState('');
  const [presence, setPresence] = useState<Presence | null>(null);
  const [error, setError] = useState('');
  const [ringing, setRinging] = useState<{ callId: string; roomUrl: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSecret(new URLSearchParams(window.location.search).get('secret') ?? '');
  }, []);

  const load = useCallback(async () => {
    if (!secret) return;
    const res = await fetch(`/api/operator?secret=${encodeURIComponent(secret)}`);
    if (!res.ok) {
      setError('That link is not valid.');
      return;
    }
    setError('');
    setPresence((await res.json()).presence as Presence);
  }, [secret]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(id: keyof Presence, online: boolean) {
    const res = await fetch('/api/operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, operatorId: id, online }),
    });
    if (!res.ok) {
      setError('Could not change that.');
      return;
    }
    setPresence((await res.json()).presence as Presence);
  }

  // Poll for a ring. Five seconds is fast enough to catch a 60 second ring
  // with plenty of room, and slow enough to be free.
  useEffect(() => {
    if (!secret) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/operator/ringing?secret=${encodeURIComponent(secret)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { call: { callId: string; roomUrl: string } | null };
      setRinging(data.call);
      if (data.call) void audioRef.current?.play().catch(() => {});
    }, 5_000);
    return () => clearInterval(timer);
  }, [secret]);

  async function answer() {
    if (!ringing) return;
    await fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'answer', callId: ringing.callId }),
    });
    window.open(ringing.roomUrl, '_blank', 'noopener');
    setRinging(null);
  }

  if (!secret) return <main className="op-page">Add ?secret= to the address.</main>;

  return (
    <main className="op-page">
      <h1>Who is on</h1>
      {error && <p className="op-error">{error}</p>}

      {presence &&
        (Object.keys(NAMES) as (keyof Presence)[]).map((id) => (
          <button
            key={id}
            className={`op-switch${presence[id] ? ' on' : ''}`}
            onClick={() => void toggle(id, !presence[id])}
          >
            <span>{NAMES[id]}</span>
            <span>{presence[id] ? 'On, 4 hours' : 'Off'}</span>
          </button>
        ))}

      {ringing && (
        <button className="op-answer" onClick={() => void answer()}>
          Answer the call
        </button>
      )}

      <audio ref={audioRef} src="/team/ring.mp3" preload="auto" />
    </main>
  );
}
```

- [ ] **Step 6: Add the ringing lookup route**

Create `app/api/operator/ringing/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { selectRows } from '@/lib/supabase';

// The newest ringing call, if any. Only reachable with the operator
// secret, because it exposes a join url.

interface Row {
  id: string;
  room_url: string | null;
  created_at: string;
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.OPERATOR_SECRET;
  const given = req.nextUrl.searchParams.get('secret');
  if (!expected || given !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const since = new Date(Date.now() - 90_000).toISOString();
  const rows = await selectRows<Row>(
    'calls',
    `status=eq.ringing&created_at=gte.${since}&select=id,room_url,created_at&order=created_at.desc&limit=1`,
  );
  const row = rows?.[0];
  return NextResponse.json({
    call: row?.room_url ? { callId: row.id, roomUrl: row.room_url } : null,
  });
}

export const GET = withMetrics('operator-ringing', handleGet);
```

- [ ] **Step 7: Add a ringtone file**

Any short mp3 works. Generate a plain tone so nothing is downloaded from the internet:

```bash
command -v ffmpeg >/dev/null && ffmpeg -f lavfi -i "sine=frequency=660:duration=1.2" -ac 1 -b:a 64k public/team/ring.mp3 -y
```

If ffmpeg is missing, create a silent placeholder and note it in the PR: the operator page still shows the Answer button, it just does not make noise.

- [ ] **Step 8: Run the full suite**

```bash
npm test
```

Expected: PASS, everything green.

- [ ] **Step 9: Commit**

```bash
git add app/api/operator app/operator public/team/ring.mp3 lib/__tests__/operatorRoute.test.ts
git commit -m "Add the operator page with both switches and a ringtone"
```

---

### Task 8: Team images

**Files:**
- Create: `public/team/pulkit.jpg`, `rohit.jpg`, `amazon.jpg`, `square.jpg`, `uc.jpg`, `bessemer.jpg`, `hbs.jpg`

- [ ] **Step 1: Copy the images**

```bash
mkdir -p public/team
for f in pulkit rohit amazon square uc bessemer hbs; do
  cp "public/classic/assets/$f.jpg" "public/team/$f.jpg"
done
ls -la public/team
```

Expected: seven jpgs, all non-zero.

- [ ] **Step 2: Commit**

```bash
git add public/team
git commit -m "Add the team headshots and company logos"
```

---

### Task 9: The call card

The three state card. Pure presentation driven by props, so the state machine stays in `Chat.tsx` and this file can be read on its own.

**Files:**
- Create: `components/CallCard.tsx`
- Create: `components/BookingEmbed.tsx`
- Modify: `app/globals.css` (append)

**Interfaces:**
- Consumes: the `PresenceReply['card']` shape from Task 5; `CalPrefill` from `lib/calLink.ts`.
- Produces:
  ```typescript
  export interface OperatorCard {
    id: 'pulkit' | 'rohit';
    name: string;
    role: string;
    photo: string;
    location: string;
    linkedin: string;
    companies: { logo: string; label: string }[];
    rating: number;
    fixes: number;
    tag: string;
  }
  export type CallState = 'live' | 'ringing' | 'booking';
  // props: { card, state, secondsLeft, prefill, onCall, onCancel }
  ```

- [ ] **Step 1: Write `components/BookingEmbed.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { CalPrefill } from '@/lib/calLink';

// Cal.com inline embed, rendered inside the card so the visitor never
// leaves the chat. The loader script is injected once and reused.

declare global {
  interface Window {
    Cal?: ((...args: unknown[]) => void) & { ns?: Record<string, (...a: unknown[]) => void> };
  }
}

const SNIPPET = `(function(C,A,L){let p=function(a,ar){a.q.push(ar)};let d=C.document;C.Cal=C.Cal||function(){let cal=C.Cal;let ar=arguments;if(!cal.loaded){cal.ns={};cal.q=cal.q||[];d.head.appendChild(d.createElement("script")).src=A;cal.loaded=true}if(ar[0]===L){const api=function(){p(api,arguments)};const namespace=ar[1];api.q=api.q||[];typeof namespace==="string"?(cal.ns[namespace]=api)&&p(api,ar):p(cal,ar);return}p(cal,ar)})(window,"https://app.cal.com/embed/embed.js","init");`;

export default function BookingEmbed({ prefill }: { prefill: CalPrefill }) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current || !ref.current) return;
    mounted.current = true;

    if (!window.Cal) {
      const script = document.createElement('script');
      script.textContent = SNIPPET;
      document.head.appendChild(script);
    }

    const cal = window.Cal;
    if (!cal) return;
    cal('init', 'callcard', { origin: 'https://app.cal.com' });
    cal.ns?.callcard?.('inline', {
      elementOrSelector: ref.current,
      calLink: prefill.calLink,
      config: {
        layout: 'month_view',
        ...(prefill.name ? { name: prefill.name } : {}),
        ...(prefill.email ? { email: prefill.email } : {}),
        notes: prefill.notes,
      },
    });
  }, [prefill]);

  return <div className="booking-embed" ref={ref} />;
}
```

- [ ] **Step 2: Write `components/CallCard.tsx`**

```tsx
'use client';

import type { CalPrefill } from '@/lib/calLink';
import BookingEmbed from '@/components/BookingEmbed';

// Three states, one card. The person shown is always the person who would
// answer, and the tag is always matched to what they asked about.

export interface OperatorCard {
  id: 'pulkit' | 'rohit';
  name: string;
  role: string;
  photo: string;
  location: string;
  linkedin: string;
  companies: { logo: string; label: string }[];
  rating: number;
  fixes: number;
  tag: string;
}

export type CallState = 'live' | 'ringing' | 'booking';

export default function CallCard({
  card,
  state,
  secondsLeft,
  prefill,
  onCall,
}: {
  card: OperatorCard;
  state: CallState;
  secondsLeft: number;
  prefill: CalPrefill;
  onCall: () => void;
}) {
  return (
    <div className="call-card">
      {state === 'live' && (
        <div className="call-live">
          <i className="call-dot" />
          Live right now
        </div>
      )}

      <div className="call-person">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="call-av" src={card.photo} alt="" />
        <div className="call-body">
          <div className="call-top">
            <span className="call-name">{card.name}</span>
            <a
              className="call-li"
              href={card.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${card.name} on LinkedIn`}
            >
              in
            </a>
            <span className="call-loc">{card.location}</span>
          </div>
          <div className="call-role">{card.role}</div>
          <div className="call-cos">
            {card.companies.map((c, i) => (
              <span key={c.label}>
                {i > 0 && <span className="call-sep">·</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logo} alt="" />
                {c.label}
              </span>
            ))}
          </div>
          <div className="call-bot">
            <span className="call-tag">{card.tag}</span>
            <span className="call-rate">
              <span className="call-star">★</span> {card.rating} <span className="call-sep">·</span>{' '}
              {card.fixes} fixes delivered
            </span>
          </div>
        </div>
      </div>

      {state === 'live' && (
        <>
          <button className="call-cta" onClick={onCall}>
            Get connected now
          </button>
          <div className="call-sub">First call is free · audio only · about 15 min · no signup</div>
        </>
      )}

      {state === 'ringing' && (
        <>
          <button className="call-cta call-cta-ringing" disabled>
            Ringing… {secondsLeft}s
          </button>
          <div className="call-sub">Picking up their phone. Hang on.</div>
        </>
      )}

      {state === 'booking' && (
        <>
          <div className="call-sub call-sub-lead">
            First call is free · about 15 min · they read your chat first
          </div>
          <BookingEmbed prefill={prefill} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Append the styles**

Add to the end of `app/globals.css`. Follow the tokens already at the top of that file (`--ink`, `--ink-2`, `--ink-3`, `--line`, `--accent`, `--accent-deep`, `--accent-tint`, `--amber`, `--radius-card`, `--ease-out`):

```css
/* ---------- Call card ---------- */
.call-card {
  background: rgba(255, 255, 255, .70);
  border: 1px solid rgba(255, 255, 255, .78);
  outline: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: 14px;
  margin-top: 10px;
  box-shadow: 0 10px 26px rgba(45, 32, 22, .07);
  display: flex; flex-direction: column; gap: 11px;
  animation: msg-in 300ms var(--ease-out) backwards;
}

.call-live {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
  color: #2E7D52; background: rgba(46, 125, 82, .1);
  border: 1px solid rgba(46, 125, 82, .3);
  border-radius: 999px; padding: 4px 10px;
}
.call-dot { width: 7px; height: 7px; border-radius: 50%; background: #2E7D52; animation: call-breathe 2.4s ease-in-out infinite; }
@keyframes call-breathe { 0%, 100% { opacity: 1 } 50% { opacity: .35 } }

.call-person { display: flex; gap: 12px; }
.call-av { flex: none; width: 50px; height: 50px; border-radius: 14px; object-fit: cover; box-shadow: inset 0 0 0 1px rgba(33,30,26,.06); }
.call-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.call-top { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
.call-name { font-size: 14.5px; font-weight: 600; letter-spacing: -.01em; }
.call-li { font-size: 10px; font-weight: 700; color: var(--ink-3); text-decoration: none; border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; }
.call-li:hover { color: #0A66C2; }
.call-loc { font-size: 12.5px; color: var(--ink-3); margin-left: auto; }
.call-role { font-size: 12.5px; color: var(--ink-3); }
.call-cos { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; font-size: 11.5px; color: var(--ink-2); }
.call-cos span { display: inline-flex; align-items: center; gap: 5px; }
.call-cos img { width: 15px; height: 15px; border-radius: 4px; object-fit: cover; }
.call-sep { color: var(--ink-3); }
.call-bot { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-top: 2px; }
.call-tag { font-size: 11.5px; font-weight: 600; color: var(--accent-deep); background: var(--accent-tint); border: 1px solid rgba(196, 89, 60, .22); padding: 3px 9px; border-radius: 8px; }
.call-rate { font-size: 11.5px; color: var(--ink-2); }
.call-star { color: var(--amber); }

.call-cta {
  align-self: flex-start; border: none; cursor: pointer;
  background: var(--accent); color: #fff;
  font-size: 13.5px; font-weight: 600; padding: 9px 20px; border-radius: 999px;
  box-shadow: 0 6px 16px rgba(196, 89, 60, .26);
  transition: transform 160ms var(--ease-out), box-shadow 160ms ease;
}
.call-cta:active { transform: scale(.97); }
@media (hover: hover) and (pointer: fine) {
  .call-cta:hover { box-shadow: 0 10px 22px rgba(196, 89, 60, .32); }
}
.call-cta-ringing { background: var(--amber); cursor: default; box-shadow: none; }
.call-cta-ringing:active { transform: none; }

.call-sub { font-size: 11.5px; color: var(--ink-3); line-height: 1.45; }
.call-sub-lead { margin-bottom: 2px; }

.booking-embed { width: 100%; min-height: 380px; overflow: auto; border-radius: 12px; }

/* ---------- Titlebar pill ---------- */
.call-pill {
  margin-left: auto; margin-right: 10px;
  border: 1px solid var(--line); cursor: pointer;
  background: rgba(255, 255, 255, .6); color: var(--ink-2);
  font-size: 11.5px; font-weight: 600;
  padding: 4px 11px; border-radius: 999px;
  transition: transform 160ms var(--ease-out), background 140ms ease;
}
.call-pill:active { transform: scale(.97); }
@media (hover: hover) and (pointer: fine) {
  .call-pill:hover { background: rgba(255, 255, 255, .85); }
}

/* ---------- Operator page ---------- */
.op-page { max-width: 420px; margin: 0 auto; padding: 40px 20px; display: flex; flex-direction: column; gap: 12px; }
.op-switch { display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid var(--line); background: rgba(255,255,255,.6); border-radius: 14px; padding: 16px 18px; font-size: 15px; font-weight: 600; }
.op-switch:active { transform: scale(.98); }
.op-switch.on { border-color: #2E7D52; background: rgba(46, 125, 82, .1); color: #2E7D52; }
.op-answer { cursor: pointer; border: none; background: var(--accent); color: #fff; font-size: 16px; font-weight: 700; padding: 18px; border-radius: 14px; }
.op-error { color: var(--accent-deep); font-size: 13px; }

@media (prefers-reduced-motion: reduce) {
  .call-dot { animation: none; }
  .call-card { animation: none; }
}
```

If `msg-in` is not an existing keyframe in `globals.css`, drop the `animation` line from `.call-card`.

- [ ] **Step 4: Verify it compiles**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components/CallCard.tsx components/BookingEmbed.tsx app/globals.css
git commit -m "Add the call card, the booking embed and their styles"
```

---

### Task 10: Wire the pill into the chat

The last connection. `Chat.tsx` owns the call state because it already owns the brief and the message history.

**Files:**
- Create: `components/CallPill.tsx`
- Modify: `components/Titlebar.tsx`
- Modify: `components/Chat.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1 through 9.
- Produces: nothing downstream.

- [ ] **Step 1: Write `components/CallPill.tsx`**

```tsx
'use client';

// Gives away nothing about who is on. A pill that permanently reads
// "nobody is here" teaches people to stop looking.
export default function CallPill({ onTap }: { onTap: () => void }) {
  return (
    <button className="call-pill" onClick={onTap}>
      Talk to a human
    </button>
  );
}
```

- [ ] **Step 2: Modify `components/Titlebar.tsx`**

Replace the whole file:

```tsx
'use client';

import type { ReactNode } from 'react';

// The Mac window chrome: lights, wordmark, the call pill, and the privacy
// link. Static, and the only per-flow part is the small tag beside the
// wordmark.
export default function Titlebar({ tag, action }: { tag: string | null; action?: ReactNode }) {
  return (
    <div className="titlebar">
      <div className="lights">
        <i className="r" />
        <i className="y" />
        <i className="g" />
      </div>
      <div className="wordmark">
        <span className="worb">✳︎</span>midsesh
        {tag && <span className="tag">{tag}</span>}
      </div>
      {action}
      <a className="privacy-link" href="/privacy">
        Privacy
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Modify `components/Chat.tsx`**

Add these imports beside the existing ones:

```typescript
import CallCard, { type CallState, type OperatorCard } from '@/components/CallCard';
import CallPill from '@/components/CallPill';
import type { CalPrefill } from '@/lib/calLink';
```

Add this state block after `const [primaryPath, setPrimaryPath] = useState<PrimaryPath>('session');`:

```typescript
// The call lives beside the conversation rather than inside it: the pill
// is always there once they have said something, and the card appears
// under the thread when they tap it.
const [card, setCard] = useState<OperatorCard | null>(null);
const [callState, setCallState] = useState<CallState>('booking');
const [secondsLeft, setSecondsLeft] = useState(0);
const [prefill, setPrefill] = useState<CalPrefill | null>(null);
const callIdRef = useRef<string | null>(null);
const messageIdRef = useRef<number | null>(null);
const lastUserMsg = useRef('');
```

Inside `sendChat`, immediately after `push({ role: 'user', text });`, add:

```typescript
lastUserMsg.current = text;
```

Add these three functions before `function onSubmit`:

```typescript
// One request, made only when they tap. Nothing is polled, so the chat
// never advertises an empty room.
async function openCall() {
  try {
    const res = await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, lastMessage: lastUserMsg.current }),
    });
    if (!res.ok) throw new Error(`presence ${res.status}`);
    const data = (await res.json()) as { online: boolean; card: OperatorCard };
    setCard(data.card);
    setCallState(data.online ? 'live' : 'booking');
    setPrefill({
      calLink: 'pulkit-walia-plcgb7/15min',
      name: null,
      email: null,
      notes: lastUserMsg.current,
    });
  } catch {
    push({ role: 'ai', text: 'Could not check that. Try again in a moment.' });
  }
}

async function startRing() {
  if (!card) return;
  setCallState('ringing');
  setSecondsLeft(60);
  try {
    const res = await fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ring',
        operatorId: card.id,
        sessionId: sessionIdRef.current,
        brief,
        lastMessage: lastUserMsg.current,
      }),
    });
    if (!res.ok) throw new Error(`ring ${res.status}`);
    const data = (await res.json()) as {
      callId: string;
      roomUrl: string;
      messageId: number | null;
    };
    callIdRef.current = data.callId;
    messageIdRef.current = data.messageId;
  } catch {
    callIdRef.current = null;
    setCallState('booking');
  }
}

// The countdown and the status poll are the same effect: both only run
// while ringing, and both must stop the moment it resolves.
useEffect(() => {
  if (callState !== 'ringing') return;
  const started = Date.now();
  const timer = setInterval(async () => {
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const left = 60 - elapsed;
    setSecondsLeft(left > 0 ? left : 0);

    const id = callIdRef.current;
    if (id) {
      const res = await fetch(`/api/call?id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = (await res.json()) as { status: string; roomUrl: string | null };
        if (data.status === 'answered' && data.roomUrl) {
          window.open(data.roomUrl, '_blank', 'noopener');
          setCallState('live');
          return;
        }
      }
    }

    if (left <= 0) {
      setCallState('booking');
      if (id) {
        void fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'end',
            callId: id,
            missed: true,
            messageId: messageIdRef.current,
            operatorId: card?.id,
          }),
        });
      }
    }
  }, 2_000);
  return () => clearInterval(timer);
}, [callState, card]);
```

Change the `Titlebar` line to pass the pill. It only appears once the visitor has said something, so nobody rings with no context:

```tsx
<Titlebar
  tag={config.tag}
  action={
    phase !== 'welcome' && lastUserMsg.current ? <CallPill onTap={() => void openCall()} /> : null
  }
/>
```

Add the card at the end of the `.thread` div, just before its closing `</div>`, after the `MatchStep` block:

```tsx
{card && prefill && (
  <CallCard
    card={card}
    state={callState}
    secondsLeft={secondsLeft}
    prefill={prefill}
    onCall={() => void startRing()}
  />
)}
```

- [ ] **Step 4: Run the full suite and build**

```bash
npm test && npm run build
```

Expected: both pass.

- [ ] **Step 5: Check the copy rule**

```bash
grep -rn "—" components/ app/ lib/ --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules
```

Expected: no output. If anything appears, replace the em dash.

- [ ] **Step 6: Commit**

```bash
git add components/CallPill.tsx components/Titlebar.tsx components/Chat.tsx
git commit -m "Wire the talk to a human pill into the chat"
```

---

### Task 11: Environment, docs, and the preview run

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the new env vars**

Append to `.env.example`:

```bash
# The live call. Without DAILY_API_KEY the pill always resolves to booking,
# which is the correct degraded behaviour rather than a broken call button.
DAILY_API_KEY=

# The ring that reaches a pocket. Without these the operator page is the
# only thing that rings.
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID_PULKIT=
TELEGRAM_CHAT_ID_ROHIT=

# Guards /operator and its routes. Unset means nobody can flip a switch,
# so presence stays false and every visitor sees booking.
OPERATOR_SECRET=
```

- [ ] **Step 2: Document the feature**

Add to the Layout section of `CLAUDE.md`:

```
app/operator/       /operator?secret=…: both presence switches, ringtone, Answer
app/api/presence/   which card to show and whether that person is on
app/api/call/       ring, status, answer, end
app/api/operator/   flip a switch, guarded by OPERATOR_SECRET
```

Add a new section after "Chat behavior is eval-gated":

```markdown
## The call button

A "Talk to a human" pill in the chat titlebar. Tapping it asks
`/api/presence` once, which matches the brief to Pulkit or Rohit and
reports whether that person is switched on. On means a Daily audio room
and a Telegram ring; off means a prefilled Cal.com picker in the same card.

Presence is manual. Flip it at `/operator?secret=…` on any device. Every
toggle expires after four hours.

The roster, the credential copy and the tag keywords live in
`lib/operators.ts`. Tag order inside each person is the priority order,
because the first keyword hit wins.

A human answers this call. No copy anywhere may describe it as AI.

This work does not touch `lib/prompts.ts`, the model, `sanitizeReply` or
the question budget, so it is outside the eval gate above. Do not run
`npm run eval` for call button changes.
```

- [ ] **Step 3: Run everything one last time**

```bash
npm test && npm run build
```

Expected: both pass.

- [ ] **Step 4: Commit and push**

```bash
git add .env.example CLAUDE.md
git commit -m "Document the call button and its environment"
git push -u origin feat/call-button
```

- [ ] **Step 5: Apply the migration and set the env vars**

Report to Pulkit rather than doing it silently. He needs to:

1. Run `supabase/migrations/20260725000000_presence_calls.sql` against the Supabase project.
2. Add `DAILY_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID_PULKIT`, `TELEGRAM_CHAT_ID_ROHIT` and `OPERATOR_SECRET` in Vercel, for Preview and Production.

Without these the pill still works and always shows booking, which is the intended degraded state.

- [ ] **Step 6: Verify on the preview deploy**

Vercel builds a preview for the branch. On that URL:

1. Open `/operator?secret=…` on a phone, switch Rohit on.
2. Open the chat in another browser, send one message about a Stripe bug.
3. Tap "Talk to a human". Expect Rohit's card, `Live right now`, tag `Payments & APIs`.
4. Tap "Get connected now". Expect the Telegram push and the operator page ring within five seconds.
5. Answer, confirm audio both ways.
6. Switch Rohit off, reload, send a message about n8n, tap the pill. Expect Pulkit's card, `Workflow automation`, and the Cal picker with the chat summary in the notes.

Record what actually happened, including anything that did not work. Do not merge to `master` until step 6 is green, because `master` deploys to midsesh.com on push.
