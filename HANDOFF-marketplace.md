# Marketplace launch: session handoff

**Last updated:** 2026-08-07
**Read this first. It supersedes `marketplace-preview/HANDOFF.md` for anything
about the live app.** That file is still correct about the static preview's
history and the two rejected redesigns; it knows nothing about the port.

---

## 0. Where this actually is

The marketplace is **built, deployed to a Vercel preview, and verified**. It is
**not on production**. Three things stand in the way, all listed in section 4.

- Branch: **`design/cream-directions`**, 12 commits ahead of `master`, nothing
  pushed, nothing merged.
- Latest preview:
  **https://get-an-expert-mfjrhxkww-pulkitwalia099s-projects.vercel.app**
- Vercel project `get-an-expert-web` is linked locally and `vercel whoami`
  answers `pulkitwalia099`, so `vercel deploy` works with no setup.

### Routes as they stand

| Route | What it is |
|---|---|
| `/` | The marketplace. New. React, `app/page.tsx` |
| `/search-experts` | The old expert-search product, **unchanged**, moved off `/` |
| `/ask` | Redirects to `/search-experts` (307, deliberately not permanent) |
| `/services/ugc-ads` | The designed page, served as static HTML via rewrite |
| `/services/linkedin` | same |
| `/services/voice-outbound` | same |
| `/services/video-editing` | same |
| `/services/explainer-videos` | same |
| `/services/ratemywipe` | same, and deliberately **not** linked from the home grid |
| `/privacy` | Pre-existing, 304 lines, entity and address already filled in |

---

## 1. The decision that shapes everything

**The six service pages are served as the static HTML that was designed, behind
rewrites in `vercel.json`**, exactly the way this repo already serves `/classic`.

They were first rebuilt as one React template driven by a data file. That was
wrong and was thrown away: the UGC page lost its sample carousel, its worked
example and its objective picker, and every other page lost its bespoke
sections. Re-deriving 3,000 lines of reviewed layout, motion and carousel logic
by hand loses detail every time.

**Do not "properly port" these to React without being asked.** If you do, the
bar is every section surviving, not most of them.

Files: `public/services/*.html`, assets in `public/services/assets/`, rewrites at
the bottom of `vercel.json`.

---

## 2. What was built, in order

1. **`/` is the marketplace.** Hero, three live services in equal thirds with
   media on top, two Launching soon below, how it works, closing strip, the
   existing `Backing` strip, `SiteFooter`.
2. **`lib/services.ts` is the single source of truth for prices**, read by both
   the home cards and nothing else now. It exists because the preview shipped a
   home tile promising "$10 per video" against a page selling a $29 first ad.
3. **`public/services/intake.js`** makes the designed forms real. They were
   markup: every one looked complete, did nothing, and **none asked for an email
   address**, so even a working submit would have captured a brief with no way
   to answer it. The script adds the missing field and posts to `/api/signup`.
4. **Reuses, never copies:** `Backing`, `SiteFooter`, `ContactLink`,
   `AccountLink`, `/api/signup`. Every token comes from `app/globals.css`.

### Content decisions the user made, do not relitigate

- It is **AI UGC**, not UGC. Named in the service name, the card blurb, the
  promise, the output card and an FAQ that answers plainly that the actors are
  AI generated. This is an honesty point, not a positioning one.
- **The 30% hook rate promise is deleted** from the offer. So are its guarantee
  section, its four pricing spec rows and its FAQ. The sales/CPA/ROAS disclaimer
  that lived inside that FAQ was **kept** in a new "Do you promise results?"
  entry; do not drop it.
- Monthly pack is **12 ads**, not 8.
- Names: **AI UGC Campaign Engine**, **LinkedIn Growth Engine**. The user asked
  for alternatives to be proposed and took these.
- **RateMyWipe is off the home grid.** Its page still exists and works.
- Live: AI UGC, LinkedIn, Video Editing (badged `New · in beta`).
  Launching soon: Voice Outbound, Product Explainer Videos.
- Voice Outbound is priced **per qualified lead**, rate still open.
- Voice and Explainer **keep every designed section**. Only their CTAs changed
  to `Get notified` and their intake became a single email field.
