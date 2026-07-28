# Handoff: the PostHog funnel and replay for /setups

**For:** a fresh Claude Code session working with Pulkit on midsesh.
**Written:** 2026-07-27, by the session that rebuilt /setups and wired Supabase.
**Repo:** `Pulkitwalia099/get-an-expert-web`, branch `master` at `69d1303`.

## What you are being asked to do

Add a conversion funnel to `/setups` in PostHog, and set up the replay filter
that explains the drop-off. Nothing here is built yet.

Read this whole file before writing anything. Two of the five steps have a
trap in them that is not obvious from the code.

## Why it matters

`/setups` is the page being promoted on Reddit and Instagram. It fires
**not one PostHog event.** There is no `track()` call anywhere in
`components/setups/`. So today there are pageviews and session replays for the
page, and no way at all to answer the only question that matters: where do
people fall out between seeing a setup and booking a time.

## What already works, so do not rebuild it

- `lib/analytics.ts` is the single place PostHog is touched. It exports
  `track(event, props)` and `capturePageview(url)`. Both no-op safely on the
  server, before init, and when `NEXT_PUBLIC_POSTHOG_KEY` is unset.
- `components/analytics/PostHogProvider.tsx` is in the root layout and fires a
  pageview on every App Router navigation.
- **Session replay is already on site-wide.** `maskAllInputs: false`, so the
  chat conversation is legible in replay, with individual contact fields opting
  out via the `ph-no-capture` class exported as `NO_CAPTURE` from
  `lib/replay.ts`.
- Keys are already in Vercel for Production and Preview.
- The chat flow already has a real funnel to copy the shape of:
  `chat_opened`, `choice_shown`, `matches_shown`, `experts_selected`,
  `email_shown`, `intro_submitted`. See `components/useExpertSearch.ts`.

**PostHog project:** "Midsesh", id `526312`, US cloud
(`https://us.i.posthog.com`).

## The rule that file is built around

Never import `posthog-js` anywhere except `lib/analytics.ts`. Everything else
calls `track()`. That is why the recording config lives in one place, and it is
the thing to preserve.

## The funnel to build

Six events. Send every property listed: the interesting cuts are by setup and
by category, and adding them later means losing the history in between.

| # | Event | Fires when | Properties |
|---|---|---|---|
| 1 | `setups_viewed` | `/setups` loads | `referrer`, `utm_source` |
| 2 | `setup_reel_played` | A card's video is tapped | `slug`, `category`, `position`, `views` |
| 3 | `setup_opened` | **Try this** pressed | `slug`, `category`, `position`, `price` |
| 4 | `booking_opened` | **Book a time** pressed, Cal sheet mounts | `slug`, `category`, `price`, `from` (`card` or `sheet`) |
| 5 | `booking_completed` | Cal confirms the booking | `slug`, `category` |
| 6 | `setup_requested` | Reel sent through the ask form | `has_contact` (boolean, **never the value**) |

Where each one goes:

- 1: `components/setups/SetupsApp.tsx`, mount effect.
- 2: `components/setups/ReelCard.tsx`, in the existing `setPlaying(true)` handler.
- 3: `ReelCard.tsx`, in the `onGet` handler.
- 4: `components/setups/BookingSheet.tsx`, mount effect. `from` distinguishes the
  path taken, since `book()` in `SetupsApp` can be reached from the detail sheet
  only right now, but that may change.
- 5: server side, see the trap below.
- 6: `components/setups/AskForm.tsx`, on a successful response.

The catalog is `lib/setups.ts`. Every setup carries `slug`, `category`,
`price`, `views`. `ORDERED_SETUPS` is the shipped grid order, so the index in
that array is the `position` property.

## Trap 1: step 5 cannot fire from the browser

The Cal calendar is a **cross-origin iframe** (`app.cal.com`). The page never
learns that a booking completed, and session replay cannot see inside it
either. The booking step is a black box on the client. Do not try to listen for
it with a message handler or a timer; both will lie.

Fire `booking_completed` **server side** from `app/api/cal/route.ts`, which
already exists and already receives Cal's webhook.

To make that event land on the right person rather than an anonymous one:

1. In `BookingSheet.tsx`, put the visitor's PostHog distinct id into the Cal
   booking notes next to the setup slug that is already written there. Get it
   with a small exported helper in `lib/analytics.ts`, something like
   `export function distinctId(): string | null`, wrapping
   `posthog.get_distinct_id()`. Do not reach for `posthog-js` in the component.
2. In `lib/cal-webhook.ts`, read it back out. There is already a
   `setupSlugFromNotes()` doing exactly this kind of parsing, with tests. Copy
   its shape, including returning `null` on anything unexpected.
3. In the route, send the event with `posthog-node` using that id as
   `distinctId`.

**Without that stitch the funnel breaks at the last step, which is the step
that matters.** PostHog will happily record `booking_completed` against a new
anonymous person and the funnel will read as 0% conversion forever.

`posthog-node` is a new dependency. It is the correct one; do not try to call
the capture API by hand.

## Trap 2: do not send contact values

`setup_requested` carries `has_contact: true`, never the email or handle
itself. The same rule the rest of the app follows.

The ask form's contact field was recording into session replay until
2026-07-27; it now carries `NO_CAPTURE`. If you add any new input to
`components/setups/`, it needs the same treatment.

## Build order

1. **Events 1 to 4 and 6**, all through the existing `track()`. No new
   dependency, no config. Ship it and confirm they arrive in PostHog Live
   Events before going further.
2. **The distinct id stitch:** add it to the Cal notes in `BookingSheet`, read
   it in `lib/cal-webhook.ts` next to the slug parsing.
3. **Event 5 server side** with `posthog-node` in `app/api/cal/route.ts`.
4. **Build the funnel insight** in PostHog on those six events, broken down by
   `category`. This is also how you find out whether the automations-first grid
   ordering was the right call.
5. **Replay:** nothing to build. Add a saved filter for sessions containing
   `setup_opened` without `booking_opened`. That is the drop-off worth
   watching, and the replays are where the answer to "why" lives.

## Depends on

Step 5 needs the Cal webhook to be live, which needs two things Pulkit has to
do himself and may not have done yet:

- `CAL_WEBHOOK_SECRET` set in Vercel Production.
- A webhook in Cal pointing at `https://midsesh.com/api/cal` with that secret,
  subscribed to Booking created, cancelled and rescheduled.

Check with him before building step 5. Until both exist, `/api/cal` returns 401
to everything by design, so nothing will reach the route to fire the event.
Steps 1 to 4 and 6 do not depend on any of that and can ship first.

## Testing notes from the last session

- The tab Chrome hands the agent runs **hidden**, so `document.visibilityState`
  is `hidden`. Lazy images never load, `getBoundingClientRect()` returns zeros,
  and `resize_window` reports success without changing the viewport. Anything
  viewport-dependent measured that way is wrong.
- What worked instead: run the production build locally on port 3100, put a
  tiny proxy in front that strips `content-security-policy` and
  `x-frame-options`, then measure a real 390x844 iframe against the proxy. The
  site sets `frame-ancestors 'none'`, so it cannot be framed without that.
- PostHog events can be checked from the browser console with
  `posthog.capture` calls landing in Live Events, but the reliable check is the
  PostHog MCP, which is connected to project 526312 in Pulkit's sessions.

## House rules that apply

- No em dashes anywhere, and no AI-sounding language. See `~/.claude/CLAUDE.md`.
- Verify on a Vercel preview before merging to `master`, then merge and let it
  deploy. No pull request step.
- `master` is checked out in another worktree, so push with
  `git push origin <your-branch>:master` rather than checking it out.
