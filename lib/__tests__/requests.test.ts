import { describe, expect, it } from 'vitest';
import { parseConsultRequest, parseReelRequest } from '@/lib/setups-validate';

const today = new Date('2026-07-26T12:00:00Z');

describe('parseConsultRequest', () => {
  const good = {
    email: 'rohit@example.com',
    date: '2026-07-27',
    slot: '10:30 AM',
    setups: ['openclaw', 'ollama'],
  };

  it('accepts a clean request', () => {
    const parsed = parseConsultRequest(good, today);
    expect(parsed).not.toBeNull();
    expect(parsed?.setups).toEqual(['openclaw', 'ollama']);
  });

  it('rejects bad emails', () => {
    expect(parseConsultRequest({ ...good, email: 'nope' }, today)).toBeNull();
    expect(parseConsultRequest({ ...good, email: '' }, today)).toBeNull();
  });

  it('rejects unknown slots and slugs', () => {
    expect(parseConsultRequest({ ...good, slot: '9:00 AM' }, today)).toBeNull();
    expect(parseConsultRequest({ ...good, setups: ['nope'] }, today)).toBeNull();
  });

  it('rejects past dates and far future dates', () => {
    expect(parseConsultRequest({ ...good, date: '2026-07-20' }, today)).toBeNull();
    expect(parseConsultRequest({ ...good, date: '2027-01-01' }, today)).toBeNull();
  });

  it('allows an empty cart, the consult still books', () => {
    expect(parseConsultRequest({ ...good, setups: [] }, today)).not.toBeNull();
  });
});

describe('parseReelRequest', () => {
  it('accepts an https link with optional contact', () => {
    const parsed = parseReelRequest({
      link: 'https://www.instagram.com/reel/DYK2IWyoEWh/',
      contact: '@rohit',
    });
    expect(parsed?.link).toContain('instagram.com');
  });

  it('rejects non-http links and junk', () => {
    expect(parseReelRequest({ link: 'javascript:alert(1)' })).toBeNull();
    expect(parseReelRequest({ link: 'not a link' })).toBeNull();
    expect(parseReelRequest({})).toBeNull();
  });

  it('trims and caps the contact field', () => {
    const parsed = parseReelRequest({
      link: 'https://x.com/some/reel',
      contact: `  ${'a'.repeat(300)}  `,
    });
    expect(parsed?.contact?.length).toBeLessThanOrEqual(200);
  });
});
