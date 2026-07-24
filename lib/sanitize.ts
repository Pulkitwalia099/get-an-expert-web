// Scrubbing for text that crosses a trust boundary: visitor input, SerpAPI
// titles and snippets, and model output before it reaches another prompt or
// the page. Strips control characters and invisible Unicode that smuggle
// hidden instructions or break logs, and normalises newlines. Visible text,
// emoji and non-Latin scripts pass through untouched.

const CONTROL_AND_INVISIBLE = new RegExp(
  '[' +
    '\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F' + // C0 controls except tab/newline, DEL
    '\\u200B-\\u200F' + // zero-width spaces, joiners, direction marks
    '\\u2028\\u2029' + // line/paragraph separators
    '\\u202A-\\u202E' + // bidi embedding overrides
    '\\u2060-\\u2064' + // word joiner and invisible operators
    '\\uFEFF' + // byte order mark
    ']',
  'g',
);

export function scrubUntrusted(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(CONTROL_AND_INVISIBLE, '');
}

// True when the request's Origin header matches the host it arrived on.
// Browsers always send Origin on cross-site POSTs, so this blocks other
// sites scripting the API from a visitor's browser. Requests without an
// Origin (curl, server-to-server) pass; rate limits and caps handle those.
export function matchesOrigin(origin: string | null, host: string | null): boolean {
  if (origin === null) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
