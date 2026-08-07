# Get-an-Expert Web — Marketplace Pivot: Session Handoff

**Last updated:** 2026-08-06 (session 4 close-out, UGC Ads shipped in 710b988)
**Read this first in any new session. It is the single source of truth.**

**New session?** Clone/pull https://github.com/Pulkitwalia099/get-an-expert-web
and work inside `marketplace-preview/` ONLY. Do not deploy, do not touch the
live Next.js app. Read the progress log below, then continue from
"Next session starts at".

## 0. Progress log

### Session 5 (2026-08-06): the design language is now Swiss Industrial

**This supersedes the design half of the HARD RULE below. Read both.**

- **DECISION, made by the user on 2026-08-06.** The visual system moves to
  **Swiss Industrial Print**, the light substrate of the `industrial-brutalist-ui`
  language in github.com/leonxlnx/taste-skill. Warm cream and terracotta are
  retired. Ground `#F4F4F0`, carbon ink `#050505`, hazard red `#E61919` as the
  only accent, zero border radius, no shadows, no gradients, no glass.
- **The freeze is deliberately lifted for this work only.** The HARD RULE in
  "Sessions 1 and 2" below still governs everything it does not cover, and the
  new system gets frozen the same way once it is built. Do not treat this as
  permission to improvise generally.
- **The plan lives in `SWISS-PLAN.md`**, reviewed through plan-room at
  `SWISS-PLAN.plan-room.html`. 10 tasks, 4 tradeoffs, 8 unknowns, risk low.
  **Open that file before writing any code.** Four of the tradeoffs and all
  eight unknowns need the user's answer, and several block the first task.
- **How we got here.** Sessions 1 to 4 built the pages inside the old system.
  A review against github.com/pbakaus/impeccable and taste-skill measured the
  set and found: 26 font sizes with 10 between 10.5px and 15px, 13 corner radii
  with 24 places bypassing the `--radius-card` token, an eyebrow above every
  section on 6 of 7 pages, all 36 section heads centred, and all five brand
  colours sitting inside the palette family taste-skill names as the AI default
  for craft brands. Five design languages were rendered on real content and the
  user picked Swiss Industrial.
- **Audit items still to apply, tracked as T9 in the plan.** Item 03 (radii)
  and item 04 (centred heads) are resolved by the language itself. Items 01
  (one eyebrow per three sections), 02 (consolidated type ramp) and 05 (no em
  dash in the `$ —` placeholder) still have to be done by hand. Items E2 (div
  built fake previews) and E4 (six one-line cards) were left as the user's call
  and should be raised again once the new language is in place.
- **Nothing was converted in this session.** No page CSS changed. The only
  files touched were `SWISS-PLAN.md`, this log, and `START-HERE.md`.

### Session 4 (2026-08-06): UGC offer redraft

- **`hifi/ugc.html` fully redrafted around a new offer.** The old pricing said
  HUMAN + AGENT while charging $10 to $15 a video, which is at or below what a
  pure-AI tool charges with no human at all. That made the badge unpayable, and
  the badge is the whole marketplace positioning. Everything below follows from
  fixing that.
- **The offer now:** $29 first ad, credited to the first month. Three monthly
  packs sized to the buyer's ad spend, $395 / $890 / $1,690 for 8 / 24 / 60 ads.
  Volumes follow the working benchmark of 20 to 30 creatives a week per $100k
  of monthly spend, so the buyer can self-select a tier.
- **Guarantee replaced.** Was "pay only if you like it". Now: any ad under a 30%
  hook rate gets replaced free until it clears. Chosen because hook rate is the
  only metric the creative dominates, it is self-reported from their own ads
  manager so it needs no account access, and a replacement costs one
  regeneration rather than a refunded month. The page states plainly that we do
  not promise CPA or ROAS.
- **Benchmarks verified 2026-08-06, not assumed.** Meta hook rate median is 28%,
  top 10% is 40%+, and ecommerce benchmarks about 12% above cross-industry,
  so ~31%. **Our 30% floor is therefore slightly under the DTC median**, which
  is why the page calls it a floor and not a target and shows the whole scale.
  Do not quietly raise this to 35% without re-checking the replacement cost.
