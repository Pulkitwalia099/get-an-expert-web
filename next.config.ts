import type { NextConfig } from 'next';

// script-src needs 'unsafe-inline' for the Next.js runtime bootstrap and
// style-src for styled-jsx; everything else is locked to self. img-src
// allows https and data because expert thumbnails come from SerpAPI CDNs.
//
// PostHog analytics runs in the browser and talks to its own hosts, so those
// origins are allowed explicitly: connect-src for event capture and remote
// config, script-src for the lazily loaded session-replay recorder, and
// worker-src for the blob web worker that recorder spins up. Without these the
// default 'self' policy silently blocks every analytics call and nothing is
// ever recorded.
const POSTHOG = 'https://us.i.posthog.com https://us-assets.i.posthog.com';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${POSTHOG}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self' data:",
  `connect-src 'self' ${POSTHOG}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
