import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../../public/content-page.js', import.meta.url), 'utf8');
// Small DOM harness for the shipped browser script, with controllable visibility.
class Node {
  events: Record<string, Function[]> = {};
  attrs: Record<string, string> = {};
  dataset: Record<string, string> = {};
  children: Node[] = [];
  selectors: Record<string, Node> = {};
  lists: Record<string, Node[]> = {};
  className = ''; textContent = ''; innerHTML = ''; hidden = false; disabled = false;
  open = false; paused = true; muted = true; defaultMuted = true; controls = true;
  parentElement!: Node; card: Node | null = null; tabIndex = 0;
  classList = { toggle() {}, remove() {}, add() {} };
  addEventListener(name: string, fn: Function) { (this.events[name] ||= []).push(fn); }
  emit(name: string, data = {}) { this.events[name]?.forEach(fn => fn({ target: this, ...data })); }
  setAttribute(name: string, value: string) { this.attrs[name] = value; }
  getAttribute(name: string) { return this.attrs[name]; }
  querySelector(name: string) { return this.selectors[name]; }
  querySelectorAll(name: string) {
    if (name === '.media-controls button') return this.selectors.video.parentElement.children[0]?.children || [];
    return this.lists[name] || [];
  }
  append(...nodes: Node[]) { this.children.push(...nodes); }
  closest() { return this.card; }
  contains(node: Node) { return node === this || this.children.includes(node); }
  getClientRects() { return this.hidden ? [] : [{}]; }
  getBoundingClientRect() { return { left: 0, right: 100, top: 0, bottom: 100 }; }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
  play() { this.paused = false; this.emit('play'); return Promise.resolve(); }
  pause() { if (!this.paused) { this.paused = true; this.emit('pause'); } }
}
function browser({ reduced = false, saveData = false } = {}) {
  vi.useFakeTimers();
  const root = new Node(), document = Object.assign(new Node(), { activeElement: new Node() });
  const names = ['#portfolio-grid', '#portfolio-prev', '#portfolio-next', '#portfolio-rotation', '#show-more', '#portfolio-count', '#cr-work', '#content-order-dialog', '#cr-product', '.gallery-controls', '#cr-loop', '#loop-replay', '#loop-join', '#loop-waitlist', '#loop-email', '.dialog-close'];
  names.forEach(name => { root.selectors[name] = new Node(); });
  const cards = Array.from({ length: 5 }, (_, i) => {
    const card = new Node(), video = new Node();
    video.card = card; video.parentElement = new Node();
    video.attrs['aria-label'] = 'Video ' + i;
    card.selectors = { video, '.select-video': new Node(), h3: Object.assign(new Node(), { textContent: 'Video ' + i }) };
    return card;
  });
  const videos = cards.map(card => card.selectors.video);
  const start = new Node();
  root.lists = { video: videos, '.sample': cards, '.start': [start] };
  const motion = Object.assign(new Node(), { matches: reduced });
  const connection = Object.assign(new Node(), { saveData });
  const observers: { callback: Function; nodes: Node[] }[] = [];
  class IntersectionObserver {
    nodes: Node[] = [];
    constructor(public callback: Function) { observers.push(this); }
    observe(node: Node) { this.nodes.push(node); }
    disconnect() {}
  }
  Object.assign(document, { getElementById: () => root, createElement: () => new Node() });
  vm.runInNewContext(source, { document, navigator: { connection }, matchMedia: () => motion,
    IntersectionObserver, MutationObserver: class { observe() {} }, setTimeout, clearTimeout,
    requestAnimationFrame: (fn: Function) => fn() });
  function visibility(node: Node, ratio: number) {
    observers.filter(o => o.nodes.includes(node)).forEach(o => o.callback([{ target: node, isIntersecting: ratio > 0, intersectionRatio: ratio }]));
  }
  function show() {
    visibility(root.selectors['#portfolio-grid'], 1);
    videos.forEach(video => visibility(video, 1));
  }
  return { root, cards, videos, start, document, motion, visibility, show,
    node: (name: string) => root.selectors[name],
    controls: (index: number) => videos[index].parentElement.children[0].children };
}
afterEach(() => vi.useRealTimers());
describe('content media interactions', () => {
  it('rotates visible work and plays only the selected video, muted', () => {
    const page = browser(); page.show();
    expect(page.videos[0].paused).toBe(false);
    expect(page.videos.every(v => v.muted && !v.controls)).toBe(true);
    vi.advanceTimersByTime(6500);
    expect(page.cards[1].dataset.slot).toBe('0');
    expect(page.videos[0].paused).toBe(true);
    expect(page.videos[1].paused).toBe(false);
  });
  it('manual navigation pauses rotation until explicitly resumed', () => {
    const page = browser(); page.show(); page.node('#portfolio-next').emit('click');
    vi.advanceTimersByTime(20000);
    expect(page.cards[1].dataset.slot).toBe('0');
    expect(page.node('#portfolio-rotation').textContent).toBe('Resume rotation');
    page.node('#portfolio-rotation').emit('click'); vi.advanceTimersByTime(6500);
    expect(page.cards[2].dataset.slot).toBe('0');
  });
  it('pauses for hover, focus, offscreen and open dialogs', () => {
    const page = browser(); page.show();
    page.node('#cr-work').emit('pointerenter', { pointerType: 'mouse' });
    vi.advanceTimersByTime(7000); expect(page.cards[0].dataset.slot).toBe('0');
    page.node('#cr-work').emit('pointerleave');
    page.document.activeElement = page.node('#cr-work'); page.node('#cr-work').emit('focusin');
    vi.advanceTimersByTime(7000); expect(page.cards[0].dataset.slot).toBe('0');
    page.document.activeElement = new Node(); page.node('#cr-work').emit('focusout'); vi.advanceTimersByTime(0);
    page.visibility(page.node('#portfolio-grid'), 0);
    vi.advanceTimersByTime(7000); expect(page.cards[0].dataset.slot).toBe('0');
    page.show(); page.start.emit('click');
    vi.advanceTimersByTime(7000); expect(page.cards[0].dataset.slot).toBe('0');
    expect(page.videos.every(v => v.paused)).toBe(true);
  });
  it.each([{ reduced: true }, { saveData: true }])('respects preferences while allowing explicit playback: %j', (preferences) => {
    const page = browser(preferences); page.show();
    vi.advanceTimersByTime(15000);
    expect(page.videos.every(v => v.paused)).toBe(true);
    expect(page.node('#portfolio-rotation').disabled).toBe(true);
    page.controls(0)[0].emit('click');
    page.document.emit('visibilitychange');
    expect(page.videos[0].paused).toBe(false);
    page.visibility(page.videos[0], 0);
    expect(page.videos[0].paused).toBe(true);
  });
  it('keeps an explicitly paused video paused and unmutes only the requested video', () => {
    const page = browser(); page.show();
    page.controls(0)[0].emit('click'); page.document.emit('visibilitychange');
    expect(page.videos[0].paused).toBe(true);
    page.controls(0)[1].emit('click');
    expect(page.videos[0].muted).toBe(false);
    expect(page.videos[0].paused).toBe(false);
    expect(page.videos.slice(1).every(v => v.paused)).toBe(true);
    vi.advanceTimersByTime(15000); expect(page.cards[0].dataset.slot).toBe('0');
  });
});