- **Arcads pricing could NOT be verified from source.** `arcads.ai/pricing`
  returns 404. The $110 / $220 figures circulating in the strategy docs come
  from third-party review sites and may be stale or affiliate-driven. No
  competitor price appears anywhere on the page, so there is no exposure, but
  do not put one there without checking the vendor's own page first.
- **Objective picker added**, 4 options not 5. Prospecting was dropped because
  it is the same funnel stage as Awareness under a media-buying name, and
  showing both reads as not knowing the difference. Order is Awareness,
  Consideration, Conversion, Re-engagement.
- **"How it works" rebuilt as the monthly cycle**, still 4 emoji cards so the
  frozen 4-column grid is untouched. The hero card moved from "You review and
  pay" to "We make four, ship one", because reassurance now lives in the
  guarantee section and the differentiator needed the emphasis. Card 4 is the
  loop, which is what makes it a subscription.
- **Team section added.** The AI video lead is real (instagram.com/blurred_ai)
  and his credentials are on the page as chips: Kaggle Master, NVIDIA, Z by HP
  Ambassador, Sr. Data Scientist. **His name is `Name TBD` in amber**, because
  the user supplied a handle and not a name, and inventing one was refused.
  Positioned as AI video lead and deliberately NOT as a media buyer: his public
  feed is AI tooling and career content, not DTC ad accounts, and the link is
  right there on the page. Strategy is credited to Pulkit and Rohit.
- **Prose cut to tables per user instruction.** Tier bodies became 5-row spec
  lists, credentials became chips, the hook rate benchmark became a 4-cell
  scale. Audience is seed to Series A founders who skim.
- **Deliberate deviation, needs your call:** normalised the two known drift
  values to match the other five pages, `.dhead .promise` 520 to 540 and
  `.guarantee h2` 560 to 580. Session 3 flagged these and said to ask first.
  Two lines to revert if you want ugc.html left alone.
- **Verified, not assumed:** 0px horizontal overflow at every width from 320 to
  1440. Zero em dashes, zero italics, zero exclamation marks in copy. Six TBD
  markers still visible. Shots re-taken at exact page height, desktop 1440x5090
  and mobile 390x8380.
