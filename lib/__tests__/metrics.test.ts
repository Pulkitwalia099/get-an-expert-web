import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withMetrics } from '../metrics';

const REQ = {} as NextRequest;

describe('withMetrics', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes the handler response through', async () => {
    const handler = withMetrics('test', async () => NextResponse.json({ ok: true }));
    const res = await handler(REQ);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('turns an uncaught error into a clean 500 with no stack details', async () => {
    const handler = withMetrics('test', async () => {
      throw new Error('secret internal detail');
    });
    const res = await handler(REQ);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('secret internal detail');
    expect(body).toEqual({ error: 'Something went wrong' });
  });
});
