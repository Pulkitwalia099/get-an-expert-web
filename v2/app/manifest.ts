import type { MetadataRoute } from "next";

/* Web app manifest. Colors mirror the cream/forest palette (kept as literals:
   a manifest is JSON, it cannot read CSS custom properties).
   TODO: add dedicated maskable 192x192 and 512x512 PNGs when the icon set is
   generated; favicon.ico and the generated apple-icon cover install for now. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "get an expert",
    short_name: "get an expert",
    description:
      "An MCP server for Claude Code, Codex, and Cursor. Real human experts join your session to review, deliver, and take work off your plate.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F0",
    theme_color: "#FAF7F0",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
