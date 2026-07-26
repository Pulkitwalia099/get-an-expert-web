import { OPERATORS, type OperatorId } from '@/lib/operators';

// The ring that reaches a pocket. Fire and forget: a Telegram outage must
// never break a call, because the operator page rings too.

if (typeof window !== 'undefined') {
  throw new Error('lib/telegram is server-only and must never reach the client');
}

const TIMEOUT_MS = 4_000;

function chatId(id: OperatorId): string | null {
  return process.env[OPERATORS[id].telegramEnv] || null;
}

async function call(method: string, body: object): Promise<unknown | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[midsesh:telegram] ${method} failed`, res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[midsesh:telegram] ${method} failed`, err);
    return null;
  }
}

/** Returns the message id so it can be edited when the call resolves. */
export async function sendRing(
  id: OperatorId,
  summary: string,
  joinUrl: string,
): Promise<number | null> {
  const chat = chatId(id);
  if (!chat) return null;
  const data = (await call('sendMessage', {
    chat_id: chat,
    text: `Someone wants to talk.\n\n${summary}`,
    reply_markup: {
      inline_keyboard: [[{ text: 'Join the call', url: joinUrl }]],
    },
  })) as { result?: { message_id?: number } } | null;
  return data?.result?.message_id ?? null;
}

/**
 * A copy of someone else's ring. Same information, but it names who is
 * actually being rung, so a backup joiner knows to introduce themselves
 * rather than assume the visitor expected them.
 */
export async function sendRingCopy(
  toId: OperatorId,
  aboutId: OperatorId,
  summary: string,
  joinUrl: string,
): Promise<void> {
  const chat = chatId(toId);
  if (!chat || toId === aboutId) return;
  await call('sendMessage', {
    chat_id: chat,
    text: `${OPERATORS[aboutId].name} is being rung.\n\n${summary}`,
    reply_markup: {
      inline_keyboard: [[{ text: 'Join as backup', url: joinUrl }]],
    },
  });
}

export async function editRing(
  id: OperatorId,
  messageId: number,
  text: string,
): Promise<void> {
  const chat = chatId(id);
  if (!chat) return;
  await call('editMessageText', { chat_id: chat, message_id: messageId, text });
}
