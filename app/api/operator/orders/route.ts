import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { isOrderStatus } from '@/lib/order-status';
import { isAuthorised } from '@/lib/operatorAuth';
import { advance, detail, queue, recentlyClosed, remove, updateDelivery } from '@/lib/operatorOrders';

// The dashboard's one endpoint: read the queue, read one order, move one on.
//
// 404 rather than 401 on a bad secret, the same as every other operator route.
// A 401 confirms the address is worth attacking; a 404 says there is nothing
// here.

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const order = await detail(id);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ order });
  }

  const [orders, closed] = await Promise.all([queue(), recentlyClosed()]);
  if (orders === null) {
    return NextResponse.json({ error: 'Cannot reach the orders right now' }, { status: 502 });
  }
  // A missing archive is not worth failing the request over. Live work is the
  // reason somebody opened this page, and hiding it because the Closed section
  // could not be read would be the wrong half to keep.
  return NextResponse.json({ orders, closed: closed ?? [] });
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
  const text = (key: string): string | null =>
    typeof payload[key] === 'string' ? (payload[key] as string) : null;

  // Correcting what was published with a sample that already went out. No
  // status moves and no email goes, because fixing a paragraph is not an event
  // in the life of the order.
  if (payload.action === 'edit-delivery') {
    const edited = await updateDelivery(orderId, {
      deliveredCut: text('deliveredCut'),
      deliveredDiff: text('deliveredDiff'),
      frames: payload.frames,
    });
    if (!edited.ok) return NextResponse.json({ error: edited.error }, { status: 400 });
    return NextResponse.json({ ok: true, message: 'Saved. The customer sees this now.' });
  }

  const status = typeof payload.status === 'string' ? payload.status : '';
  if (!isOrderStatus(status)) {
    return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
  }

  const result = await advance({
    orderId,
    status,
    note: text('note'),
    assetUrl: text('assetUrl'),
    draft: text('draft'),
    deliveredCut: text('deliveredCut'),
    deliveredDiff: text('deliveredDiff'),
    frames: payload.frames,
  });

  // A refused move is the operator's mistake to see, not a server error, so it
  // comes back 400 with the sentence to put on screen.
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, message: result.emailed });
}

async function handleDelete(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const id = req.nextUrl.searchParams.get('id') ?? '';
  const result = await remove(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, message: result.emailed });
}

export const GET = withMetrics('operator-orders', handleGet);
export const DELETE = withMetrics('operator-orders', handleDelete);
export const POST = withMetrics('operator-orders', handlePost);
