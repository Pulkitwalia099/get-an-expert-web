import { getSupabaseAdmin } from "@/lib/supabase";
import { validateExpert, type ExpertInput } from "@/lib/validateSubmission";

const FAIL = "Could not save your application right now. Please try again in a minute.";

export async function POST(request: Request) {
  let body: ExpertInput;
  try {
    body = (await request.json()) as ExpertInput;
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const result = validateExpert(body);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
  // Honeypot: report success to the bot, insert nothing.
  if (result.kind === "honeypot") return Response.json({ ok: true }, { status: 200 });

  try {
    const { error } = await getSupabaseAdmin()
      .from("expert_applications")
      .insert(result.row);
    if (error) {
      console.error("[expert-apply] insert failed:", error.message);
      return Response.json({ ok: false, error: FAIL }, { status: 500 });
    }
  } catch (e) {
    console.error("[expert-apply] unexpected error:", e);
    return Response.json({ ok: false, error: FAIL }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}
