import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/email', () => ({ isValidEmail: (email: string) => email.includes('@'), sendEmail: vi.fn() }));
vi.mock('@/lib/insights', () => ({ recordInsight: vi.fn() }));
vi.mock('@/lib/metrics', () => ({ withMetrics: (_name: string, fn: unknown) => fn }));
vi.mock('@/lib/ratelimit', () => ({ clientId: () => 'test-client', rateLimit: () => true }));
vi.mock('@/lib/usage', () => ({ durableLimit: async () => 'ok' }));
vi.mock('@/lib/marketplaceOrders', () => ({ recordMarketplaceOrder: vi.fn() }));
vi.mock('@/lib/orderMail', () => ({ notifyCustomer: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ countRows: async () => 1, recordLead: vi.fn(), selectRows: async () => [{ id: 'test-order-id' }] }));

import { sendEmail } from '@/lib/email';
import { recordMarketplaceOrder } from '@/lib/marketplaceOrders';
import { notifyCustomer } from '@/lib/orderMail';
import { POST } from '@/app/api/signup/route';

function request(slug: string, kind: string): NextRequest {
  return {
    headers: new Headers({ origin: 'https://midsesh.com', host: 'midsesh.com' }),
    json: async () => ({ type: 'contact', email: 'test@example.com', serviceSlug: slug, orderKind: kind, purpose: 'Content', message: 'Product link: https://example.com' }),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendEmail).mockResolvedValue(true);
  vi.mocked(recordMarketplaceOrder).mockResolvedValue({ ok: true, ref: 'test-ref' });
  vi.mocked(notifyCustomer).mockResolvedValue('sent');
});

describe('content signup integration', () => {
  it('records the canonical $39 video offer and sends the order confirmation', async () => {
    const response = await POST(request('short-form-video', 'order'));
    expect(response.status).toBe(200);
    expect(recordMarketplaceOrder).toHaveBeenCalledWith(expect.objectContaining({ kind: 'order', serviceSlug: 'short-form-video', serviceName: 'Short-form video', priceCents: 3900 }));
    expect(notifyCustomer).toHaveBeenCalledOnce();
  });
  it('records a Loop notification without a priced order or order confirmation', async () => {
    await POST(request('loop-agent', 'notify'));
    expect(recordMarketplaceOrder).toHaveBeenCalledWith(expect.objectContaining({ kind: 'notify', serviceSlug: 'loop-agent', priceCents: null }));
    expect(notifyCustomer).not.toHaveBeenCalled();
  });
  it('records a monthly inquiry as contact, not an order or subscription', async () => {
    const req = request('', '');
    req.json = async () => ({ type: 'contact', email: 'test@example.com',
      purpose: 'Monthly content plan request',
      message: 'Plan: 12 videos per month\nMonthly price: $565\nProduct link: https://example.com' });
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(recordMarketplaceOrder).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'contact', priceCents: null, serviceName: 'Monthly content plan request',
    }));
    expect(notifyCustomer).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledOnce();
  });
});
