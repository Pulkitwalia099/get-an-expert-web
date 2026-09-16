// A monthly content plan, offered to one customer, as data.
//
// The copy lives here rather than in a table because there is one customer on
// a plan and every word of it was argued over. A diff is the review surface
// that exists; an editor would be one to build. When the second brand arrives
// this file grows a second entry, and the day it is the tenth it becomes a
// table.
//
// Browser safe on purpose. The page that renders it is a server component,
// but the carousel and the chooser are client components and read the same
// objects, so nothing here may import a server-only module or carry a secret.
// The reference reels are creators' work, shown here as references at
// Pulkit's say so. Only the trend rebuild links to its original, because
// that slide's whole point is a reel that exists and what we would make
// from it; the other references stand on their own.
//
// The customer's email is not a secret: it is the address every order email
// already goes to, and it is what decides whose account the page belongs in.

export type FormatStatus = 'tested' | 'ours' | 'reference' | 'ready';

/** What plays in the phone frame for a format. */
export interface FormatMedia {
  /** Served from our own origin and autoplays muted. */
  src: string;
  poster: string;
  /**
   * Set when the cut is a creator's, shown here as a reference. The slide
   * credits them by name and links to the reel it came from, with its
   * thumbnail, so the original is one tap away and never mistaken for ours.
   */
  original?: { code: string; by: string };
}

export interface PlanFormat {
  slug: string;
  title: string;
  /** One line on what the format is. */
  line: string;
  /** The job the format does for the account. */
  job: string;
  /** Typical length, as copy. */
  length: string;
  status: FormatStatus;
  /** Every format on the page has something to play. A name with nothing behind it is not a sample. */
  media: FormatMedia;
}

export interface PlanTier {
  /** The name on the card: "Starter pack", "Popular". */
  name: string;
  /** Videos a month. */
  videos: number;
  /** Integer cents. Never a float, never parsed back out of copy. */
  priceCents: number;
  /** The one we suggest starting on. */
  start: boolean;
}

export interface PlanRule {
  text: string;
  /** Right hand column, or null when the rule has no figure. */
  right: string | null;
}

export interface PlanMonth {
  label: string;
  text: string;
}

export interface Plan {
  slug: string;
  brand: string;
  /** The address the plan belongs to. Lowercase. */
  email: string;
  title: string;
  lede: string;
  tiers: PlanTier[];
  rules: PlanRule[];
  months: PlanMonth[];
  formats: PlanFormat[];
}

export const FORMAT_STATUS_LABELS: Record<FormatStatus, string> = {
  tested: 'Tested with you',
  ours: 'Made by us',
  reference: 'Reference',
  ready: 'Ready',
};

const MEDIA = '/media/plans/mishq';

const MISHQ: Plan = {
  slug: 'mishq',
  brand: 'Mishq',
  email: 'avpuri@gmail.com',
  title: 'Four videos a month for Mishq',
  lede: 'You approved your first cut on 2 September. This is the plan to keep that going every month.',
  tiers: [
    { name: 'Starter pack', videos: 4, priceCents: 19900, start: true },
    // $395 is the figure the site already quotes for a pack.
    { name: 'Popular', videos: 8, priceCents: 39500, start: false },
    // About $47 a video against $49 on the other two: a little off for the
    // bigger commitment, not so much that the smaller packs look like a trap.
    { name: 'Pro', videos: 12, priceCents: 56500, start: false },
  ],
  rules: [
    { text: 'A video is 30 seconds.', right: null },
    { text: 'Under 15 seconds counts as half a video.', right: null },
    { text: 'Over 30 seconds, up to 60, counts as two.', right: null },
  ],
  months: [
    { label: 'Month 1', text: 'Set up for quality. The faces, the voice, the caption style. Every video is also an asset we reuse.' },
    {
      label: 'Month 2',
      text: 'Experiment. Same faces, different formats. Each comes back with its numbers, and you get a short read on what earned its place.',
    },
    {
      label: 'Month 3 on',
      text: 'Double down. The formats that scored get more slots, and each month builds on what the last one learned.',
    },
  ],
  formats: [
    {
      slug: 'talking-head',
      title: 'Talking head',
      line: 'An AI avatar, or your own raw phone footage, cut with the words moving on screen and more than one angle. This reference was made from simple raw footage.',
      job: 'Trust',
      length: '20 to 30s',
      status: 'reference',
      media: {
        src: `${MEDIA}/talking-head.mp4`,
        poster: `${MEDIA}/talking-head.jpg`,
      },
    },
    {
      slug: 'ugc',
      title: 'UGC ad',
      line: 'Phone shot, to camera, the fitting as the fix. The cut you approved on 2 September.',
      job: 'Booking',
      length: '20 to 30s',
      status: 'tested',
      media: { src: `${MEDIA}/team-b.mp4`, poster: `${MEDIA}/team-b.jpg` },
    },
    {
      slug: 'storyboard',
      title: 'Storyboard ad',
      line: 'A scripted scene, the problem played out, the fitting as the fix. The Mirror cut from the same brief.',
      job: 'Booking',
      length: '20 to 30s',
      status: 'ours',
      media: { src: `${MEDIA}/storyboard.mp4`, poster: `${MEDIA}/storyboard.jpg` },
    },
    {
      slug: 'street',
      title: 'Street interview',
      line: 'One question to strangers, real feeling answers, the fitting as the answer.',
      job: 'Trust',
      length: '15 to 30s',
      status: 'ours',
      media: { src: '/media/ugc-reel.mp4', poster: '/media/ugc-reel-poster.jpg' },
    },
    {
      slug: 'trend',
      title: 'Trend rebuild',
      line: 'A reel that is working right now, rebuilt for Mishq. This one could become "every wrong size bra’s nightmare".',
      job: 'Reach',
      length: '6 to 15s',
      status: 'reference',
      media: {
        src: `${MEDIA}/trend.mp4`,
        poster: `${MEDIA}/trend.jpg`,
        original: { code: 'DbJ-vlZoLRS', by: 'alinborodin.ugc' },
      },
    },
    {
      slug: 'founder',
      title: 'Founder to camera',
      line: 'You shoot on a phone from our shot list. We cut the hook, the captions and the b-roll. Raw on the left, finished on the right.',
      job: 'Trust',
      length: 'up to 60s',
      status: 'reference',
      media: {
        src: `${MEDIA}/founder.mp4`,
        poster: `${MEDIA}/founder.jpg`,
      },
    },
  ],
};

export const PLANS: Plan[] = [MISHQ];

export function planBySlug(slug: string): Plan | null {
  return PLANS.find((p) => p.slug === slug) ?? null;
}

/** Whether an address owns a plan. Case and whitespace on the email are not a second person. */
export function ownsPlan(plan: Plan, email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === plan.email;
}

/** The plans an address can see, for the card on /account. */
export function plansForEmail(email: string | null | undefined): Plan[] {
  return PLANS.filter((p) => ownsPlan(p, email));
}

/** "$199", from integer cents, for the tier cards. */
export function tierPrice(tier: PlanTier): string {
  return `$${Math.round(tier.priceCents / 100)}`;
}

/** The public reel a reference format points at, so the page can credit it. */
export function instagramUrl(code: string): string {
  return `https://www.instagram.com/reel/${code}/`;
}
