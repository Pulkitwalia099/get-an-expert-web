# Expert application + Supabase wiring — design

Date: 2026-07-19
Branch base: `v2-next` (work on a feature branch, PR into it)
App: `v2/` (Next.js 16, React 19, Tailwind v4)

## Goal

Add a sticky "Join as an Expert" entry point that opens a warm, quietly selective
application form. Persist submissions to Supabase. Route the existing Waitlist to
the same Supabase project so experts and signups live in one dashboard.

## Decisions (locked)

- Supabase: design the schema here, guide setup separately. Two tables, one project.
- Fields: focused + selective (name, email, expertise, years, links, focus note).
- Entry: sticky pill, top-right, fixed so it stays visible on scroll. Label
  "Join as an Expert".
- Tone: warm and quietly selective.
- Waitlist: switch fully to the Supabase route (option A). One source of truth.
- Application UI: modal overlay, reusing the existing Book-a-demo modal look.

## References

- Toptal: "rigorously tested and vetted", "highly selective", "exclusive network".
- GLG: "Use your expertise to shape the future", "elite global community". Warm
  invitation, intake happens after the click.
- Braintrust: apply, get screened, earn an approved badge.

Pattern adopted: GLG warmth plus a "we keep it small" selectivity signal, in the
site's own voice.

## Architecture

```
Browser form ──POST JSON──▶ Next.js API route (server) ──▶ Supabase
  ExpertApply.tsx            /api/expert-apply             expert_applications
  Waitlist.tsx               /api/waitlist                 waitlist_signups
                                    │
                          SUPABASE_SERVICE_ROLE_KEY
                          (server-only env, never sent to browser)
```

The secret key lives only in the route handler. The browser can only submit the
form. No client-side Supabase key, no public row-level-security surface to lock down.

## Files

| File | New/edit | Purpose |
|---|---|---|
| `lib/supabase.ts` | new | Server-side Supabase client factory (service role key) |
| `lib/validateSubmission.ts` | new | Pure validation helpers (name, email, honeypot). Unit-tested. |
| `app/api/expert-apply/route.ts` | new | Validate, drop honeypot, insert expert application |
| `app/api/waitlist/route.ts` | new | Validate, drop honeypot, insert waitlist signup |
| `components/ExpertApply.tsx` | new | Sticky pill (fixed, top-right) plus application modal |
| `components/Waitlist.tsx` | edit | Point at our `/api/waitlist` (remove ask-a-human endpoint) |
| `app/layout.tsx` | edit | Mount the sticky pill so it shows at every scroll position |
| `lib/validateSubmission.test.ts` | new | Vitest for the validation helpers |
| `docs/.../supabase-setup.md` | new | Click-by-click Supabase steps + table SQL |

## Data model

`expert_applications`

| column | type | notes |
|---|---|---|
| id | uuid | pk, default gen_random_uuid() |
| created_at | timestamptz | default now() |
| name | text | not null |
| email | text | not null |
| expertise | text | not null |
| years_experience | text | select bucket: "0-2", "3-5", "6-10", "10+" |
| links | text | LinkedIn, GitHub, or portfolio (freeform) |
| focus_note | text | "what would you want to work on?" |
| source | text | default 'expert-modal' |

`waitlist_signups`

| column | type | notes |
|---|---|---|
| id | uuid | pk, default gen_random_uuid() |
| created_at | timestamptz | default now() |
| name | text | not null |
| email | text | not null |
| role | text | founder / side-project / engineer / designer-pm / student / other |
| source | text | default 'waitlist' |

Both tables: enable row-level security with no anon policies. The server uses the
service role key, which bypasses RLS. The browser cannot read or write directly.

## Env vars (server-only)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Added to `v2/.env.local` (gitignored) and to the Vercel project `get-an-expert-v2`
for Production and Preview.

## API contract

`POST /api/expert-apply`
Body: `{ name, email, expertise, yearsExperience, links, focusNote, company }`
- `company` is the honeypot. If non-empty, return `{ ok: true }` without inserting.
- Validate: name present, email matches regex, expertise present.
- Insert, return `{ ok: true }` or `{ ok: false, error }` with the right status.

`POST /api/waitlist`
Body: `{ name, email, role, company }`
- Same honeypot and validation pattern.

## Copy (em-dash-free, no AI-language)

- Pill: "Join as an Expert"
- Modal heading: "Join the expert network"
- Sub: "We bring in a small number of people we'd trust with our own work. Tell us
  a little about you and we'll be in touch."
- Field labels: Name / Email / Area of expertise / Years of experience /
  Links (LinkedIn, GitHub, or portfolio) / What would you want to work on?
- Fine print: "We read every application by hand. The network stays small on purpose."
- Submit: "Submit application" (sending: "Sending...")
- Success: "Thank you. We read every application personally and will be in touch.
  We keep the network small on purpose."
- Error: "Could not send your application right now. Please try again in a minute."

## Error handling

- Client: inline validation before submit (name, email, expertise), warm messages,
  disabled button while sending, network-failure fallback message.
- Server: honeypot silently accepted, validation returns 400 with a message,
  Supabase insert failure returns 500 with a generic message (details logged
  server-side only).

## Testing

- `lib/validateSubmission.ts` is pure and unit-tested with Vitest: honeypot drop,
  invalid email rejected, missing required field rejected, valid input passes.
- End-to-end verified manually in `next dev` against a real Supabase project: submit
  both forms, confirm rows land in the two tables.
- Preview deploy on Vercel verified before any merge.

## Constraints

- Next.js 16 has breaking changes. Read `node_modules/next/dist/docs/` for route
  handlers before writing them.
- No direct push to any protected branch. Feature branch, PR into `v2-next`.
- No auto-commit. Nothing is committed until Pulkit says so.
- Grep for em dashes and AI-language before shipping copy.

## Out of scope

- Expert review/approval workflow, dashboards, emails to applicants.
- Auth. This is public intake only.
- Migrating historical waitlist data from the old endpoint.
