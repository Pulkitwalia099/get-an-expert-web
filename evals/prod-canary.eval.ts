import { describe, expect, test } from 'vitest';
import { demoChatReply, demoDevChatReply } from '@/lib/demo';
import type { ChatReply } from '@/lib/types';

// Guards against the failure that already happened once in production: env
// keys under the wrong names made hasAnthropicKey() false, so every visitor
// got the scripted demo questions and nobody noticed. Two cheap requests
// against the deployed site prove the live chat is model-driven.
//
//   EVAL_TARGET=https://midsesh.com npm run eval
//
// No sessionId is sent, so these probes write nothing to Supabase.

const target = process.env.EVAL_TARGET?.replace(/\/+$/, '');

if (!target) {
  console.warn('[evals] EVAL_TARGET not set, prod canary skipped.');
}

async function probe(flow: 'main' | 'dev', content: string): Promise<ChatReply> {
  const res = await fetch(`${target}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flow, messages: [{ role: 'user', content }] }),
  });
  expect(res.status, `POST ${target}/api/chat (${flow})`).toBe(200);
  return (await res.json()) as ChatReply;
}

describe.skipIf(!target)('prod canary: live chat is not in demo mode', () => {
  const opener = { role: 'user' as const, content: 'placeholder' };

  test('main flow answers from the model, not the demo script', { timeout: 120_000 }, async () => {
    const reply = await probe('main', 'I need a maritime lawyer for a charter dispute in Rotterdam');
    const demo = demoChatReply([opener]);
    expect(reply.reply).not.toBe(demo.reply);
    expect(reply.reply.length).toBeGreaterThan(0);
  });

  test('dev flow answers from the model, not the demo script', { timeout: 120_000 }, async () => {
    const reply = await probe('dev', 'Claude Code keeps reverting my prisma schema changes');
    const demo = demoDevChatReply([opener]);
    expect(reply.reply).not.toBe(demo.reply);
    expect(reply.reply.length).toBeGreaterThan(0);
  });
});
