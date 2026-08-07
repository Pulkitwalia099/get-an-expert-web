# START HERE: opening a new session on this project

Paste this as your first message in the new session:

---

Read `marketplace-preview/SWISS-HANDOFF.md` and `HANDOFF.md` section 0, then
start. Everything you need is in those two files.

We are rebuilding the marketplace preview in **Swiss Industrial Print**. I
picked it on 2026-08-06 and the design freeze is lifted for this work only.

Clone the spec first:
`git clone --depth 1 https://github.com/leonxlnx/taste-skill /tmp/taste-skill`
then read `/tmp/taste-skill/skills/brutalist-skill/SKILL.md` section 2.1 and
sections 3 to 8.

Serve the preview:
`python3 -m http.server 4319 --directory marketplace-preview/hifi`

**Your first build is `hifi/_decisions.html`**, the five comparisons in section
4 of SWISS-HANDOFF.md, rendered on real Voice Outbound content. I decide by
looking, not by reading questions. Show me all five at once, I answer once,
then you convert `voice.html` alone and stop for approval.

Do not ask me anything before that page exists. Everything else is already
decided in section 3.

Do not redesign the UGC offer, prices, promise, videos or copy. That shipped in
710b988 and this is a visual conversion only.

---

## State as of session 4

- **UGC Ads: done.** `hifi/ugc.html`, committed in `710b988`. $29 first ad,
  packs at $395 / $890 / $1,690, a 30% hook rate replacement promise, a
  four-way objective picker, five real sample videos in a carousel, and a
  worked example pairing the reference a client sent with the ad we made.
- **The other five SKU pages are built but unpriced.** Voice Outbound, Video
  Editing and Explainer each show their pricing options on the page, so those
  are a read-and-pick rather than a blank.
- **Nothing is deployed.** This folder is a static preview only.

## What is in this bundle

- `HANDOFF.md`: the single source of truth. Positioning, all 6 SKUs, the full
  progress log, locked decisions, open questions, copy rules. Read it first.
- `hifi/index.html`: marketplace home, hero plus 6 SKU tiles.
- `hifi/ugc.html`: UGC Ads. Finished, and the template the others follow.
- `hifi/linkedin.html`, `ratemywipe.html`, `voice.html`, `video-editing.html`,
  `explainer.html`: the other five detail pages.
- `hifi/directions.html`: the 3 brand directions explored (A chosen).
- `hifi/assets/`: video. ~20MB, which needs to move to blob storage at the
  Next.js port rather than riding along in git.
- `hifi/shots/`: all pages, desktop 1440 and mobile 390.
- `wireframe/`: Phase A low-fi, historical.

## Ground rules for any session

1. Read `HANDOFF.md` first. Update its progress log before ending the session.
2. All artifacts stay in this folder. Do not deploy, do not touch the live
   Next.js app.
3. **The design system is FROZEN.** The `:root` token block, the type scale
   including headline size, the system sans stack, and the section rhythm are
   a fixed inheritance from a paid brand designer. Compose new elements from
   the system; never add a value to it. Details in the HARD RULE in section 0.
4. Copy rules: terse, no em dashes, no exclamation marks, no hype words, no
   italics. Emoji only in the UGC "How it works" cards, where they were asked
   for explicitly.
5. Anything marked TBD stays visibly marked in amber until the user decides.
6. **Verify motion in a real browser.** The Browser pane runs hidden, so media
   stays paused and CSS transitions and rAF are frozen there; headless
   `--virtual-time-budget` does not advance video decoding either. Several
   confident wrong readings in session 4 came from trusting those. See the
   verification note in section 0.
7. **Check any supplied clip end to end before publishing it.** Two clips that
   were not ours got through a single-frame check in session 4.
