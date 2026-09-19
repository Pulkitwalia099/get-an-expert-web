import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { serviceBySlug, SERVICES } from '@/lib/services';

const html = readFileSync(new URL('../../public/content.html', import.meta.url), 'utf8');
const intakeSource = readFileSync(new URL('../../public/content-intake.js', import.meta.url), 'utf8');
function client(fetch = vi.fn()) {
  const context = vm.createContext({ fetch, URL, AbortController, setTimeout, clearTimeout });
  vm.runInContext(intakeSource, context);
  return context.MidseshContentIntake;
}

describe('/content launch', () => {
  it('ships the approved story without duplicate hero proof or hidden monthly pricing', () => {
    expect(html).toContain('Your product-to-content engine');
    expect(html).toContain('id="content-order-dialog"');
    expect(html).not.toContain('class="proof-card"');
    expect(html).not.toContain('class="filters"');
    for (const name of ['case-mishq', 'case-future', 'case-kaftan']) {
      expect(html).toContain('id="' + name + '"');
    }
    for (const price of ['$395', '$565', '$1,090']) expect(html).toContain(price);
    expect(html).toContain('No payment taken here.');
    expect(html).toContain('Analysis and content plan shown are illustrative.');
  });
  it('keeps browser scripts syntactically valid and all tab targets present', () => {
    new vm.Script(readFileSync(new URL('../../public/content-page.js', import.meta.url), 'utf8'));
    new vm.Script(intakeSource);
    for (const [, target] of html.matchAll(/aria-controls="([^"]+)"/g)) {
      expect(html).toContain('id="' + target + '"');
    }
  });
  it('resolves every in-page link and referenced local script and stylesheet', () => {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, target] of html.matchAll(/href="#([^"]*)"/g)) {
      expect(target).not.toBe('');
      expect(ids).toContain(target);
    }
    for (const [, file] of html.matchAll(/(?:src|href)="(\/content-[^"?]+)(?:\?[^"]*)?"/g)) {
      expect(existsSync(new URL('../../public' + file, import.meta.url))).toBe(true);
    }
    expect(html).not.toMatch(/Preview only|Proposed revamp|id="content-before"|noindex/);
  });
  it('keeps the $39 content offer separate from the $29 UGC catalogue card', () => {
    expect(serviceBySlug('short-form-video')?.priceCents).toBe(3900);
    expect(serviceBySlug('ugc-ads')?.priceCents).toBe(2900);
    expect(serviceBySlug('loop-agent')?.status).toBe('soon');
    expect(SERVICES.some((s) => s.slug === 'short-form-video')).toBe(false);
  });
  it('normalises product URLs and rejects executable or credential-bearing URLs', () => {
    const api = client();
    expect(api.normaliseProductLink('example.com/app')).toBe('https://example.com/app');
    for (const invalid of ['', 'javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com', 'file:///etc/passwd']) {
      expect(() => api.normaliseProductLink(invalid)).toThrow();
    }
  });
  it('builds distinct order and notification payloads with the product brief', () => {
    const api = client();
    const order = api.orderPayload('example.com', ' buyer@example.com ', 'Brand reference');
    expect(order).toMatchObject({ email: 'buyer@example.com', serviceSlug: 'short-form-video', orderKind: 'order' });
    expect(order.message).toContain('https://example.com/');
    expect(order.message).toContain('$39');
    expect(order.message).toContain('Brand reference');
    expect(api.waitlistPayload('buyer@example.com')).toMatchObject({ serviceSlug: 'loop-agent', orderKind: 'notify' });
    expect(() => api.waitlistPayload('not-an-email')).toThrow();
  });
  it('posts once to signup and accepts confirmed notification', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, notified: true }) });
    const api = client(fetch);
    const payload = api.waitlistPayload('buyer@example.com');
    await expect(api.submitSignup(payload)).resolves.toMatchObject({ notified: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/signup', expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }));
  });
  it.each([
    { ok: true, status: 200, data: { ok: true, notified: false } },
    { ok: false, status: 429, data: { error: 'Too many requests' } },
    { ok: true, status: 200, data: {} },
  ])('rejects an unconfirmed or failed request: $status/$data', async ({ ok, status, data }) => {
    const fetch = vi.fn().mockResolvedValue({ ok, status, json: async () => data });
    await expect(client(fetch).submitSignup({})).rejects.toThrow();
  });
});
