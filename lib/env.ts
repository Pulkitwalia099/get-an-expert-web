// Key lookup with a compatibility fallback.
//
// The production Vercel project stores the API keys as "sensitive" variables,
// which cannot be renamed, under non-standard names: Anthropic_chat and
// Serp_search. Read the canonical name first, then fall back to those so the
// app runs live instead of dropping to demo mode. Once the Vercel vars are
// recreated as ANTHROPIC_API_KEY / SERPAPI_KEY, the fallbacks can be removed.

export function anthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY ?? process.env.Anthropic_chat;
}

export function serpapiKey(): string | undefined {
  return process.env.SERPAPI_KEY ?? process.env.Serp_search;
}

// The second retrieval engine. Optional like every other key here: without it
// the search runs on SerpAPI alone, which is exactly what it does today.
export function exaKey(): string | undefined {
  return process.env.EXA_API_KEY;
}

// Reads public data only, so a token with no scopes at all is the right one to
// issue. It is here for the rate limit rather than for access: unauthenticated
// REST allows 60 requests an hour per IP, which a single busy afternoon of
// searches would exhaust, and a token raises that to 5,000.
export function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN;
}
