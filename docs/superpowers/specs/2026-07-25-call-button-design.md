# Call now, or book

A "Talk to a human" pill in the midsesh chat that reaches Pulkit or Rohit live on audio
when one of them has switched themselves on, and turns into a prefilled Cal.com booking
picker when neither has.

Rendered version of this design, with card previews:
https://claude.ai/code/artifact/2aa39f44-0195-44e9-bd78-0198d9dd3f0f

Status: approved 2026-07-25. Ready for an implementation plan.

## Why

The chat already runs an AI intake agent that collects a brief and searches for experts.
When it cannot solve someone's problem, there is nothing between "the agent could not help"
and "email us". This puts a live human at the end of that path, and a booking link when no
human is around.

## The three states

A visitor who has sent at least one message sees a pill in the chat titlebar reading
**Talk to a human**. The pill shows no presence state. Tapping it resolves into one of:

| State | What renders |
| --- | --- |
| Someone is on | Credential card with a `Live right now` badge, button **Get connected now** |
| Ringing | Same card, button shows a 60 second countdown |
| Nobody on, or 60s with no answer | Same card, button **Pick a time**, Cal.com inline embed below |

## Identity

The button never carries a name. The card below it does.

Card fields, matching the expert cards already in the chat: photo, short name, role,
company logos, location, LinkedIn icon, a tag, and a rating.

| | Rohit J. | Pulkit W. |
| --- | --- | --- |
| Role | Senior software engineer | Founder, growth & automation |
| Worked at | Amazon, Square | Urban Company, Bessemer, Harvard Business School |
| Rating | 4.8, 12 fixes delivered | 4.7, 10 fixes delivered |
| Location | San Francisco | San Francisco |
| LinkedIn | linkedin.com/in/rohit-jain-343437187 | linkedin.com/in/pulkitwalia |
| Photo | `public/team/rohit.jpg` | `public/team/pulkit.jpg` |

Photos and company logos are copied from `public/classic/assets/`. Logos needed:
`amazon.jpg`, `square.jpg`, `uc.jpg`, `bessemer.jpg`, `hbs.jpg`.

A human answers the call, so no copy anywhere describes the call as AI. The chat agent is
AI and continues to say so.

## Routing and tags

A keyword sweep over the brief the intake agent already built picks the operator, then the
tag. First match wins, so list order is the priority order. No model call.

| Person | Tag | Selected when the brief mentions |
| --- | --- | --- |
| Rohit J. | Payments & APIs | stripe, payments, billing, webhook, api, integration |
| Rohit J. | Debugging & deploys | bug, crash, error, broken, vercel, deploy, build |
| Rohit J. | Backend & databases | backend, server, database, postgres, supabase, query |
| Rohit J. | AI agents & LLM apps | agent, llm, claude, openai, rag, prompt, mcp |
| Rohit J. | Code & engineering | fallback |
| Pulkit W. | Workflow automation | n8n, zapier, make, clay, automation, workflow, scrape |
| Pulkit W. | Outbound & GTM | outbound, cold email, prospect, pipeline, sales, leads |
| Pulkit W. | Landing pages & frontend | landing page, website, copy, frontend, design, conversion |
| Pulkit W. | AI workflows | ai workflow, agent, automate with ai, claude, gpt |
| Pulkit W. | GTM & automations | fallback |

Rohit's keywords are swept first. When nothing matches either list, the card shows whoever
is on, with their fallback tag. When the matched person is off and the other is on, the card
shows the one who is on, with their own tag. The card never shows a person who will not answer.

## Copy

| Where | Copy |
| --- | --- |
| Titlebar pill | Talk to a human |
| Card button, someone on | Get connected now |
| Under it | First call is free &middot; audio only &middot; about 15 min &middot; no signup |
| Card button, nobody on | Pick a time |
| Under it | First call is free &middot; about 15 min &middot; they read your chat first |

"Free" appears once per state. No em dashes anywhere in shipped copy.

Copy choices come from published CTA tests: a reassurance line under a button measured a
124% lift on its own, "Talk to a Human" beat "Book a demo" by 110%, and asking for a form
field at the click moment cost 25.5%. Possessive first person ("Get my free call") is
deliberately not used, because the same research finds it works less well on
commitment-oriented actions.

## Presence

One row per operator in Supabase. Available means `online = true AND expires_at > now()`,
computed server-side in one place so the phone and the site can never disagree.

- Both switches sit on `/operator`, so either person can be flipped from the shared device.
- Every toggle sets `expires_at = now() + 4 hours`. The page shows the countdown and a
  one-tap extend.
- Presence is read once, when the visitor taps the pill. Nothing is polled and nothing is
  cached.
- If Supabase is unreachable, presence resolves to `false`. Never promise a call that cannot
  be delivered.

## The call

Daily.co, audio only, embedded in the chat panel. No camera control ships in v1.

1. Tap **Get connected now**. `POST /api/call` matches an operator, creates a Daily room
   with a 60 minute expiry, writes a `calls` row as `ringing`, and builds a two line summary
   from the brief plus the last user message.
