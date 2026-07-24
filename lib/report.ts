// Pure aggregation for the daily email. Everything here takes plain data
// and returns text, so the whole report is unit testable without Supabase.

export interface SearchStat {
  demo: boolean;
  result_count: number;
}

export interface EventStat {
  route: string;
  status: number;
  latency_ms: number | null;
}

export interface ReportInput {
  date: string;
  sessions: number | null;
  leads: number | null;
  searches: SearchStat[] | null;
  events: EventStat[] | null;
  serpUsed: number | null;
  serpCap: number;
}

export interface Report {
  subject: string;
  text: string;
  issues: string[];
}

export function p95(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function collectIssues(input: ReportInput): string[] {
  const issues: string[] = [];
  if (input.sessions === null || input.events === null) {
    issues.push('Supabase was unreachable while building this report; numbers may be missing.');
  }
  if (input.sessions === 0) {
    issues.push('Zero traffic yesterday. That usually means the site is broken, not quiet.');
  }
  for (const [route, count] of byRoute5xx(input.events ?? [])) {
    issues.push(`${count} server error${count === 1 ? '' : 's'} on /api/${route}.`);
  }
  const used = input.serpUsed;
  if (used !== null) {
    const ratio = used / input.serpCap;
    if (ratio >= 1) {
      issues.push(
        `SerpAPI monthly quota exhausted (${used}/${input.serpCap}). Searches are serving demo profiles.`,
      );
    } else if (ratio >= 0.9) {
      issues.push(`SerpAPI monthly quota past 90% (${used}/${input.serpCap}).`);
    } else if (ratio >= 0.7) {
      issues.push(`SerpAPI monthly quota past 70% (${used}/${input.serpCap}).`);
    }
  }
  return issues;
}

function byRoute5xx(events: EventStat[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.status >= 500) counts.set(e.route, (counts.get(e.route) ?? 0) + 1);
  }
  return counts;
}

export function buildReport(input: ReportInput): Report {
  const issues = collectIssues(input);
  const searches = input.searches ?? [];
  const demoCount = searches.filter((s) => s.demo).length;
  const events = input.events ?? [];
  const latencies = events
    .map((e) => e.latency_ms)
    .filter((v): v is number => typeof v === 'number');
  const p95Latency = p95(latencies);

  const lines = [
    `Daily report for ${input.date}`,
    '',
    `Sessions: ${input.sessions ?? 'unknown'}`,
    `Leads: ${input.leads ?? 'unknown'}`,
    `Searches: ${input.searches === null ? 'unknown' : searches.length}${
      demoCount > 0 ? ` (${demoCount} demo fallback${demoCount === 1 ? '' : 's'})` : ''
    }`,
    `API requests: ${input.events === null ? 'unknown' : events.length}${
      p95Latency !== null ? `, p95 ${p95Latency} ms` : ''
    }`,
    `SerpAPI quota: ${input.serpUsed ?? 'unknown'}/${input.serpCap} this month`,
    '',
  ];
  if (issues.length === 0) {
    lines.push('No issues.');
  } else {
    lines.push('Issues:');
    for (const issue of issues) lines.push(`- ${issue}`);
  }

  const subject =
    issues.length === 0
      ? `midsesh daily: no issues (${input.date})`
      : `midsesh daily: ${issues.length} issue${issues.length === 1 ? '' : 's'} (${input.date})`;
  return { subject, text: lines.join('\n'), issues };
}
