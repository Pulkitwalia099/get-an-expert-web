// Sesh's head, the small brand mark. Fur follows currentColor so the mark
// sits on glass and ink alike; the spark stays terracotta everywhere. The
// muzzle and eyes punch through to the page ground via --bg. Fixed-color
// exports for use outside the app live in design/logo/.
export default function SeshMark({ size = 17 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="18" cy="18" r="5.5" fill="currentColor" />
      <circle cx="46" cy="18" r="5.5" fill="currentColor" />
      <circle cx="32" cy="36" r="22" fill="currentColor" />
      <ellipse cx="32" cy="44" rx="11" ry="8.5" fill="var(--bg, #F6F3ED)" />
      <ellipse cx="32" cy="39.8" rx="3.6" ry="2.8" fill="currentColor" />
      <line x1="32" y1="42.5" x2="32" y2="44.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="23.5" cy="30.5" r="2.4" fill="var(--bg, #F6F3ED)" />
      <circle cx="40.5" cy="30.5" r="2.4" fill="var(--bg, #F6F3ED)" />
      <g stroke="#C4593C" strokeWidth="3.2" strokeLinecap="round">
        <line x1="56" y1="2.5" x2="56" y2="14.5" />
        <line x1="50.8" y1="5.5" x2="61.2" y2="11.5" />
        <line x1="61.2" y1="5.5" x2="50.8" y2="11.5" />
      </g>
    </svg>
  );
}
