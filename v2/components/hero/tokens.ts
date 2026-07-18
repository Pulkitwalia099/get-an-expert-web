/* tokens.ts - read palette tokens out of the CSS layer so WebGL colors stay
 * tied to the same @theme source as the rest of the site. No hex lives here;
 * the values resolve from :root custom properties defined in app/globals.css. */

import { Color } from "three";

/** Read a CSS custom property off :root, e.g. tokenValue("--color-forest"). */
export function tokenValue(name: string): string {
  if (typeof window === "undefined") return "rgb(0,0,0)";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || "rgb(0,0,0)";
}

/** Read a palette token as a three.js Color. */
export function tokenColor(name: string): Color {
  return new Color(tokenValue(name));
}

/** The palette the globe needs, resolved once on mount. */
export function readGlobePalette() {
  return {
    ink: tokenColor("--color-ink"),
    bronze: tokenColor("--color-bronze"),
    forest: tokenColor("--color-forest"),
    sage: tokenColor("--color-sage"),
    paper: tokenColor("--color-paper"),
  };
}

export type GlobePalette = ReturnType<typeof readGlobePalette>;
