import { ImageResponse } from "next/og";

/* Generated apple-touch icon: a forest tile with a cream monogram, matching the
   wordmark. Rendered at build time by next/og (no external image service).
   Palette literals mirror the @theme tokens; ImageResponse cannot read CSS vars. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = "get an expert";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2F4A38",
          color: "#F7F3E9",
          fontSize: 118,
          fontWeight: 600,
          fontFamily: "Georgia, serif",
        }}
      >
        e
      </div>
    ),
    { ...size },
  );
}
