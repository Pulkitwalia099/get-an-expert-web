// The marketplace catalogue. One source for the home page cards and the
// /services/<slug> routes, so a price can never say one thing on the tile and
// another on the page. That exact bug shipped in the static preview: the home
// tile promised "pay only if you like it" and "$10 per video" while the UGC page
// sold a $29 first ad and packs from $395.
//
// `status` is the only thing that decides whether a service appears in the live
// grid or the quieter Launching soon row. Flipping one value moves a card
// between them, and nothing else has to be touched.

export type ServiceStatus = 'live' | 'beta' | 'soon';

export type Service = {
  slug: string;
  name: string;
  /** Honesty badge. Mandatory, and never softened. */
  badge: string;
  status: ServiceStatus;
  /** One line on the card. */
  blurb: string;
  /** Headline price. */
  price: string;
  /** Second line under the price, or null. */
  priceNote: string | null;
  /** True when the price itself is still undecided, so it renders in amber. */
  priceOpen: boolean;
  /** Card call to action. */
  cta: string;
  /** Which media block the card shows, if any. */
  media: 'video' | 'post' | 'timeline' | null;
};

export const SERVICES: Service[] = [
  {
    slug: 'ugc-ads',
    name: 'AI UGC Campaign Engine',
    badge: 'Human + Agent',
    status: 'live',
    blurb:
      'Send your product link and an ad you like. We research it, script it, and send back a finished ad within 24 hours. The actors are AI, not hired creators.',
    price: '$29 first ad',
    priceNote: 'Packs from $395 a month',
    priceOpen: false,
    cta: 'Start for $29',
    media: 'video',
  },
  {
    slug: 'linkedin',
    name: 'LinkedIn Growth Engine',
    badge: 'Human + Agent',
    status: 'live',
    blurb:
      'Your LinkedIn all handled by our agents. Posts, comments, and engagements all reviewed by a human before anything ships.',
    price: '$100 per 10k',
    priceNote: 'impressions in your relevant audience',
    priceOpen: false,
    cta: 'See details',
    media: 'post',
  },
  {
    // No sample footage exists yet, deliberately. The card shows a timeline
    // motif rather than filling the slot with someone else's work.
    slug: 'video-editing',
    name: 'Video Editing',
    badge: 'Human + Agent',
    status: 'beta',
    blurb:
      'Send raw footage. Get back an edited video, ready to post. Cuts, captions, and sound handled.',
    price: 'Price TBD',
    priceNote: null,
    priceOpen: true,
    cta: 'See details',
    media: 'timeline',
  },
  {
    slug: 'voice-outbound',
    name: 'Voice Outbound',
    badge: 'Agent + Human QA',
    status: 'soon',
    blurb:
      'Outbound calls that convert. The voice agent works your list, qualifies the leads, and sends you the notes.',
    price: 'Per qualified lead',
    priceNote: 'Rate TBD',
    priceOpen: true,
    cta: 'See details',
    media: null,
  },
  {
    slug: 'explainer-videos',
    name: 'Product Explainer Videos',
    badge: 'Human + Agent',
    status: 'soon',
    blurb:
      'Pick a template, send your product, get a launch-ready explainer video at a fixed price per template.',
    price: 'Fixed price per template',
    priceNote: 'Prices TBD',
    priceOpen: true,
    cta: 'See details',
    media: null,
  },
];

/** Sellable today. Rendered as the three equal cards at the top of the grid. */
export const LIVE_SERVICES = SERVICES.filter((s) => s.status !== 'soon');

/** Not sellable yet, so it must not compete with what is. */
export const SOON_SERVICES = SERVICES.filter((s) => s.status === 'soon');

export function serviceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

// Who is behind the company. Lifted from the live site's Backing component so
// the marketplace home carries the same marks, in the same order.
export const BACKERS = [
  { name: 'Harvard Innovation Labs', note: 'Boston', src: '/backers/hi.jpeg', w: 300, h: 300 },
  {
    // Harvard is named in full. "Rock Venture Catalyst" alone reads as an
    // unrelated fund; the school is the part that carries any weight.
    name: 'Harvard Rock Venture Catalyst',
    note: 'Harvard Business School',
    src: '/backers/harvard-shield.png',
    w: 150,
    h: 177,
  },
  { name: 'Founders Inc', note: 'San Francisco', src: '/backers/founders.png', w: 225, h: 225 },
];
