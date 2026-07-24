// Mask anything that looks like a secret before it reaches the logs.
//
// A thrown error can echo a credential verbatim: an invalid-header-value error
// includes the API key that was being set. Scrub known key shapes at every
// logging boundary so a crash can never dump a live key into the runtime logs.

const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{10,}/g, // Anthropic API keys
  /sb_secret_[A-Za-z0-9_-]{10,}/g, // Supabase secret keys
  /\b[a-f0-9]{64}\b/g, // SerpAPI-style 64-char hex keys
];

export function redact(value: unknown): string {
  let text: string;
  if (value instanceof Error) {
    text = `${value.name}: ${value.message}`;
  } else if (typeof value === 'string') {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }
  return SECRET_PATTERNS.reduce((s, pattern) => s.replace(pattern, '[redacted]'), text);
}
