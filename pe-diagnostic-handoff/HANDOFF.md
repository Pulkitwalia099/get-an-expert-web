# HANDOFF - PE Capability Diagnostic pitch deck (v2 rebuild)

Read this first. Everything needed to continue is in this folder. The immediate task is at the bottom.

## Who / what

- Pulkit Walia, co-founder of **Laoh** (laoh.ai, SF). Co-founder Rohit Jain. Laoh = live simulation-based screening of Forward-Deployed Engineers (FDEs) / AI-native engineers. Clients: **ElevenLabs, Retell, +3 YC-backed AI-native cos** (spell exactly like that - never "11 labs").
- New offering (separate from Laoh; Laoh is credibility, not the platform): an **AI capability diagnostic + upskilling service sold to middle-market PE firms** for their teams and portcos. Sectors: tech-enabled services, skilled-trades roll-ups, healthcare services.
- Buyer: PE operating partner / head of value creation. Distribution: one connector sends warm intros with the proposal deck attached (PDF, reads without a presenter, phone-readable).
- Entry product: assessment-only diagnostic, **$1,000/seat**, one portco, 2-3 weeks. Expansion: portfolio dashboard → upskilling (12-week cycles) → deal diligence.
- Positioning insight: "we've watched deployment fail from the other side of the table" - Laoh screens the FDEs that labs deploy into companies; deployment lands, absorption doesn't; nobody on the sell side is paid to fix absorption.

## Voice rules (non-negotiable, from Pulkit's voice guide)

Compress - fewest words that land. Spaced hyphens " - " ALWAYS, never em dashes. Second person, direct. No corporate words (leverage/seamless/robust/empower). Shorthand fine ("cos", slashes). Warm, low ego ("no sales, just here to learn"). Decks: sentence case. Perfect spelling, especially names: Laoh, ElevenLabs.

## Design system (from midsesh.com / the get-an-expert-web repo)

- Colors: forest #2F4A38 (primary), ink #1C1A16, cream #FAF7F0 / #F7F3E9, sage #8FB89B / #9CC5A5, beige border #E8DFC9, muted #7A756A. **NO ORANGE ANYWHERE** (skip the site's terracotta).
- Fonts: Cormorant Garamond (display), Hanken Grotesk (body). In the build sandbox, download both variable TTFs from github.com/google/fonts into ~/.fonts + fc-cache so LibreOffice renders true; ship PDF as the send version.
- More visual, less text. One idea per slide. Dark forest cover + close, cream content slides.
- Build chain that worked: pptxgenjs (needs `npm install pptxgenjs` in outputs dir) → validate.py → soffice.py to PDF → pdftoppm QA. Note: overwriting the PDF in the mounted outputs dir failed once (Io Abort) - convert in /tmp and copy back.

## Key references (verified)

- Dan Shapiro "The Five Levels" (danshapiro.com, Jan 2026): L0 spicy autocomplete, L1 coding intern, L2 pair programming (the trap - feels done, isn't; ~90% of "AI-native" devs live here), L3 agent manager (life is diffs), L4 spec-driven (writes specs/skills, checks outcomes), L5 dark software factory (specs in, software out, no human reads code).
- METR RCT 2025: devs believed +20% faster, measured -19% slower, 246 real tasks. Kills self-reported adoption data.
- Google DORA 2025 AI Capabilities Model (~5,000 professionals): AI amplifies org strengths/dysfunction; 7 org capabilities gate returns.
- BCG 2026 "Inside the AI-First PE Firm": Deploy (licenses, no value) / Reshape (rethink work, where value is) / Invent. Most PE firms can't show AI returns.
- StrongDM software factory (simonwillison.net/2026/Feb/7/software-factory/): L5 exists in production; scenarios as holdouts; ~$1k/day/engineer tokens.
- Vista Agentic AI Factory; Korn Ferry "AI Operating Partner" (mega-funds build in-house; mid-market can't).
- PwC 2026 healthcare deals: AI moved from narrative to diligence requirement - measured impact attracts buyers, claims get discounted.
- Study **klarity.ai** for proposal/approach style (not design).

## What exists in this folder

- 01-04 .md: framework (levels + role tracks), assessment rubric/tasks, upskilling plan, leadership pitch doc (v0.2, good content source).
- build_deck.js + pe-capability-diagnostic.pptx / -v2.pdf: **deck v1 - REJECTED, being replanned.** Use as visual-style reference only.

## Pulkit's critique of deck v1 (drives the rebuild)

1. **Five levels are missing.** Deck never establishes what the levels are, why they matter, what each unlocks, why an L4/L5 engineering team is the goal. Dan Shapiro never mentioned. This must come early and be the spine.
2. **Metrics feel small.** "Parallel sessions, repo files" - how do these connect upward toward EBITDA? Not promising EBITDA, but show the causal chain (behaviors → capacity/cycle time → P&L relevance).
3. **Observability agents absent.** Deck implies only the 90-120 min sim. Reality: for this offering, observability agents deploy on laptops/repos for a few days, passively watch real work, then we analyze. The sim is Laoh's method; the diagnostic is telemetry-led. Explain how observability works at a high level.
4. **Org-readiness slide overweighted.** We don't fix the org - stop dwelling there. Mention as context at most.
5. **Cut "where it lands in your portfolio" sector cards** - irrelevant/obvious.
6. **Timeline the pain:** "licenses went out, value didn't show" mapped to actual timeline (2023 → 2026).
7. **Core story:** what does an AI-native org look like (the levels) → why L4/L5 unlocks matter → adoption data is noise + skill isn't the whole story → we measure it (observability agents over days + simulation) → **"we get you there in 3 critical moves"** (the how is the main thing) → offer.
8. **McKinsey slide discipline:** every slide title = the answer (action title), body = context/support. One message per slide. Spawn a **management/strategy-consultant subagent** to critically evaluate: does each slide have one core message, does the story arc deliver across slides.

## Immediate next task

1. Re-plan the full deck slide by slide (titles as answers, one message each, visual spec per slide). Fetch klarity.ai for approach inspiration first.
2. Run the plan past the strategy-consultant subagent for story/message critique; iterate.
3. Show Pulkit the plan before building. He's willing to go slide by slide if needed.
4. Then rebuild the PPTX (same theme/voice/build chain), QA renders, deliver PPTX + PDF.
