# HANDOFF - PE diagnostic deck v3 (post slide-by-slide review with Pulkit, Jul 16)

Read this first. **v3 supersedes v2 and the deck-plan-v2.md spec.** The deck went through a full slide-by-slide content review with Pulkit on Jul 16. Every slide below is approved at the content level ("high level, this looks fine"). Source of truth is now **build_deck_v3.js** - not the old plan file.

## Deliverables in this folder

- `pe-capability-diagnostic-v3.pptx` / `-v3.pdf` - current deck, 13 pages (12 + 1 backup). PDF is the send version.
- `build_deck_v3.js` - the build script that generated them. Edit this, never the pptx directly.

## Deck structure (13 pages)

1. **Cover (forest)** - approved v2 verbatim, EXCEPT cred line is now: "From the team that screens forward-deployed engineers for a frontier AI lab, a vertical AI company, and 3 YC-backed AI cos."
2. **Why now** - timeline 2023→2026 kept (2026 = buyers ask for measured impact, PwC). Bottom = two panels: "AI license spend" (up and to the right) vs "EBITDA impact" (the question everyone is asking). Subject lines are the big type.
3. **The levels** - five-row table **L1-L5 per the expert framework (see below)**: what it is / what you'd see them doing / what comes out. L2 = highlighted trap row (no more Shapiro cite - these are not his levels).
4. **The economics** - L2/L3/L5 input→happens→output table. Chip: "Why the order matters - L5 fan-out is only safe because L4 verification is automated." (StrongDM chip removed - contradicted the new L4/L5 "reads every diff".) Title now L5 vs L2.
5. **The method (new)** - two disciplines: checkpoint-driven development (one-shot = the L2 way, misses; checkpointed = the L4 way, hits) + context engineering (instructions file → the right files → spec first = **the L3 dividing line**; screenshots, worked examples, tests-first make it L4). Strip: simple to learn / real only when applied + anti-hype naming "loop engineering" and "Ralph loops" (Pulkit explicitly chose to name them).
6. **The visibility (new)** - what we watch (disciplines applied vs missed, task by task) / what that shows (where value per token leaks). Chart: spend per token flat, value per token rising L2→L4. Closes: "a scorecard for every person, and the map for every team."
7. **Measurement problem** - METR +20%/-19% numerals, unchanged.
8. **How we measure** - 3 high-level steps only (Pulkit: no more detail than this). Coding sessions only - never the rest of the laptop. Engineering leads decide what gets measured per role. Calibration side panel + trust strip.
9. **Report card** - sample person scorecard, L1-L5 strip, dimensions: Context / Spec quality / Tests-first / Diff review / Fan-out / Judgment. Path to L3 = instructions file · files on purpose · spec before prompting. Closing line: "A growth map, never a report card." (Pulkit picked this wording.)
10. **The path** - Measure / Move the levels / Prove it moved. Card 2 names the disciplines drilled on real tickets. Strip opens: "Only what's measured improves:".
11. **Why us** - flow + cred cards. **No client names anywhere in the deck** - only "a frontier AI lab · a vertical AI company · 3 YC-backed AI cos".
12. **Offer (forest)** - deliverables echo the deck: person scorecard, team map, leak map, 100-day plan. Typical run strip (30-40 seats · $30-40k · fund or portco budget). IC quote labeled "THE LINE TO FORWARD TO YOUR IC". Chevrons: one portco → portfolio dashboard → upskilling (**"deal diligence" removed** - Jul 16). Close: "30 mins to scope it. We'll bring the instrument."
13. **Backup: team map** - function × level heatmap with sample read. Pulkit wanted team rollup as backup only.

## THE LEVEL FRAMEWORK (locked Jul 17 - from an advanced-AI expert Pulkit trusts; work backward from these, not word for word)

- **L1 chat-window operator** - AI as a better Stack Overflow; no repo context; accepts by vibes.
- **L2 agent-native, context-naive** - lives in Claude Code/Cursor but drives it like a chat window; one-shot prompts; no instructions file; doesn't read the diff. THE TRAP.
- **L3 context engineer** - THE DIVIDING LINE. Supplies the right files, conventions, constraints on purpose; persistent instructions file; writes a spec before prompting; reviews output.
- **L4 high-context + verified** - L3 plus: multimodal context (screenshots, diagrams, reference designs), worked examples, tests-first (hard oracle), reads every diff.
- **L5 fan-out + refusal** - L4 plus: parallel agents on decomposable work (only safe because L4 verification is automated) and task-selection judgment (found where AI is negative, stopped using it there).

Everything level-related in the deck (S3, S4, S5, S6, S9, S12 bullet, S13) is derived from this. There is no L0 and no "software factory" level anymore.

## Content decisions locked Jul 16-17 (do not relitigate)

1. Client names (ElevenLabs, Retell) removed from the ENTIRE deck, cover included.
2. Mega-funds/Vista/Korn Ferry/"rent the playbook" - cut. S2's gap is spend-up vs EBITDA-unknown, nothing else.
3. Core narrative arc across S3-S6: levels exist → they pay → two disciplines move you up (checkpoints, context engineering) → skills are built only in the live workflow → we watch where they're applied vs missed → value per token rises while spend per token stays flat → hence person scorecard + team map.
4. Anti-hype: name "loop engineering" / "Ralph loops" explicitly as influencer content.
5. Observability scope: coding sessions only, engineering leads decide what's measured. Say it simply, high level.
6. S9 closing line: "A growth map, never a report card."
7. "Deal diligence" removed from the offer chevrons.
8. (Jul 17) Level framework replaced wholesale with the expert's L1-L5 above. Shapiro cite and StrongDM chip dropped as casualties of the swap.

## Voice (unchanged, non-negotiable)

Spaced hyphens " - " always, never em dashes. Sentence case. No orange (palette in build script). No corporate words. MBB declarative titles, one message each. No "X, not Y" constructions in body copy. Non-technical PE reader - keep level descriptions tangible.

## Build chain (proven, unchanged)

1. Fonts: Cormorant Garamond + Hanken Grotesk variable TTFs from github.com/google/fonts → ~/.fonts → fc-cache (needed for true PDF rendering).
2. `npm install pptxgenjs` in working dir → `node build_deck_v3.js`.
3. Convert with soffice **in /tmp, then copy back** (direct overwrite in mounted dir once failed with Io Abort).
4. `pdftoppm -png -r 60` every page → visually QA each render.
5. QA greps: zero "—", zero orange hexes, zero client names, verbatim numbers ($1,000 a seat · 30-40 seats · $30-40k · 2-3 weeks).

## Open items for next session

- `[portco]` placeholder in the S12 IC quote - personalize per recipient fund before sending.
- Deck reviewed at content level; Pulkit may still want a final end-to-end read of the v3 PDF before first send.
- Possible next: per-fund personalization, or a one-pager cut of the same story.
