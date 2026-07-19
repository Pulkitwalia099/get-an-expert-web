import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Server-only Supabase client. Uses the service role key, which bypasses
   row-level security, so this module must never be imported into a client
   component. Env is read lazily at request time (not import time) so a build
   without the vars still succeeds; the route surfaces a clear error instead. */

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cached) {
    cached = createClient(url, key, { auth: { persistSession: false } });
  }
  return cached;
}
