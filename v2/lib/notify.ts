// Best-effort Telegram notification on each new intake. It no-ops until the bot
// token and chat id are configured, and swallows its own errors, so a failed or
// unconfigured notification never blocks or breaks a form submission.

type ExpertRowLike = {
  name: string;
  email: string;
  expertise: string;
  years_experience?: string;
  links?: string;
  focus_note?: string;
};

type WaitlistRowLike = { name: string; email: string; role?: string };

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // not configured yet
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error("[notify] telegram send failed:", e);
  }
}

export function notifyExpert(row: ExpertRowLike): Promise<void> {
  const lines = [
    "🧑‍💻 New expert application",
    `Name: ${row.name}`,
    `Email: ${row.email}`,
    `Expertise: ${row.expertise}`,
    row.years_experience ? `Years: ${row.years_experience}` : null,
    row.links ? `Links: ${row.links}` : null,
    row.focus_note ? `Focus: ${row.focus_note}` : null,
  ].filter(Boolean) as string[];
  return sendTelegram(lines.join("\n"));
}

export function notifyWaitlist(row: WaitlistRowLike): Promise<void> {
  const lines = [
    "📩 New waitlist signup",
    `Name: ${row.name}`,
    `Email: ${row.email}`,
    row.role ? `Role: ${row.role}` : null,
  ].filter(Boolean) as string[];
  return sendTelegram(lines.join("\n"));
}