- **Second pass, same session, after user review:**
  - **Real sample videos are in.** Three user-supplied clips transcoded to
    `hifi/assets/sample-1..3.mp4` (1.86 / 1.26 / 1.76 MB, h264, faststart).
    Autoplay muted loop with a per-card sound toggle; only one can be unmuted
    at a time. The gradient placeholders are gone.
  - **PROVENANCE IS UNRESOLVED AND MARKED TBD ON THE PAGE.** The source
    filenames read like social downloads ("This UGC Ad Is 100% AI", "I Created
    an AI UGC Ad in Seconds", and one naming the real brand Dot & Key). Session
    3 set the precedent that we do not fill a gallery with someone else's work.
    Do not ship publicly until the user confirms these are ours, or they are
    relabelled as references rather than output.
  - **sample-2 is only 360x640**, which is soft in a 284px card on a retina
    screen. Replace with a higher-resolution source when possible.
  - **CTA moved out of the hero.** The header now carries a ghost "See what
    comes back" that jumps to samples. The first money ask sits directly under
    the sample gallery, where the visitor has just seen the work. User called
    the old hero CTA premature and the "$395 a month / Start for $29" pairing
    confusing, which it was.
  - **Pricing restructured to trial plus one pack.** Two cards visible, the $29
    trial and the $395 monthly, with $890 and $1,690 behind a `<details>`
    expander. The trial card now spells out what $29 buys, which is what the
    confusion was.
  - **Subscription starts with a call, not the form.** Tier CTAs say "Book a
    call". The three-field form is explicitly labelled as the $29 path only,
    with a note above it and a new FAQ entry.
  - **Model preference removed** from both the input flow and the form. Input
    is now three things: product link, an ad you like, objective. Section
    heading is "Three things in. One ad out."
  - **Re-verified:** 0px overflow at 320/390/721/1024/1440. All three videos
    reach readyState 4 and autoplay. Sound toggle exclusivity tested. Expander
    opens. Zero em dashes. Six TBD markers.
- **Third pass, same session:**
  - **Samples are now five of our own, in a carousel.** Provenance was queried
    because the first batch had social-post filenames; the user confirmed all
    of it is our work and asked only for the **Dot & Key** clip to be dropped,
    since it named a real brand. That one is deleted. The surviving five are
    `assets/sample-1..5.mp4`, 1.26 to 1.84 MB each, four at 720x1280 and
    sample-4 at 360x640 which stays visibly soft. **Client permission to show
    this work publicly has not been confirmed in writing.**
  - The 3-up grid became a horizontal scroll-snap carousel, since five vertical
    videos will not sit in a row. Cards are 74% width on mobile and one third
    on desktop, so the next one always peeks and the affordance is obvious
    without adding arrows. `.samples` carries 28px bottom padding because
    `overflow-x` clips the card shadow otherwise.
  - **Second provenance catch:** the original sample-2, a golden retriever and
    a "Buddy" dog-walking app, was NOT our work either. Found by stepping
    through frames rather than trusting the single-frame check that missed it
    the first time. Replaced with the user's `hf_*db30.mp4`, a MyFutureSelf app
    walkthrough. **Check every clip end to end before publishing, not one
    frame.**
  - Carousel order set by the user: street app, at home captioned, app
    walkthrough, street interview, footwear last, because footwear already
    appears elsewhere on the site.
  - Captions are format-descriptive and read off the footage, not guessed.
    Deliberately NOT labelled by objective, and no client is named. Note two
    clips both show an app on a phone, so the captions distinguish them by
    setting rather than by subject.
  - **sample-4 is 360x640 and now sits in slot 2**, the most prominent position
    after the lead. It is the only soft clip in the set. Re-export at 1080x1920
    or move it further back.
  - **Byline moved out of the samples section** at the user's request and now
    sits under the How it works cycle, reading "Ads by @blurred_ai". The word
    "Led by" was rejected. Note this is now a direct authorship claim over the
    clips, which is the user's call and not one to soften back without asking.
  - **Worked example section added**, sitting directly under the abstract input
    diagram so the diagram gets an immediate concrete instance. Two panels only:
    the reference the client sent, and the ad we made from it. The user floated
    a four-part version (reference, product, uploaded sample, outcome) and it
    was cut to two, because the product and the upload are already covered by
    the diagram above and four things dilute the read.
  - It works because the poses match. @valerii.murr's styling video and our
    footwear ad both open on the leg-up shoe pose, so the before and after is
    legible with no explanation. **The footwear clip was pulled out of the
    carousel** to avoid showing it twice; the carousel is now four.
  - **The like count is 143.7K, not the 240K quoted in conversation.** Verified
    off the public post on 2026-08-06 along with 703 comments. View count is not
    publicly visible. Do not restore 240K without a source.
  - **`reference-1.mp4` is a third party's work**, self-hosted here. It carries a
    visible credit and a link to the original post, and the label says plainly
    that it is someone else's post used as the brief. **Before this goes public,
    either get @valerii.murr's permission or swap to Instagram's official embed**,
    which attributes and links natively. Self-hosting someone's Reel on a
    commercial page is the same class of problem as the Dot & Key clip.
  - **The two example clips are cut to a shared beat.** The hook is the outfit
    change on the leg-up pose. Scene detection put it at 6.60s in the reference
    and 4.88s in ours, so both were re-cut to a 4.40s window with 3.00s of held
    pose before the change and 1.40s after. The reference window stops at 8.00s
    because its next cut is at 8.17s and would otherwise intrude.
  - Both are forced to **30fps CFR, 132 frames, 4.400s, beat at 3.000s**. The
    first attempt left them 25ms apart in duration, which drifts the beat apart
    over a few loops. Identical frame counts mean the loop holds structurally
    rather than depending on the script.
  - `loop` was removed and both are driven from JS: whichever hits the end sends
    both back to zero, with a 120ms drift correction. That is now a safety net,
    not the mechanism. Files are `reference-sync.mp4` and `outcome-sync.mp4`;
    the untrimmed `reference-1` and `outcome-1` are kept as sources.
  - **Verification limit, read before changing the timing.** Live playback sync
    could not be observed anywhere in this environment: the Browser pane runs
    hidden so media stays paused, and headless `--virtual-time-budget` does not
    advance media decoding, so successive budgets render identical frames.
    Alignment was proven at file level instead, by pulling frames at 2.60, 2.93,
    3.07 and 3.40s from both and confirming they flip outfits in the same
    window. Anyone changing these cuts should eyeball the result in a real
    browser rather than trusting a screenshot.
  - **Carousel now has centre-focus and auto-advance.** On mobile the centred
    card sits at scale 1 while neighbours drop to 0.9 and 60% opacity, driven by
    a scroll handler on rAF. On desktop the 3-up layout is untouched and only
    auto-advance runs, per the user's call that desktop already worked.
    Auto-advance steps every 3.2s, pauses on hover and when the tab is hidden,
    stops permanently on the first real interaction, and on mobile also stops
    itself after 20s so nothing keeps moving under a reader.
  - **The script writes `--focus-scale` and `--focus-op`, never `transform`
    directly.** The media query decides whether those variables are consumed, so
    the desktop layout cannot end up wearing stale mobile scaling if a repaint
    is missed. An earlier direct-transform version had exactly that bug.
  - Motion follows the house rules: transform and opacity only, the existing
    `--ease-out` curve, 260ms, hover gated behind `(hover:hover) and
    (pointer:fine)`, and `prefers-reduced-motion` drops both the scaling and the
    auto-advance while keeping the opacity cue.
  - **Verification note for the next session.** The Browser pane runs with
    `document.hidden === true`, which freezes CSS transitions and rAF, so
    `getComputedStyle` there reports pre-transition values and reads as "the
    transform is not applying". It is. Verify motion with headless Chrome and
    `--virtual-time-budget` at two different values and compare the frames, or
    set `transition:none` first. Several confident wrong readings came from this.
  - **Copy trimmed on request.** The long paragraph under the hook rate
    guarantee is gone and the benchmark scale now speaks for itself. **The
    "we do not promise sales, CPA or ROAS" disclaimer was NOT deleted, it moved
    into the hook rate FAQ answer**, because it is the sentence that keeps the
    guarantee from reading as a performance promise. Do not drop it from there.
    The pricing note lost the creatives-per-$100k benchmark and keeps only
    "Pause or cancel anytime".
  - **Team section deleted.** User wanted the credit subtle rather than a block.
    Replaced with a one-line byline under the samples: avatar, "Led by
    @blurred_ai", 246K followers (verified from the public profile 2026-08-06),
    linking out. Pulkit and Rohit removed entirely, along with every credential
    chip on both sides.
  - Wording is "Led by" and not "Made by", because the samples are company work
    and he leads the video side. Do not change this to a personal authorship
    claim without checking who actually cut each one.
  - **SLA is now 24 hours, not 48**, everywhere: trial card, CTA subline, form
    note, FAQ. The SLA TBD marker is retired.
  - **Watermark step added.** The $29 ad arrives watermarked; the clean file
    follows once they say yes, and the $29 credits to the first month. In the
    form note and a new FAQ entry.
  - "Two minutes of input" is now "60 seconds of input".
  - **Re-verified:** 0px overflow at 320/390/721/1024/1440. All three videos
    readyState 4 and autoplaying. Zero em dashes. Three TBD markers left.
    Desktop 1440x4830, mobile 390x7430. `assets/` is now 16MB, which is worth
    watching before the Next.js port.
- **Still open:** creator photo for the byline, the Book a call link target,
  revisions and ownership policy, whether the actor is selectable, written
  client sign-off on showing their ads, and **there is no payment path for the
  $29 at all** (per repo CLAUDE.md, orders carry no payment and nothing touches
  Stripe).

### Session 3 (2026-08-06)

- **All six detail pages now exist.** Built `hifi/ratemywipe.html`,
  `hifi/voice.html`, `hifi/video-editing.html` and `hifi/explainer.html` from
  the ugc/linkedin template. Every home tile now links to a real page; no
  `href="#"` is left in the SKU grid.
- **Screenshot backlog cleared.** `hifi/shots/` holds all 7 pages at desktop
  (1440) and mobile (390), each shot at the page's exact height so there is no
  dead space. Captured against a local server, not `file://`.
- **Verified, not assumed:** all 6 tile hrefs return 200; all 7 pages have
  0px horizontal overflow at 390px; the 4 explainer template cards align at
  the same title offset (109px) regardless of panel count.
- **Per-page decisions worth keeping:**
  - RateMyWipe drops the intake form. It is an open-source tool you run, so
    section 7 is a command block plus three run steps. Repo URL is `TBD`.
  - Voice Outbound adds a demo strip under the header ("Talk to the agent"),
    since hearing it is the sample. Whether the demo is live or recorded is
    still open, so it carries a `Demo TBD`.
  - Video Editing has **no sample gallery on purpose**. There is no content
    yet, so it shows three labelled empty slots and says we are not filling
    them with someone else's work.
  - Explainer replaces the samples section with a 4-template gallery, each
    with its beat structure drawn as a storyboard. Template count and every
    price are `TBD`.
- **Undecided prices are shown as options, not blanks.** Voice shows the three
  pricing models under consideration (per call / per qualified lead /
  monthly), Video Editing shows two (per video / per finished minute), each
  with its real trade-off written out. That turns open question 3 and 4 into a
  decision you can make by reading the page.
- **Interaction states (deliberate deviation, needs your call):** the global
  rule requires `:active { scale(0.97) }` press feedback and `:hover` gated
  behind `@media (hover:hover) and (pointer:fine)`. The template had neither,
  so buttons fired their hover lift on tap on a phone. I read the HARD RULE
  below as covering appearance (fonts, tokens, card structure) and not
  interaction states, and applied press feedback across all six pages
  including `index.html`, `ugc.html` and `linkedin.html`. Nothing about the
  resting appearance changed. **Say the word and I will revert the two
  pre-existing files.**
- **One open copy question:** the price placeholder `$ —` uses an em dash. It
  came from the approved `ugc.html` and is now on four more pages. It is a
  placeholder glyph rather than prose, so I kept it for consistency. If you
  want zero em dashes anywhere, it is a one-line find and replace across five
  files.
- **Not done:** the real LinkedIn post screenshot is still a skeleton, and
  UGC's sample videos are still gradient placeholders.

### Sessions 1 and 2

- **HARD RULE (user, locked 2026-08-06, restated and sharpened the same day,
  applies everywhere):** the design system is FROZEN to the original site. It
  was built by an expensive brand designer and is a fixed inheritance, not a
  starting point. New work means new elements **composed from** the system,
  never new values **in** it. No session (AI or human) changes it unless the
  user explicitly decides to.

  Frozen, specifically:
  - The `:root` token block, verbatim. Do not add a token, not even to name a
    colour that already exists as a literal elsewhere. Violated once in
    session 3 (`--green: #2F7A3D`, already used in index/ugc/linkedin) and
    backed out.
  - The type scale, **including headline font size**:
    `.dhead h1 { font-size: clamp(30px,5vw,42px) }` on every detail page.
  - The system sans stack. Fraunces serif was tried and rejected.
  - No italics anywhere.
  - Section rhythm, wrap width, grid columns and gaps, card radius, padding,
    border and shadow conventions.

  Home vs detail pages legitimately differ, and that is NOT drift:
  `index.html` runs wrap 1060 (detail 880), section padding
  `clamp(48px,8vh,88px)` (detail `clamp(36px,6vh,64px)`), and section h2
  `clamp(23px,3.6vw,30px)` (detail `clamp(21px,3.4vw,27px)`).

  Before claiming a new page matches, **diff the shared declarations against
  the template**. Drift is invisible at a glance and compounds. Copy for tiles
  and pages comes from Rohit where Rohit has written it; design stays ours.
- **Known pre-existing drift between the two approved detail pages, needs a
  decision:** `ugc.html` and `linkedin.html` disagree on two paragraph
  max-widths. `.dhead .promise` is 520px in ugc, 540px in linkedin.
  `.guarantee h2` is 560px in ugc, 580px in linkedin. No font size, weight or
  letter-spacing differs. The four session-3 pages followed `linkedin.html` as
  the more recently approved page, so it is now five pages at 540/580 and ugc
  alone at 520/560. Two lines to normalise either way. Ask before touching an
  approved file.
- **Font revert (done):** the Direction A serif experiment (Fraunces) was
  REJECTED by the user and removed from index.html and ugc.html. All pages
  use the original system sans stack only. Direction A survives only as
  layout/tile structure, not typography.
- **LinkedIn tile (user correction):** copy restored verbatim to Rohit's
  text; my earlier copy tightening was reverted per the rule above.
- **UGC promo video (done):** midsesh-promo.mp4 embedded in the UGC flagship
  tile as autoplay muted loop; file at hifi/assets/midsesh-promo.mp4
  (~10.7 MB in git).
- **LinkedIn detail page (done):** hifi/linkedin.html built from the UGC
  template with Rohit's copy and pricing ($100 per 10k impressions in your
  relevant audience). Home tile now links to it. FAQ items marked TBD.