2. Telegram sends the matched operator the summary and a Join button. The `/operator` tab
   plays a tone and shows Answer. First one touched wins; the second is a no-op, enforced by
   a conditional update on `answered_at`.
3. The visitor sees a 60 second countdown. On answer, the Daily iframe mounts in the chat
   panel. On timeout, the card becomes the booking picker.

## The booking fallback

Cal.com inline embed for `pulkit-walia-plcgb7/15min`, rendered inside the same card so the
visitor never leaves the page. Name and email are prefilled from the session when the chat
already has them, and the brief goes into the notes field.

Cal.com's instant meeting feature requires their Teams plan, which is why the live call runs
on Daily. Cal handles booking only.

## Files

New:

| File | Job |
| --- | --- |
| `supabase/migrations/20260725000000_presence_calls.sql` | `operator_presence` and `calls` |
| `lib/presence.ts` | Read and write each switch, apply the expiry rule |
| `lib/operators.ts` | The roster: names, roles, photos, companies, LinkedIn, tag set with keywords, Telegram chat id, Cal link |
| `lib/daily.ts` | Create a room through Daily's REST API |
| `lib/telegram.ts` | Send the ring push |
| `lib/callSummary.ts` | Brief plus last user message into two lines |
| `app/api/presence/route.ts` | Public GET, returns online state and the matched card only |
| `app/api/operator/route.ts` | POST the toggle, guarded by a secret |
| `app/api/call/route.ts` | Ring, poll status, answer, end |
| `app/operator/page.tsx` | Both switches, countdown, ringtone, Answer button |
| `components/CallCard.tsx` | The three state card |
| `components/BookingEmbed.tsx` | Cal.com inline embed with prefill |
| `public/team/*.jpg` | Two headshots and five company logos |

Modified: `components/Chat.tsx` and `components/Titlebar.tsx` to mount the pill and card.

Presence is read by the browser and never written by it. Every write goes through a server
route with the Supabase secret key, matching how `lib/supabase.ts` already works.

Names, credential copy and tags live in `lib/operators.ts`, not the database. They change
when copy is rewritten, not when a switch is flipped, so they belong in reviewed code.

## Data model

```sql
create table operator_presence (
  id          text primary key,          -- 'pulkit', 'rohit'
  online      boolean not null default false,
  expires_at  timestamptz,
  updated_at  timestamptz not null default now()
);

insert into operator_presence (id) values ('pulkit'), ('rohit');

create table calls (
  id            uuid primary key,
  session_id    uuid,
  operator_id   text,
  room_url      text,
  status        text check (status in ('ringing','answered','missed','ended')),
  summary       text,
  visitor_name  text,
  created_at    timestamptz default now(),
  answered_at   timestamptz,
  ended_at      timestamptz
);
```

Row Level Security on, no policies, matching the existing tables.

## Failure

| What fails | What the visitor sees |
| --- | --- |
| Supabase unreachable | Booking picker. Presence defaults to false. |
| Daily API errors | Booking picker, ring never fires. Logged to PostHog. |
| Telegram down | Nothing. The operator tab still rings, which is why both exist. |
| Switched on but nobody picks up | 60 second countdown, then booking picker. |
| Visitor closes the tab mid-ring | Row flips to `missed` after 60 seconds. The Telegram message edits itself to say they left. |
| Same visitor rings repeatedly | One ring per session every 5 minutes. Beyond that, booking picker only. |

## Cost

Daily.co free tier covers roughly 10,000 participant-minutes a month. Telegram, Supabase and
Cal.com add nothing. Incremental cost is zero.

New environment variables: `DAILY_API_KEY`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID_PULKIT`, `TELEGRAM_CHAT_ID_ROHIT`, `OPERATOR_SECRET`.

## Testing

Unit tests with the vitest setup already in the repo:

- the expiry rule, including the boundary where `expires_at` has just passed
- operator and tag matching, including the fallback and the matched-person-is-off case
- the summary builder
- the Cal prefill URL builder
- the ring state machine, including double-answer and timeout

**The chat evals stay out of this work.** `evals/chat.eval.ts` scores how the intake agent
converses, and nothing here touches the conversation. Running them would spend Anthropic
credits re-proving unchanged behaviour, and a flake would block a merge for no reason. Do
not add call or booking cases to `evals/scenarios.ts`.

Before merge, on a preview deploy: switch on from a phone, ring from a second browser on
another network, answer, talk. Then switch off and confirm the same pill opens Cal with the
brief in the notes.

## Not in this round

- A roster editable without a deploy. Two people hardcoded in `lib/operators.ts`; a third is
  a four line edit, cheaper than an admin screen nobody asked for.
- Call recording or transcription. The chat before the call is already saved.
- Video. Audio only.
- Calendar-derived presence. The manual switch is right until it becomes annoying.
- Twilio ringing an actual phone. Telegram push already reaches a pocket for free.
- A queue for a second caller during a call. They see the booking picker.
- A separate "schedule a call" button beside the pill. One entry point.
