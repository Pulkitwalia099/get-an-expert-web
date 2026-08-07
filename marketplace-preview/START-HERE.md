# START HERE: opening a new session on this project

Paste this as your first message in the new session:

---

Read `marketplace-preview/HANDOFF.md` in this repo and continue the
get-an-expert marketplace work. UGC Ads is finished and committed in 710b988:
new offer, real sample videos, synced worked example. Do not redesign it.

Serve the preview before you look at anything:
`python3 -m http.server 4319 --directory marketplace-preview/hifi`
then open http://localhost:4319/ugc.html

Read section 0 for what shipped, section 7 for what is still open, then tell me
which of the three options under "Next session starts at" you would pick and
why, before you touch a file.

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
