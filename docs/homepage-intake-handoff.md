# Handoff: improving the homepage chat

Written 2026-07-24. Read this before changing how the homepage chat behaves.

The point of this file is to stop the next session relitigating decisions that were already
made deliberately, and to stop it repeating mistakes that were already paid for.

---

## 1. Which chat this is

| | |
| --- | --- |
| URL | `midsesh.com/` (the homepage) |
| Flow id | `dev` |
| Prompt | `CHAT_SYSTEM_DEV` in `lib/prompts.ts` |
| Schema | `DEV_CHAT_SCHEMA` in `lib/prompts.ts`, chosen by `schemaFor(flow)` |
| Ending | `ending: 'choice'` in `components/flows.ts`, rendered by `components/GetUnstuck.tsx` |
| History | Was `/stuck`; that URL now 307s to `/` |

**Not** `midsesh.com/chat`, which is `flow: 'main'` / `CHAT_SYSTEM` / ends in expert cards from a
real marketplace search. The main flow was deliberately left untouched. Do not "tidy" the two
prompts into one; they serve different visitors and end in different places.

---

## 2. State as of this handoff

- Branch `feat/homepage-intake-v2`, PR #24, **not merged**. `midsesh.com` still serves the old
  two-question triage.
- Merging auto-deploys to production. There is no separate deploy step. See
  `[[get-an-expert-web-auto-deploy]]` in Pulkit's memory, or just know that master push equals live.
- **Pre-merge blocker:** the migration `supabase/migrations/20260724050000_lead_kind_expert.sql`
  must be run against production Supabase or freelancer applications are silently rejected by a
  check constraint. The applicant still sees a thank you; only the log shows the failure.
- **Gate not met:** `npm run eval` has never been run against these changes. See section 6.

---

## 3. Decisions already made. Do not reopen without asking Pulkit

These came from him directly over several rounds. Each has a reason attached, because the reason
is what a future change has to argue with.

| Decision | Reason |
| --- | --- |
| No deflection. Any need gets a full intake and a brief. | The old prompt sent anyone who was not a stuck coding session to `/chat` with no brief built. It turned away qualified leads on the front door. |
| Aim for 3 to 5 questions, hard ceiling enforced in code. | Feeling understood is the objective. Two questions was a triage, not a conversation. |
| No floor on question count. | A floor makes the model invent a filler question when the visitor has already explained everything, which produces exactly the "processed, not heard" feeling being fixed. |
| Register mirrors how they write. Routing does not. | Two separate judgements that were wrongly fused at first. See below. |
| `primary_path` is judged from the WORK, not the person. | A founder who cannot code but whose checkout is broken should still be offered the session route, because an expert working directly on their site is genuinely fastest for them. |
| Both endings always render; only the order swaps. | A misread changes emphasis, never access. Hiding an option on a wrong guess costs the visitor. |
| Clickable options by default, including on open questions. | Cold ad traffic will not compose a paragraph into a blank box. Examples plus a catch-all guide without narrowing. |
| `match_intro` states an experience count for an expert not yet identified. | Pulkit's explicit call on 2026-07-24 after being shown the risk. **Revisit once real matches can be compared against the claim.** Prices, fees and percentages are still never invented. |
| Freelancers get a two-turn application, not a rejection. | They used to be told midsesh has no signup. |

### The register / routing split

This is the distinction most likely to get collapsed by accident:

- **How they write** decides the words in the questions. Technical terms for someone pasting a
  stack trace, plain words for someone describing lost sales.
- **What the work is** decides which ending leads. Digital or build work leads with the session
  route, everything else leads with email.

They are independent. Someone can write in plain English about a broken checkout and correctly get
the session route.

---

## 4. The reply contract

`DEV_CHAT_SCHEMA` returns the four original fields plus:

| Field | Values | Notes |
| --- | --- | --- |
| `chip_mode` | `single` \| `multi` | `multi` makes chips toggle with a confirm control |
| `primary_path` | `session` \| `email` | Which ending leads. Set every turn. |
| `expert_signup` | boolean | Visitor is a freelancer applying |
| `match_intro` | string | Only present when `done` |
| `match_confidence` | `medium` \| `high` | Only present when `done` |

`sanitizeReply` in `lib/validate.ts` fails safe on all five: unrecognised values collapse to
single-select, session-first, not-a-freelancer, and the match line is forced empty unless `done`.

**`match_intro` and `match_confidence` are deliberately NOT in `required`.** They were at first, and
that forced the model to emit empty strings for them mid-conversation. Measured on one deployment,
same model, same conversation: the homepage flow produced repeated-syllable corruption in the free
text fields (`"two two"`, `"accaccaccount"`, `"Building a new new app"`) on 2 of 8 runs, against 0
of 8 for the expert search flow. Making them absent until they mean something took it to 0 of 8.
**If garbling ever comes back, look at schema pressure first, not at the model.**

---

## 5. What is enforced in code, and what is only asked of the model

Getting this wrong wastes a lot of time. A rule written in the prompt is a request. A rule written
in the route is a guarantee.

