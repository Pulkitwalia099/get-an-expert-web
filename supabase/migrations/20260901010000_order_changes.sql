-- What we did about each thing they asked for.
--
-- One row per request, tied to the version that answered it. Written by us, in
-- our words, and deliberately not derived from their note: turning three
-- paragraphs of somebody's feedback into three ticks is an editorial act, and a
-- parser guessing at it would tick things nobody did.
--
-- `done` exists because the honest answer is sometimes no. A round where two of
-- three landed has to be able to say so, and a list that can only tick is a
-- list a client stops believing the first time it is wrong.
--
-- Their exact words stay where they were, on the `working` event. This never
-- replaces them, it sits above them, and the page keeps both.

create table if not exists public.order_changes (
  id           bigserial primary key,
  order_id     uuid        not null,
  -- Which cut answered it, matching RevisionCut.version, so a second round's
  -- list cannot render against the first round's cut.
  version      integer     not null,
  -- What we did, one line, their side of it rather than ours. "Call to action
  -- added", not "re-rendered frames 6 and 7".
  text         text        not null,
  -- False for something asked for and not done. The page says so plainly.
  done         boolean     not null default true,
  -- Why it is not done, when it is not. Ignored while `done` is true.
  note         text,
  position     integer     not null default 0,
  created_at   timestamptz not null default now(),

  constraint order_changes_version_positive check (version > 0),
  constraint order_changes_one_per_slot unique (order_id, version, position)
);

create index if not exists order_changes_by_order
  on public.order_changes (order_id, version, position);

-- Read with the service key from a server route only, same as order_avatars.
alter table public.order_changes enable row level security;
