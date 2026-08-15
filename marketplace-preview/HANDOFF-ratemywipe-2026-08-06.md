# RateMyWipe / Rate My Vibe: Session Handoff

**Session date:** 2026-08-06
**Scope:** Rohit's rating tool was run end to end for the first time, and the
packaging of SKU #3 was started and then stopped at the first question.

**This file does not replace `HANDOFF.md`.** That one is still the source of
truth for the marketplace preview. Read it first, then this. Nothing in
`marketplace-preview/` was edited this session, because a commit was said to be
pending on it.

---

## 1. What happened, in order

1. Cloned and set up `github.com/RohitJain1103/rate-my-vibe`.
2. Found and fixed two real bugs that stopped it running. Both are patched
   locally and **not committed anywhere**.
3. Produced a real report from the last 10 Claude Code sessions. Result below.
4. Started brainstorming how to package SKU #3. Stopped at the first question
   on user instruction. **No packaging decision was made.**

---

## 2. The tool: where it is and what state it is in

| Thing | Value |
|---|---|
| Clone | `/Users/pulkitwalia/Programs/rate-my-vibe` |
| Upstream | `github.com/RohitJain1103/rate-my-vibe` (Rohit's, not ours) |
| Head commit | `1216f3a` |
| Local change | `M src/cli/backends/claude-cli.ts`, uncommitted |
| Tests | 173 of 173 pass, before and after the patch |
| Report cache | `~/.local/share/ai-fluency-guide/assessments/` |
| Config | `~/.config/ai-fluency-guide/config.json` |

Run it again with:

```bash
cd /Users/pulkitwalia/Programs/rate-my-vibe && npx tsx src/cli/index.ts assess
```

### The two bugs

Both are upstream bugs, not machine-specific. Anyone with MCP servers
configured will hit the first one.

**Bug 1: the judge inherits your entire global Claude Code environment.**

`claude -p` loads every configured MCP server's tool schemas even when spawned
from a scratch directory. Measured on this machine with a one-word prompt:

| | Tokens | Cost per call |
|---|---|---|
| Before | 379,518 | $3.79 |
| After `--strict-mcp-config` | 12,434 | $0.12 |

A 30x difference, and it is invisible: the CLI only reports `exited with code
1`, with the cost buried in a usage counter inside a truncated error string.
The first assessment run burned roughly **$8** before this was caught.

**Bug 2: `--max-turns 1` kills a schema-constrained reply.**

With `--json-schema`, the reply is itself a tool call. Any run that spends its
first turn on something else stops with `stop_reason: "tool_use"`, which
`--max-turns 1` converts into a hard failure. Chunk 2 of 2 failed this way on
every run until the limit was raised.

Two dead ends worth not repeating:
- `--tools ""` does **not** remove tools. The judge still listed Bash, Read,
  Write, WebSearch, WebFetch, AgentTool.
- Denying tools through `--settings` `permissions.deny` blocks the call but the
  model keeps retrying and burns every turn, so it still fails.

**The patch** (in `src/cli/backends/claude-cli.ts`, around line 178): added
`--strict-mcp-config`, raised `--max-turns` from `1` to `6`, both with comments
explaining why.

### Also worth knowing

The judge inherits the user's global `CLAUDE.md` and output style. During
testing it replied in Pulkit's own `★ Insight` format. The repo spawns from a
scratch directory specifically to avoid *project* CLAUDE.md contamination, but
user-level config still loads, so the judge reading the prompts is shaped by
the prompt author's own instructions. Not fixed. Worth raising with Rohit.

### Not done

No issue was filed on Rohit's repo and no diff was sent to him. Both were
offered and neither was approved.

---

## 3. The actual result

**Level 3 of 5, "Steering". Ahead of about 76% of Claude Code users.**
Judged from 59 prompts across 10 sessions, 41 sent to the judge, model
`claude-opus-5`.

Report:
`file:///Users/pulkitwalia/.local/share/ai-fluency-guide/assessments/1f11000d7cbe49082e286025dc60e073bb6f8a36d4abef21a513695a15814f6c.html`

Raw terminal output: `/tmp/assess-run3.txt`

| Habit | Score |
|---|---|
| Writing corrections down | 4/5 |
| Saying what done looks like | 3/5 |
| Making it prove the work | 3/5 |
| Running work in parallel | 3/5 |
| Keeping your habits current | 3/5 |

The judge's summary: a system most people never build (saved rules, skills,
handoff docs that carry standards between sessions), losing points at the
finish line. Too many requests end with "let me know what should be done" or
"be really thorough" instead of a testable definition of done, so the assistant
invents the standard and taste gets corrected afterwards.

