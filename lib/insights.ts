export type InsightKind = 'brief' | 'search' | 'intros' | 'custom' | 'install';

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.(local|internal|localdomain)$/i,
  /^127\./,
  /^10\./,
  /^0\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

// SSRF guard: the webhook URL comes from config, but a compromised or
// mistyped value must not let the server POST visitor data to localhost,
// cloud metadata (169.254.169.254) or anything else on the private network.
export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  return !PRIVATE_HOST_PATTERNS.some((p) => p.test(url.hostname));
}

// Every conversation produces structured rows: what expert people want, their
// budget/timeline, who they picked, and their email. Rows go to the server log
// and, when INSIGHTS_WEBHOOK_URL is set, to that webhook as JSON.
export async function recordInsight(
  kind: InsightKind,
  data: Record<string, unknown>,
): Promise<void> {
  const entry = { kind, at: new Date().toISOString(), ...data };
  console.log('[midsesh:insight]', JSON.stringify(entry));

  const url = process.env.INSIGHTS_WEBHOOK_URL;
  if (!url) return;
  if (!isSafeWebhookUrl(url)) {
    console.error('[midsesh:insight] webhook url rejected (not public https), skipping');
    return;
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(2_500),
      redirect: 'error',
    });
  } catch (err) {
    console.error('[midsesh:insight] webhook failed', err);
  }
}
