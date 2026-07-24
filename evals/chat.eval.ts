import { writeFileSync } from 'node:fs';
import { afterAll, describe, expect, test } from 'vitest';
import { hasAnthropicKey } from '@/lib/anthropic';
import { systemFor } from '@/lib/prompts';
import {
  deterministicChecks,
  judgeRun,
  renderTranscript,
  runScenario,
  verdictScores,
  type Verdict,
} from './harness';
import { SCENARIOS } from './scenarios';

// LLM conversations vary run to run, so a scenario passes only when both the
// objective checks and the judge agree. Runs cost real API money; this suite
// is `npm run eval`, deliberately separate from `npm test`.

interface Row {
  id: string;
  questions: number;
  done: boolean;
  failures: string[];
  verdict: Verdict | null;
}

const rows: Row[] = [];

// vitest retries replace a scenario's earlier attempt, so the summary table
// shows one final row per scenario.
function pushRow(row: Row): void {
  const i = rows.findIndex((r) => r.id === row.id);
  if (i >= 0) rows.splice(i, 1);
  rows.push(row);
}

if (!hasAnthropicKey()) {
  console.warn('[evals] ANTHROPIC_API_KEY missing, chat evals skipped.');
}

describe.skipIf(!hasAnthropicKey())('chat intake evals', () => {
  for (const scenario of SCENARIOS) {
    test.concurrent(
      `${scenario.flow}: ${scenario.title}`,
      { timeout: 300_000 },
      async () => {
        let run;
        let verdict: Verdict | null = null;
        try {
          run = await runScenario(systemFor(scenario.flow), scenario);
          verdict = await judgeRun(run);
        } catch (err) {
          pushRow({
            id: scenario.id,
            questions: run?.questionsAsked ?? 0,
            done: run?.done ?? false,
            failures: [`harness error: ${err instanceof Error ? err.message : String(err)}`],
            verdict,
          });
          throw err;
        }
        const failures = deterministicChecks(run);
        pushRow({
          id: scenario.id,
          questions: run.questionsAsked,
          done: run.done,
          failures,
          verdict,
        });

        const transcript = renderTranscript(run.messages, run.replies);
        const detail = [
          failures.length > 0 ? `Deterministic failures:\n- ${failures.join('\n- ')}` : '',
          `Judge: ${JSON.stringify(verdict)}`,
          `Transcript:\n${transcript}`,
        ]
          .filter(Boolean)
          .join('\n\n');

        expect(failures, detail).toEqual([]);
        expect(verdict!.pass, detail).toBe(true);
        for (const score of verdictScores(verdict!)) {
          expect(score, detail).toBeGreaterThanOrEqual(4);
        }
      },
    );
  }
});

afterAll(() => {
  if (rows.length === 0) return;
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log('\n=== eval summary ===');
  console.log(
    pad('scenario', 26) + pad('Q', 4) + pad('done', 6) + pad('det', 5) + 'judge r/n/a/t/o pass',
  );
  for (const r of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
    const v = r.verdict;
    const scores = v ? verdictScores(v).join('/') : '-';
    console.log(
      pad(r.id, 26) +
        pad(String(r.questions), 4) +
        pad(r.done ? 'yes' : 'no', 6) +
        pad(r.failures.length === 0 ? 'ok' : String(r.failures.length), 5) +
        `${scores} ${v?.pass ? 'PASS' : 'FAIL'}`,
    );
  }
  const passed = rows.filter((r) => r.failures.length === 0 && r.verdict?.pass).length;
  console.log(`${passed}/${rows.length} scenarios passed`);
  try {
    writeFileSync(
      new URL('./.last-run.json', import.meta.url),
      JSON.stringify(rows, null, 2),
    );
  } catch {
    // Report file is a convenience; never fail the run over it.
  }
});
