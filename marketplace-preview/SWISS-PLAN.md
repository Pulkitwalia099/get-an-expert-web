# Rebuild the marketplace preview in Swiss Industrial

## Goal

Every page in `marketplace-preview/hifi/` reads as one deliberate Swiss
Industrial Print interface instead of the warm cream and terracotta system,
without changing a single price, promise or piece of copy.

## Constraints

- **The design freeze is lifted for this work only, and only because the user
  said so on 2026-08-06.** The HARD RULE in `HANDOFF.md` section 0 stays in
  force for everything it does not cover. Once the new system is locked, it is
  frozen the same way the old one was.
- Source of truth for the language is `taste-skill/skills/brutalist-skill/SKILL.md`,
  section 2.1 Swiss Industrial Print and sections 3 to 8. Read it before writing
  any CSS. Clone from github.com/leonxlnx/taste-skill.
- The skill says pick ONE substrate and commit. We picked the **light** one.
  Tactical Telemetry, the dark CRT variant, is out of scope entirely.
- Copy rules are unchanged: no em dashes, no exclamation marks, no hype words,
  no italics.
- Anything marked TBD stays visibly marked.
- Nothing deploys. This folder stays a static preview.
- The UGC offer shipped in `710b988`: the $29 first ad, the packs, the 30% hook
  rate promise, the five real sample videos, the worked example. All of that
  content is settled and must survive the redesign untouched.

## Non-goals

- Not the Next.js port. That is still Phase E and unaffected.
- Not a copy rewrite. If a headline has to change to fit uppercase macro type,
  that is a flag for the user, not a decision to make alone.
- Not the dark Tactical Telemetry variant.
- Not resolving any TBD price. Those are still section 7 questions.
- Not touching the live site.

## Tasks

- **T1: Replace the token block.**
  - WHEN the new `:root` block is written, THE SYSTEM SHALL define ground
    `#F4F4F0`, foreground `#050505`, surface `#FFFFFF`, and hazard red
    `#E61919` as the only accent.
  - GIVEN any page in `hifi/`, THE SYSTEM SHALL contain zero references to
    `#F6F3ED`, `#C4593C`, `#9E3F24`, or the three aurora radial gradients.
  - GIVEN the old `--radius-card` token, THE SYSTEM SHALL remove it, because
    the language forbids border radius entirely.

- **T2: Build the two-tier type system.**
  - WHEN a page headline renders, THE SYSTEM SHALL use a heavy grotesk at
    weight 900, uppercase, tracking between -0.03em and -0.06em, and leading
    between 0.85 and 0.95.
  - WHEN metadata, navigation, labels, badges or table headers render, THE
    SYSTEM SHALL use a monospace face at 10px to 14px, uppercase, tracking
    between 0.05em and 0.1em.
  - GIVEN a macro headline, THE SYSTEM SHALL size it with `clamp()` so it
    scales aggressively without breaking layout between 320px and 1440px.
  - WHEN fonts are chosen, THE SYSTEM SHALL self host them rather than link a
    CDN, and SHALL record the licence in this file.

- **T3: Strip the old material system.**
  - GIVEN any element, THE SYSTEM SHALL have no `border-radius` other than 0.
  - GIVEN any element, THE SYSTEM SHALL have no `box-shadow`, no gradient fill,
    and no translucent glass surface.
  - WHEN a boundary is needed, THE SYSTEM SHALL draw a solid 1px or 2px rule
    rather than a shadow or a tint.

- **T4: Rebuild the layout on a blueprint grid.**
  - WHEN a multi-item group renders, THE SYSTEM SHALL use `display:grid` with
    `gap:1px` over a contrasting parent background so dividing lines are
    produced by the grid rather than by per-child borders.
  - GIVEN a page, THE SYSTEM SHALL alternate between dense monospace data
    clusters and large areas of negative space framing the macro type, rather
    than repeating one card rhythm.
  - GIVEN any section boundary, THE SYSTEM SHALL use a full width rule.

- **T5: Resolve the single accent conflict.**
  - GIVEN hazard red is the only permitted accent, THE SYSTEM SHALL decide in
    writing what happens to the amber TBD marker, the green ready and qualified
    states, and the LinkedIn blue dot, before any page is converted.
  - WHEN a status needs to be distinguished without colour, THE SYSTEM SHALL
    use a mono label, a rule weight, or an ASCII frame instead.

- **T6: Convert the shared components.**
  - WHEN a badge, chip, button, input, card, FAQ row or price table renders,
    THE SYSTEM SHALL use the square, ruled, uppercase treatment rather than the
    pill and glass treatment.
  - WHEN the honesty badges render, THE SYSTEM SHALL keep the exact strings
    `AGENT` and `HUMAN + AGENT`, since those are a positioning commitment and
    not a style choice.

