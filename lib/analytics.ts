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
      // Replay records the conversation, because a drop-off is only readable
      // if you can see what was actually said before it. Layout and clicks
      // alone tell you someone left, never why.
      //
      // Email fields are the exception and stay out: they carry a real
      // contact detail, they add nothing to understanding the conversation,
      // and they are already stored properly on the server. Every one of them
      // carries the ph-no-capture class, which PostHog blocks at record time,
      // so the value never leaves the browser. See NO_CAPTURE in lib/replay.
      maskAllInputs: false,
    },
  });
  ready = true;
}

export function capturePageview(url: string): void {
  // Ensure init has run: React fires child effects before parent effects, so a
  // page or component can call this before the provider's initAnalytics() has
  // run. initAnalytics() is idempotent, so this just guarantees ordering.
  initAnalytics();
  if (!ready) return;
  posthog.capture('$pageview', { $current_url: url });
}

/**
 * The id PostHog is filing this visitor's events under. It exists so the
 * booking sheet can carry it into the Cal notes: the calendar is a
 * cross-origin iframe, so the only way `booking_completed` lands on the person
 * who walked the funnel is to send the id out with the booking and read it
 * back off the webhook. Without that the last step is a stranger and the
 * funnel reads 0%.
 *
 * Null before init, on the server, and with no key set, same as everything
 * else here. Callers treat that as "no stitch" rather than an error.
 */
export function distinctId(): string | null {
  initAnalytics();
  if (!ready) return null;
  try {
    return posthog.get_distinct_id() || null;
  } catch {
    return null;
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  // Same ordering guarantee as capturePageview: the first event of a visit
  // (chat_opened) fires from a child effect before the provider mounts, so
  // without this it would silently no-op and the funnel would lose its top step.
  initAnalytics();
  if (!ready) return;
  try {
    posthog.capture(event, props);
  } catch {
    // Recording is never allowed to break the chat.
  }
}
