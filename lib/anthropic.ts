import { anthropicKey } from '@/lib/env';
import type { ChatMessage } from '@/lib/types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-8';
const TIMEOUT_MS = 75_000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504, 529]);

export function hasAnthropicKey(): boolean {
  return Boolean(anthropicKey());
}

interface AskOptions {
  system: string;
  messages: ChatMessage[];
  schema: Record<string, unknown>;
  maxTokens?: number;
  /** Evals swap in cheaper models for the simulated user and the judge.
   * Production callers omit this and always get MODEL. */
  model?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
}

interface MessagesResponse {
  stop_reason?: string;
  content?: ContentBlock[];
}

class AnthropicHttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`Anthropic API ${status}: ${body.slice(0, 300)}`);
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof AnthropicHttpError) return RETRYABLE_STATUS.has(err.status);
  return (
    err instanceof Error &&
    (err.name === 'TimeoutError' || err.name === 'AbortError' || err.name === 'TypeError')
  );
}

async function callOnce<T>(opts: AskOptions): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey() ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model ?? MODEL,
      max_tokens: opts.maxTokens ?? 1_500,
      system: opts.system,
      messages: opts.messages,
      output_config: { format: { type: 'json_schema', schema: opts.schema } },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new AnthropicHttpError(res.status, await res.text());
  }

  const data = (await res.json()) as MessagesResponse;
  if (data.stop_reason === 'refusal') {
    throw new Error('Model declined the request');
  }
  const text = data.content?.find((b) => b.type === 'text')?.text;
  if (!text) {
    throw new Error(`Empty model response (stop_reason: ${data.stop_reason})`);
  }
  return JSON.parse(text) as T;
}

// One call, JSON out, with a single automatic retry on timeouts, overloads,
// and transient network failures. output_config.format constrains the
// response to the given JSON schema, so the text block parses directly.
export async function askClaude<T>(opts: AskOptions): Promise<T> {
  try {
    return await callOnce<T>(opts);
  } catch (err) {
    if (!isRetryable(err)) throw err;
    console.warn('[midsesh:anthropic] retrying after', (err as Error).name);
    return callOnce<T>(opts);
  }
}