- **Phase A (done, session 2):** this HANDOFF.md + low-fi wireframe in
  `wireframe/` (home + UGC detail), screenshots in `wireframe/shots/`.
  User reviewed: "this looks good, go ahead".
- **Phase C hi-fi (built, pending user review):** `hifi/index.html`
  (marketplace home: hero "Work, delivered." + 6 SKU tiles, UGC flagship tile
  spans 2 cols with video thumb), `hifi/ugc.html` (full branded UGC detail
  page, real copy, prices marked TBD where undecided), `hifi/directions.html`
  (3 premium brand directions). Verified shot: `hifi/shots/index-desktop.png`.
  REMAINING: screenshots of ugc.html + directions.html + mobile (Bash
  approvals expired mid-session; re-run the Chrome headless commands).
- **Name correction (user, session 2):** it is RateMyWipe / "wipe coding",
  never "vibe". Already applied everywhere.
- **Brand direction (corrected 2026-08-06):** Direction A survives as layout
  and tile structure ONLY. Its typography (Fraunces serif) was rejected and
  reverted. NO italics anywhere. Fonts remain the original site font; see
  the HARD RULE at the top of this log. Directions B and C rejected.
- **UGC page revisions (done, session 2):** input/output section rebuilt as a
  visual flow (mini product-site thumb + reference-ad thumb + model photo →
  big output video card, less text); How it works simplified to 4 emoji-led
  cards (🔍 ✍️ 🎬 ✅) with "You review and pay" as the emphasized main card
  (user explicitly asked for emoji here, overriding the no-emoji copy rule
  for this section only); section H2 is "You review, then you pay."
