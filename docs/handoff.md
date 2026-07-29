# Handoff, 25 July 2026

Everything below is live on midsesh.com unless it says otherwise.

## What changed today

| | |
| --- | --- |
| Homepage sub-line rewritten | PR #25, live |
| Garbled chat replies fixed | PR #26, live, deploy `ab60e6d` |
| Anthropic API key | The dead one in `~/.zshrc.secrets:3` was replaced. Evals and local dev work again |

## Files worth knowing

| File | What it holds |
| --- | --- |
| `lib/anthropic.ts` | Model and the `thinking: disabled` line. Read the comment before changing either |
| `lib/prompts.ts` | Both system prompts. `CHAT_SYSTEM_DEV` is the homepage, `CHAT_SYSTEM` is `/chat` |
| `components/flows.ts` | Homepage copy: headline, sub-line, starter chips |
| `components/GetUnstuck.tsx` | The ending screen, both routes |
| `app/api/chat/route.ts` | Question budget, the only rules that cannot drift |
| `evals/scenarios.ts` | 19 eval scenarios |

## Open work

**1. Supabase migration, still unverified**
`supabase/migrations/20260724050000_lead_kind_expert.sql`
Until it runs on production, every freelancer application is rejected by a check
constraint and the applicant still sees a thank you. Nobody has confirmed it ran.
One query against production tells you.

**2. Degenerate briefs**
Seen once in an eval run: the brief came back `expert_type: "x"`, `domain: "x"`,
`specifics: "x"` with no match line. Same family as the corruption fixed today
and it survived that fix. Rare, none in 18 production runs. The visitor sees
clean text; the expert handoff gets nothing useful.

**3. The ending screen leads with a terminal command, on mobile**
`components/GetUnstuck.tsx`, no viewport handling anywhere in it.
All traffic is mobile. `primary_path` defaults to `session` for anything digital,
so most visitors get "run this in your coding tool" as the *first* option, which
they physically cannot do on a phone. Probably the biggest leak on the site.

**4. Starter chips read as software only**
`components/flows.ts`, the `dev.suggestions` array.
"Improve what I built", "Fix what's broken", "Make it faster". Anyone arriving
for marketing, legal or finance decides they are in the wrong place. The prompt
serves them; the front door does not look like it does.

**5. `/install` is a 404**
No `app/install` route exists. The real page is `public/classic/install.html`,
served at `/classic/install.html`. Ads point at `/install`.

**6. Freelancers get two different answers**
`lib/prompts.ts`, the freelancer rule in `CHAT_SYSTEM`.
The homepage gives them a warm two-turn application and takes their email.
`/chat` tells them there is no signup and declines their email. That rule predates
the expert application feature and nobody reconciled the two.

**7. The licensed read, parked**
A prompt change that makes the chat react to a problem before asking the next
question, rather than mirroring and moving on. Tested and it works: question
counts went down, not up. Pulkit parked it. Wording is in the artifact from
25 July if you want to pick it up.

## Traps

- **A push to master deploys to production.** There is no separate step.
- **After merging, wait for the deploy before testing.** Production keeps serving
  the old build for a minute or two. Check the deployment SHA
  (`gh api repos/Pulkitwalia099/get-an-expert-web/deployments`), not whether the
  site responds. The old build responds perfectly well.
- **Omitting `thinking` is not the same as disabling it.** On Opus 5 an absent
  field means adaptive thinking, which is what corrupted the replies.
- **Do not put scratch files in `evals/`.** Anything matching `*.eval.ts` runs as
  part of `npm run eval`.
- **The eval suite is stochastic.** Across four runs no scenario failed every
  time. One red scenario is a reason to look, not proof of a regression.
- **Judge eval failures before editing anything.** Five of them were assertion
  bugs where the model was right and the test was wrong.
- **Run checks against the committed tree**, not the working tree.
  `git stash -u && npx tsc --noEmit && git stash pop`.
