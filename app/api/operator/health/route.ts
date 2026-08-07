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

interface TableProbe {
  status: number | null;
  rowCount: number | null;
  error: string | null;
}

interface Report {
  configured: boolean;
  host: string | null;
  tables: Record<string, TableProbe>;
  ids: string[];
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
    tables: {},
    ids: [],
  };

  if (!url || !key) return NextResponse.json(report);

  // sessions predates this work and is written on every chat message. If it
  // answers and operator_presence does not, the credentials and the project
  // are right and the problem is that one table. If neither answers, this is
  // not the project the migration ran in.
  for (const table of ['sessions', 'operator_presence', 'calls']) {
    const probe: TableProbe = { status: null, rowCount: null, error: null };
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=5`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5_000),
      });
      probe.status = res.status;
      const text = await res.text();
      if (!res.ok) {
        probe.error = text.slice(0, 200);
      } else {
        const rows = JSON.parse(text) as Record<string, unknown>[];
        probe.rowCount = Array.isArray(rows) ? rows.length : null;
        if (table === 'operator_presence' && Array.isArray(rows)) {
          report.ids = rows.map((r) => String(r.id));
        }
      }
    } catch (err) {
      probe.error = String(err).slice(0, 200);
    }
    report.tables[table] = probe;
  }

  return NextResponse.json(report);
}

export const GET = withMetrics('operator-health', handleGet);
