# Hero concepts

Static hero directions for the midsesh.com front door. Each file is a
self-contained page sized for a 1440x900 viewport; open it in a browser to see
the exact composition. Fonts load from Google Fonts.

`marketplace/` holds the current round, built for the marketplace pivot
described in `marketplace-preview/HANDOFF.md`: agents do the work, a named
expert owns the outcome, and the three lead SKUs are UGC Ads, LinkedIn
Marketeer and Video Editing. Copy and prices come from the hifi pages, so $29
and $100 per 10k are real and Video Editing stays Price TBD per the honesty
rule.

- `marketplace/a-aurora-split.html` Aurora split. Frozen palette and system
  layout language, "Work, delivered." left, the three SKU cards stacked as the
  right-hand visual with the hook rate floor, a post skeleton and a timeline.
- `marketplace/b-editorial.html` Editorial. Giant serif statement "Agents do
  the work. Experts own the outcome." with a tilted band of SKU cards. NOTE:
  the serif italics deliberately step outside the frozen design system, which
  rejected serif and italics. Shipping this look is a brand decision to make
  on purpose, not by drift.
- `marketplace/c-statement.html` Statement. Fully inside the frozen system:
  the live "Work, delivered." hero at display size, the search bar, and the
  three SKU tiles with their real badges and prices above the fold.

The four files below are the previous round, built for the expert-intro
positioning before the marketplace pivot. Kept for reference.

None of this is wired into the app. These are visual proposals only, to pick a
direction before any React work starts.

- `a-aurora-split.html` Aurora split. The current cream, glass and aurora
  palette kept, headline left, and the live glass chat mid-conversation as the
  right-hand visual, with floating proof chips.
- `b-dark-spotlight.html` Dark spotlight. Warm near-black, dot grid, centered
  statement headline with a gradient, two CTAs, and the product in a glowing
  browser frame tilted in perspective.
- `c-terminal.html` Terminal. Monospace, a fake `midsesh new` session that
  types a request, scans engines, prints three ranked matches with quotes, and
  sends the intro.
- `d-editorial.html` Editorial. Giant Instrument Serif statement on cream, one
  black CTA pill, a facts row, and a tilted band of vetted expert cards
  bleeding off the bottom edge.

Everyone named on a card in these files is invented, same rule as `lib/demo.ts`.
