# Get-an-Expert Web — Marketplace Pivot: Session Handoff

**Last updated:** 2026-08-07 (session 3: RateMyVibe decisions + flow page)
**Read this first in any new session. It is the single source of truth.**

**New session?** Clone/pull https://github.com/Pulkitwalia099/get-an-expert-web
and work inside `marketplace-preview/` ONLY. Do not deploy, do not touch the
live Next.js app. Read the progress log below, then continue from
"Next session starts at".

## 0. Progress log

- **HARD RULE (user, locked 2026-08-06, applies everywhere):** the design
  system is FROZEN to the original site. Fonts stay the system sans stack
  exactly as the current website. Theme, tokens, colours, and tile/card
  skeletons stay ours. No session (AI or human) changes fonts, theme, or
  component skeletons unless the user explicitly decides to. Copy for tiles
  and pages comes from Rohit where Rohit has written it; design stays ours.
- **RateMyVibe decisions (user, session 3):** two of the three open decisions
  are closed. **The name is RateMyVibe** (see the reversal bullet below).
  **It lives as a flow page on our own site**, not as a full SKU detail page:
  the paid template's pricing tiers, guarantee strip and intake form do not map
  onto a free self-run tool. This is what Phase D already called for.
- **RateMyVibe flow page (done, session 3):** `hifi/ratemyvibe.html`, seven
  sections not nine (header, input/output, how to run it, what comes back, why
  it is free, FAQ, cross-sell). Built from the ugc.html shell, so tokens and
  card language are unchanged. New CSS is limited to the score card and two
  input thumbs. NO emoji: the emoji exception was granted for the UGC
  how-it-works section only, so the steps here are numbered instead. The home
  tile now links to it; that tile is no longer a dead `#`.
- **Still open, decision 6c (repo ownership):** the GitHub URL is marked TBD on
  the page in three places (header button, step 1, FAQ) using the amber `.tbd`
  convention. Recommendation on the table: move the repo under a shared org
  before this page is public, with Rohit keeping maintainer and authorship
  credit, so the marketplace's whole free tier does not depend on one personal
  account. Not actionable without Rohit. Does not block anything else.
- **Privacy answer is deliberately unresolved:** the FAQ item "Does anything
  leave my machine?" is marked TBD on purpose. The tool reads session
  transcripts, so that is the first question a developer asks, and the claim
  should not ship before it can be checked against public code.
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
- **Name, REVERSED (user, session 3, 2026-08-07):** it is **RateMyVibe** and
  "vibe coding". This reverses the session-2 correction, which read "it is
  RateMyWipe / 'wipe coding', never 'vibe'" and is kept here only as history so
  a later session does not "fix" the name back. RateMyVibe is now applied in
  hifi/index.html, hifi/ratemyvibe.html, hifi/directions.html and
  wireframe/index.html. The wordmark is one token; body copy says "vibe coding".
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
- **Screenshot backlog:** Bash approvals expire repeatedly, so only
  hifi/shots/index-desktop.png (pre-revision) exists. Re-shoot hifi/index.html,
  hifi/ugc.html, and hifi/linkedin.html (desktop + mobile) at next opportunity.
- **Next session starts at:** remaining 3 detail pages (Voice Outbound, Video
  Editing, Explainer Videos) using ugc.html as the template; those three tiles
  still link "#". RateMyVibe is done. Open questions in section 7 still need
  user answers (UGC single price, Voice pricing, Video Editing pricing,
  explainer template prices, RateMyVibe repo URL once 6c is settled).
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
| 1 | **UGC Ads** (flagship, build first) | HUMAN + AGENT | Product link, a UGC ad you like, optional model photo/brief | Research, script, finished UGC video | Single price TBD; subscription $15/video at 3/week, $10/video at 10/week | Sample first: pay only if you like it |
| 2 | **LinkedIn Marketeer** | HUMAN + AGENT (assumed) | TBD | TBD | TBD | TBD |
| 3 | **RateMyVibe** (page done) | AGENT | Your Claude session transcripts (open-source tool on GitHub, user runs it on their cloud session) | Vibe-coding level 1-5, breakdown by skill area (planning, reviewing, running tools, etc.), prescribed skill packs/repos to level up | **FREE** | It IS the free sample/lead magnet |
| 4 | **Voice Outbound** ("voice port") | AGENT + HUMAN QA (assumed) | Call list + script/transcript | Outbound calls done: leads generated and qualified | TBD | On-site voice agent you can talk to, to judge quality |
| 5 | **Video Editing** | HUMAN + AGENT (assumed) | Raw videos | Edited video | TBD; no content/data yet | TBD |
| 6 | **Product Explainer Videos** | HUMAN + AGENT (assumed) | Product + launch context | Explainer video from fixed templates | Fixed price per template type | Template gallery |

Notes:
- "Lead Man" from session 1 appears folded into SKU 4 (voice outbound lead
  gen/qualification). Confirm, then delete the old name.
- RateMyVibe details: open-source GitHub project; analyzes your AI coding
  ("vibe coding") transcripts, scores 1-5, identifies weak areas, recommends
  skill packs/repos/git records to unlock productivity. Free tier of the
  marketplace and the credibility play. Page built: `hifi/ratemyvibe.html`.

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
- **Phase D:** remaining detail pages; voice-agent demo embed for SKU 4.
  RateMyVibe flow page (GitHub instructions + results view) is DONE, session 3.
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

1. Single UGC video price (post-sample one-time price)?
2. LinkedIn Marketeer: input, output, price?
3. Voice Outbound: price model (per call? per qualified lead? monthly?)
   and is the on-site demo agent real or recorded?
4. Video Editing: price per video or per minute? Any sample content?
5. Explainer Videos: how many templates and what price points?
6. Confirm "Lead Man" = Voice Outbound, or a separate SKU?
7. Hero positioning line options: "Work, delivered." / "Agents do the work.
   Experts own the outcome." — pick or propose.
8. RateMyVibe: ~~product name spelling~~ ANSWERED session 3, it is RateMyVibe.
   Still open: the exact GitHub repo URL, which is blocked on decision 6c
   (who owns the repo). Marked TBD in three places on hifi/ratemyvibe.html.
9. RateMyVibe privacy claim: does the tool upload anything, or is it fully
   local? The FAQ answer stays TBD until this can be checked against the code.
