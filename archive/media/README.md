# Archived media

Nothing here is served. `public/` is what Vercel deploys, so a file in this
folder costs nothing per request and nothing per deploy, while staying in the
repo and in git history where it can be moved back with one `git mv`.

Four clips, ~23MB, none referenced by any shipped page when they were moved on
2026-08-07:

| File | Why it is here |
|---|---|
| `midsesh-promo.mp4` | 10MB. The original promo. The UGC tile was recut from it as `public/media/ugc-tile.mp4`, at 2.5MB and 16:10. |
| `ugc-sample.mp4` | 10MB. The 9:16 reel the UGC card used before the 16:10 tile replaced it. |
| `reference-1.mp4` | The uncut reference clip. The worked example on the UGC page uses `reference-sync.mp4`. |
| `outcome-1.mp4` | The uncut outcome clip, paired with the above. `outcome-sync.mp4` is the one in use. |

`marketplace-preview/HANDOFF.md` still mentions two of these by name. That file
is a record of what happened, not a manifest, so it was left alone.

To put one back:

```
git mv archive/media/<file> public/services/assets/<file>
```
