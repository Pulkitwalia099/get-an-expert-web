# Supabase setup (about 5 minutes)

This wires the two forms (expert applications + waitlist) to a Supabase database.
Once done, every submission lands in a table you can view and export.

## 1. Create a project

1. Go to https://supabase.com and sign in (free tier is fine).
2. Click **New project**. Give it a name like `get-an-expert`, set a database
   password (save it somewhere), pick a region near you, and create it.
3. Wait about a minute for it to finish provisioning.

## 2. Create the two tables

1. In the left sidebar, open **SQL Editor**.
2. Click **New query**, paste the block below, and hit **Run**.

```sql
create table if not exists expert_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  expertise text not null,
  years_experience text,
  links text,
  focus_note text,
  source text default 'expert-modal'
);

create table if not exists waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  role text,
  source text default 'waitlist'
);

-- Lock both tables down. The website writes with the service role key, which
-- bypasses these policies. With RLS on and no public policy, nobody can read or
-- write the tables from the browser.
alter table expert_applications enable row level security;
alter table waitlist_signups enable row level security;
```

## 3. Copy the two keys

1. In the left sidebar, open **Project Settings** (the gear), then **API**.
2. Copy the **Project URL**.
3. Under **Project API keys**, copy the **`service_role`** secret key.
   (Use `service_role`, not `anon`. The service key is a secret and only ever
   lives on the server.)

## 4. Paste them in two places

**Local (`v2/.env.local`):**

```
SUPABASE_URL=<your Project URL>
SUPABASE_SERVICE_ROLE_KEY=<your service_role key>
```

**Vercel (so the live site works):** open the `get-an-expert-v2` project on
Vercel, go to **Settings > Environment Variables**, and add the same two names
and values for **Production** and **Preview**. Redeploy after saving.

## 5. Check it

- Local: run `npm run dev` in `v2/`, open the site, submit each form, then look
  at the **Table Editor** in Supabase. A new row should appear in each table.
- Live: submit on the Vercel preview URL and confirm the rows land.

## Where the data goes

- **Expert applications** to `expert_applications`.
- **Waitlist signups** to `waitlist_signups`.

View and export both from the Supabase **Table Editor** (Export to CSV).
