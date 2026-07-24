// Scrubs AI writing tics from model output before it reaches the screen.
// Em dashes always go; spaced en dashes go too, but unspaced ones survive so
// ranges like "€5–15k" stay intact.
export function stripEmDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s+–\s+/g, ', ')
    .replace(/,\s*,/g, ', ')
    .replace(/ {2,}/g, ' ')
    .trim();
}
