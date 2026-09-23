import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
const source = readFileSync(new URL('../../public/content-monthly.js', import.meta.url), 'utf8');
class Node {
  handlers: Record<string, Function> = {}; dataset: Record<string,string> = {};
  value = ''; textContent = ''; hidden = true; disabled = false; open = false;
  addEventListener(name: string, fn: Function) { this.handlers[name] = fn; }
  emit(name: string) { return this.handlers[name]?.({ preventDefault() {} }); }
  showModal() { this.open = true; } close() { this.open = false; } focus() {}
  reset() {} querySelector(_name: string): Node { throw new Error('Not configured'); }
}
function browser(submit = vi.fn().mockResolvedValue({ ok: true })) {
  const nodes = Object.fromEntries(['#monthly-request-dialog','#monthly-discuss','#monthly-request-form',
    '#monthly-request-status','#monthly-product','#monthly-email','#monthly-request-summary'].map(n=>[n,new Node()]));
  const button = new Node(), close = new Node(), choice = new Node();
  choice.value = '12'; choice.dataset.price = '699';
  nodes['#monthly-request-form'].querySelector = () => button;
  nodes['#monthly-request-dialog'].querySelector = () => close;
  nodes['#monthly-product'].value = 'example.com'; nodes['#monthly-email'].value = 'test@example.com';
  const payload = vi.fn((count,product,email)=>({count,product,email}));
  const root = { dataset: {}, querySelector: (name:string)=>name.includes(':checked')?choice:nodes[name] };
  vm.runInNewContext(source, { document:{getElementById:()=>root}, Intl,
    MidseshContentIntake:{monthlyPayload:payload,submitSignup:submit} });
  return {nodes,button,close,choice,payload,submit};
}
describe('monthly request form',()=>{
  it.each([['8','499','$499'],['12','699','$699'],['24','1299','$1,299']])('shows the current price for %s videos', (count,price,formatted)=>{
    const page=browser();page.choice.value=count;page.choice.dataset.price=price;
    page.nodes['#monthly-discuss'].emit('click');
    expect(page.nodes['#monthly-request-summary'].textContent).toBe(count+' videos · '+formatted+' / month');
  });
  it('uses the current entry price when a choice has no price attribute',()=>{
    const page=browser();page.choice.value='8';delete page.choice.dataset.price;
    page.nodes['#monthly-discuss'].emit('click');
    expect(page.nodes['#monthly-request-summary'].textContent).toBe('8 videos · $499 / month');
  });
  it('carries the selected plan and blocks duplicate submission after confirmation', async()=>{
    const page=browser();page.nodes['#monthly-discuss'].emit('click');
    expect(page.nodes['#monthly-request-summary'].textContent).toBe('12 videos · $699 / month');
    expect(page.nodes['#monthly-request-dialog'].open).toBe(true);
    await page.nodes['#monthly-request-form'].emit('submit');
    await page.nodes['#monthly-request-form'].emit('submit');
    expect(page.payload).toHaveBeenCalledWith('12','example.com','test@example.com');
    expect(page.submit).toHaveBeenCalledOnce();
    expect(page.button.disabled).toBe(true);
    expect(page.nodes['#monthly-request-status'].textContent).toContain('Request received');
    page.close.emit('click');
    expect(page.nodes['#monthly-request-dialog'].open).toBe(false);
  });
  it('keeps the request retryable and honest on delivery failure', async()=>{
    const page=browser(vi.fn().mockRejectedValue(new Error('That did not send.')));
    page.nodes['#monthly-discuss'].emit('click');
    await page.nodes['#monthly-request-form'].emit('submit');
    expect(page.nodes['#monthly-request-status'].textContent).toBe('That did not send.');
    expect(page.button.disabled).toBe(false);
  });
});
