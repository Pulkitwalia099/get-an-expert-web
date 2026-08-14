import { describe, expect, it, vi } from 'vitest';

// The check standing between an operator session and an arbitrary fetch.
//
// The watermark route is handed a URL by the dashboard and gives it straight
// to ffmpeg, which opens most things it is handed: an http address on a
// private network, a file path, a redirect somewhere else. Narrowing it to our
// own storage under this order's own prefix is the whole defence, so it is
// pinned here rather than left to a reading of the route.

vi.mock('@vercel/blob', () => ({ list: vi.fn(async () => ({ blobs: [] })) }));
vi.mock('@/lib/supabase', () => ({
  selectRows: vi.fn(async () => []),
  insertRows: vi.fn(async () => ({ ok: true, status: 201 })),
  deleteRows: vi.fn(async () => ({ ok: true, status: 204 })),
}));
vi.mock('@/lib/orderMail', () => ({ notifyCustomer: vi.fn(async () => 'skipped') }));

const { finalPrefix, isParkedFinalUrl, samplePrefix } = await import('@/lib/operatorOrders');

const ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const OTHER = '9c858901-8a57-4791-81fe-4c455b099bc9';
const STORE = 'https://s5ctlb6t9xn4mzpm.public.blob.vercel-storage.com';

describe('prefixes', () => {
  it('gives every order its own folder, so a list is cheap and cannot collide', () => {
    expect(finalPrefix(ID)).toBe(`orders/${ID}/final/`);
    expect(samplePrefix(ID)).toBe(`orders/${ID}/sample/`);
    expect(finalPrefix(ID)).not.toBe(finalPrefix(OTHER));
  });
});

describe('isParkedFinalUrl', () => {
  it('accepts this order own parked clean file', () => {
    expect(isParkedFinalUrl(ID, `${STORE}/orders/${ID}/final/clean-aX5hRF.mp4`)).toBe(true);
  });

  it('refuses another order file', () => {
    expect(isParkedFinalUrl(ID, `${STORE}/orders/${OTHER}/final/clean.mp4`)).toBe(false);
  });

  it('refuses the sample slot, which is where the result is written', () => {
    // Watermarking a watermarked file would draw the mark twice, and it is the
    // one path that could loop: output becomes input becomes output.
    expect(isParkedFinalUrl(ID, `${STORE}/orders/${ID}/sample/watermarked.mp4`)).toBe(false);
  });

  it('refuses anywhere that is not our storage', () => {
    for (const url of [
      'https://example.com/evil.mp4',
      `https://evil.com/orders/${ID}/final/clean.mp4`,
      // The check is on the hostname ending, so a lookalike domain must fail.
      `https://vercel-storage.com.evil.net/orders/${ID}/final/clean.mp4`,
      `http://s5ctlb6t9xn4mzpm.public.blob.vercel-storage.com/orders/${ID}/final/clean.mp4`,
    ]) {
      expect(isParkedFinalUrl(ID, url)).toBe(false);
    }
  });

  it('refuses a protocol that is not https at all', () => {
    for (const url of [
      'file:///etc/passwd',
      'http://169.254.169.254/latest/meta-data/',
      'data:video/mp4;base64,AAAA',
    ]) {
      expect(isParkedFinalUrl(ID, url)).toBe(false);
    }
  });

  it('refuses anything that is not a URL, without throwing', () => {
    expect(isParkedFinalUrl(ID, '')).toBe(false);
    expect(isParkedFinalUrl(ID, 'not a url')).toBe(false);
  });

  it('refuses an order id that is not an id', () => {
    expect(isParkedFinalUrl('../..', `${STORE}/orders/../../final/x.mp4`)).toBe(false);
  });
});
