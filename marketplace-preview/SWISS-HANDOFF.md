# Swiss Industrial rebuild: handoff

**Written 2026-08-06 at the end of session 5. Read this and `HANDOFF.md`
section 0, then start. Nothing here needs answering before you begin.**

Session 5 made one decision and wrote this file. No page CSS changed.

---

## 1. The decision, locked

The marketplace preview moves to **Swiss Industrial Print**: the light
substrate of `industrial-brutalist-ui` in github.com/leonxlnx/taste-skill.
Chosen by the user on 2026-08-06 from five languages rendered on real content.

Warm cream and terracotta are retired. **The design freeze is deliberately
lifted for this work and nothing else.** The HARD RULE in `HANDOFF.md` still
governs everything this does not cover, and the new system gets frozen the same
way once it is built.

The skill says pick one substrate and commit. We picked light. The dark
Tactical Telemetry variant is out of scope. Do not mix them.

---

## 2. The spec, so you do not have to re-derive it

Full source: `skills/brutalist-skill/SKILL.md` in that repo, section 2.1 and
sections 3 to 8. Clone it, the detail below is a summary and not a substitute.

```
git clone --depth 1 https://github.com/leonxlnx/taste-skill /tmp/taste-skill
```

**Colour**
| Token | Value | Use |
|---|---|---|
| ground | `#F4F4F0` | page substrate, unbleached documentation paper |
| ground alt | `#EAE8E3` | second surface where a zone needs separating |
| surface | `#FFFFFF` | cards, data panels |
| ink | `#050505` | all body and display text |
| ink alt | `#111111` | secondary text |
| hazard red | `#E61919` | **the only accent.** Rules, fills, alerts, key data |

**Contrast, measured 2026-08-06, not assumed**
| Pair | Ratio | Verdict |
|---|---|---|
| carbon `#050505` on paper | 18.48:1 | passes everything |
| white on hazard red | 4.65:1 | passes body. Red buttons with white text are fine |
| hazard red on paper | **4.22:1** | **fails AA for body text** |
| carbon on hazard red | 4.38:1 | fails body, passes large and UI |

So **hazard red is never body text on the paper ground.** It is legal for
large type over 18px, rules, fills, borders and icons. This is a hard
constraint, not a preference.

**Type, two tiers**
- Macro, for headlines: heavy grotesk, weight 900, uppercase, tracking
  `-0.03em` to `-0.06em`, leading `0.85` to `0.95`, sized with `clamp()`.
  Reference faces: Neue Haas Grotesk Black, Archivo Black, Monument Extended.
- Micro, for everything structural: monospace, 10px to 14px, uppercase,
  tracking `0.05em` to `0.1em`. Used for metadata, nav, labels, badges, table
  headers, unit ids. Reference faces: JetBrains Mono, IBM Plex Mono, Space Mono.
- There is no third tier. Body copy sits in the macro family at normal weight.

**Layout**
- Blueprint grid. Elements anchor to tracks, they do not float.
- Visible compartmentalisation: 1px or 2px solid rules delineate zones, and
  horizontal rules span the full container to separate units.
- Bimodal density: dense monospace data clusters against large negative space
  framing the macro type. Never one repeated card rhythm.
- **Zero border radius anywhere.** Every corner is 90 degrees.
- The grid trick to use: `display:grid; gap:1px` over a contrasting parent
  background, so dividing lines come from the grid rather than per-child
  borders.

**Forbidden by the language**
Gradients. Box shadows. Translucent glass. Border radius. Soft tints. The
current aurora background, the `--glass-strong` surfaces and every rounded
corner all have to go.

**Component symbology**
ASCII framing (`[ DELIVERY SYSTEMS ]`, `>>>`, `///`), registration and
trademark marks used as geometry, crosshairs at grid intersections, barcodes,
and short technical strings (`REV 2.6`, `UNIT / D-01`). Use these with
restraint, see decision D3.

---

## 3. Already decided, so you do not have to ask

| # | Decision | Rationale |
|---|---|---|
| 1 | **`voice.html` converts first**, alone, then stop for approval | Unfinished, no real assets, nothing to break |
| 2 | **`ugc.html` converts last** | Only finished page. Carries the $29 offer and five real videos |
| 3 | Order between them: `index.html`, then `linkedin`, `ratemywipe`, `video-editing`, `explainer` | Home proves the tile grid early, which is the riskiest layout |
| 4 | Hazard red is never body text | Measured at 4.22:1, fails AA |
| 5 | Badge strings `AGENT` and `HUMAN + AGENT` keep their exact wording | Positioning commitment, not styling |
| 6 | Copy rules unchanged | No em dashes, no exclamation marks, no hype words, no italics |
| 7 | TBD markers stay visible | Whatever colour they end up, see D2 |

