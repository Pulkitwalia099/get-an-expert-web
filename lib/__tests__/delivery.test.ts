import { describe, expect, it } from 'vitest';
import {
  REVIEW_NOUN,
  TEXT_LABELS,
  TEXT_NOTES,
  byCustomer,
  deliveryFor,
} from '@/lib/delivery';
import { SERVICES } from '@/lib/services';
import { ORDER_STATUSES, STATUS_LABELS, STATUS_NOTES } from '@/lib/order-status';

// What an order delivers, which decides half of what both order pages draw.

describe('deliveryFor', () => {
  it('sends the LinkedIn engine down the text path', () => {
    expect(deliveryFor('linkedin')).toBe('text');
  });

  it('leaves every other service on files', () => {
    for (const service of SERVICES) {
      if (service.slug === 'linkedin') continue;
      expect(deliveryFor(service.slug)).toBe('file');
    }
  });

  it('treats an unknown or missing slug as a file', () => {
    // A row written before a service existed, or one whose slug was retired.
    // Guessing text would show somebody a draft editor for a video.
    expect(deliveryFor(null)).toBe('file');
    expect(deliveryFor(undefined)).toBe('file');
    expect(deliveryFor('something-else')).toBe('file');
  });

  it('names a slug that is really in the catalogue', () => {
    // The whole mechanism hangs off this string matching lib/services.ts. A
    // rename there with no change here is silent: LinkedIn orders quietly go
    // back to asking for a video file.
    expect(SERVICES.map((s) => s.slug)).toContain('linkedin');
  });
});

describe('what a person reads', () => {
  it('calls it a draft, not a sample', () => {
    expect(REVIEW_NOUN.text).toBe('draft');
    expect(REVIEW_NOUN.file).toBe('sample');
  });

  it('overrides only the statuses that talk about watching or downloading', () => {
    // Every override has to name a real status, or it silently never applies.
    for (const status of [...Object.keys(TEXT_LABELS), ...Object.keys(TEXT_NOTES)]) {
      expect(ORDER_STATUSES).toContain(status);
    }
  });

  it('never tells somebody with a post to watch or download it', () => {
    for (const status of ORDER_STATUSES) {
      const line = TEXT_NOTES[status] ?? STATUS_NOTES[status];
      expect(line.toLowerCase()).not.toContain('watch');
      expect(line.toLowerCase()).not.toContain('download');
      expect(line.toLowerCase()).not.toContain('clean file');
    }
  });

  it('leaves a headline for every status, overridden or not', () => {
    for (const status of ORDER_STATUSES) {
      expect(TEXT_LABELS[status] ?? STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('writes the overrides without em dashes', () => {
    for (const line of [...Object.values(TEXT_LABELS), ...Object.values(TEXT_NOTES)]) {
      expect(line).not.toContain('—');
    }
  });
});

describe('byCustomer', () => {
  it('tells their words from ours', () => {
    expect(byCustomer('customer:someone@example.com')).toBe(true);
    expect(byCustomer('operator')).toBe(false);
  });

  it('is not fooled by an actor that merely mentions a customer', () => {
    expect(byCustomer('operator:for-customer')).toBe(false);
    expect(byCustomer(null)).toBe(false);
    expect(byCustomer(undefined)).toBe(false);
  });
});