**Enforced in code** (cannot fail):
- Em dash stripping (`lib/humanize.ts`), tag stripping and length caps (`lib/validate.ts`)
- Reply shape (JSON schema), chip count (max 5), chips forced empty when `done`
- The question ceiling. `questionBudget()` and `finalTurnNudge()` in `app/api/chat/route.ts`

**Only asked of the model** (can drift, only evals would notice):
- Never re-asking something already answered
- Never inventing a price
- Reflecting back before asking
- Asking only questions that change who we would match

### The question budget, specifically

Written in the prompt alone, the five-question ceiling failed. A visitor answering "hi", "not sure",
"dunno", "whatever you think" got **eight** questions, the model rewording the same ask each time.
Adding a sentence telling it to stop did not fix it. Counting turns in the route did, immediately.

The budget flexes, at Pulkit's direction: **4 by default, 7 once the visitor has written a message of
12+ words twice.** Chip clicks deliberately do not count as engagement, because they are short by
design and would otherwise make every chip user look like a stonewaller.

---

## 6. How to verify a change

Three levels. Do all three before claiming a behaviour change works.

**1. Unit and build.** `npx tsc --noEmit`, `npm test`, `npm run build`. 110 tests as of this handoff.
Note: run these against the **committed** tree, not the working tree. A partially staged commit
passed every check here and still did not compile. `git stash -u && npx tsc --noEmit && git stash pop`
catches it.

**2. Behavioural harness.** `scripts/verify-intake.py`. Drives real multi-turn conversations and
asserts the design's promises: no deflection, the question ceiling, `primary_path` from work rather
than register, chips on cold start, the freelancer path, long messages keeping their tail.

```
python3 scripts/verify-intake.py http://localhost:3000
```

**3. The eval suite.** `npm run eval`, 19 scenarios, required by `CLAUDE.md` whenever the prompt,
the model, `sanitizeReply` or the question budget changes.

### The key problem, and the way around it

`ANTHROPIC_API_KEY` in Pulkit's shell (set from `~/.zshrc.secrets:3`) returned **401 invalid** as of
this handoff. `lib/env.ts` reads `ANTHROPIC_API_KEY ?? Anthropic_chat`, so that dead key **shadows**
a good one and silently drops the app into `lib/demo.ts` scripted replies, which look like a broken
prompt rather than a missing key.

`vercel env pull` does **not** solve this. `Anthropic_chat`, `Serp_search` and the Supabase keys are
Vercel **sensitive** variables, which are write-only: the CLI returns their names with empty values.

What works: deploy a preview (`vercel deploy --yes`), which does get the real keys, then drive the
harness against it. Previews sit behind Vercel auth, so mint a share link with the Vercel MCP
`get_access_to_vercel_url`, capture the `_vercel_jwt` cookie, and pass it as `PREVIEW_COOKIE`.
Watch out: the cookie jar line begins with `#HttpOnly_`, so a naive comment-skipping parser drops it.

This is how every behavioural claim in PR #24 was verified. It does not substitute for the eval
suite, which needs a working local key because the simulated visitor and the judge both run locally.

---

## 7. Open work, roughly in priority order

1. **Run the eval suite.** Never run against these changes. `dev-not-stuck` was inverted and four
   scenarios are new, so the first run may need scenario tuning rather than prompt tuning. Judge
   failures carefully before changing the prompt.
2. **Verify the ending screen in a real browser.** `primary_path` ordering was verified at the API
   level and the reordered `GetUnstuck` screen was never actually seen. Same for the multi-select
   chip UI once selected, the confidence marker, and the expert application form. All three are
   built and typed, none were clicked through end to end.
3. **Add `/install`.** `midsesh.com/install` 404s. The real page is `public/classic/install.html`,
   which is an ugly link to share and the wrong destination for an ad about a one-line install.
4. **Question quality.** One bad question was found and fixed (it asked what a site was built on
   when the visitor wanted motion design, offering frameworks that omitted Claude Code). The general
   rule now says a question must change who we would match. That rule is lightly tested.
5. **Revisit the invented experience count** in `match_intro` once there are real matches to compare
   against.
6. **Cursor is a JSON block, not a one-liner.** Any copy promising "one line" is inaccurate for
   Cursor users. Affects the install page and the Reddit creative.

---

## 8. Mistakes already made here. Do not repeat them

- **Verifying the working tree instead of the commit.** A commit that missed four extracted files
  passed tests and build, because the checks ran before staging. `HEAD` did not compile.
- **Assuming the API was at fault.** A "Hit a snag" report turned out to be corrupted model output
  from schema pressure, and every request had returned 200. Check the runtime logs before theorising.
- **Trusting a "clean shell" test that inherits the environment.** `zsh -lic` inherits the parent's
  env. Use `env -i` plus `zsh -lixc` and read the trace to find which file sets a variable.
- **`sips -c` crops from the centre**, not the top left, which silently ruins an image crop.
- **Fixing a symptom in the prompt when the cause was the schema.** The garbling was chased through
  the tag stripper first. The controlled A/B (same model, same conversation, dev flow vs main flow)
  is what actually located it. Reach for that experiment shape early.