- **T7: Decide the emoji question.**
  - GIVEN the four how it works cards currently use emoji at the user's
    explicit request, THE SYSTEM SHALL either keep them or replace them with
    mono markers, and SHALL NOT change them without the user saying so.

- **T8: Convert the pages in a fixed order.**
  - WHEN the first page is converted, THE SYSTEM SHALL convert `voice.html`
    first and stop for user approval before touching anything else.
  - GIVEN approval, THE SYSTEM SHALL then convert `index.html`, then the four
    remaining detail pages, and SHALL convert `ugc.html` last.

- **T9: Absorb the audit findings that survive.**
  - GIVEN the redesign sets radius to 0 and section heads to left aligned,
    THE SYSTEM SHALL treat audit items 03 and 04 as resolved by the language.
  - WHEN the conversion is done, THE SYSTEM SHALL still have applied item 01
    (at most one eyebrow per three sections), item 02 (a consolidated type
    ramp with no near duplicate steps), and item 05 (no em dash in the price
    placeholder).
  - GIVEN items E2 and E4 were left as the user's call, THE SYSTEM SHALL raise
    them again once the new language is in place, since a hard edged frame
    changes how a div skeleton reads.

- **T10: Verify before claiming done.**
  - WHEN a page is converted, THE SYSTEM SHALL report 0px horizontal overflow
    at 320, 390, 721, 1024 and 1440.
  - WHEN hazard red is used on the paper ground, THE SYSTEM SHALL report the
    measured contrast ratio and confirm it clears WCAG AA for its text size.
  - WHEN a page is converted, THE SYSTEM SHALL re-shoot desktop and mobile into
    `hifi/shots/` at the page's exact height.
  - GIVEN the sample videos on `ugc.html`, THE SYSTEM SHALL confirm each still
    plays end to end after the conversion, in a real browser and not headless.

## Tradeoffs

- **Which page gets converted first:**
  - `voice.html` first. Unfinished, no real assets, nothing to break. Slowest route to seeing the language on the work that actually matters.
  - `ugc.html` first. The flagship, and it carries the real videos, so it is the honest test of whether the language survives real content. It is also the only finished page, so a bad conversion damages shipped work.
  - `index.html` first. The tile grid is where the language will either sing or fall apart, and it is the page a visitor sees first. Six tiles is also the largest single conversion.

- **Which face to use for the macro grotesk:**
  - Archivo Black. Free, self hostable today, close to the reference. Slightly narrower than ideal and only one weight.
  - Neue Haas Grotesk or Monument Extended. Exactly the reference, costs money, and needs a licence check before it can ship.
  - System sans at weight 900. Free and instant, and undersells the language badly enough that the redesign may read as unfinished.

- **How much analog degradation to apply:**
  - None. Clean Swiss print only. Safest, and risks reading as merely plain.
  - Grain only. One low opacity noise layer over the root. Cheap, subtle, hard to get wrong.
  - Full treatment. Halftone imagery, barcodes, crosshairs at grid intersections, registration marks. Most distinctive, and most likely to tip into pastiche on a page selling a service.

- **What happens to the semantic colours:**
  - Collapse everything to red and ink. Purest reading of the language. Loses the instant read of TBD versus ready.
  - Keep amber for TBD only, since it is scaffolding for us rather than brand. Slight impurity, large working benefit while prices are undecided.
  - Keep amber and green both. Easiest, and breaks the single accent rule the language is most insistent about.

## Risks and unknowns

- Does Swiss Industrial read as credible to seed and Series A founders buying a service, or does it read as hostile and hard to scan?
- Does hazard red `#E61919` clear WCAG AA on `#F4F4F0` at body size, or is it restricted to large type and rules?
- Unknown: whether the five real UGC sample videos, which are warm and human, sit correctly inside a hard edged monochrome frame.
- Unknown: the font licensing budget, which decides the macro grotesk tradeoff.
- Should the wordmark `midsesh` become uppercase to match the macro type, or does that change the brand mark itself?
- Unknown: whether the user wants the emoji in the four how it works cards kept.
- Does removing the green qualified and ready states cost more in clarity than the single accent rule is worth?
- Unknown: how the LinkedIn blue reaction dot survives, given it is a platform colour and not ours to change.

## Milestones

- **M1. Foundation on one page.** New token block, type system, and stripped
  material system applied to a single page. Stop and get user approval on the
  language before converting anything else.
- **M2. The rest of the set.** Home plus the four remaining detail pages,
  leaving the flagship until the language is proven.
- **M3. The flagship.** `ugc.html` converted with its offer, videos and worked
  example intact and verified playing.
- **M4. Close out.** Audit items 01, 02 and 05 applied, all screenshots
  re-shot, `HANDOFF.md` updated, and the new system written up and re-frozen.
