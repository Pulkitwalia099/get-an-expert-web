# Launch tracking (do-now block)

Date: 2026-07-24
Branch: `feat/launch-tracking` off `origin/master`
Goal: record what visitors do before the promotion drives traffic, so post-hoc
analysis is possible later. Dashboards are a separate, later phase.

## Why now

Analytics data is perishable. A `sessions` row is only written on the first chat
message, so pure visits, mid-funnel drop-off, and real-vs-demo are not captured
today. Once promotion sends real traffic, anything not being recorded is lost for
good. This block turns recording on. It does not build dashboards.

## Decisions (from Pulkit)

- Tool: PostHog, on the chat, all inputs and on-screen text masked in replay.
- Privacy posture: quiet footer notice plus a short `/privacy` page. Recording is
  on for everyone. No consent banner for launch.
- First-party demo flag stays in Supabase too, so real and demo traffic are
  separable even without PostHog.
- Custom `/admin` dashboards and first-party copies of the funnel events are
  deferred to the next phase.

## Scope

### 1. Demo flag (first-party, Supabase)

- Migration `supabase/migrations/20260724040000_session_demo_flag.sql`:
  `alter table sessions add column demo boolean not null default false;`
- `recordSession` gains `demo?: boolean` in opts; sends `demo: true` only when
  true, mirroring how `completed` and `flow` are sent, so a lagging migration
  never breaks writes.
- `app/api/chat/route.ts` computes `demo = !hasAnthropicKey()` and passes it.
- Unit test in `lib/__tests__/supabase.test.ts` for the demo field.

### 2. PostHog recording

- Add `posthog-js`.
- `lib/analytics.ts`: single home for the PostHog singleton. `initAnalytics()`
  (no-op without `NEXT_PUBLIC_POSTHOG_KEY` or on the server), `capturePageview(url)`,
  and `track(event, props)`. All three no-op until init succeeds, so calls are
  always safe. Recording config: `maskAllInputs: true`, `maskTextSelector: '*'`
  so no typed or on-screen text is ever recorded, only layout and interactions.
- `components/analytics/PostHogProvider.tsx` (client): calls `initAnalytics()`
  once, and a Suspense-wrapped child fires `capturePageview` on every App Router
  path change (manual, because client-side navigation does not reload the page).
- Wire the provider into `app/layout.tsx`.
- `.env.example`: document `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`.

### 3. Funnel events (the small custom bit)

Fired from `components/Chat.tsx` and `components/GetUnstuck.tsx` at the exact
transition points, all carrying `flow`:

| Event | Where |
|-------|-------|
| `chat_opened` | Chat mount |
| `first_message_sent` | first user turn in `sendChat` |
| `matches_shown` | phase enters `matches` (plus `result_count`) |
| `experts_selected` | an expert card is toggled on (plus `count`) |
| `email_shown` | phase enters `email` |
| `intro_submitted` | `submitIntro` succeeds (plus `kind`, `count`) |
| `choice_shown` | dev flow phase enters `choice` |
| `install_clicked` | GetUnstuck copy (plus `tool`) |
| `dev_email_submitted` | GetUnstuck email sent |

Names are snake_case and stable. Renaming later splits history in PostHog.

### 4. Privacy notice

- `app/privacy/page.tsx`: short, plain-English page. What is collected (anonymous
  usage, no message content or emails recorded in replay), the tool, no selling,
  a contact line.
- A small, low-contrast footer line linking to it, styled in `globals.css`,
  positioned so it never overlaps the composer.

## Out of scope (next phase)

- The `/admin` dashboards and their SQL/RPC aggregation.
- First-party persistence of the funnel events (a `funnel_events` table).
- Consent banner, retention/returning-visitor analysis.

## Testing and verification

- `npm test` (with leaked shell keys unset) stays green, plus the new demo test.
- `npm run build` passes.
- Run `npm run dev` and confirm: the footer line renders and does not overlap the
  composer, the `/privacy` page loads, and no console errors. PostHog stays dark
  locally unless a key is set, which is the intended degrade-quietly behavior.

## Rollout

Commit on `feat/launch-tracking`. Open a PR into `master` only on Pulkit's
go-ahead. Set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel to start recording in prod.