All three prescribed fixes are CLAUDE.md rules, so nothing needs installing.
The `vibe-fixes` plugin was **not** installed.

---

## 4. Rating of `hifi/ratemywipe.html`

Written before anyone had run the tool. It holds up structurally. Two problems.

### It captures nothing

Session 3 dropped the intake form on purpose, since it is a tool you run
yourself. That is right for a product page and wrong for a lead magnet.
`HANDOFF.md` line 392 calls SKU #3 "the free sample/lead magnet" and "the
credibility play". As built it can only be the second. A visitor reads the
page, leaves for GitHub, and leaves no trace.

**This is the unresolved strategic question.** See section 6.

### The page overstates the product

| Page says | What actually runs |
|---|---|
| "One command" | clone, `npm install`, `npm run build`, launch `claude`, `/setup`. Five steps. |
| "Four steps, one command" | It failed twice before producing anything |
| Skill areas: planning, reviewing, running tools, giving context, verifying | Rubric v2 signals: spec, verification, written corrections, parallelism, habit freshness |

The skill-area list is the one to fix first. It is on the page as fact and it
does not match the rubric the tool ships.

---

## 5. TBDs the repo now answers

Five of the six markers on `ratemywipe.html` can close. Verified against the
repo, not assumed.

| Page marker | Answer |
|---|---|
| `repo URL TBD` | `github.com/RohitJain1103/rate-my-vibe` |
| `Rubric TBD` | Published and user-editable at `data/rubric.yaml`, v2, five signals |
| `Does my code leave my machine? TBD` | Only the prompts you wrote reach the judging model. Claude's replies are never sent. Transcripts and reports stay local. |
| `Which transcripts TBD` | Claude Code CLI sessions in `~/.claude/projects`. Web sessions at claude.ai/code live on Anthropic's servers and cannot be read. |
| `Mechanics TBD` | Reads transcripts on disk, pools the last 10 sessions by default |
| `package name TBD` | Still open. There is no published npm package; it is `npx tsx src/cli/index.ts` from a clone, or `npm link` for a `guide` binary. |

Two numbers that would make the page concrete, both real and both measured
here: 2,055 discoverable sessions on this machine, and a full assessment reads
10 of them.

---

## 6. Open decisions. Nothing here was decided.

### 6a. The name. Three are live, two of them ours.

- `HANDOFF.md:329` records a locked user instruction from session 2:
  **"it is RateMyWipe / 'wipe coding', never 'vibe'. Already applied
  everywhere."**
- The repo is `rate-my-vibe`, and the product calls itself **AI Fluency Guide**
  in its own CLI output and config paths (`~/.config/ai-fluency-guide/`).
- The user's message opening this session called it **"the Rate My Vibe
  section"**, which contradicts the locked instruction.

Not resolved, deliberately. The handoff says it was locked on purpose.

### 6b. Where the free product lives. This was the question that was stopped.

Four options were put up. None chosen.

1. **Hosted on get-an-expert.** Visitor gets the report in the browser, email
   required to see it. Real capture. Needs a web version, since the CLI reads
   `~/.claude/projects` directly.
2. **Local CLI, link out to GitHub.** What the page does today. Zero
   engineering, zero capture.
3. **Both.** Open-source CLI as proof it is honest, hosted path for people who
   will not clone a repo. Two surfaces to keep in sync.
4. **Capture inside the report.** Stay local, but when the report scores a
   habit weak, it offers a matching human expert from the marketplace. Capture
   happens in the tool rather than on the page.

Everything downstream depends on this: whether the page keeps a form, whether
the name can change, whether the tool gets forked or linked.

### 6c. Ownership

The tool is Rohit's repo. Whether get-an-expert forks it, links it, or takes it
over was never discussed and needs to be, before anything is built on top.

---

## 7. Rules that were in force and stayed in force

- The design system is **frozen**. `HANDOFF.md` lines 271 to 276. New work
  composes from the system and adds nothing to it.
- No em dashes, no emoji, no exclamation marks, no hype words in copy.
- `AGENT` / `HUMAN + AGENT` badges are mandatory honesty labels. RateMyWipe is
  `AGENT · Free`.
- Nothing in `marketplace-preview/` was edited this session.

---

## 8. Suggested opening for the next session

> Read `marketplace-preview/HANDOFF.md`, then
> `marketplace-preview/HANDOFF-ratemywipe-2026-08-06.md`. Answer 6a and 6b in
> that file, then continue the packaging design for SKU #3.

The two questions in section 6 are worth answering before any page edit,
because both change what the page is for.
