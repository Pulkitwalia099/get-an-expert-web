import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const script = readFileSync(new URL('../../public/content-pricing.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../public/content.html', import.meta.url), 'utf8');
describe('monthly content selector', () => {
  it('updates the displayed price and contact link for all three plans', () => {
    const selector = { disabled: true };
    const strong = { textContent: '' };
    const link = { href: '', label: '', setAttribute(_key: string, label: string) { this.label = label; } };
    const choices = [...html.matchAll(/name="monthly-videos" value="(\d+)" data-price="(\d+)"( checked)?/g)].map(m => ({
      value: m[1], dataset: { price: m[2] }, checked: !!m[3],
      change: () => {},
      addEventListener(_event: string, handler: () => void) { this.change = handler; },
    }));
    const nodes = { fieldset: selector, '#monthly-price': { querySelector: () => strong }, '#monthly-discuss': link };
    const section = {
      querySelector: (name: keyof typeof nodes) => nodes[name],
      querySelectorAll: () => choices,
    };
    vm.runInNewContext(script, { document: { getElementById: () => section }, Intl });
    expect(selector.disabled).toBe(false);
    expect(strong.textContent).toBe('$395');
    for (const [index, count, price] of [[0, '8', '$395'], [1, '12', '$565'], [2, '24', '$1,090']] as const) {
      choices.forEach((choice, i) => { choice.checked = i === index; });
      choices[index].change();
      expect(strong.textContent).toBe(price);
      expect(link.href).toBe('mailto:midsesh.social@gmail.com?subject=' + encodeURIComponent('Request: ' + count + ' videos per month'));
      expect(link.label).toContain(count + ' videos per month');
    }
  });
  it('provides native radio navigation, an announced price, and a no-script fallback', () => {
    expect(html.match(/type="radio" name="monthly-videos"/g)).toHaveLength(3);
    expect(html).toContain('<legend>Videos per month</legend>');
    expect(html).toContain('id="monthly-price" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('8 videos: $395/month · 12 videos: $565/month · 24 videos: $1,090/month.');
  });
});