---

## 4. The five decisions that need the user's eye

**Do not ask these as questions in text. Build the visual first, then ask.**

Session 6 step zero is to build **one comparison page**, `hifi/_decisions.html`,
that renders all five side by side on real Voice Outbound content. The user
looks at it once and answers all five. That page is scaffolding and gets
deleted before the work is called done.

| # | Decision | What to render |
|---|---|---|
| **D1** | Macro grotesk face | The same headline in Archivo Black (free, shippable today), system sans at weight 900 (free, weakest), and one licensed reference face if you can get a trial. Same size, same tracking, stacked. Also state the licence cost of each under it. |
| **D2** | What happens to amber and green | One card set three ways: red and ink only; red and ink plus amber for TBD; red, ink, amber and green. The single accent rule says the first, working clarity says the second. Show the TBD price and a "qualified" state in each. |
| **D3** | How much analog texture | The same section three ways: clean Swiss print, one low opacity grain layer, and the full treatment with halftone, crosshairs at intersections and registration marks. |
| **D4** | Wordmark casing | `midsesh` lowercase as today, next to `MIDSESH` in the mono face, in the sitebar. This changes the brand mark, so it needs an explicit yes. |
| **D5** | Emoji in the four how-it-works cards | The current emoji row next to the same row with mono markers or ASCII framing. The user asked for emoji explicitly in an earlier session, so this needs their reversal, not yours. |

Two more that are real but not yet answerable, and should be raised at the
milestone they belong to, not now:

- When `ugc.html` converts: do the five warm, human sample videos survive
  inside a hard edged monochrome frame, or does the frame fight the content?
- Once the language is in place: do the div built fake previews (audit item E2)
  and the six one line cards (item E4) still read the same way? A hard frame
  changes both. Re-raise then.

---

## 5. What session 6 does, in order

**Step 0.** Read this file and `HANDOFF.md` section 0. Clone taste-skill and
read the brutalist skill properly. Serve the preview:
`python3 -m http.server 4319 --directory marketplace-preview/hifi`

**Step 1.** Build `hifi/_decisions.html`, the five comparisons from section 4,
on real content. Get the user's five answers. This is the only place questions
get asked.

**Step 2.** Write the new token block and the two tier type system. Self host
the chosen faces into `hifi/assets/fonts/` and record the licence in this file.
Do not link a font CDN.

**Step 3.** Convert `voice.html` only. Strip the aurora, the glass, every
shadow and every radius. Rebuild the sections on the blueprint grid. **Stop and
get approval before touching anything else.**

**Step 4.** Convert `index.html`, then `linkedin`, `ratemywipe`,
`video-editing`, `explainer`.

**Step 5.** Convert `ugc.html`. Confirm all five videos still play end to end in
a real browser, not headless.

**Step 6.** Apply the audit items the language does not resolve by itself:
- item 01, at most one eyebrow per three sections
- item 02, a consolidated type ramp with no near duplicate steps
- item 05, no em dash in the `$ —` price placeholder
Items 03 (radii) and 04 (centred heads) are resolved by the language itself.

**Step 7.** Delete `_decisions.html`. Re-shoot every page desktop and mobile at
exact height into `hifi/shots/`. Update `HANDOFF.md`, write the new system up
here, and re-freeze it.

---

## 6. What must not change

- The UGC offer that shipped in `710b988`: the $29 first ad, the packs at
  $395 / $890 / $1,690, the 30% hook rate promise, the five sample videos, the
  worked example, and all of its copy. This is a visual conversion only.
- Any TBD price. Those are still open questions in `HANDOFF.md` section 7.
- The honesty badges' wording.
- Nothing deploys. This folder stays a static preview.

---

## 7. Verification, per page, before calling it done

- 0px horizontal overflow at 320, 390, 721, 1024 and 1440.
- Every hazard red use is large type, a rule, a fill or an icon. Never body.
- Zero `border-radius` other than 0. Zero `box-shadow`. Zero gradient.
- Screenshots re-shot at the page's exact height, against the local server and
  not `file://`.
- On `ugc.html` only: all five videos reach `readyState` 4 and play through in
  a real browser. Session 4 got burned twice trusting headless and the hidden
  Browser pane, where media stays paused. See the verification note in
  `HANDOFF.md` section 0.

---

## 8. File map

```
marketplace-preview/
  HANDOFF.md          the single source of truth, read section 0 first
  SWISS-HANDOFF.md    this file, the rebuild
  START-HERE.md       the paste-ready opening message
  hifi/               the seven pages, the assets, the shots
```

Session 5 also produced a written review of the old system against
pbakaus/impeccable and taste-skill. Its conclusions are folded into section 4
and step 6 above, so there is nothing else to go and read.