- **Screenshot backlog:** CLEARED in session 3. All 7 pages, desktop and
  mobile, are in `hifi/shots/`. If you need to re-shoot, start the static
  server (`.claude/launch.json` has a `marketplace-preview` entry on port
  4319) and shoot against `http://localhost:4319`, not `file://`.
- **Next session starts at: the Swiss Industrial rebuild. Open `SWISS-PLAN.md`
  first.** Everything below is now queued behind it, because converting the
  design language touches every page and doing more work in the old system
  means converting that too.
  - **Step 1 is not code.** Answer the 4 tradeoffs and 8 unknowns in the plan.
    Several block T1: which page converts first, which macro grotesk we can
    licence, how much analog texture, and what happens to the amber TBD and
    green ready states under a single accent rule.
  - **Step 2 is T1 and T2 on one page only**, then stop for approval. The plan
    says `voice.html` unless the user overrides in the tradeoff.
  - Queued behind the rebuild, unchanged: the remaining SKU prices (section 7),
    unblocking the UGC launch (items 1a to 1f), and Phase E, the Next.js port
    with six `/services/<slug>` routes. The ~20MB of video still needs to move
    to blob storage during that port.
- **LinkedIn tile (done, session 2):** Rohit's commit b48a3a5 built the
  LinkedIn Marketeer flagship tile (2-span, post-screenshot skeleton,
  $100 per 10k impressions pricing). Taste pass in commit 5a7e4d1: copy
  tightened to UGC-tile rhythm, media block hints an image, LinkedIn-blue
  reaction dot added. Real post screenshot still TBD (swap instructions in
  the .pthumb CSS comment). CANONICAL FILES NOW LIVE IN THE REPO at
  marketplace-preview/; workspace hifi/ is a mirror. Edit the repo copy
  first, then mirror back. LinkedIn DETAIL page (linkedin.html) not built
  yet; tile href is still "#".

