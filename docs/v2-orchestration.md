# v2 sprint orchestration (Days 2 to 4)

You are the orchestrator, running in the main worktree (~/Programs/get-an-expert-web, branch v2-next).
Read docs/v2-sprint.md first: it is the sprint's source of truth (status, track briefs, hard rules).

## Phase 1: run Days 2 and 3 in PARALLEL as subagents

Launch two subagents at the same time (background), each confined to its own worktree:

- Agent "port": works ONLY in /Users/pulkitwalia/Programs/gae-v2-port (branch v2-port).
  Task: execute the Day 2 track brief from docs/v2-sprint.md. Port every section of the live
  static site (root index.html + support.js) into v2/ as React components, 1:1 visual parity,
  including the splitscreen demo state machine. Run the build, verify locally, commit in small
  steps, push v2-port, open a PR into v2-next (never master). Report the PR number.

- Agent "hero": works ONLY in /Users/pulkitwalia/Programs/gae-v2-hero (branch v2-hero).
  Task: execute the Day 3 track brief from docs/v2-sprint.md. Build hero film Acts 1 and 2
  (auto-typing ask, probe flight, R3F globe with city arcs and bloom, GSAP ScrollTrigger + Lenis,
  scrubbed both directions, reduced-motion fallback). The prototype artifact linked in the sprint
  doc is the exact choreography spec; fetch and study it before coding. Build must pass. Commit,
  push v2-hero, open a PR into v2-next. Report the PR number.

While they run: relay their progress to Pulkit briefly as it happens. Do not edit files in
either worktree yourself during Phase 1.

## Phase 2: review and merge

When both PRs are open: review each diff yourself (correctness, token usage not raw hex,
hard copy rules from the sprint doc: no "machine", no em dashes, no real faces in hero,
"On it." immediacy). Fix small issues directly on the track branches; send anything big back
to a fresh subagent in that worktree. Merge the port PR into v2-next first, then rebase/merge
the hero PR. Resolve conflicts favoring: tokens from globals.css, structure from the port,
hero code from the hero branch. Delete track branches after merge; keep worktrees.

## Phase 3: Day 4 on v2-next (you, or one subagent, sequential)

Execute the Day 4 brief: hero Acts 3 and 4 (product card rises, match card FLIP-flies into the
chat slot with a receiving glow, context chips arc from app pane to chat, expert reply
"I know what you're looking for. On it.", delivery lands, agent continues, whisper, CTAs),
plus the "Delivered today" strip after the hero. If generated assets exist in
v2/public/assets/v2/, weave them in with CSS fallbacks; if not, skip without blocking.

## Deploy and report

After each phase merge, deploy a preview: cd v2 && vercel deploy --yes (project get-an-expert-v2;
NEVER vercel --prod on the old project, never touch master or midsesh.com). End with: preview URL,
what shipped, what is left for Day 5, and any honest concerns. Update docs/v2-sprint.md
checkboxes as phases complete, and commit the doc update.

## Budget and safety

- Subagents must never run git push --force, never commit to master, never modify the root
  static site files (index.html, support.js, assets/) except to READ them for porting.
- If a subagent stalls or errors terminally, restart it once with a refined brief before asking Pulkit.
- Pulkit controls all external token spend: never trigger Higgsfield/image generation yourself.
