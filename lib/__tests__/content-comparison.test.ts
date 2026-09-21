import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../public/content-comparison.js', import.meta.url), 'utf8');
class Node {
  handlers: Record<string, Set<Function>> = {};
  hidden = false; textContent = ''; paused = true; muted = true; controls = true;
  readyState = 4; currentTime = 0; seeking = false; ended = false; playbackRate = 1;
  dataset: Record<string, string> = {};
  addEventListener(name: string, fn: Function) { (this.handlers[name] ||= new Set()).add(fn); }
  removeEventListener(name: string, fn: Function) { this.handlers[name]?.delete(fn); }
  emit(name: string) { this.handlers[name]?.forEach(fn => fn()); }
  setAttribute() {}
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() { this.readyState = 4; this.emit('loadedmetadata'); }
}
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
function browser(reduced = false) {
  vi.useFakeTimers();
  const pair = [new Node(), new Node()];
  pair[0].dataset.start = '3.6'; pair[1].dataset.start = '2.375';
  const names = ['#comparison-play', '#comparison-replay', '#comparison-sound', '#comparison-status', '.comparison-controls'];
  const controls = Object.fromEntries(names.map(name => [name, new Node()]));
  const panel = new Node();
  const box = { querySelectorAll: () => pair, querySelector: (name: string) => controls[name], closest: () => panel };
  let modal = false;
  const root = { querySelector: (name: string) => name === '#kaftan-comparison' ? box : modal ? {} : null, querySelectorAll: () => [] };
  const document = Object.assign(new Node(), { getElementById: () => root });
  const motion = Object.assign(new Node(), { matches: reduced });
  let visibility: Function = () => {}, mutation: Function = () => {}, frame: Function = () => {};
  vm.runInNewContext(source, {
    document, navigator: {}, matchMedia: () => motion, setTimeout, clearTimeout,
    requestAnimationFrame: (fn: Function) => { frame = fn; return 1; }, cancelAnimationFrame: () => {},
    IntersectionObserver: class { constructor(fn: Function) { visibility = fn; } observe() {} },
    MutationObserver: class { constructor(fn: Function) { mutation = fn; } observe() {} },
  });
  async function show(visible = true) {
    visibility([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]);
    pair.forEach(v => v.emit('seeked')); await flush();
  }
  async function click(name: string) { controls[name].emit('click'); pair.forEach(v => v.emit('seeked')); await flush(); }
  return { pair, controls, show, click, frame: () => frame(), panel, mutation: () => mutation(),
    modal: () => { modal = true; mutation(); } };
}
afterEach(() => vi.useRealTimers());
describe('aligned case-study playback', () => {
  it('starts both at their aligned offsets and pauses them for a dialog', async () => {
    const page = browser();
    await page.show();
    expect(page.pair.map(v => v.currentTime)).toEqual([3.6, 2.375]);
    expect(page.pair.every(v => !v.paused && v.muted && !v.controls)).toBe(true);
    page.modal();
    expect(page.pair.every(v => v.paused)).toBe(true);
  });
  it('corrects drift and loops both videos together', async () => {
    const page = browser(); await page.show();
    page.pair[0].currentTime = 6.6; page.pair[1].currentTime = 5.6;
    page.frame();
    expect(page.pair[1].currentTime).toBeCloseTo(5.375);
    page.pair[0].currentTime = 10.61; page.frame();
    page.pair.forEach(v => v.emit('seeked')); await flush();
    expect(page.pair.map(v => v.currentTime)).toEqual([3.6, 2.375]);
    expect(page.pair.every(v => !v.paused)).toBe(true);
  });
  it('respects manual pause, replay, and reduced motion', async () => {
    const page = browser(true); await page.show();
    expect(page.pair.every(v => v.paused)).toBe(true);
    await page.click('#comparison-play');
    expect(page.pair.every(v => !v.paused)).toBe(true);
    await page.click('#comparison-play'); page.mutation();
    expect(page.pair.every(v => v.paused)).toBe(true);
    await page.click('#comparison-replay');
    expect(page.pair.map(v => v.currentTime)).toEqual([3.6, 2.375]);
    await page.show(false);
    expect(page.pair.every(v => v.paused)).toBe(true);
  });
});

