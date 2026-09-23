import { describe, expect, it } from 'vitest';
import config from '../../next.config';

async function routes() {
  const result = await config.rewrites!();
  if (Array.isArray(result)) throw new Error('Expected scoped beforeFiles routes');
  return result.beforeFiles;
}

describe('homepage and marketplace routing', () => {
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
