# Chat evals

Both intake chats are model-driven, so a prompt edit can make them worse in
ways no unit test catches. This suite measures the actual behavior: 14
scripted visitors talk to the production prompts on the production model, and
every conversation is graded twice.

The scenarios cover the ways real people showed up, not just the happy path:
everything in one message, a vague "i need help", a freelancer trying to sign
up, price questions before anything else, a refused budget, three needs at
once, Hinglish, a prompt injection, a wrong-page visitor who wants an app
built, and someone repeating themselves at a bot that already asked.

## Run it

```
npm run eval
```

Needs `ANTHROPIC_API_KEY` in `.env.local`. A full run makes about 100 model
calls, so it costs real money and takes a few minutes. Run it whenever you
touch `lib/prompts.ts`, the model in `lib/anthropic.ts`, or `sanitizeReply`.

```
EVAL_TARGET=https://midsesh.com npm run eval
```

Adds the prod canary: two cheap requests against the live site that fail if
it is serving the scripted demo replies. That exact failure shipped once,
when the Vercel env vars sat under the wrong names and every visitor got the
same two questions. The canary makes that a red build instead of a support
complaint. The probes send no sessionId, so nothing lands in Supabase.

## How a scenario is judged

1. `harness.ts` plays the visitor with a cheap model that only knows its
   persona facts, while the real prompt and model play the assistant.
2. Deterministic checks catch the objective failures: more questions than the
   scenario allows, re-asking a fact the visitor already gave, repeating a
   question, dead-end replies with no question, a missing or wrong brief.
3. A judge model scores relevance, repetition, adaptivity, tone and outcome
   from 1 to 5, with the persona's hidden facts in hand. A scenario passes
   only when the checks are clean and every judge score is 4 or 5.

LLM output varies run to run, so vitest retries a failed scenario once.
A scenario that fails twice is a real problem, not noise. Per-scenario
results land in `evals/.last-run.json` (gitignored).

`EVAL_USER_MODEL` and `EVAL_JUDGE_MODEL` override the simulator and judge
(default `claude-sonnet-5` for both). The assistant under test always uses
the production model from `lib/anthropic.ts`.

## Reading real sessions

```
npm run sessions          # last 10 transcripts from Supabase
npm run sessions -- 25
```

Needs `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. When someone says the chat
felt off, read these first, then turn what you find into a new scenario in
`scenarios.ts` so it stays fixed.
