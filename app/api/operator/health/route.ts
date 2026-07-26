import { NextRequest, NextResponse } from 'next/server';
import { withMetrics } from '@/lib/metrics';
import { isAuthorised } from '@/lib/operatorAuth';

// Why the switches are not moving, answered without guessing.
//
// readPresence collapses two very different failures into the same answer:
// a request that failed, and a request that succeeded but matched nothing.
// This reports the raw shape so they can be told apart, and names the
// Supabase host so a wrong project is obvious. Behind the operator secret,
// because it describes internal wiring.

interface Report {
  configured: boolean;
  host: string | null;
  status: number | null;
  rowCount: number | null;
  ids: string[];
  body: string | null;
}

async function handleGet(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SECRET_KEY;

  const report: Report = {
    configured: Boolean(url && key),
    host: url ? new URL(url).host : null,
    status: null,
    rowCount: null,
    ids: [],
    body: null,
  };

  if (!url || !key) return NextResponse.json(report);

  try {
    const res = await fetch(`${url}/rest/v1/operator_presence?select=id,online,expires_at`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5_000),
    });
    report.status = res.status;
    const text = await res.text();

    if (!res.ok) {
      // The message matters here. A stale PostgREST schema cache says the
      // relation does not exist even though the table is right there.
      report.body = text.slice(0, 300);
      return NextResponse.json(report);
    }

    const rows = JSON.parse(text) as { id: string }[];
    report.rowCount = Array.isArray(rows) ? rows.length : null;
    report.ids = Array.isArray(rows) ? rows.map((r) => r.id) : [];
  } catch (err) {
    report.body = String(err).slice(0, 300);
  }

  return NextResponse.json(report);
}

export const GET = withMetrics('operator-health', handleGet);
