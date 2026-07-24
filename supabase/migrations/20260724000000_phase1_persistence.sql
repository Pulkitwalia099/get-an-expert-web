-- Phase 1: persistence for every interaction, including abandoned ones.
--
-- All writes happen in server routes using the secret key, which bypasses
-- Row Level Security. RLS is enabled on every table with no policies, so the
-- publishable key can neither read nor write anything.

-- One row per visitor session, written on the first message.
create table sessions (
  id uuid primary key,
  user_agent text,
  referrer text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  completed boolean not null default false
);

-- Every chat turn, linked to a session. question_no is the number of
-- assistant questions asked before the turn: a user turn with question_no 0
-- answered the static welcome prompt, question_no 1 answered the first
-- assistant question. An assistant turn's question_no is its own ordinal.
create table messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  question_no integer,
  created_at timestamptz not null default now()
);

create index messages_session_id_idx on messages (session_id);

-- One row per expert search. demo means the app fell back to sample
-- profiles because API keys were missing.
create table searches (
  id bigint generated always as identity primary key,
  session_id uuid references sessions (id) on delete cascade,
  brief jsonb not null,
  query text not null default '',
  result_count integer not null default 0,
  latency_ms integer,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index searches_session_id_idx on searches (session_id);

-- The only table holding personal data. session_id is a plain uuid with no
-- foreign key on purpose: leads must be exportable and deletable on their
-- own, independent of session retention.
create table leads (
  id bigint generated always as identity primary key,
  session_id uuid,
  email text not null,
  kind text not null default 'intros' check (kind in ('intros', 'custom')),
  selected jsonb not null default '[]'::jsonb,
  need text,
  brief jsonb,
  consent boolean not null default true,
  created_at timestamptz not null default now()
);

create index leads_email_idx on leads (email);

-- RLS on everywhere, no policies: the publishable key gets nothing.
alter table sessions enable row level security;
alter table messages enable row level security;
alter table searches enable row level security;
alter table leads enable row level security;