---

## 1. The pivot (locked by user, session 2)

The site is becoming an **AI + human agent marketplace**:

- Agents deliver the work. Human experts stay in the loop and take
  accountability for the outcome.
- It is NOT a self-serve platform. The pitch: "You do your work best,
  we handle the rest." Pay for outcomes and outputs, not subscriptions to
  figure things out.
- Everything is input -> output: user gives defined inputs, gets a defined
  deliverable back, at a stated price.
- The existing search bar / "find an AI expert" flow REMAINS as a separate,
  secondary product ("Looking for a human AI expert instead?").

Supersedes session-1 framing of "five tiles, expert-first". Earlier plan file
`marketplace-tiles-plan.md` in this folder is historical context only.

## 2. SKU catalog (session 2 state)

Six SKUs named so far. User earlier said "five tiles", then listed six —
six it is, grid handles any count.

| # | SKU | Badge | Input | Output | Price | Sample hook |
|---|-----|-------|-------|--------|-------|-------------|
| 1 | **UGC Ads** (flagship, BUILT, committed 710b988) | HUMAN + AGENT | Product link, a UGC ad you like, objective | Research, script, finished UGC ad | $29 first ad credited to month 1; packs $395 / $890 / $1,690 a month | $29 sample, then a 30% hook rate promise |
| 2 | **LinkedIn Marketeer** | HUMAN + AGENT (assumed) | TBD | TBD | TBD | TBD |
| 3 | **RateMyWipe** | AGENT | Your Claude session transcripts (open-source tool on GitHub, user runs it on their cloud session) | Wipe-coding level 1-5, breakdown by skill area (planning, reviewing, running tools, etc.), prescribed skill packs/repos to level up | **FREE** | It IS the free sample/lead magnet |
| 4 | **Voice Outbound** ("voice port") | AGENT + HUMAN QA (assumed) | Call list + script/transcript | Outbound calls done: leads generated and qualified | TBD | On-site voice agent you can talk to, to judge quality |
| 5 | **Video Editing** | HUMAN + AGENT (assumed) | Raw videos | Edited video | TBD; no content/data yet | TBD |
| 6 | **Product Explainer Videos** | HUMAN + AGENT (assumed) | Product + launch context | Explainer video from fixed templates | Fixed price per template type | Template gallery |

