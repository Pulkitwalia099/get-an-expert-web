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
