# Archived pages

Nothing here is served. Next.js routes what is under `app/`, and Vercel deploys
what is under `public/`, so a file in this folder costs nothing per request and
nothing per deploy while staying in the repo and in git history.

Six page groups, moved on 2026-08-14. Every one of them was orphaned by at
least two independent signals: no page linked to it, and it drew almost no
visitors in the 90 days before the move.

| Page | Visitors, 90d | Why it is here |
|---|---|---|
| `experts/` | unreachable | The `beforeFiles` rewrite in `next.config.ts` sends `/experts` to the marketplace, which wins. This file had not rendered for anyone since that rewrite shipped. The live page is titled "Partner with us"; this one says "Become an expert". |
| `stuck/` | 0 | The dev chat for people stuck mid AI coding session. No inbound links. |
| `chat/` | 1 | The same chat shell asking the general intake question. Reached only from the empty state on `/dashboard`, which now points at `/ask`. |
| `setups/` | 12 | A redirect to `/get`. See the note below, because this path is still live as a config redirect. |
| `get/` | 1 | The setups product: an agent sets up an AI tool on your laptop on a 15 minute call. Retired as a product on 2026-08-14. |
| `../static/classic/` | not measured | The original MCP install pitch, three HTML files and their assets. Its `/classic` rewrite came out of `vercel.json`, and the waitlist form's cross origin allowance came out of the CSP. |

## `/setups` still answers, and should

The two pages are gone but the path is not. `app/setups/page.tsx` carried a note
that the URL is printed in Reddit and Instagram posts that are still up, and it
drew 49 views in its last 90 days. Those are people arriving on a link we
published ourselves, so a 404 would be our fault rather than theirs.

`/setup` and `/setups` are now temporary redirects to `/` in `next.config.ts`.
They stay temporary because that destination has already moved twice, and a
permanent redirect is cached by the browser and close to impossible to take back.

## What came out with them

- `vercel.json`: the `/classic` rewrite.
- `next.config.ts`: the `WAITLIST_API` origin in `connect-src`, which existed
  only for the `/classic` waitlist form.
- `lib/__tests__/securityHeaders.test.ts`: that origin is now asserted absent
  rather than present.
- `components/SiteFooter.tsx`: the Setups link.
- `app/dashboard/page.tsx`: the empty state now points at `/ask`.

## Still here, deliberately

`components/setups/` and `lib/setups.ts` were not moved. `lib/packs.ts` and two
test files still reach into them, so untangling that is its own change rather
than a side effect of this one. The TikTok origin in `frame-src` stays for the
same reason.

## To put one back

```
git mv archive/pages/stuck app/stuck
```

For `classic`, restore the directory and its rewrite together, or the page will
answer at `/classic/index.html` and 404 at `/classic`:

```
git mv archive/static/classic public/classic
```
