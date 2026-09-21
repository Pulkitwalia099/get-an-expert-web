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
    expect(html).toContain('No payment is taken here.');
    expect(html).toContain('Launching soon');
    expect(html).not.toContain('Analysis and content plan shown are illustrative.');
    expect(html).not.toContain('Illustrative analysis · Not live performance data');
  });
  it('keeps the founder-first page concise and puts the trial before monthly plans', () => {
    expect(html).toContain('You built the product.<br><span>Now get it seen.</span>');
    expect(html).toContain('AI production. Expert direction.');
    expect(html).toContain('Expert steers at checkpoints');
    expect(html).toContain('Introductory offer');
    expect(html.match(/>Give it a shot for \$39 ↗<\/button>/g)).toHaveLength(5);
    expect(html.indexOf('class="pricebox"')).toBeLessThan(html.indexOf('id="monthly-pricing"'));
    expect(html).not.toContain('class="monthly-plans"');
    expect(html).toContain('Work that looks native.<br>Not generated.');
    for (const redundant of ['Start with your product link.', 'The transformation', 'The actual starting brief', 'Four beats shape the story.', 'Real client videos. Autoplay', 'class="format-label"']) {
      expect(html).not.toContain(redundant);
    }
    const hero = html.slice(html.indexOf('class="hero hero-final"'), html.indexOf('id="cr-work"'));
    expect(hero).not.toContain('Start with one video for $39.');
  });
  it('keeps browser scripts syntactically valid and all tab targets present', () => {
    new vm.Script(readFileSync(new URL('../../public/content-page.js', import.meta.url), 'utf8'));
    new vm.Script(intakeSource);
    new vm.Script(readFileSync(new URL('../../public/content-comparison.js', import.meta.url), 'utf8'));
    new vm.Script(readFileSync(new URL('../../public/content-monthly.js', import.meta.url), 'utf8'));
    new vm.Script(readFileSync(new URL('../../public/content-pricing.js', import.meta.url), 'utf8'));
    for (const [, target] of html.matchAll(/aria-controls="([^"]+)"/g)) {
      expect(html).toContain('id="' + target + '"');
    }
  });
  it('includes the two footage edits with real assets and accurate format descriptions', () => {
    expect(html.match(/class="sample"/g)).toHaveLength(7);
    for (const file of ['founder', 'talking-head']) {
      for (const ext of ['mp4', 'jpg']) {
        const path = '/media/plans/mishq/' + file + '.' + ext;
        expect(html).toContain(path);
        expect(existsSync(new URL('../../public' + path, import.meta.url))).toBe(true);
      }
    }
    expect(html).toContain('Raw → finished');
    expect(html).toContain('A talking-head story with animated type and visual cutaways.');
    expect(html).not.toContain('Yes, this is all AI.');
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
  it('keeps monthly requests separate from paid orders and carries the selected plan', () => {
    const api = client();
    for (const [count, price] of [[8, 395], [12, 565], [24, 1090]]) {
      const payload = api.monthlyPayload(String(count), 'example.com', ' buyer@example.com ');
      expect(payload).toMatchObject({ type: 'contact', email: 'buyer@example.com', purpose: 'Monthly content plan request' });
      expect(payload).not.toHaveProperty('serviceSlug');
      expect(payload).not.toHaveProperty('orderKind');
      expect(payload.message).toContain(count + ' videos per month');
      expect(payload.message).toContain('$' + price);
      expect(payload.message).toContain('https://example.com/');
    }
    expect(() => api.monthlyPayload('100', 'example.com', 'buyer@example.com')).toThrow();
    expect(() => api.monthlyPayload('8', 'javascript:alert(1)', 'buyer@example.com')).toThrow();
    expect(() => api.monthlyPayload('8', 'example.com', 'invalid')).toThrow();
  });
  it('uses real sources, concise categories and a shared transition comparison', () => {
    for (const removed of ['View all work', 'Your product could be next.', 'Discuss this plan', 'Make the fitting feel like the fix']) expect(html).not.toContain(removed);
    for (const category of ['Lingerie · India', 'Consumer app · US', 'Apparel · Middle East']) expect(html).toContain(category);
    expect(html).toContain('https://mishq.in/pages/book-bra-fitting');
    expect(html).toContain('id="monthly-request-form"');
    expect(html).toContain('Submit request');
    const starts = [...html.matchAll(/data-sync-video data-start="([\d.]+)"/g)].map(m => Number(m[1]));
    expect(starts).toEqual([3.6, 2.375]);
    expect(6.6 - starts[0]).toBeCloseTo(5.375 - starts[1], 8);
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
