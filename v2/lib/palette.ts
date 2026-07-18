/* Token-backed color helpers so components never carry raw hex.
   Every value routes through a CSS variable defined in app/globals.css @theme.
   The alpha helpers reproduce the original rgba() literals exactly:
   color-mix(in srgb, C p%, transparent) == C at alpha p. */

export const c = {
  paper: "var(--color-paper)",
  surface: "var(--color-surface)",
  raised: "var(--color-raised)",
  ink: "var(--color-ink)",
  ink2: "var(--color-ink-2)",
  border: "var(--color-border)",
  border2: "var(--color-border-2)",
  forest: "var(--color-forest)",
  forestDeep: "var(--color-forest-deep)",
  sage: "var(--color-sage)",
  sageSoft: "var(--color-sage-soft)",
  bronze: "var(--color-bronze)",
  bronzeInk: "var(--color-bronze-ink)",
  bronzeSoft: "var(--color-bronze-soft)",
  rust: "var(--color-rust)",
  cream: "var(--color-cream)",
  paperLit: "var(--color-paper-lit)",
  code: "var(--color-code)",
} as const;

const mix = (token: string, a: number) =>
  `color-mix(in srgb, ${token} ${+(a * 100).toFixed(4)}%, transparent)`;

/** ink (#1C1A16) at alpha a */
export const ink = (a: number) => mix("var(--color-ink)", a);
/** forest (#2F4A38) at alpha a */
export const forest = (a: number) => mix("var(--color-forest)", a);
/** bronze (#8C7136) at alpha a */
export const bronze = (a: number) => mix("var(--color-bronze)", a);
/** paper (#FAF7F0) at alpha a */
export const paper = (a: number) => mix("var(--color-paper)", a);
/** surface / white (#FFFFFF) at alpha a */
export const surface = (a: number) => mix("var(--color-surface)", a);
/** pure black at alpha a (used only for a single deep shadow) */
export const black = (a: number) => `rgba(0, 0, 0, ${a})`;

/** forest hover: 85% forest mixed into ink, matching the source color-mix. */
export const forestHover = "color-mix(in srgb, var(--color-forest) 85%, var(--color-ink))";
