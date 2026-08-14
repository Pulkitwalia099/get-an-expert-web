# Let a customer see, review and approve the ad they ordered

## Goal

Somebody who ordered a UGC ad can sign in with the email they ordered with, see where their request has got to, watch the sample, ask for changes or approve it, and download the clean file once it is ready.

## Constraints

- The status trail already exists. `mk_orders`, `mk_order_events` and the `mk_orders_current` view are live, and Pranav's request is already a row in them. This reads that, it does not replace it.
- Status stays derived, never stored. Current status is the newest event, the same way credit balance is a sum over `credit_entries`. A stored status column is the one thing this must not add.
- The `mk_` tables belong to `~/Programs/get-an-expert-orders`. Every migration here goes in that repo, not in `supabase/migrations`.
- Two doors, both first class: Google, or an address proved by opening a link sent to it. An email is trusted only when it has been proved, never because somebody typed it.
- `RESEND_API_KEY` becomes load bearing. Without it the email door is not rendered and its routes answer 503, matching every other optional key here.
- The page lives in `get-an-expert-web`, because auth, the session cookie and Supabase access are all already here. Moving sign in to the marketplace project is what `next.config.ts` says explicitly not to do.
- Six runtime dependencies. Nothing here adds a seventh.
- The UGC page itself lives in `github.com/Pulkitwalia099/agon-agent`, a separate Vite project rewritten in at the apex, so T8 is a change over there.
- No em dashes in anything a customer reads.

## Non-goals

- No payments. The $29 is taken outside this flow and stays outside it.
- No file upload. An operator pastes a URL and the page links to it.
- No threaded chat. One comment box attached to one action.
- No operator UI. Statuses keep moving through the scripts in the orders repo.
- Nothing here touches `lib/prompts.ts`, the model, `sanitizeReply` or the question budget, so the eval gate in CLAUDE.md does not apply.

## Tasks

- **T1: Two new statuses, one migration.**
  - WHEN the migration adds `sample_sent` and `approved` to the `mk_order_events` status check, THE SYSTEM SHALL accept events carrying either value and still accept `new`, `working`, `delivered`, `declined` and `refunded`.
  - GIVEN an order with no events at all, THE SYSTEM SHALL still read as `new` through `mk_orders_current`.
  - WHEN the migration file is run a second time against the same database, THE SYSTEM SHALL complete without error and change nothing.
- **T2: Sign in by email, with no password.**
  - WHEN an address is submitted, THE SYSTEM SHALL email a link carrying an HMAC of that address and an expiry, signed with `SESSION_SECRET`, reusing the helpers in `lib/quotes.ts`.
  - WHEN a valid link is opened, THE SYSTEM SHALL create or find the account, set the session cookie, and redirect so the token leaves the address bar.
  - IF the signature fails or the link is over 15 minutes old, THE SYSTEM SHALL say so plainly and offer to send another.
  - WHEN any address is submitted, THE SYSTEM SHALL answer identically whether or not it has an order, so the form cannot be used to test who is a customer.
  - WHEN one address or one client asks more than five times in an hour, THE SYSTEM SHALL answer 429 and send no mail.
  - IF no email key is configured, THE SYSTEM SHALL not render the email door and SHALL answer 503 from its routes.
- **T3: The list page reads an account's orders.**
  - WHEN a signed in visitor opens `/orders`, THE SYSTEM SHALL list every `mk_orders_current` row whose email equals the session's proved email, lowercased, newest first.
  - GIVEN the same address signed in by Google once and by email once, THE SYSTEM SHALL show both sessions the same orders, because orders are found by email rather than by account.
  - WHEN that email matches no row, THE SYSTEM SHALL render an empty state naming the email it searched and one way to reach a human.
  - WHEN Supabase is unreachable, THE SYSTEM SHALL render an error state and never a stack trace.
  - IF the visitor is signed out, THE SYSTEM SHALL show the two doors rather than an error page.
  - WHEN the page is requested, THE SYSTEM SHALL render it dynamically and never cache or prerender it, because every row belongs to one account.
- **T4: One order, four steps, read only.**
  - WHEN a customer opens an order they own, THE SYSTEM SHALL render four steps, Received, In progress, Sample ready and Done, with the current one marked.
  - GIVEN the order is `new` or `working`, THE SYSTEM SHALL show the brief that was submitted and no actions.
  - IF the order's email is not the session's email, THE SYSTEM SHALL answer 404 rather than 403, so the page cannot confirm an order exists.
- **T5: An event can carry a file link.**
  - WHEN a `sample_sent` or `delivered` event is written, THE SYSTEM SHALL store an optional `asset_url` on that event row.
  - GIVEN an order with two `sample_sent` events, THE SYSTEM SHALL treat the newest as the current sample and leave the earlier row readable.
  - IF an `asset_url` is not an `https` URL, THE SYSTEM SHALL reject the write rather than store a link a browser will refuse to open.
- **T6: The sample, the approval, the download.**
  - GIVEN the newest event is `sample_sent` with an `asset_url`, THE SYSTEM SHALL show the sample and exactly two actions, Approve and Request changes.
  - GIVEN the newest event is `approved`, THE SYSTEM SHALL say the clean file is being prepared and offer no download.
  - GIVEN the newest event is `delivered` with an `asset_url`, THE SYSTEM SHALL show a Download control pointing at it.
  - GIVEN the newest event is `declined` or `refunded`, THE SYSTEM SHALL show that status and offer no actions.
