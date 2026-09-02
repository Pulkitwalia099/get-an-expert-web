import { beforeEach, describe, expect, it, vi } from 'vitest';

// Rejecting a recut ends the order. Asking for changes on a first cut does not.
// Both press the second button and both post the same action, so the only thing
// standing between them is the flag this pins. Get it wrong in one direction and
// a closed order sits in the queue promising a version nobody agreed to make;
// get it wrong in the other and a first round dies on its first complaint.

const insertRows = vi.fn(async () => ({ ok: true, status: 201 }));
const selectRows = vi.fn(async () => []);
vi.mock('@/lib/supabase', () => ({ insertRows, selectRows, patchRows: vi.fn(), deleteRows: vi.fn() }));

const { appendCustomerEvent } = await import('@/lib/orderTracking');

const ID = '01dd1d17-fcdb-4518-bd81-96c557f90758';

function written() {
  return insertRows.mock.calls[0][1] as unknown as Record<string, unknown>;
}

beforeEach(() => insertRows.mockClear());

describe('appendCustomerEvent', () => {
  it('hands a first cut back to us', async () => {
    await appendCustomerEvent(ID, 'changes', 'a@b.com', 'slower please', null, false);
    expect(written().status).toBe('working');
  });

  it('closes the order when they turn down the recut', async () => {
    await appendCustomerEvent(ID, 'changes', 'a@b.com', 'still wrong', null, true);
    expect(written().status).toBe('declined');
  });

  it('defaults to handing it back, never to closing', async () => {
    // A caller that forgets the flag must not silently end somebody's order.
    await appendCustomerEvent(ID, 'changes', 'a@b.com', 'note', null);
    expect(written().status).toBe('working');
  });

  it('approves the same way on either', async () => {
    await appendCustomerEvent(ID, 'approve', 'a@b.com', null, null, true);
    expect(written().status).toBe('approved');
  });

  it('names the customer as the actor, not us', async () => {
    await appendCustomerEvent(ID, 'changes', 'A@B.com', 'x', null, true);
    expect(written().actor).toBe('customer:a@b.com');
  });
});
