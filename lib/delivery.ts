// What an order hands over at the end: a file, or words.
//
// Derived from the service rather than stored on the order, because the
// catalogue is code. `lib/services.ts` is the list, `mk_orders.service_slug`
// records which entry somebody bought, and a column repeating that would be a
// second answer to the same question that could disagree with the first.
//
// Client safe on purpose. Both the operator dashboard and the customer's order
// page branch on this, and both are client components.

export type Delivery = 'file' | 'text';

/**
 * Services whose deliverable is written, not shot.
 *
 * One entry today. It is a list rather than a comparison against one string
 * because the next one is obviously coming: a newsletter, a landing page, an
 * outbound sequence. Adding a slug here is the whole change.
 */
export const TEXT_SERVICES: readonly string[] = ['linkedin'];

export function deliveryFor(serviceSlug: string | null | undefined): Delivery {
  return serviceSlug && TEXT_SERVICES.includes(serviceSlug) ? 'text' : 'file';
}

/** Longest draft we store. Anything past this is cut, not rejected. */
export const MAX_DRAFT = 20_000;

/**
 * What the review step is called, per delivery type.
 *
 * The customer facing copy says "sample" everywhere, which is right for a cut
 * of a video and wrong for a post: nobody calls a piece of writing a sample of
 * itself. The status underneath is `sample_sent` either way, because that is
 * the ladder both go up, and only the words a person reads change.
 */
export const REVIEW_NOUN: Record<Delivery, string> = {
  file: 'sample',
  text: 'draft',
};

/** True when the actor string on a draft or comment names the customer. */
export function byCustomer(actor: string | null | undefined): boolean {
  return typeof actor === 'string' && actor.startsWith('customer:');
}

/**
 * The lines on the order page that only make sense about a video.
 *
 * An override map rather than a second full copy of STATUS_LABELS and
 * STATUS_NOTES. Most of the ladder reads correctly either way: "Received",
 * "In progress" and "Refunded" are about the order, not about what it
 * delivers. Only the three steps that tell somebody to watch or download
 * something are wrong for a post, so only those three are written twice.
 */
export const TEXT_LABELS: Record<string, string> = {
  sample_sent: 'Your draft is ready',
  delivered: 'Ready to publish',
};

export const TEXT_NOTES: Record<string, string> = {
  working: 'Being written now. Your draft lands within 24 hours of a complete brief.',
  sample_sent:
    'Read it below. You can edit it yourself, say something about it, or approve it as it stands.',
  approved: 'Thanks. We are getting the final version ready and it will appear here.',
  delivered: 'The post is yours, with full usage rights. Copy it straight into LinkedIn.',
};
