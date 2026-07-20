import { getSupabaseAdmin } from "@/lib/supabase";
import { validateExpert, type ExpertInput } from "@/lib/validateSubmission";
import { corsHeaders } from "@/lib/cors";
import { notifyExpert } from "@/lib/notify";

const FAIL = "Could not save your application right now. Please try again in a minute.";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

export async function POST(request: Request) {
  const cors = corsHeaders(request.headers.get("origin"));

  let body: ExpertInput;
  try {
    body = (await request.json()) as ExpertInput;
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400, headers: cors });
  }

  const result = validateExpert(body);
  if (!result.ok)
    return Response.json({ ok: false, error: result.error }, { status: 400, headers: cors });
  // Honeypot: report success to the bot, insert nothing.
  if (result.kind === "honeypot")
    return Response.json({ ok: true }, { status: 200, headers: cors });

  try {
    const { error } = await getSupabaseAdmin()
      .from("expert_applications")
      .insert(result.row);
    if (error) {
      console.error("[expert-apply] insert failed:", error.message);
      return Response.json({ ok: false, error: FAIL }, { status: 500, headers: cors });
    }
  } catch (e) {
    console.error("[expert-apply] unexpected error:", e);
    return Response.json({ ok: false, error: FAIL }, { status: 500, headers: cors });
  }

  await notifyExpert(result.row); // best-effort; never throws

  return Response.json({ ok: true }, { status: 200, headers: cors });
}
