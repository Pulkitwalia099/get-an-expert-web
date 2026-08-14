# One identity, one door, visible everywhere

Order tracking works. What does not work is everything around it: three
surfaces answer "who are you" three different ways, one person can hold two
accounts, and the only sign in offering both doors is a page you can reach only
if you already knew it existed.

Rendered version: https://claude.ai/code/artifact/18fe85f8-fb17-43d4-ad0b-e22f77565945

## Status, 14 Aug 2026

- **P1 done.** `resolveAccount` in `lib/credits.ts` runs before either callback
  signs a session, the merge migration is applied, and
  `accounts_email_key` now makes a second account for one address impossible.
  Verified against production: 0 split addresses, 5 accounts, index present.
- **P4 done.** `midsesh.com` is verified at Resend, `REPORT_FROM` and
  `REPORT_REPLY_TO` are set in Production, and a sign in link was delivered to
  a non-Gmail address. Pranav is no longer blocked.
- **Deliverability follow up.** DKIM at `resend._domainkey.midsesh.com` and a
  `_dmarc` record do not resolve in public DNS. Mail is arriving anyway, so
  this is not urgent, but unsigned mail from a new domain is what lands in
  spam once volume rises. Worth adding both at GoDaddy.
- **P2 next.** There is no `/signin` route, and all six pages in
  `public/services/` link straight at `/api/auth/google`.

## Read this first

`midsesh.com` serves three codebases behind one domain:

| Path | App | Session aware |
|---|---|---|
| `/`, `/about`, `/contact`, `/experts` | marketplace, `github.com/Pulkitwalia099/agon-agent`, cloned at `~/Downloads/agon-agent_2-b3acde98` | No |
| `/services/*.html` | static files in `public/` of this repo | No |
| `/orders`, `/dashboard`, `/api/*` | this repo | Yes |

The rewrites are an explicit list in `next.config.ts` under `beforeFiles`.
**Any redirect to `/` leaves this app.** That is how a working Google sign in
looked broken for days: the callback set the cookie and landed on a page from
another project that never reads it. No error, no 404, no log line.

## Decisions, settled. Do not reopen these.

- **Approving triggers nothing automatic.** No job, no generation, no charge.
  The only thing that changes is what the page shows.
- **Download now, invoice after.** Approve reveals the clean file at once and
  states the amount due with payment details to follow by email.
- **A public download link is acceptable.** Whatever URL is pasted is readable
  by anyone holding it. Accepted deliberately.
- **Sign in links are not single use**, and the window is 30 minutes. A
  forwarded email inside that window signs in whoever opens it. Accepted.
- **The second revision warns and still sends.** No wall.

## Phases

### P1: One account per person

Today email sign in writes `sub = email:<address>` and Google writes its numeric
subject id, so one human who used both doors holds two `accounts` rows. Orders
are unaffected because they are matched on email, but credits hang off `sub` and
split. Pulkit already has two.

- WHEN an address already holds an account and the same address signs in through
  the other door, THE SYSTEM SHALL use that account rather than create a second.
- WHEN two rows already exist for one address, a migration SHALL merge them and
  move every `credit_entries` row onto the survivor.
- WHEN the merge runs twice, the balance SHALL be unchanged, because the ledger
  is summed rather than rewritten.

### P2: One place to sign in

The six static service pages send people straight to Google. Somebody without a
Google account reaches a Google screen and stops. The email door exists on one
page they cannot find.

- WHEN anything says Sign in, it SHALL point at `/signin`, carrying Google and
  email side by side.
- WHEN a visitor arrives with `?next=`, they SHALL be returned there after
  either door, matched against an allowlist the way
  `app/api/auth/email/callback/route.ts` already does.
- WHEN sign in fails, they SHALL land on `/signin` with a reason, never on a
  page with nothing to say. The Google callback's failure branch still goes
  home and is the remaining half of the bug fixed on 14 Aug.

### P3: The marketplace learns who you are

`/api/me` already exists and nothing in the marketplace calls it.

- WHEN the marketplace loads, it SHALL ask `/api/me` once and show either Sign
  in or the address with a link to `/orders`.
- IF that call fails or is slow, the nav SHALL render signed out and never
  block paint.

### P4: Email that reaches customers

**Pulkit's, at GoDaddy.** Resend is in testing mode, so it delivers only to
`pulkitwalia099@gmail.com`. Everything customer facing waits on this.

- WHEN `midsesh.com` is verified at resend.com/domains and `REPORT_FROM` is set,
  a sign in link SHALL be delivered to an address that is not that Gmail.

### P4b: Approve, then download, with nothing in between

Follows from the settled decision. The clean file must exist before approval,
so it is attached when the sample goes out and withheld until they say yes.

- WHEN an operator sends a sample, both the watermarked cut and the clean file
  SHALL be attached in the same move.
- GIVEN the order is `sample_sent`, the clean URL SHALL never appear in the
  page's markup, the same way a locked expert card carries no name.
- WHEN the customer approves, the download SHALL appear immediately, with no
  operator step and nothing automatic fired.
- WHEN they approve, the page SHALL state the amount due and that payment
  details are coming by email.
- WHEN `npm run send` is given one clean file, it SHALL produce the watermarked
  copy with ffmpeg and attach both. ffmpeg is installed.
- IF the encode fails, it SHALL send nothing rather than ship a clean file as
  if it were the sample.

## Already built. Do not rebuild.

- `/orders` list and order page, four step ladder, sample, approve, request
  changes, download.
- Email sign in by signed link (`lib/emailAuth.ts`), with an allowlisted `next`
  so mail can deep link to one order.
- Customer emails on every status worth one (`lib/orderMail.ts`), hooked into
  `advance()` in `~/Programs/get-an-expert-orders` via
  `/api/operator/order-mail`.
- `npm run send` in the orders repo, which refuses a sample with no file.
- Revision counting and the warning.
- Footer and dashboard links to `/orders`, sign out without JavaScript.
- Migration `0002_customer_review.sql`, applied.

## Deliberately not built

No operator UI, no file upload, no threaded chat, no visible event history for
the customer, no payments anywhere in this flow.

## Housekeeping

- Two test orders at `sample_sent`: `b1029c04-c43d-422b-9000-ff79632847a6`
  (Gmail) and `1392593e-e212-466b-9835-73f28a63e9c4` (`+uatest`). Delete when
  done.
- `about-rewrite` contains nothing master lacks. Safe to delete.
- Pranav's real order is `6f863100-0888-45b8-8952-23453eaa490b`,
  `pranav@kroslo.com`, still `new`. He is not a Gmail address, so P4 blocks him.