- **T7: Approve and request changes.**
  - WHEN a customer submits Request changes with a comment, THE SYSTEM SHALL append a `working` event whose note is the comment and whose actor names the customer.
  - WHEN a customer submits Approve, THE SYSTEM SHALL append an `approved` event.
  - IF the session's email does not match the order's email, THE SYSTEM SHALL answer 403 and write nothing.
  - WHEN Approve is submitted twice, THE SYSTEM SHALL leave the visible status as approved and show the customer no error.
  - IF a comment is empty, THE SYSTEM SHALL answer 400 and write nothing.
  - WHEN a comment is longer than 2,000 characters, THE SYSTEM SHALL store the first 2,000 rather than reject the submission.
  - WHEN either action succeeds, THE SYSTEM SHALL email the operator address already used by `/api/signup`.
  - WHEN either action is submitted more than ten times from one client in a window, THE SYSTEM SHALL answer 429 using the limiter already in `lib/ratelimit.ts`.
- **T8: Ask for an account at the moment somebody orders.**
  - WHEN a visitor submits the UGC form on the marketplace, THE SYSTEM SHALL confirm the submission and offer to follow the order with the address they just typed.
  - WHEN they take that offer, THE SYSTEM SHALL send the sign in link to that address without asking them to type it twice.
  - IF they ignore the offer, THE SYSTEM SHALL still record the order exactly as it does today.
  - WHEN an order is marked `sample_sent`, THE SYSTEM SHALL link the notification email straight to that order and sign them in on arrival, using the same signed link as T2.
- **T9: Tests, at the places this can fail quietly.**
  - WHEN the test suite runs, tests SHALL pass asserting that an order belonging to one email is never returned for a session holding a different email.
  - WHEN the test suite runs, tests SHALL pass asserting that a sign in link signed for one address does not verify for another, that an expired one does not verify at all, and that a tampered expiry does not extend a link's life.
  - WHEN the test suite runs, tests SHALL pass asserting the column list written to `mk_order_events`, the way `lib/__tests__/marketplaceOrders.test.ts` already pins `mk_orders`.
  - WHEN this merges, `npm test` and `npm run build` both pass clean.

## Tradeoffs

- What the email door actually checks:
  - A signed link, no password: nothing stored, nothing to leak, no new dependency, and it deletes the separate per order link this plan used to need. A link forwarded inside its 15 minute window signs in whoever opens it, because single use would need a table to remember spent tokens.
  - Email and password: familiar and instant on a repeat visit, at the cost of a hash, a table, a forgot password flow that is itself an emailed link, and a credential worth stealing. Roughly twice the work for the same access.
  - A six digit code typed into the page: cannot be forwarded usefully and stays on the device that asked, at the cost of a table holding live codes and their attempt counts, which is the storage the link avoids.
- How a customer's comment is recorded:
  - As a `working` event whose note is the comment: one trail, no new table, and the order lands back in the operator queue on its own. "Not started" and "changes asked for" then look identical in a status filter and differ only by reading the note.
  - As a third new status, `revising`: reads correctly in the queue, at the cost of another value in the check constraint and a fifth state the customer ladder has to explain or hide.
  - As a separate `mk_order_comments` table: opens the door to real threads later, at the cost of a second answer to "what happened to this order", which is the exact split this schema was built to avoid.
- How an account finds the orders it owns:
  - Query `mk_orders_current` by the session's verified email on every load: no claim step, no new column, correct the first time somebody signs in. Changing your Google email changes what you can see.
  - Write a `sub` onto `mk_orders` the first time an account matches, the way `claimMatchSet` does: survives an email change, at the cost of a migration on a table this repo does not own plus a race between two tabs claiming one row.
- What the four steps are called:
  - Received, In progress, Sample ready, Done: plain, and "Done" covers approved and downloaded without needing a fifth box.
  - Received, Making it, Your review, Yours: warmer, and "Your review" says whose turn it is, which is the one thing a status page exists to answer.

## Risks and unknowns

- Should a sign in link be single use? It costs one small table to remember spent tokens. Without it, a link forwarded inside 15 minutes works for whoever opens it.
- Unknown: nothing in `~/Programs/get-an-expert-orders/lib/orders.ts` passes an `asset_url` today, so `advance()` needs a change in that repo as well as the migration. How much work is that?
- Does approving need to trigger anything automatic, or is it only the signal for you to send the clean file by hand?
- Unknown: preview deploys carry no Supabase keys, because they are Production only variables. Where does this get verified before it reaches production, given the rule is to prove it on staging first?
- The download is a link to whatever host you paste, so anyone holding that URL has the clean file and nothing on our side can take it back. Is that acceptable?
- Three repos write to one Postgres and only the table prefix warns anybody. Adding a column to `mk_order_events` from a plan that lives in the web repo is exactly the change that breaks the other two silently.

## Milestones

- **M1: He can see it.** T1, T2, T3 and T4. Pranav signs in and finds his UGC request with its real status. Nothing is writable, and nothing in the operator flow has to change for this to be true.
- **M2: He can answer it.** T5, T6 and T7. The sample plays, Approve and Request changes work, the download appears once the clean file is attached.
- **M3: Everybody else gets in.** T8, in the marketplace repo. The UGC page starts asking people to follow their order with the address they just typed.
- **M4: It stays correct.** T9, with `npm test` and `npm run build` green before anything merges.
