// Tailwind 4 for the marketplace at the apex, and nothing else.
//
// The rest of this app is hand written CSS in app/globals.css and CSS modules.
// Tailwind's preflight is a global reset, Next has no per route stylesheet
// boundary, and app/globals.css is loaded by the root layout, so importing
// Tailwind the usual way would have restyled /setups, /get, /dashboard,
// /search-experts and /stuck. The import in globals.css deliberately takes the
// theme and utilities layers and leaves the base layer out, which is what
// keeps every existing page exactly as it was.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