Notes:
- "Lead Man" from session 1 appears folded into SKU 4 (voice outbound lead
  gen/qualification). Confirm, then delete the old name.
- RateMyWipe details: open-source GitHub project; analyzes your AI coding
  ("wipe coding") transcripts, scores 1-5, identifies weak areas, recommends
  skill packs/repos/git records to unlock productivity. Free tier of the
  marketplace and the credibility play.

## 3. Information architecture

**Home page (new order):**
1. Sitebar (wordmark, Contact, Privacy, Sign in)
2. Hero — marketplace positioning line + sub + search bar (search still works,
   routes to expert flow)
3. **Services grid — the 6 SKU tiles** (the core of the page)
4. How it works — Pick a service / Give the input / Agent + expert deliver /
   Approve and pay
5. Why this is not self-serve (positioning strip)
6. Proof/examples (existing "What done looks like", labeled Examples)
7. Secondary path: "Looking for a human AI expert instead?" -> expert search
8. Footer

**Detail pages:** one route per SKU, `/services/<slug>`. Shared template:
header (badge, promise, price, CTA) -> You give / You get -> How it works ->
sample gallery -> pricing -> guarantee strip -> intake form -> FAQ.
UGC Ads is the first detail page to be fully built.

## 4. Build plan — iterative, not one-shot

- **Phase A (this session):** HANDOFF.md + low-fi grayscale wireframe of home
  and UGC detail (`wireframe/`), desktop + mobile screenshots, user review.
  NO brand styling, NO copy polish. Structure only.
- **Phase B (next session):** user feedback into wireframe v2; lock tile order,
  section order, and the UGC detail blocks; fill TBD prices/inputs where user
  decides; start real copy pass (copy rules below).
