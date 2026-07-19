import { getSupabaseAdmin } from "@/lib/supabase";
import { validateWaitlist, type WaitlistInput } from "@/lib/validateSubmission";
import { corsHeaders } from "@/lib/cors";

const FAIL = "Could not reach the waitlist right now. Please try again in a minute.";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const cors = corsHeaders(request.headers.get("origin"));

  let body: WaitlistInput;
  try {
    body = (await request.json()) as WaitlistInput;
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400, headers: cors });
  }

  const result = validateWaitlist(body);
  if (!result.ok)
    return Response.json({ ok: false, error: result.error }, { status: 400, headers: cors });
  // Honeypot: report success to the bot, insert nothing.
  if (result.kind === "honeypot")
    return Response.json({ ok: true }, { status: 200, headers: cors });

  try {
    const { error } = await getSupabaseAdmin()
      .from("waitlist_signups")
      .insert(result.row);
    if (error) {
      console.error("[waitlist] insert failed:", error.message);
      return Response.json({ ok: false, error: FAIL }, { status: 500, headers: cors });
    }
  } catch (e) {
    console.error("[waitlist] unexpected error:", e);
    return Response.json({ ok: false, error: FAIL }, { status: 500, headers: cors });
  }

  return Response.json({ ok: true }, { status: 200, headers: cors });
}
