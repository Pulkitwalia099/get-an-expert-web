import { Inter } from 'next/font/google';

// Inter, self hosted.
//
// The marketplace at midsesh.com/ is set in Inter and uses weights the variable
// file exists for and a static one does not: 450, 550, 650, 820, 850, 860. On a
// system face every one of those snaps to the nearest of 400/700, so matching
// the marketplace's type is not a font-family line, it is this file.
//
// next/font downloads it at build time and serves it from our own origin, so
// nothing is fetched from fonts.googleapis.com at runtime. The marketplace does
// make that runtime fetch, and pulls two more families it never uses. This side
// does not copy that.
export const inter = Inter({
  subsets: ['latin'],
  // The variable axis, which is the entire point.
  weight: 'variable',
  display: 'swap',
  // Sits behind the same fallbacks the marketplace names, so a slow font swap
  // lands somewhere sane rather than on Times.
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
});
