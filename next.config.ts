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

// The new marketplace, served at the apex through the rewrites at the bottom
// of this file. Its stable production alias, not a deployment URL: agon-agent
// .vercel.app belongs to somebody else's project, which is why this reads the
// way it does.
const MARKETPLACE = 'https://agon-agent-eight.vercel.app';

// Every card on /setups embeds TikTok's official player in an iframe. Without
// this the browser refuses the frame and shows its own "This content is
// blocked" panel where the video should be, which is what shipped: the whole
// page is videos, and none of them played.
const TIKTOK = 'https://www.tiktok.com';

// The waitlist form on /classic posts to an API that still lives on the older
// v2 deployment, so it is a cross origin fetch from this app's point of view.
// connect-src did not name it, the browser blocked the request before it left
// the page, and the form's own catch reported it as the waitlist being
// unreachable. The API itself was up the whole time.
const WAITLIST_API = 'https://get-an-expert-v2.vercel.app';

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${POSTHOG} https://app.cal.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${POSTHOG} ${DAILY} ${CAL} ${WAITLIST_API}`,
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
  // People type and share the singular, and got a 404. It points straight at
  // /get rather than /setups so it is one hop, not two.
  //
  // Now temporary, where it used to be permanent. A permanent redirect is
  // cached by the browser and is close to impossible to take back: everyone who
  // hit /setup while it pointed at the root will keep landing on the root, which
  // is the ask page now, and nothing served from here can reach them. That is
  // the cost of guessing a destination will never move, and it moved.
  async redirects() {
    return [{ source: '/setup', destination: '/get', permanent: false }];
  },
  // The apex serves the new marketplace, which is a separate Vite app in its
  // own repo and its own Vercel project. It is rewritten in rather than folded
  // in, because that app is Tailwind 4 with framer-motion and this repo runs
  // six runtime dependencies and hand written CSS. Folding it in means either
  // three dependencies enter the repo that refuses them, or its whole visual
  // surface gets rewritten.
  //
  // The domain stays here. Every route this repo owns keeps working, which is
  // what matters: /api, /mcp, /dashboard, /experts, /services and the Google
  // OAuth callback are all registered against this host, and moving the apex
  // to the other project would break sign in and the MCP connector.
  //
  // `beforeFiles`, not the default, because these have to win against this
  // app's own routes. The destination is the other project's stable production
  // alias, not a deployment URL, so its next deploy is picked up here with no
  // change on this side.
  //
  // Deliberately absent: /privacy. That URL has to answer for everything this
  // domain does, and /experts, /dashboard and /search-experts still run chat,
  // session replay and Google sign in. The other app carries a shorter policy
  // that is true of itself and not of the rest, so this repo keeps that page
  // until those routes are gone.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: `${MARKETPLACE}/` },
        { source: '/contact', destination: `${MARKETPLACE}/contact` },
        // Its assets live under this one prefix on purpose. This repo has its
        // own public/media holding three of the same filenames, and without
        // the prefix the apex would serve our rohit.png and ugc-tile.mp4 over
        // theirs, which looks almost right.
        { source: '/_agon/:path*', destination: `${MARKETPLACE}/_agon/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
