import type { Service } from '@/lib/services';

// /content owns these offers. They are recognised by intake and order tracking
// without adding unrelated cards to the existing marketplace catalogue.
export const CONTENT_SERVICES: Service[] = [
  {
    slug: 'short-form-video', name: 'Short-form video', badge: 'Human + Agent',
    status: 'live', blurb: 'Expert-directed short-form video in 24 hours.',
    price: '$39', priceCents: 3900, priceNote: 'One video', priceOpen: false,
    cta: 'Start with one video', media: 'video',
  },
  {
    slug: 'loop-agent', name: 'Loop Agent', badge: 'Launching soon',
    status: 'soon', blurb: 'Turn creative signals into a sharper next batch.',
    price: 'Launching soon', priceCents: null, priceNote: null, priceOpen: false,
    cta: 'Join the waitlist', media: null,
  },
];