- **Phase C:** hi-fi — apply brand system (cream #F6F3ED, ink #211E1A,
  terracotta #9E3F24, aurora bg, existing card style) to home tiles + UGC
  detail in `design/app/index.html` preview; desktop + mobile screenshots.
- **Phase D:** remaining 5 detail pages; voice-agent demo embed for SKU 4;
  RateMyWipe flow page (GitHub instructions + results view).
- **Phase E:** port to the Next.js repo (`repo/`, cloned from
  github.com/Pulkitwalia099/get-an-expert-web): new `/services/*` routes,
  tiles component on `app/page.tsx`. `npm test && npm run build` must pass;
  repo guardrails in section 6.

## 5. Session / context-window strategy

- This HANDOFF.md is updated at the END of every session before anything else.
- New session opening message: "Read get-an-expert/HANDOFF.md and continue
  from Phase X."
- One phase per session max. Phases B/C may split if feedback is heavy.
- All artifacts stay in `/Users/pulkitwalia/Documents/kimi/workspace/get-an-expert/`:
  - `design/` — Kimi v3 homepage preview + shots (from session 1 zip)
  - `repo/` — the real Next.js site (cloned)
  - `wireframe/` — Phase A output
  - `marketplace-tiles-plan.md` — superseded, historical

## 6. Standing rules (from repo CLAUDE.md + session 1)

- Copy: terse, no em dashes, no emoji, no exclamation marks, no hype words
  (seamless, cutting-edge, robust, leverage).
- Badges `AGENT` / `HUMAN + AGENT` are mandatory honesty labels. Sample-first
  and Examples labels stay visible. No fake social proof without a label.
- Backing story, when used: idea started at Harvard Innovation Labs, grant
  from Rock Venture Catalyst, building out of Founders Inc SF. Never "backed
  by Harvard".
- Pending from session 1 (still unapplied to preview): match headline fix,
  outcome card price/time cuts, restore "Supported and backed by" logo section.
  These are homepage-edit tasks that now merge into Phase C.
- Repo port guardrails: files < 400 lines, `npm test` + `npm run build` green,
  eval gate only if touching prompts/chat route.

## 7. Open questions for user

Each one is marked `TBD` in amber on the page it affects, so nothing here can
harden into a fake number by accident.

| # | Question | Status | Where it shows |
|---|----------|--------|----------------|
| 1 | UGC pricing | **ANSWERED.** $29 first ad, packs $395/$890/$1,690 | ugc.html pricing |
| 1a | UGC: photo of the AI video lead for the byline | open | ugc.html byline, amber |
| 1b | UGC: "Book a call" link target, all three pack CTAs point at `#` | open | ugc.html pricing |
| 1c | UGC: permission from @valerii.murr, or swap to an Instagram embed | open, blocks going public | ugc.html worked example |
| 1d | UGC: written client sign-off to show their ads | open, blocks going public | ugc.html samples |
| 1e | UGC: revisions policy, ownership, actor selection | open | ugc.html FAQ, amber |
| 1f | UGC: **there is no payment path for the $29 at all** | open, blocks launch | repo has no Stripe |
| 2 | LinkedIn Marketeer input and output detail | mostly answered by Rohit; price is $100 per 10k | linkedin.html |
| 3 | Voice Outbound price model, and is the demo real or recorded? | open, **three options now written out with their trade-offs** | voice.html pricing + demo strip |
| 4 | Video Editing: per video or per finished minute? Sample content? | open, **two options now written out**; no samples exist | video-editing.html pricing + samples |
| 5 | Explainer Videos: how many templates, what price points? | open, **4 proposed templates drawn**; all prices blank | explainer.html gallery + price table |
| 6 | Confirm "Lead Man" = Voice Outbound, or a separate SKU? | open | not on any page yet |
| 7 | Hero line: "Work, delivered." vs "Agents do the work. Experts own the outcome." | "Work, delivered." is live | index.html hero |
| 8 | RateMyWipe: exact GitHub repo URL | open | ratemywipe.html run block |

Answering 3, 4 and 5 unblocks the most: they are the only three services where
a visitor currently cannot find out what it costs.
