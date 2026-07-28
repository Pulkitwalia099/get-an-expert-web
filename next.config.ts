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
//
// The live call and the booking picker are both third party iframes, and both
// were dead on arrival before these entries existed. There was no frame-src at
// all, so it fell back to default-src 'self' and the browser refused to create
// either frame. Daily also needs a websocket for signalling and blob media for
// audio playback, and Cal serves its embed loader from its own host.
const POSTHOG = 'https://us.i.posthog.com https://us-assets.i.posthog.com';

// The room subdomain for this Daily account. Permissions-Policy does not
// accept wildcards, so the exact origin is named again below.
const DAILY_ROOM_ORIGIN = 'https://midsesh.daily.co';
const DAILY = 'https://*.daily.co wss://*.daily.co';
const CAL = 'https://app.cal.com https://cal.com';

// Every card on /setups embeds TikTok's official player in an iframe. Without
// this the browser refuses the frame and shows its own "This content is
// blocked" panel where the video should be, which is what shipped: the whole
// page is videos, and none of them played.
const TIKTOK = 'https://www.tiktok.com';

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${POSTHOG} https://app.cal.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${POSTHOG} ${DAILY} ${CAL}`,
  `frame-src 'self' ${DAILY} ${CAL} ${TIKTOK}`,
  `media-src 'self' blob: ${DAILY}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

// An empty allowlist means nobody, including this site. microphone=() denied
// the mic to the call iframe no matter what Daily asked for, because a parent
// policy always beats an iframe's own allow attribute. Camera stays denied on
// purpose: these calls are audio only.
const PERMISSIONS_POLICY = [
  'camera=()',
  `microphone=(self "${DAILY_ROOM_ORIGIN}")`,
  `autoplay=(self "${DAILY_ROOM_ORIGIN}")`,
  'geolocation=()',
].join(', ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
  // People type and share the singular, and got a 404. It points at the root
  // rather than /setups so it is one hop, not two, now that setups is the
  // home page and /setups is itself a redirect.
  async redirects() {
    return [{ source: '/setup', destination: '/', permanent: true }];
  },
};

export default nextConfig;
