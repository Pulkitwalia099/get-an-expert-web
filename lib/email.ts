export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 6 || email.length > 254) return false;
  return /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function hasEmailKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
}

// Sends through Resend's API. Returns false instead of throwing when the
// key is missing, the recipient is invalid, or the request fails, so a
// broken email path never breaks the caller. The subject is flattened to a
// single line: even though recipients only ever come from config, nothing
// user-shaped must ever be able to inject headers.
export async function sendEmail(mail: OutboundEmail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log('[midsesh:email] no RESEND_API_KEY, skipping send:', mail.subject);
    return false;
  }
  if (!isValidEmail(mail.to)) {
    console.error('[midsesh:email] invalid recipient, skipping send');
    return false;
  }
  const subject = mail.subject.replace(/[\r\n]+/g, ' ').slice(0, 200);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.REPORT_FROM || 'midsesh <onboarding@resend.dev>',
        to: [mail.to.trim()],
        subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error('[midsesh:email] send failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[midsesh:email] send failed', err);
    return false;
  }
}
