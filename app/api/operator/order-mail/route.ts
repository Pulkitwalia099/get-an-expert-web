import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { isAuthorised } from '@/lib/operatorAuth';
import { isOrderStatus } from '@/lib/order-status';
import { notifyCustomer } from '@/lib/orderMail';
import { countRows, selectRows } from '@/lib/supabase';

// Called by advance() in ~/Programs/get-an-expert-orders after it writes a
// status event, so the customer hears about it.
//
// It lives here rather than in that repo because the mail carries a sign in
// link signed with SESSION_SECRET, and a signing secret should exist in one
// place. Behind OPERATOR_SECRET, which that repo already needs for nothing
// else today, so this is its first use over there.
//
// Deliberately takes an order id and nothing else about the customer. The
// address and the service are read here from the row, so a caller cannot mail
// an arbitrary address by asking, and a wrong id sends nothing rather than
// sending to whoever was named in the request.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Row {
  id: string;
  email: string;
  service_name: string | null;
  brief: string | null;
  status: string;
}

async function handlePost(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
  if (!UUID.test(orderId)) {
    return NextResponse.json({ error: 'Bad order id' }, { status: 400 });
  }

  const rows = await selectRows<Row>(
    'mk_orders_current',
    // brief is read for the confirmation email, which shows somebody what
    // they asked for rather than only naming the service they picked.
    `select=id,email,service_name,brief,status&id=eq.${orderId}&limit=1`,
  );
  if (!rows) return NextResponse.json({ error: 'Cannot read the order' }, { status: 502 });
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const row = rows[0];
  // The status is read back from the row rather than taken from the request.
  // The caller has just written the event, so the view is the truth, and this
  // way a retry cannot mail a status the order is no longer in.
  if (!isOrderStatus(row.status)) {
    return NextResponse.json({ result: 'skipped', reason: 'unknown status' });
  }

  // Whether this address has ordered before, asked only for the confirmation
  // that says so. The order being confirmed is already written, so one row is
  // a first order. A count that cannot be read comes back null and is treated
  // as "not their first": thanking a returning customer for joining us reads
  // worse than not thanking a new one.
  const orderCount =
    row.status === 'new'
      ? await countRows('mk_orders_current', `email=eq.${encodeURIComponent(row.email)}`)
      : null;

  const result = await notifyCustomer({
    orderId: row.id,
    email: row.email,
    status: row.status,
    serviceName: row.service_name,
    brief: row.brief,
    firstOrder: orderCount === 1,
    afterChanges: payload.afterChanges === true,
  });

  // Reported, not thrown. The status change already happened and is correct;
  // this only says whether the customer heard about it.
  return NextResponse.json({ result });
}

export const POST = withMetrics('operator-order-mail', handlePost);
