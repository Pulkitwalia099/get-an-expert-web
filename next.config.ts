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

// The marketplace at the apex loads Inter and JetBrains Mono from Google
// Fonts. style-src did not name the stylesheet host and font-src did not name
// the file host, so the browser blocked both and the whole site rendered in
// system fallbacks. It looks almost right on a Mac, where system-ui is SF Pro,
// and clearly wrong on Windows and Android. Nothing in the console said
// "fonts", it said style-src, which is why this survived a deploy.
const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_FILES = 'https://fonts.gstatic.com';

// Where uploaded files are served from. The customer's order page plays the
// sample in a <video> whose src is a Blob URL, and media-src named only 'self'
// and the call provider, so the browser refused to load it. Nothing had caught
// this because no sample had ever been sent: the whole upload path shipped on
// 14 Aug and mk_order_events is still empty, so the first customer to open a
// finished order would have been the test.
//
// img-src already allows https: generally, which is why the same URL works for
// a thumbnail and not for the video it belongs to.
const BLOB = 'https://*.public.blob.vercel-storage.com';

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${POSTHOG} https://app.cal.com`,
  `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_CSS}`,
  "img-src 'self' https: data: blob:",
  `font-src 'self' data: ${GOOGLE_FONTS_FILES}`,
  `connect-src 'self' ${POSTHOG} ${DAILY} ${CAL}`,
  `frame-src 'self' ${DAILY} ${CAL} ${TIKTOK}`,
  `media-src 'self' blob: ${BLOB} ${DAILY}`,
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
  // The watermark encode shells out to ffmpeg, which is a 68MB binary inside a
  // package rather than JavaScript that can be imported. Both of these packages
  // find their binary by assembling a path and calling `require` on it, which
  // the bundler cannot follow: it fails the build outright with "Can't resolve
  // <dynamic>". Left external, they are plain `require`s at runtime and the
  // path resolves the way Node intended.
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', '@ffprobe-installer/ffprobe'],
  // External still leaves the tracer guessing which files to deploy, and the
  // answer it reaches is the wrapper without the binary: an encode that fails
  // with ENOENT in production having passed every check here. Named explicitly,
  // and named per route, so every other function stays the size it was.
  outputFileTracingIncludes: {
    '/api/operator/watermark': [
      './node_modules/@ffmpeg-installer/**/*',
      './node_modules/@ffprobe-installer/**/*',
      './assets/watermark.png',
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
  // The setups product is retired and its two pages were archived on
  // 2026-08-14, but `/setups` is printed in Reddit and Instagram posts that are
  // still up, and it drew 49 views in the 90 days before it was archived. Those
  // people would now get a 404 on a path we published ourselves, so both spellings
  // land on the marketplace instead.
  //
  // Temporary, not permanent, for the same reason as before: a permanent redirect
  // is cached by the browser and is close to impossible to take back. This
  // destination has already moved twice.
  async redirects() {
    return [
      { source: '/setup', destination: '/', permanent: false },
      { source: '/setups', destination: '/', permanent: false },
    ];
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
        // The founder page. It lives over there because it has to look like the
        // site it is linked from, and every footer that links to it is on that
        // side too. This list is explicit rather than a wildcard, so a page
        // added to the marketplace works on its own Vercel URL and 404s at the
        // apex until its path is named here. That is the failure to watch for
        // whenever a route is added on that side.
        { source: '/about', destination: `${MARKETPLACE}/about` },
        // The new site's own experts page, which is where its "Partner with
        // us" CTAs point. It wins over this repo's /experts: that one is the
        // old pitch, and two pages arguing the same case on one domain is how
        // a visitor ends up on the one nobody is maintaining.
        { source: '/experts', destination: `${MARKETPLACE}/experts` },
        // The social card its meta tags name, plus the crawler files. All
        // three are absolute URLs on this host, so without these they 404 and
        // every share of midsesh.com comes back as a bare link.
        { source: '/og.png', destination: `${MARKETPLACE}/og.png` },
        { source: '/robots.txt', destination: `${MARKETPLACE}/robots.txt` },
        { source: '/sitemap.xml', destination: `${MARKETPLACE}/sitemap.xml` },
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