- **"Ask for something custom" is removed everywhere.** The chat handles it.
- The home hero has **no search bar** and the section head is
  "What our agents and experts deliver".
- **The $29 does not charge anything.** The user chose the existing no-payment
  flow. Nothing in this repo touches Stripe and nothing should start to without
  being asked.

---

## 3. Two redesigns were built and rejected. Do not propose a third.

Swiss Industrial Print on 2026-08-06 (PR #31 closed). Three cream directions on
2026-08-07: Ledger, Studio and Terracotta, rendered on real content and all
rejected. The existing cream and terracotta system stays. Detail in
`marketplace-preview/HANDOFF.md` section 0, session 6.

---

## 4. What blocks production, and only this

1. **Five amber TBD badges are visible on the home page.** `Screenshot TBD`,
   `Samples TBD`, `Price TBD`, `Rate TBD`, `Prices TBD`. Correct on a private
   preview, reads as unfinished to a paying customer. Clearing it needs three
   numbers from the user: Video Editing price, Voice Outbound rate, Explainer
   template prices.
2. **The top-right button says "First setup free", not "Sign in".** The user
   asked for Sign in. That button is `components/AccountLink.tsx`, shared with
   `/search-experts`, and its signed-out copy advertises the setups product.
   Changing it affects both pages, so it was left alone.
3. **20MB of video sits in `public/services/assets/`.** It works and it deploys,
   but it belongs on blob storage before real traffic.

When those clear: `vercel deploy --prod`, then verify `/` and `/search-experts`
on the live domain before saying anything shipped.

---

## 5. Gotchas that cost real time. Read before debugging.

- **`.foot` was two different things.** On the static preview it was both the
  page footer and the SKU card footer, so the footer's `text-align:center`,
  muted colour and 40px bottom padding landed on every price in the grid. That
  is why prices rendered grey and centred. The React side calls it `.cardFoot`
  on purpose. If you add a card footer anywhere, check for the collision first.
- **Headless screenshots lie at phone widths.** macOS Chrome enforces a minimum
  window width around 500px, so `--window-size=390` lays the page out at ~500px
  and then clips the PNG to 390. That reports false overflow: text does not wrap
  because the columns really were wider, and the last cell falls outside the
  crop. **Measure the DOM or use a real 390px viewport.**
- **The Browser pane runs hidden.** CSS transitions, rAF and video playback are
  frozen there, so `getComputedStyle` reports pre-transition values and video
  stays paused. Several confident wrong readings came from trusting it.
- **`RESEND_API_KEY` and `BOOKING_NOTIFY_EMAIL` are Production-scoped only.**
  Any form tested on a preview deployment will take the "alert did not send"
  branch. That is correct behaviour, not a bug. The forms deliberately refuse to
  promise an email they could not send.
- **`ContactBlock` takes a required `open` prop** and returns `null` without it.
- **8 pre-existing `tsc` errors** in `lib/__tests__/operators.test.ts`. Not
  yours. `npm run build` and `npm test` are both green regardless.

---

## 6. Verification bar

Every claim in section 0 was checked against a deployment, not locally:

- All ten routes return their correct status, `/services/nope` 404s,
  `/ask` follows through to `/search-experts`.
- On `/services/ugc-ads`: 4 sample videos, both synced worked-example clips, the
  4-way objective picker, 4 pricing tiers, 10 FAQs, 0 dead links, 0px overflow.
- On `/services/voice-outbound`: demo strip, input/output, how it works, sample
  calls, three pricing models, 6 FAQs all present; all CTAs read `Get notified`;
  a real submit replaced the form with a confirmation.
- 581 tests across 42 files pass. `npm run build` compiles.

The eval gate in `CLAUDE.md` does **not** apply: nothing here touches
`lib/prompts.ts`, the model, `sanitizeReply` or the chat route.

---

## 7. Still open, inherited

- No payment path for the $29 at all.
- `@valerii.murr` permission for the reference clip on the UGC worked example,
  and written client sign-off to show their ads. Both block going fully public.
- Creator photo for the `@blurred_ai` byline.
- The `$ —` em-dash placeholder still exists in the `marketplace-preview/`
  copies of voice, video-editing and explainer. The `public/services/` copies
  are what ship, so this is cosmetic debt in the preview folder only.
