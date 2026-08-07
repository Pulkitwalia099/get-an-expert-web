// The seam, the midsesh mark: an m whose second arch is picked up in
// terracotta mid-stroke, the handoff drawn as a letter. The ink arch follows
// currentColor so the mark sits on glass and ink alike; the terracotta arch
// never changes. Fixed-color exports for use outside the app live in
// design/logo/.
export default function SeamMark({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        d="M13 50 L13 28 Q13 18 22.5 18 Q32 18 32 28 L32 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="8.5"
        strokeLinecap="round"
      />
      <path
        d="M33.5 46 L33.5 28 Q33.5 18 42.5 18 Q51.5 18 51.5 28 L51.5 50"
        fill="none"
        stroke="#C4593C"
        strokeWidth="8.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
