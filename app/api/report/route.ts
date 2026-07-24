import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { buildReport, type EventStat, type SearchStat } from '@/lib/report';
import { countRows, rpc, selectRows } from '@/lib/supabase';
import { bumpUsage, monthKey, serpMonthlyCap } from '@/lib/usage';

// Daily monitoring report, hit by the Vercel cron in vercel.json. Vercel
// sends Authorization: Bearer <CRON_SECRET> automatically when the env var
// exists; without the secret configured the route refuses to run at all,
// so it is never protected by obscurity alone.
async function handleReport(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const dayFilter = (column: string): string =>
    `${column}=gte.${start.toISOString()}&${column}=lt.${end.toISOString()}`;

  const [sessions, leads, searches, events, serpUsed] = await Promise.all([
    countRows('sessions', dayFilter('first_seen')),
    countRows('leads', dayFilter('created_at')),
    selectRows<SearchStat>('searches', `select=demo,result_count&${dayFilter('created_at')}`),
    selectRows<EventStat>(
      'api_events',
      `select=route,status,latency_ms&limit=10000&${dayFilter('created_at')}`,
    ),
    bumpUsage(monthKey('serp'), 0),
  ]);

  // Retention runs with the report so it needs no extra scheduler.
  await rpc('purge_expired', {});

  const report = buildReport({
    date: start.toISOString().slice(0, 10),
    sessions,
    leads,
    searches,
    events,
    serpUsed,
    serpCap: serpMonthlyCap(),
  });

  const to = process.env.REPORT_EMAIL ?? '';
  const sent = to
    ? await sendEmail({ to, subject: report.subject, text: report.text })
    : false;
  if (!to) console.warn('[midsesh:report] REPORT_EMAIL not set, report not emailed');
  console.log('[midsesh:report]', JSON.stringify({ sent, issues: report.issues }));

  return NextResponse.json({ ok: true, sent, report: report.text });
}

export const GET = handleReport;
