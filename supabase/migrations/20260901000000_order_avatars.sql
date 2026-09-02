-- The faces we generated for a brand, and the one that got the job.
--
-- Named `order_avatars` rather than `mk_order_avatars` on purpose. The orders
-- repo owns every `mk_` table; this one is written and read here, so it sits in
-- this repo's own namespace alongside `accounts` and `match_sets`.
--
-- Append mostly, edited rarely. A row is a candidate face that was actually
-- generated for this brand, never a face invented afterwards to pad a lineup:
-- the section this feeds tells a client "here is what we evaluated", and that
-- sentence is only worth printing while it is true.

create table if not exists public.order_avatars (
  id           bigserial primary key,
  order_id     uuid        not null,
  -- Stable handle for one face within an order. Used in URLs and as the
  -- dedupe key, so it is ours and lowercase.
  slug         text        not null,
  -- What we call this face. A persona name, not the performer: nobody real is
  -- depicted, and naming it after a person would imply somebody was cast.
  name         text        not null,
  -- The register it plays, one line. "Phone-shot UGC, Hinglish".
  kind         text,
  -- A still. Required: a lineup with a missing face is worse than no lineup.
  image_url    text        not null,
  -- An optional few seconds of it moving. A still cannot show a delivery.
  clip_url     text,
  -- Why this one carries the brand, or why it did not. Ours, and the page
  -- labels it as ours, for the same reason `reads` is split from `story` on a
  -- candidate: the read is our reasoning and must not read as the brand's.
  note         text,
  -- Exactly one per order should be true. Not enforced as a constraint,
  -- because a lineup mid-edit with none picked is a normal intermediate state
  -- and a failed insert here would be a worse outcome than a page that shows
  -- no badge for a moment.
  picked       boolean     not null default false,
  position     integer     not null default 0,
  created_at   timestamptz not null default now(),

  constraint order_avatars_slug_shape check (slug ~ '^[a-z0-9-]{1,32}$'),
  constraint order_avatars_one_per_slug unique (order_id, slug)
);

create index if not exists order_avatars_by_order
  on public.order_avatars (order_id, position);

-- Read with the service key from a server route only. No anon path exists, so
-- RLS on with no policy is the honest setting: it denies the anon and
-- authenticated roles outright rather than leaving the table open the way
-- `mk_order_candidates` currently is.
alter table public.order_avatars enable row level security;
