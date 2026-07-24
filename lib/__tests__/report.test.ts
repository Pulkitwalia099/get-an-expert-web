import { describe, expect, it } from 'vitest';
import { buildReport, p95, type ReportInput } from '../report';

const CLEAN: ReportInput = {
  date: '2026-07-23',
  sessions: 12,
  leads: 3,
  searches: [
    { demo: false, result_count: 9 },
    { demo: true, result_count: 3 },
  ],
  events: [
    { route: 'chat', status: 200, latency_ms: 300 },
    { route: 'search', status: 200, latency_ms: 900 },
  ],
  serpUsed: 40,
  serpCap: 250,
};

describe('p95', () => {
  it('picks the 95th percentile', () => {
    expect(p95([])).toBeNull();
    expect(p95([100])).toBe(100);
    const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(p95(hundred)).toBe(95);
  });
});

describe('buildReport', () => {
  it('says no issues plainly on a quiet healthy day', () => {
    const report = buildReport(CLEAN);
    expect(report.issues).toEqual([]);
    expect(report.subject).toContain('no issues');
    expect(report.text).toContain('No issues.');
    expect(report.text).toContain('Sessions: 12');
    expect(report.text).toContain('1 demo fallback');
    expect(report.text).toContain('p95 900 ms');
  });

  it('flags zero traffic as a problem, not quiet', () => {
    const report = buildReport({ ...CLEAN, sessions: 0 });
    expect(report.issues.some((i) => i.includes('Zero traffic'))).toBe(true);
    expect(report.subject).toContain('1 issue');
  });

  it('flags an unreachable Supabase', () => {
    const report = buildReport({ ...CLEAN, sessions: null, events: null });
    expect(report.issues.some((i) => i.includes('unreachable'))).toBe(true);
    expect(report.text).toContain('Sessions: unknown');
  });

  it('counts 5xx per route', () => {
    const report = buildReport({
      ...CLEAN,
      events: [
        { route: 'chat', status: 502, latency_ms: 80 },
        { route: 'chat', status: 500, latency_ms: 90 },
        { route: 'search', status: 200, latency_ms: 700 },
      ],
    });
    expect(report.issues).toContainEqual('2 server errors on /api/chat.');
  });

  it('warns at 70 and 90 percent of the SerpAPI quota and at exhaustion', () => {
    expect(
      buildReport({ ...CLEAN, serpUsed: 176 }).issues.some((i) => i.includes('past 70%')),
    ).toBe(true);
    expect(
      buildReport({ ...CLEAN, serpUsed: 226 }).issues.some((i) => i.includes('past 90%')),
    ).toBe(true);
    expect(
      buildReport({ ...CLEAN, serpUsed: 250 }).issues.some((i) => i.includes('exhausted')),
    ).toBe(true);
    expect(buildReport({ ...CLEAN, serpUsed: 100 }).issues).toEqual([]);
  });
});
