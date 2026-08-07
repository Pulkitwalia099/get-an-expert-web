import { describe, expect, it } from 'vitest';
import { parseReelRequest } from '@/lib/setups-validate';


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
