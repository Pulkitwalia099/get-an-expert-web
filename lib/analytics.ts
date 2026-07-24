// The one place PostHog is touched. Everything else calls track() and never
// imports posthog-js directly, so the recording config lives in a single spot.
//
// All three functions no-op until initAnalytics() succeeds, which it only does
// in the browser with NEXT_PUBLIC_POSTHOG_KEY set. So calling track() on the
// server, before init, or with no key configured is always safe and silent.
// This mirrors the rest of the app: every integration degrades quietly.

import posthog from 'posthog-js';

let ready = false;

export function initAnalytics(): void {
  if (ready || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // We send pageviews by hand from the provider, because App Router
    // navigations do not reload the page and would otherwise go uncounted.
    capture_pageview: false,
    persistence: 'localStorage+cookie',
    session_recording: {
      // Never record what people type or the words on screen. Replay keeps
      // the layout and interactions only, which is all we need for drop-off.
      maskAllInputs: true,
      maskTextSelector: '*',
    },
  });
  ready = true;
}

export function capturePageview(url: string): void {
  if (!ready) return;
  posthog.capture('$pageview', { $current_url: url });
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!ready) return;
  try {
    posthog.capture(event, props);
  } catch {
    // Recording is never allowed to break the chat.
  }
}
