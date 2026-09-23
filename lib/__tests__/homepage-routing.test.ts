import { describe, expect, it } from 'vitest';
import config from '../../next.config';
import { readFileSync } from 'node:fs';

async function routes() {
  const result = await config.rewrites!();
  if (Array.isArray(result)) throw new Error('Expected scoped beforeFiles routes');
  return result.beforeFiles;
}

describe('homepage and marketplace routing', () => {
  it('serves the approved content page at the root', async () => {
    expect(await routes()).toContainEqual({ source: '/', destination: '/content.html' });
    expect(await routes()).not.toContainEqual({ source: '/', destination: 'https://agon-agent-eight.vercel.app/' });
  });
  it('redirects old page URLs, never their video or image paths', async () => {
    const redirects = await config.redirects!();
    for (const source of ['/content', '/content.html']) {
      expect(redirects).toContainEqual({ source, destination: '/', permanent: false });
    }
    for (const source of ['/setup', '/setups']) {
      expect(redirects).toContainEqual({ source, destination: '/marketplace', permanent: false });
    }
    expect(redirects.some(rule => rule.source.includes(':path'))).toBe(false);
  });
  it('uses the homepage canonical and exposes marketplace navigation', () => {
    const html = readFileSync(new URL('../../public/content.html', import.meta.url), 'utf8');
    expect(html).toContain('<link rel="canonical" href="https://midsesh.com/">');
    expect(html).toContain('<meta property="og:url" content="https://midsesh.com/">');
    expect(html.match(/href="\/marketplace"/g)).toHaveLength(3);
    expect(html).toContain('id="cr-intake"');
    expect(html).toContain('id="monthly-request-form"');
  });
  it('serves the existing marketplace at its dedicated URL', async () => {
    expect(await routes()).toContainEqual({
      source: '/marketplace', destination: 'https://agon-agent-eight.vercel.app/',
    });
  });
  it('preserves the separate content and marketplace asset namespaces', async () => {
    expect(await routes()).toEqual(expect.arrayContaining([
      { source: '/content/:path*', destination: 'https://midsesh-preview.vercel.app/content/:path*' },
      { source: '/_agon/:path*', destination: 'https://agon-agent-eight.vercel.app/_agon/:path*' },
    ]));
  });
  it('does not move shared APIs, authentication, accounts or orders', async () => {
    const sources = (await routes()).map(route => route.source);
    for (const path of ['/api/:path*', '/signin', '/account', '/orders', '/dashboard']) {
      expect(sources).not.toContain(path);
    }
  });
});
