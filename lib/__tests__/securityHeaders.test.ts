import { describe, expect, it } from 'vitest';
import config from '../../next.config';

// These headers failed silently. There was no frame-src, so the browser
// refused to create the call and booking iframes, and microphone=() denied
// the mic to everyone including this site. Nothing errored server side and
// the only symptom was a call that never connected.

async function headers(): Promise<Record<string, string>> {
  const rules = await config.headers!();
  const out: Record<string, string> = {};
  for (const h of rules[0].headers) out[h.key] = h.value;
  return out;
}

describe('Content-Security-Policy', () => {
  it('declares frame-src rather than falling back to default-src', async () => {
    expect((await headers())['Content-Security-Policy']).toMatch(/frame-src/);
  });

  it('lets the Daily call frame load', async () => {
    const csp = (await headers())['Content-Security-Policy'];
    const frameSrc = csp.split('; ').find((d) => d.startsWith('frame-src'))!;
    expect(frameSrc).toContain('daily.co');
  });

  it('lets the Cal booking frame load', async () => {
    const csp = (await headers())['Content-Security-Policy'];
    const frameSrc = csp.split('; ').find((d) => d.startsWith('frame-src'))!;
    expect(frameSrc).toContain('cal.com');
  });

  it('lets the TikTok player frame load, which is every card on /setups', async () => {
    const csp = (await headers())['Content-Security-Policy'];
    const frameSrc = csp.split('; ').find((d) => d.startsWith('frame-src'))!;
    expect(frameSrc).toContain('https://www.tiktok.com');
  });

  it('allows the Daily signalling websocket', async () => {
    const csp = (await headers())['Content-Security-Policy'];
    const connect = csp.split('; ').find((d) => d.startsWith('connect-src'))!;
    expect(connect).toContain('wss://*.daily.co');
  });

  it('allows blob media, which is how call audio plays', async () => {
    const csp = (await headers())['Content-Security-Policy'];
    const media = csp.split('; ').find((d) => d.startsWith('media-src'))!;
    expect(media).toContain('blob:');
  });

  it('still refuses to be framed and still blocks objects', async () => {
    const csp = (await headers())['Content-Security-Policy'];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});

describe('Permissions-Policy', () => {
  it('does not deny the microphone outright', async () => {
    const pp = (await headers())['Permissions-Policy'];
    expect(pp).not.toMatch(/microphone=\(\)/);
  });

  it('grants the mic to this site and the Daily room', async () => {
    const pp = (await headers())['Permissions-Policy'];
    expect(pp).toContain('microphone=(self "https://midsesh.daily.co")');
  });

  it('allows autoplay for the Daily room, or remote audio stays silent', async () => {
    expect((await headers())['Permissions-Policy']).toContain('autoplay=(self');
  });

  it('keeps the camera denied, because these calls are audio only', async () => {
    expect((await headers())['Permissions-Policy']).toContain('camera=()');
  });
});
