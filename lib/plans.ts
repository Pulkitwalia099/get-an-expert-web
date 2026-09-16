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
// The customer's email is not a secret: it is the address every order email
// already goes to, and it is what decides whose account the page belongs in.

export type FormatStatus = 'tested' | 'ours' | 'reference' | 'ready';

/** What plays in the phone frame for a format. */
export type FormatMedia =
  | {
      /** A cut we made. Served from our own origin and autoplays muted. */
      kind: 'file';
      src: string;
      poster: string;
    }
  | {
      /**
       * A reel somebody else made. Shown as a still until tapped, then played
       * through Instagram's own embed so the creator's name stays on it. We do
       * not host a copy of work that is not ours.
       */
      kind: 'instagram';
      code: string;
      poster: string;
    };

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
  /** Null renders a typographic card until a sample exists. */
  media: FormatMedia | null;
}

export interface PlanTier {
  /** Videos a month. */
  videos: number;
  /** Integer cents. Never a float, never parsed back out of copy. */
  priceCents: number;
  /** Second line under the price. */
  note: string;
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
  lede: 'You approved the Team B cut on 2 September. This is the plan to keep that going every month.',
  tiers: [
    {
      videos: 4,
      priceCents: 19900,
      note: 'Monthly plan included for months 1 and 2, then $99 a month.',
      start: true,
    },
    { videos: 8, priceCents: 39500, note: 'Monthly plan included, every month.', start: false },
  ],
  rules: [
    { text: 'A video is up to 30 seconds. Under 15 counts as half. Up to 60 counts as two.', right: null },
    { text: 'A clip you shoot yourself and we edit counts as one video, up to 60 seconds.', right: '1 video' },
    { text: 'Extra video in any month.', right: '$50' },
    { text: 'One edit on every video.', right: 'Included' },
    {
      text: 'The first video in a format new to Mishq can be rejected whole if the format does not suit the brand.',
      right: 'Not counted',
    },
    { text: 'Unused videos roll over one month. Month to month, cancel any month.', right: null },
  ],
  months: [
    { label: 'Month 1', text: 'The faces, the voice, the caption style. Every video is also an asset we reuse.' },
    {
      label: 'Month 2',
      text: 'Same faces, different formats. Each comes back with its numbers. One page on what earned its place.',
    },
    { label: 'Month 3 on', text: 'The two formats that scored get two slots each. The lowest is dropped.' },
  ],
  formats: [
    {
      slug: 'storyboard',
      title: 'Storyboard ad',
      line: 'A scripted problem and the fitting as the fix. The format your first cut was.',
      job: 'Booking',
      length: '20 to 30s',
      status: 'tested',
      media: { kind: 'file', src: `${MEDIA}/storyboard.mp4`, poster: `${MEDIA}/storyboard.jpg` },
    },
    {
      slug: 'street',
      title: 'Street interview',
      line: 'One question to strangers, real feeling answers, the fitting as the answer.',
      job: 'Trust',
      length: '15 to 30s',
      status: 'ours',
      media: { kind: 'file', src: '/media/ugc-reel.mp4', poster: '/media/ugc-reel-poster.jpg' },
    },
    {
      slug: 'trend',
      title: 'Trend rebuild',
      line: 'A reel that is working right now, rebuilt for Mishq. This one becomes "every wrong size bra’s nightmare".',
      job: 'Reach',
      length: '6 to 15s',
      status: 'reference',
      media: { kind: 'instagram', code: 'DbJ-vlZoLRS', poster: `${MEDIA}/trend.jpg` },
    },
    {
      slug: 'talking-head',
      title: 'Talking head',
      line: 'The face you approved, to camera, with the words moving on screen. One complaint, one fix.',
      job: 'Trust',
      length: '20 to 30s',
      status: 'reference',
      media: { kind: 'instagram', code: 'DcbdZShTGoZ', poster: `${MEDIA}/talking-head.jpg` },
    },
    {
      slug: 'founder',
      title: 'Founder to camera',
      line: 'You shoot on a phone from our shot list. We cut the hook, the captions and the b-roll. Raw on the left, finished on the right.',
      job: 'Trust',
      length: 'up to 60s, counts as one',
      status: 'reference',
      media: { kind: 'instagram', code: 'DcRLe4auTk0', poster: `${MEDIA}/founder.jpg` },
    },
    {
      slug: 'product',
      title: 'Product in scene',
      line: 'Hands, product, one line on screen, no face.',
      job: 'Reach',
      length: '6 to 15s',
      status: 'ready',
      media: null,
    },
    {
      slug: 'explainer',
      title: 'Explainer',
      line: '"3 signs your bra is the wrong size." Built to be saved.',
      job: 'Saves',
      length: '30 to 45s',
      status: 'ready',
      media: null,
    },
    {
      slug: 'skit',
      title: 'Skit',
      line: 'Ten seconds of the problem, played up, then the fitting walks in.',
      job: 'Shares',
      length: '10 to 20s',
      status: 'ready',
      media: null,
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

/** Instagram's embed for the same reel, the one thing the iframe is allowed to load. */
export function instagramEmbed(code: string): string {
  return `https://www.instagram.com/reel/${code}/embed`;
}
