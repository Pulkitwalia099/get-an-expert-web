# midsesh v2 · full session context (2026-07-17)

Everything decided and shipped in the founding session, so any future session can continue
without it. Read together with docs/v2-sprint.md (sprint state) and docs/v2-orchestration.md
(how Days 2 to 4 run).

## What shipped LIVE to midsesh.com today (master, static site)

1. Install section update: Claude Code command is now
   `claude mcp add get-an-expert --scope user -- npx -y get-an-expert-agent@latest`;
   Codex relabeled (config.toml, same package); Cursor install card removed
   (Cursor stays in logo strip + FAQ copy). PR #2, merged.
2. Demo revamp (PR #3, merged): splitscreen demo = Claude Code app GUI (left) +
   consumer chat (right), story "Stuck / Expert joins / Fixed live", use case =
   launch demo video, expert = Senjal Pandharpatte, ends with Delivered chip +
   "pay only if you're satisfied". Right panel stays inert until the MCP is invoked.
   Agent line: "Script and storyboard are done, and I've made a basic motion cut.
   For a launch this important, you'll want a professional video."

## Open loose ends (not blockers)

- PR #1 (Inigo Fernandez expert card) may still be OPEN on the repo. Pulkit was given
  this to run himself (classifier blocked the merge):
  `gh pr merge 1 --squash --delete-branch && git checkout master && git pull --ff-only && vercel --prod --yes`
  Check `gh pr list` before assuming.
- Discord server does not exist yet; community section ships with placeholder.
  Starter channels: welcome, announcements, introductions, get-help, wins, expert-lounge (private).
- Rohit needs a heads-up: (a) "Sign in as Expert" will link to his dashboard app, URL must be
  stable; (b) his consumer-chat spec uses "on your machine" wording which we override everywhere.
- A local static server from the demo work may still hold port 8642 (kill: lsof -ti:8642 | xargs kill).

## The three key artifacts (Pulkit's browser, claude.ai account)

- Hero choreography prototype (THE spec for the hero film):
  https://claude.ai/code/artifact/d10d8099-3b71-4b79-ab9d-f71b020c7813
- Week 1 sprint runbook (stack, days, prompts, asset pack Pulkit generates):
  https://claude.ai/code/artifact/0702359a-f95e-4406-b746-a886829e1dc1
- Overall v2 site plan (site map, expert funnel, Discord, tools):
  https://claude.ai/code/artifact/1cda8a82-0343-4f6c-8c3f-841e8513e28d
- Demo revamp plan (already executed, reference only):
  https://claude.ai/code/artifact/1ae6a200-282e-4138-af18-ceb38cf6cadb

## Hero vision: how we got here (so nobody re-litigates)

Rejected: constellation dot-field ("too mechanical"); real team faces in hero;
all-at-once autoplay ("too much on screen one"); scroll-gated typing ("feels laggy");
"Recording tonight" copy (replies must be immediate).
Locked: "The search that travels" scroll film. Ask auto-types on load; composer becomes
a probe and flies over a rotating dot-globe (cities, scan arcs, one arc holds green);
match card mirrors the ask ("Motion graphic designer · 100+ launch videos · since 2016");
the real product splitscreen rises; match card lands in the chat slot; context chips arc
from app pane to chat; "I know what you're looking for. On it."; delivery lands in session;
whisper "You never left your session."; CTAs close. Act rail 01-04, film grain, city-scan line.
Final build = same choreography with R3F globe + bloom, GSAP ScrollTrigger + Lenis, spring
physics, generated art. Pulkit's priority: 3D motion graphics and cinematography quality.

## Decisions of record (v2)

- Stack: Next.js 16 (v2/ subdir) + Tailwind v4 tokens + GSAP ScrollTrigger + Lenis +
  react-three-fiber/drei/postprocessing + Framer Motion. No CMS, no auth yet.
- Deploys: separate Vercel project get-an-expert-v2 (auth-protected previews).
  Live midsesh.com project untouched until Gate 1 domain swap.
- Expert funnel v1: /experts + /experts/apply (Tally embed, manual review);
  "Sign in as Expert" nav link to Rohit's dashboard.
- Weekly gates: Pulkit approves a preview URL before anything goes live. Wk1 hero+port,
  Wk2 magic section, Wk3 expert funnel + community + SEO/QA.
- External spend: Pulkit personally runs all image/video generation (Nano Banana Pro via
  Higgsfield). Claude never triggers generation. Asset prompts live in the runbook artifact,
  section 04. Winners land in v2/public/assets/v2/ with CSS fallbacks.

## Copy rules (absolute, from Pulkit)

- Never "machine" / "on your machine": consent framing only ("with only the access you approved").
- No em dashes. No AI-sounding phrasing. Grep before shipping.
- No real team faces in the hero (roster/demo only).
- Expert replies immediate: "On it." Never scheduled.
- Green = people, bronze = expert activity within approved access, cream = the room.
- Tokens from v2/app/globals.css @theme; never raw hex in components.

## Related repos

- This repo (Pulkitwalia099/get-an-expert-web): the marketing site. master = live static site.
- RohitJain1103/Get-An-Expert (local: ~/Programs/get-an-expert): product monorepo.
  Consumer chat visual spec: docs/superpowers/specs/2026-07-17-consumer-chat-visual-spec.html
  (design source for chat UI; its palette/rules already mirrored in our tokens).
