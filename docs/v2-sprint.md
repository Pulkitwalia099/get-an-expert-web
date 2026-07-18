# midsesh v2 · Week 1 sprint state

Single source of truth for the sprint. Any Claude session picking up a track reads this first.
Sprint runbook artifact: https://claude.ai/code/artifact/0702359a-f95e-4406-b746-a886829e1dc1
Hero choreography prototype (THE spec for the film): https://claude.ai/code/artifact/d10d8099-3b71-4b79-ab9d-f71b020c7813

## Status

- [x] Day 1: scaffold. `v2/` = Next.js 16.2.10 + TS + Tailwind v4 tokens + Cormorant/Hanken via next/font.
      Deps installed: gsap, lenis, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, framer-motion.
      Deployed to SEPARATE Vercel project `get-an-expert-v2` (Vercel-auth protected; live midsesh.com project untouched).
      2 moderate npm audit vulns noted, revisit Day 5, do not force-fix.
- [x] Day 2 (branch `v2-port`, worktree `~/Programs/gae-v2-port`): port all current sections from root `index.html` to components in `v2/`.
      Merged as PR #4 into v2-next (9fa46b6). Build green, boot-smoked, parity screenshots vs live site.
      Notes: scroll reveal is per-section (not per-cell stagger); Book-a-demo uses Cal.com iframe embed
      (not the Cal SDK loader); next.config.ts pins turbopack root.
- [ ] Day 3 (branch `v2-hero`, worktree `~/Programs/gae-v2-hero`): hero film Acts 1+2 in `v2/`.
- [ ] Day 4 (on `v2-next` after merging both): hero Acts 3+4, weave generated assets.
- [ ] Day 5 (on `v2-next`): cinematography polish, mobile, perf, QA, Gate 1 preview to Pulkit.

## Branch flow

`v2-port` and `v2-hero` both branch from `v2-next` @ a8c608f. Each track commits to its branch,
pushes, and opens a PR into `v2-next` (NOT master). Day 4 starts after both PRs merge.
Never push to master; master is the live static site.

## Day 2 track brief (port)

Source of truth: root `index.html` (the live static site) + `support.js` (Pretext runtime).
Port 1:1 into `v2/app/` + `v2/components/`: demo splitscreen (hardest: the Component class
inside the `text/x-dc` script tag is a state machine: demoScript/sceneState/startDemo timeline/
renderStill/renderVals; port to a React component with the same timings), moments, experts
roster, FAQ (keep copy exactly), install section (Claude Code + Codex snippets, no Cursor),
waitlist (posts to ask-a-human.vercel.app/api/waitlist), footer. Assets: copy `assets/` into
`v2/public/assets/`. Parity check side by side vs https://midsesh.com before the PR.

## Day 3 track brief (hero film Acts 1+2)

The prototype artifact is the exact choreography spec. Build in `v2/`:
- Lenis + GSAP ScrollTrigger master timeline, sticky stage pinned over ~560vh, scrubbed both ways.
- Act 1: headline + composer; ask AUTO-TYPES on load (never scroll-gated): "Get an expert to build the launch video".
- Act 2: composer shrinks to probe and flies; R3F globe (fibonacci sphere ~750 pts, bronze city
  markers, arc from active city to probe, bloom postprocessing), radar pings, city-scan search line,
  one arc holds green -> match card resolves ("Motion graphic designer · 100+ launch videos · since 2016").
- Reduced motion: finished frame, no pin. Mobile: fewer points, tuned sizes.

## Hard rules (Pulkit)

- Never the word "machine" in any copy; consent framing only ("access you approved").
- No em dashes anywhere in copy. No AI-sounding phrasing.
- No real team faces in the hero (roster/demo sections only).
- Expert replies are immediate ("On it."), never scheduled ("tonight").
- Palette/tokens live in `v2/app/globals.css` @theme: use tokens, never raw hex in components.
- Green = people, bronze = expert activity, cream = the room.

## Asset pack (Pulkit generates via Higgsfield / Nano Banana Pro)

Prompts in the sprint runbook artifact, section 04. Land winners in `v2/public/assets/v2/`.
Every asset has a CSS fallback; nothing blocks on art.
