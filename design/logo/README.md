# The midsesh brand kit

The logo is the seam: an m for midsesh drawn as a handoff. The first arch is
ink, and the second is picked up in terracotta mid-stroke. One letter finished
by two hands. The visible seam at the shared stem is the product itself, the
exact place where your session ends and the expert begins.

## The marks

| File | What it is | Where it goes |
| --- | --- | --- |
| `seam.svg` | The m monogram, light grounds | Everything: favicon, avatars, headers, stickers |
| `seam-on-dark.svg` | The same on ink grounds | Dark surfaces |
| `lockup.svg` | Seam plus the typed wordmark | Headers, email signatures, one-line brand moments |
| `lockup-on-dark.svg` | The lockup on ink | Dark surfaces |

The site renders the mark from `components/SeamMark.tsx`, which draws the ink
arch with `currentColor` so it follows the text color around it. The files
here are the fixed-color exports for use outside the app.

Three places generate the mark rather than importing it, and each has a reason:
`app/icon.svg` is the favicon, `app/opengraph-image.tsx` is the social card, and
the static pages under `public/services/` and `marketplace-preview/hifi/` inline
it because they have no build step to import through. Changing the mark means
changing all of them, which is what the identical path data in each is for.

The social card is drawn with JSX `svg` paths, not an `<img>` holding the same
svg as a data URI. The renderer behind `ImageResponse` silently ignores the
second form and returns a valid png with a hole where the logo should be, so
that card has to be checked by eye rather than by status code.

## Color

The kit uses the site tokens and nothing else.

| Name | Hex | Role |
| --- | --- | --- |
| Ink | `#211E1A` | The first arch, the wordmark, text |
| Paper | `#F6F3ED` | Grounds, and the first arch on dark surfaces |
| Terracotta | `#C4593C` | The second arch, always |
| Terracotta deep | `#A8452C` | Hover and pressed states only |
| Amber | `#D98E28` | Warnings and highlights, never in the logo |

## Type

The wordmark is lowercase `midsesh` in the system stack (SF Pro on Apple
hardware), weight 700, tracking -2%. It is typed, not drawn, so it never
drifts from the UI around it. No title case, no all caps.

## Rules

- The seam is the identity. The second arch is always terracotta, the gap at
  the shared stem is always visible. A one-color m is not the logo.
- The handoff reads left to right: ink first, terracotta second. Never swap
  or mirror the arches.
- Clearspace around the mark is the width of one arch. Minimum size is 14px;
  the strokes close up below that, so drop the mark and use the wordmark
  alone.
- Grounds are paper or ink only. On photography, put the mark in a paper
  circle first (see `app/icon.svg` for the pattern).
- The ✳︎ in the Sonar searching orb is a loading glyph, not the logo. It
  stays terracotta and stays out of brand placements.
