// Page content for /services/<slug>. Copy is carried over from the static
// preview in marketplace-preview/hifi, which is where it was written and
// reviewed. Prices are NOT repeated here: the card and the page both read
// lib/services.ts, so they cannot disagree.
//
// The `$ —` price placeholder from the preview is written as "TBD" throughout.
// That glyph was an em dash, which the copy rules forbid everywhere, and it had
// spread to three pages before anyone noticed.

export type Tier = {
  name: string;
  price: string;
  /** Renders amber when the number is still undecided. */
  open?: boolean;
  body: string;
};

export type ServiceDetail = {
  promise: string;
  /** Sits under the promise. Null where the price only makes sense as tiers. */
  priceLine: string | null;
  priceOpen?: boolean;
  ctaLabel: string;
  /** Every CTA lands on the contact block. Nothing here charges a card. */
  ctaHref: string;
  ctaNote: string;
  ioHeading: string;
  inputs: { title: string; note: string }[];
  output: { title: string; note: string };
  howHeading: string;
  steps: { em: string; h: string; p: string }[];
  pricingHeading: string;
  tiers: Tier[];
  pricingNote: string | null;
  promiseHeading: string;
  promiseBody: string;
  faq: { q: string; a: string }[];
};

export const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  'ugc-ads': {
    promise:
      'Send your product link, an ad you like, and what you want the ad to do. We research your category, script it, and send back a finished AI UGC ad. The actors are AI generated, not hired creators.',
    priceLine: '$29 first ad, credited to your first month',
    ctaLabel: 'Start your first ad',
    ctaHref: '#start',
    ctaNote: 'Nothing is charged on click. We take the brief first.',
    ioHeading: 'Three things in. One ad out.',
    inputs: [
      { title: 'Your product link', note: 'yourproduct.com' },
      { title: 'A UGC ad you like', note: 'the reference we study' },
      {
        title: 'What the ad is for',
        note: 'awareness, consideration, conversion, or re-engagement',
      },
    ],
    output: { title: 'A finished AI UGC ad', note: 'AI actors, ready to run, back within 24 hours' },
    howHeading: 'The same loop, every month.',
    steps: [
      { em: '🔍', h: 'We research', p: 'What is running in your category. What is worn out.' },
      { em: '✍️', h: 'We script and direct', p: 'Hook, actor and pacing, set by your objective.' },
      {
        em: '🎬',
        h: 'We make four, ship one',
        p: 'Binning three is the point. Credits make that unaffordable.',
      },
      {
        em: '🔁',
        h: 'Next month builds on the winner',
        p: 'You tell us what performed. We build around it.',
      },
    ],
    pricingHeading: 'Try one. Then subscribe.',
    tiers: [
      {
        name: 'Try it',
        price: '$29',
        body: 'One ad, once. Three things in, back within 24 hours, watermarked. Credited to your first month if you subscribe.',
      },
      {
        name: 'The monthly pack',
        price: '$395 a month',
        body: '12 ads a month across 2 objectives a cycle. Starts with a call, where we take the full brief.',
      },
      {
        name: '$10k to $30k ad spend',
        price: '$890 a month',
        body: '24 ads a month, all four objectives, and a what won report.',
      },
      {
        name: '$30k+ ad spend',
        price: '$1,690 a month',
        body: '60 ads a month on a weekly cycle, all four objectives, weekly what won report.',
      },
    ],
    pricingNote: 'Pause or cancel anytime.',
    promiseHeading: 'You see the ad before anyone runs it.',
    promiseBody:
      'The first ad arrives watermarked so you can judge it. Say yes and the clean file is yours, with the $29 credited to your first month.',
    faq: [
      {
        q: 'Do you promise results?',
        a: 'No. We do not promise sales, cost per acquisition or return on ad spend, because those depend on your price, offer and landing page. What you are buying is the ad.',
      },
      {
        q: 'Why make four and send one?',
        a: 'Judgment is what you are paying for. Generation is cheap for us and metered for you, so buying credits means running everything you made, including the two that should have been binned.',
      },
      {
        q: 'Are the people in the ads real?',
        a: 'No. The actors are AI generated. We say so here, on the card, and in the name, because you are buying an ad that will run under your brand and you should know what is in it before it does. It is also why four ads a month is affordable at this price, and why we turn some categories down.',
      },
      {
        q: 'Which categories do you turn down?',
        a: 'Regulated health claims, fitness transformations, finance, and anything needing real lived experience on camera. AI actors underperform there and get rejected more often. We say so rather than take the money.',
      },
      {
        q: 'Revisions and ownership?',
        a: 'Full usage rights once paid. One revision on the $29 ad. Up to two revisions per ad on a monthly pack.',
      },
      {
        q: 'Can I pick the actor?',
        a: 'Not on the $29 ad. On a monthly pack we agree the casting on the call.',
      },
      {
        q: 'Who actually makes it?',
        a: 'The agent researches, drafts and generates. A human picks the angle, directs the output and rejects most of it. The video side is led by @blurred_ai.',
      },
    ],
  },

  linkedin: {
    promise:
      'Your LinkedIn all handled by our agents. Posts, comments, and engagements all reviewed by a human before anything ships.',
    priceLine: '$100 per 10k impressions in your relevant audience',
    ctaLabel: 'Start a run',
    ctaHref: '#start',
    ctaNote: 'Nothing is charged on click. We take the brief first.',
    ioHeading: 'Three things in. Your LinkedIn, running.',
    inputs: [
      { title: 'Your positioning', note: 'what you want to be known for' },
      { title: 'Your audience', note: 'who the impressions have to reach' },
      { title: 'Your voice', note: 'past posts, or a call to capture it' },
    ],
    output: { title: 'Posts, comments and replies', note: 'under your name, human reviewed' },
    howHeading: 'Nothing ships without a human.',
    steps: [
      { em: '🧭', h: 'We set the angle', p: 'Positioning first, so the posts are about something.' },
      { em: '✍️', h: 'The agent drafts', p: 'Posts, comments and replies, in your voice.' },
      { em: '🧑‍⚖️', h: 'A human reviews', p: 'Every post, comment and reply, before it ships.' },
      { em: '📈', h: 'You get the reach report', p: 'Impressions in your relevant audience, not vanity reach.' },
    ],
    pricingHeading: 'Pay for reach, not retainers.',
    tiers: [
      {
        name: 'Per impressions',
        price: '$100 per 10k',
        body: 'Impressions in your relevant audience. You pay for reach that lands in front of the people you named, not for a monthly seat.',
      },
    ],
    pricingNote: null,
    promiseHeading: 'A human reads every post, comment and reply before it ships.',
    promiseBody:
      'Nothing goes out under your name that a person has not read first. That is the whole reason this carries the Human + Agent badge.',
    faq: [
      {
        q: 'Do you need my LinkedIn password?',
        a: 'No. Access is arranged at onboarding without handing over your credentials.',
      },
      {
        q: 'Do I approve posts before they go out?',
        a: 'Yes if you want to. A human on our side reviews everything either way; your own approval step is optional and set at onboarding.',
      },
      {
        q: 'What counts as my relevant audience?',
        a: 'The roles, industries and seniorities you name at onboarding. Impressions outside that are not what you are billed for.',
      },
      {
        q: 'Who actually does the work?',
        a: 'The agent drafts. A human reviews every post, comment and reply and is accountable for what ships under your name.',
      },
    ],
  },

  'video-editing': {
    promise:
      'Send raw footage. Get back an edited video, ready to post. Cuts, captions, and sound handled.',
    priceLine: null,
    priceOpen: true,
    ctaLabel: 'Send a test cut',
    ctaHref: '#start',
    ctaNote: 'New and in beta. We take a small first job before anything bigger.',
    ioHeading: 'Raw footage in. A file you can post out.',
    inputs: [
      { title: 'Your raw footage', note: 'a link or a drive folder' },
      { title: 'What it is for', note: 'the platform and the length' },
      { title: 'A reference', note: 'an edit whose pacing you like' },
    ],
    output: { title: 'A finished cut', note: 'cuts, captions and sound handled' },
    howHeading: 'An editor finishes every cut.',
    steps: [
      { em: '📥', h: 'We take the footage', p: 'A link or a folder. No formats to convert first.' },
      { em: '✂️', h: 'The agent assembles', p: 'Selects, pacing, a first pass at captions.' },
      { em: '🧑‍🎬', h: 'An editor finishes it', p: 'Sound, timing and the final call on every cut.' },
      { em: '📤', h: 'You get the file', p: 'In the formats the platform actually wants.' },
    ],
    pricingHeading: 'Two models on the table',
    tiers: [
      {
        name: 'Per video',
        price: 'TBD',
        open: true,
        body: 'One price per finished video, whatever the runtime. Simple to buy, and the risk of a very long cut sits with us.',
      },
      {
        name: 'Per finished minute',
        price: 'TBD',
        open: true,
        body: 'You pay for what the finished cut runs. Fairer on short work, and a long edit costs what it costs.',
      },
    ],
    pricingNote:
      'The model is not decided yet. These are the two under consideration, with the trade-off written out.',
    promiseHeading: 'An editor signs off on every cut before it reaches you.',
    promiseBody:
      'The agent does the assembly. A person makes the final call on pacing and sound, which is the part that decides whether a cut is watchable.',
    faq: [
      {
        q: 'How much footage can I send?',
        a: 'Send what you have. If the volume changes the price we tell you before we start, not after.',
      },
      { q: 'How long does it take?', a: 'Agreed per job while this is in beta, and stated before you commit.' },
      { q: 'What formats do I get back?', a: 'The aspect ratios and codecs the platforms you named actually want.' },
      {
        q: 'What about music rights?',
        a: 'We use licensed or royalty free audio. If you supply a track, the rights to it are yours to clear.',
      },
      {
        q: 'Who actually edits it?',
        a: 'The agent assembles, a human editor finishes and signs off, and is accountable for the cut you receive.',
      },
    ],
  },

  'voice-outbound': {
    promise:
      'Give us your call list and script. The voice agent makes the calls, qualifies the leads, and sends you the notes.',
    priceLine: 'Per qualified lead',
    priceOpen: true,
    ctaLabel: 'Get notified',
    ctaHref: '#start',
    ctaNote: 'Not open yet. Leave an email and we will tell you when it is.',
    ioHeading: 'A list in. Qualified leads out.',
    inputs: [
      { title: 'Your call list', note: 'CSV of names and numbers' },
      { title: 'Your script', note: 'or a transcript of a call that worked' },
      { title: 'What counts as qualified', note: 'your criteria, not ours' },
    ],
    output: { title: 'Qualified leads', note: 'outcome, notes and the recording for each call' },
    howHeading: 'The agent calls. A person checks.',
    steps: [
      { em: '📇', h: 'We load your list', p: 'Numbers, script, and your qualifying criteria.' },
      { em: '☎️', h: 'The agent calls', p: 'Through the list, on the hours you set.' },
      {
        em: '🧑‍⚖️',
        h: 'A human checks the calls',
        p: 'Before any lead is marked qualified.',
      },
      { em: '📋', h: 'You get the notes', p: 'Outcome, notes, and the recording for each call.' },
    ],
    pricingHeading: 'Priced per qualified lead',
    tiers: [
      {
        name: 'Per qualified lead',
        price: 'TBD',
        open: true,
        body: 'You pay only for leads that clear your criteria. The risk of a bad list sits with us, which is why this is the model we picked over per dial or a monthly retainer.',
      },
    ],
    pricingNote: 'The rate is not set yet. It will be on this page before the service opens.',
    promiseHeading: 'Talk to the agent before you buy.',
    promiseBody:
      'You judge the quality yourself, before anything is scheduled and before you send us a single number.',
    faq: [
      {
        q: 'Does the agent say it is an AI?',
        a: 'Yes. It identifies itself on the call. We do not run a voice agent that pretends to be a person.',
      },
      {
        q: 'What about do-not-call rules and consent?',
        a: 'You are responsible for the list you send. What we screen for on our side will be written here before the service opens.',
      },
      {
        q: 'What counts as a qualified lead?',
        a: 'Whatever you write in the brief. The agent marks a lead qualified against your criteria, not a definition of ours.',
      },
      {
        q: 'Who actually does the work?',
        a: 'The agent makes the calls and writes the notes. A human reviews before leads reach you and is accountable for what you receive.',
      },
    ],
  },

  'explainer-videos': {
    promise:
      'Pick a template, send your product, get a launch-ready explainer video at a fixed price per template.',
    priceLine: 'Fixed price per template',
    priceOpen: true,
    ctaLabel: 'Get notified',
    ctaHref: '#start',
    ctaNote: 'Not open yet. Leave an email and we will tell you when it is.',
    ioHeading: 'A template and a product. One video.',
    inputs: [
      { title: 'A template', note: 'you pick the shape first' },
      { title: 'Your product', note: 'a link, or a login if it needs one' },
      { title: 'Your launch context', note: 'what the video has to land' },
    ],
    output: { title: 'A launch-ready explainer', note: 'the shape you picked, at the price shown' },
    howHeading: 'Fixed shape, fixed price.',
    steps: [
      { em: '🗂️', h: 'You pick the shape', p: 'The template decides the beats before we start.' },
      { em: '✍️', h: 'We script to it', p: 'Your product, into a structure that already works.' },
      { em: '🎬', h: 'We make it', p: 'Voice, motion and screen capture as the template needs.' },
      { em: '✅', h: 'You approve', p: 'You knew the shape and the price before we began.' },
    ],
    pricingHeading: 'One price per template',
    tiers: [
      { name: 'Problem, then product', price: 'TBD', open: true, body: 'Opens on the pain, lands on you as the answer.' },
      { name: 'Feature tour', price: 'TBD', open: true, body: 'Screen led, for a product that shows well.' },
      { name: 'Founder to camera', price: 'TBD', open: true, body: 'You on camera, structured so it stays tight.' },
      { name: 'Launch teaser', price: 'TBD', open: true, body: 'Short, for the day you go live.' },
    ],
    pricingNote: 'Template count and every price are still open, and will be here before it opens.',
    promiseHeading: 'You know the shape and the price before we start.',
    promiseBody:
      'The template fixes the beats and the cost. There is no scoping call to find out what it will run to.',
    faq: [
      {
        q: 'Can I get something outside the templates?',
        a: 'Not on this service. Fixed shape is what makes the price fixed. Ask for something custom and we will quote it separately.',
      },
      { q: 'Do I need to be on camera?', a: 'Only for the founder to camera template. The rest do not need you on screen.' },
      {
        q: 'What if my product needs a login to demo?',
        a: 'Send a demo account. We record against it rather than asking for your own credentials.',
      },
      {
        q: 'Who actually makes it?',
        a: 'The agent scripts and assembles to the template. A human directs and signs it off.',
      },
    ],
  },
};

export function serviceDetail(slug: string): ServiceDetail | undefined {
  return SERVICE_DETAILS[slug];
}
