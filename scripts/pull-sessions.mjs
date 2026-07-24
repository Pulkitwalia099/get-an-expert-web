#!/usr/bin/env node
// Prints the most recent chat sessions as readable transcripts, straight
// from Supabase. This is the first thing to run when someone says "the chat
// felt off": read what real visitors actually experienced.
//
//   SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run sessions
//   npm run sessions -- 25        # more than the default 10
//
// Or put both keys in .env.local (this script reads it too).

import { readFileSync } from 'node:fs';

try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch {
  // .env.local is optional; env vars may come from the shell.
}

const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const key = process.env.SUPABASE_SECRET_KEY;
const limit = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 10;

if (!url || !key) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SECRET_KEY.\n' +
      'Grab both from the Vercel project env (or Supabase dashboard) and either\n' +
      'export them or add them to .env.local, then rerun npm run sessions.',
  );
  process.exit(1);
}

async function fromRest(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.error(`Supabase ${res.status} on ${path}: ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
}

const sessions = await fromRest(
  `sessions?select=*&order=first_seen.desc&limit=${limit}`,
);
if (sessions.length === 0) {
  console.log('No sessions recorded yet.');
  process.exit(0);
}

const ids = sessions.map((s) => `"${s.id}"`).join(',');
const messages = await fromRest(
  `messages?select=*&session_id=in.(${ids})&order=created_at.asc`,
);
const bySession = new Map();
for (const m of messages) {
  const list = bySession.get(m.session_id) ?? [];
  list.push(m);
  bySession.set(m.session_id, list);
}

for (const s of sessions) {
  const flags = [
    s.flow ? `flow=${s.flow}` : null,
    s.demo ? 'DEMO MODE' : null,
    s.completed ? 'completed' : 'dropped off',
  ]
    .filter(Boolean)
    .join(' · ');
  console.log(`\n━━━ ${s.first_seen}  ${s.id.slice(0, 8)}  ${flags}`);
  if (s.referrer) console.log(`    referrer: ${s.referrer}`);
  const turns = bySession.get(s.id) ?? [];
  if (turns.length === 0) console.log('    (no messages)');
  for (const t of turns) {
    const who = t.role === 'user' ? 'visitor  ' : 'assistant';
    console.log(`    ${who} ${t.content}`);
  }
}

const demoCount = sessions.filter((s) => s.demo).length;
console.log(
  `\n${sessions.length} sessions, ${demoCount} in demo mode, ` +
    `${sessions.filter((s) => s.completed).length} completed.`,
);
