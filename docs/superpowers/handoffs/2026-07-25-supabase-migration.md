# Handoff: apply the call button Supabase migration

**For:** a fresh Claude Code session working with Pulkit on the midsesh Supabase project.
**Written:** 2026-07-25, by the session that built the call button.

## What you are being asked to do

Apply one migration to the midsesh Supabase project so the "Talk to a human"
call button can work. Two new tables, no changes to existing ones.

**The file:** `supabase/migrations/20260725000000_presence_calls.sql`
**The branch:** `feat/call-button` in `Pulkitwalia099/get-an-expert-web`
**Worktree on Pulkit's Mac:** `/Users/pulkitwalia/Programs/gae-call-button`

## Why it matters

Until these tables exist, the feature is not broken, it is dormant.
`lib/presence.ts` fails to read `operator_presence`, returns everyone
offline, and every visitor gets the Cal.com booking picker instead of a
live call. That is the intended safe degradation. It also means the live
call half cannot be tested at all until this is applied.

## The migration

```sql
create table operator_presence (
  id          text primary key,
  online      boolean not null default false,
  expires_at  timestamptz,
  updated_at  timestamptz not null default now()
);

insert into operator_presence (id) values ('pulkit'), ('rohit');

alter table operator_presence enable row level security;

create table calls (
  id            uuid primary key,
  session_id    uuid,
  operator_id   text,
  room_url      text,
  status        text not null check (status in ('ringing', 'answered', 'missed', 'ended')),
  summary       text,
  visitor_name  text,
  telegram_message_id bigint,
  created_at    timestamptz not null default now(),
  answered_at   timestamptz,
  ended_at      timestamptz
);

create index calls_status_idx on calls (status);
create index calls_session_id_idx on calls (session_id);

alter table calls enable row level security;
```

Read the real file rather than copying the block above, in case it moved on.

## How to apply it

Pulkit does this part, he has the dashboard open.

1. Supabase dashboard for the midsesh project
2. **SQL Editor**, new query
3. Paste the contents of `supabase/migrations/20260725000000_presence_calls.sql`
4. **Run**

There is no Supabase CLI link set up in this repo. Every other migration in
`supabase/migrations/` was applied the same way by hand, so this is the
established pattern here, not a shortcut.

## Verify it worked

Run these in the SQL Editor after applying.

```sql
-- Expect exactly two rows: pulkit and rohit, both offline.
select id, online, expires_at from operator_presence order by id;

-- Expect zero rows and no error. An error here means the table is missing.
select count(*) from calls;

-- Expect rowsecurity = true for both.
select tablename, rowsecurity from pg_tables
where tablename in ('operator_presence', 'calls');
```

If `operator_presence` has zero rows, the `insert` did not run. Run just
that line again. The app reads by primary key, so missing rows mean that
person can never be switched on.

## Things worth knowing before you touch anything

**RLS is on with no policies, on purpose.** That is the pattern every table
in this project follows. The publishable key can neither read nor write.
All access goes through server routes using `SUPABASE_SECRET_KEY`, which
bypasses RLS. Do not add policies to "fix" the empty policy list, and do not
disable RLS.

**Do not modify the migration file after it has been applied.** It was
edited once before it ever ran, to add `telegram_message_id` while closing a
security hole. Once Pulkit has run it, that window is shut: any further
schema change is a new migration file with a later timestamp.

**`telegram_message_id` is load bearing for security.** The `end` action
looks the Telegram message id up from this column rather than accepting it
from the browser. Message ids are small sequential integers, so a
client-supplied one would let anyone rewrite the bot's message history by
guessing. If the column is missing, that lookup returns null and the missed
call message simply never gets edited. It fails safe, but the feature is
degraded.

**Do not run `npm run eval`.** Nothing in this work touches `lib/prompts.ts`,
the model, `sanitizeReply` or the question budget, which are the only
triggers for the eval gate in `CLAUDE.md`. Running it spends Anthropic
credits re-proving unchanged behaviour.

## After the migration

The remaining blocker is environment variables on Vercel, which Pulkit said
he has now added: `DAILY_API_KEY`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID_PULKIT`, `TELEGRAM_CHAT_ID_ROHIT`, `OPERATOR_SECRET`.

Note on Daily: Pulkit chose not to add a payment card, which caps the
account at **50 programmatic rooms**. One room is created per call, so that
is the ceiling before rooms stop being created. When the cap is hit,
`createAudioRoom` returns null and the card falls back to the booking
picker rather than failing visibly. Worth watching early.

Then the end to end check on the Vercel preview for `feat/call-button`:

1. Open `/operator?secret=<OPERATOR_SECRET>` on a phone, switch Rohit on
2. In another browser, send one message about a Stripe bug
3. Tap **Talk to a human**. Expect Rohit's card, a `Live right now` badge,
   and the tag `Payments & APIs`
4. Tap **Get connected now**. Expect a Telegram push within seconds and the
   operator page to ring
5. Answer. The call should mount inside the chat panel, audio only, no new
   tab
6. Switch Rohit off, reload, send a message about n8n, tap the pill. Expect
   Pulkit's card, tag `Workflow automation`, and the Cal.com picker with the
   chat summary already in the notes

Step 6 is the one that has never been verified in a browser. An extension in
Pulkit's Chrome profile blocks `app.cal.com`, so the calendar itself was
never seen rendering. The fallback path was verified: after 12 seconds the
embed collapses into a working "Pick a time" link. Use a clean browser
profile for this step.

**Do not merge `feat/call-button` to `master` until the preview run passes.**
Pushing `master` deploys midsesh.com instantly.
