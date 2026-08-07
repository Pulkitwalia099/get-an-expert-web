# The midsesh brand kit

The logo is Sesh, a sea otter floating on its back holding a terracotta
asterisk called the spark. Sea otters are the Bay's animal and the one marine
mammal that uses tools: a rock on the chest, a shell opened. That is the
product in one picture. A human, equipped, arriving calmly in the middle of
your current.

## The marks

| File | What it is | Where it goes |
| --- | --- | --- |
| `sesh.svg` | Full Sesh, floating, holding the spark | Hero placements, socials, stickers, anything 32px tall or larger |
| `sesh-head.svg` | Sesh's head with the spark, square | Favicon, avatars, the titlebar dot, anything under 32px |
| `spark.svg` | The terracotta asterisk alone | Bullets, the Sonar loading orb, small accents in text |
| `lockup.svg` | Head mark plus the wordmark | Headers, email signatures, one-line brand moments |

Each mark has an `-on-dark` twin for ink grounds. The site renders the head
mark from `components/SeshMark.tsx`, which uses `currentColor` so it follows
the text color it sits in; these files are the fixed-color exports for use
outside the app.

## Color

The kit uses the site tokens and nothing else.

| Name | Hex | Role |
| --- | --- | --- |
| Ink | `#211E1A` | Sesh's fur, the wordmark, text |
| Paper | `#F6F3ED` | Grounds, and the muzzle and eyes on light marks |
| Terracotta | `#C4593C` | The spark, links, the accent everywhere |
| Terracotta deep | `#A8452C` | Hover and pressed states only |
| Amber | `#D98E28` | Warnings and highlights, never in the logo |

## Type

The wordmark is lowercase `midsesh` in the system stack (SF Pro on Apple
hardware), weight 700, tracking -2%. It is typed, not drawn, so it never
drifts from the UI around it. No title case, no all caps, no rename of the
mascot in copy: Sesh is Sesh.

## Rules

- The spark is Sesh's tool. It is always terracotta, and Sesh always holds it
  in full-body placements. A Sesh with empty paws is off-brand.
- Never flip Sesh to face right. The otter floats leftward, reading toward
  the text that follows.
- Do not add water, bubbles, sunglasses, or hats to production marks. Fan art
  and launch memes are exempt, that is what a mascot is for.
- Clearspace around any mark is the height of the spark on that mark. Minimum
  sizes: full Sesh 32px tall, head mark 14px, below that use the spark.
- Sesh appears on paper or ink grounds only. On photography, put the mark in
  a paper circle first (see `app/icon.svg` for the pattern).
- No copy may describe Sesh as an AI or the logo as a robot. The whole point
  of the animal is the human holding the tool.
