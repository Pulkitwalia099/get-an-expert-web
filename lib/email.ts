export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 6 || email.length > 254) return false;
  return /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function hasEmailKey(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Most addresses on one internal alert. A guard on a misconfigured variable. */
const MAX_RECIPIENTS = 10;

/**
 * Everyone who should hear about a customer acting on their order.
 *
 * Comma separated in `BOOKING_NOTIFY_EMAIL`, because the people who need to
 * see an order move are a team rather than a mailbox, and adding the second
 * one should be a variable change rather than a deploy.
 *
 * Falls back to the public contact address, which is where these went before
 * the variable existed. Callers pass the result straight to `sendEmail`, which
 * drops anything malformed rather than refusing the whole send.
 */
export function operatorRecipients(fallback: string): string[] {
  const configured = (process.env.BOOKING_NOTIFY_EMAIL || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : [fallback];
}

export interface OutboundEmail {
  /**
   * One address, or several.
   *
   * A list is one send with several recipients rather than several sends,
   * because these are internal alerts and two people reading the same thread
   * is the point. Anything customer facing passes a single address.
   */
  to: string | string[];
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
  // Bad addresses are dropped, not fatal. A typo in one operator's alert
  // address must not stop the alert reaching the other one, and this path is
  // already the one that "never breaks the caller".
  const raw = Array.isArray(mail.to) ? mail.to : [mail.to];
  const trimmed = raw.map((a) => a.trim());
  const valid = trimmed.filter(isValidEmail);
  const to = [...new Set(valid)].slice(0, MAX_RECIPIENTS);
  if (to.length === 0) {
    console.error('[midsesh:email] no valid recipient, skipping send');
    return false;
  }
  // Counted against the valid list, not the deduped one. A repeated address is
  // a harmless variable that was pasted twice; logging it as invalid sends
  // somebody looking for a typo that is not there.
  if (valid.length < trimmed.length) {
    console.error('[midsesh:email] dropped invalid recipients', trimmed.length - valid.length);
  }
  const subject = mail.subject.replace(/[\r\n]+/g, ' ').slice(0, 200);
  // The sender is a domain that sends but does not receive: Resend's MX record
  // is there for bounces, not for an inbox. Without this, a customer answering
  // a sign in link or a status update is writing to nobody, and they get a
  // rejection instead of a reply.
  //
  // The fallback is a real mailbox rather than nothing, because the failure it
  // guards against is silent: an unset variable would send perfectly good mail
  // that no one can answer, and the first person to notice is a customer whose
  // reply bounced. Trimmed because a trailing space in a Vercel variable is
  // invisible and Resend rejects the whole send for it.
  const replyTo = process.env.REPORT_REPLY_TO?.trim() || 'pulkitwalia099@gmail.com';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.REPORT_FROM || 'midsesh <onboarding@resend.dev>',
        reply_to: replyTo,
        to,
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
