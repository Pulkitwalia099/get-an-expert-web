# HANDOFF - Build the PE diagnostic deck v2 (plan approved)

Read this first. The plan is FINAL and approved by Pulkit - **`deck-plan-v2.md` (rev 4) is the spec.** Do not re-plan, do not change titles or messages. Build, QA, deliver.

## Status

- Deck v1 (pe-capability-diagnostic.pptx / -v2.pdf) was rejected; its critique is baked into the plan already.
- Plan v2 went through a strategy-consultant subagent critique and slide-level review with Pulkit. Cover (S1) approved verbatim. All decisions locked (see bottom of deck-plan-v2.md).
- Immediate task: build the 10-slide PPTX from deck-plan-v2.md, QA renders, deliver PPTX + PDF (PDF is the send version - phone-readable, no presenter).

## Who / what (context, compressed)

- Pulkit Walia + Rohit Jain, co-founders of **Laoh** (laoh.ai, SF) - live simulation-based screening of Forward-Deployed Engineers for frontier AI labs. Clients: **ElevenLabs, Retell, +3 YC-backed AI cos** (spell exactly - never "11 labs"). Named clients appear ONLY on S9; the cover says "frontier AI labs and 3 vertical AI companies".
- The deck sells a new offering: AI capability diagnostic for middle-market PE portcos, $1,000/seat, one portco, 2-3 weeks. Buyer: PE operating partner. Arrives as PDF attached to a warm intro.
- Content sources if needed: 01-04 .md in this folder (framework, rubric, upskilling, leadership pitch). The plan already extracts what the deck needs.

## Voice (non-negotiable)

Compress - fewest words that land. Spaced hyphens " - " ALWAYS, never em dashes. Second person, direct. No corporate words (leverage/seamless/robust/empower). Sentence case in decks. Perfect spelling: Laoh, ElevenLabs. Slide titles are full MBB declarative sentences - one clear message each, no half sentences, no "X, not Y" contrast constructions in body copy. Non-technical reader: level descriptions must stay tangible (they're written that way in the plan - keep them).

## Design system

- Colors: forest #2F4A38 (primary), ink #1C1A16, cream #FAF7F0 / #F7F3E9, sage #8FB89B / #9CC5A5, beige border #E8DFC9, muted #7A756A. **NO ORANGE.**
- Fonts: Cormorant Garamond (display), Hanken Grotesk (body). Download both variable TTFs from github.com/google/fonts into ~/.fonts + fc-cache before converting, so LibreOffice renders true.
- Forest cover + close (S1, S10), cream content slides. More visual, less text. One idea per slide, in the body too - phone density check: no slide carries chart + strip + footer stacks.

## Build chain (proven)

1. `npm install pptxgenjs` in the outputs dir; write build script (reuse **build_deck.js** in this folder as scaffold - its chip/title/pageNum helpers, palette consts, and card/shadow styles are the approved look).
2. Reusable v1 layouts with new copy: S5 METR giant numerals, S7 skill-report card, S9 why-us flow + cred cards, S10 offer (left card + chevrons). All other slides are new builds per the plan.
3. validate.py-style sanity pass → convert to PDF with soffice **in /tmp, then copy back** (overwriting the PDF in the mounted outputs dir once failed with Io Abort) → `pdftoppm` every page and visually QA each render (text overflow, font fallback, contrast, spacing).
4. Deliver pe-capability-diagnostic-v2.pptx + .pdf to the user's folder and present both.

## QA gates before delivering

- Every title matches deck-plan-v2.md exactly.
- Spaced hyphens everywhere; zero em dashes; zero orange; spelling of Laoh / ElevenLabs / Retell.
- Fonts render as Cormorant Garamond / Hanken Grotesk in the PDF (not fallback serif/sans).
- Readable at phone size: minimum ~11pt body on renders.
- S6 trust strip and S10 numbers ($1,000/seat, 30-40 seats, $30-40k, 2-3 weeks) present verbatim.

## Open item carried into build

- S7 line "Built for development sequencing, not performance reviews" is an "X, not Y" construction Pulkit generally banned - it survived for political cover but was flagged. Confirm with him or rephrase to "Built for development sequencing" during the S7 build.
