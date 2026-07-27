import { recordInsight } from '@/lib/insights';
import { notifyBooking } from '@/lib/notify';
import { rateLimit } from '@/lib/ratelimit';
import { parseConsultRequest, parseReelRequest } from '@/lib/setups-validate';

export interface SetupRequestResult {
  status: number;
  body: { ok: boolean; error?: string };
}

// The whole POST /api/requests behavior as a pure-ish function so acceptance
// tests can drive it directly. The route wraps this with HTTP plumbing.
export async function processSetupRequest(
  input: unknown,
  clientKey: string,
  today = new Date(),
): Promise<SetupRequestResult> {
  if (!rateLimit(`${clientKey}:requests`, 10)) {
    return { status: 429, body: { ok: false, error: 'Too many requests.' } };
  }

  const type =
    typeof input === 'object' && input !== null ? (input as { type?: unknown }).type : undefined;

  if (type === 'consult') {
    const parsed = parseConsultRequest(input, today);
    if (!parsed) {
      return { status: 400, body: { ok: false, error: 'Check the booking details.' } };
    }
    await recordInsight('custom', { form: 'setup_consult', ...parsed });
    await notifyBooking(parsed);
    return { status: 200, body: { ok: true } };
  }

  if (type === 'reel') {
    const parsed = parseReelRequest(input);
    if (!parsed) {
      return { status: 400, body: { ok: false, error: 'That link did not parse.' } };
    }
    await recordInsight('custom', { form: 'setup_reel', ...parsed });
    return { status: 200, body: { ok: true } };
  }

  return { status: 400, body: { ok: false, error: 'Unknown request type.' } };
}
