-- Presence and calls for the "Talk to a human" pill in the chat.
--
-- Same posture as every other table here: RLS on with no policies, so the
-- publishable key can neither read nor write. All access goes through
-- server routes with the secret key.

-- One row per operator. Available means online = true AND expires_at >
-- now(); the expiry is what stops a switch left on overnight from ringing
-- someone at 3am.
create table operator_presence (
  id          text primary key,
  online      boolean not null default false,
  expires_at  timestamptz,
  updated_at  timestamptz not null default now()
);

insert into operator_presence (id) values ('pulkit'), ('rohit');

alter table operator_presence enable row level security;

-- One row per attempt to reach a human, answered or not. The missed rows
-- are the interesting ones: they say how often someone wanted to talk and
-- nobody was there.
create table calls (
  id            uuid primary key,
  session_id    uuid,
  operator_id   text,
  room_url      text,
  status        text not null check (status in ('ringing', 'answered', 'missed', 'ended')),
  summary       text,
  visitor_name  text,
  -- The Telegram message this call rang out on. Stored rather than passed
  -- back by the browser: message ids are small sequential integers, so a
  -- client-supplied one lets anyone rewrite the bot's history.
  telegram_message_id bigint,
  created_at    timestamptz not null default now(),
  answered_at   timestamptz,
  ended_at      timestamptz
);

create index calls_status_idx on calls (status);
create index calls_session_id_idx on calls (session_id);

alter table calls enable row level security;
