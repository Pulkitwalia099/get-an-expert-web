import type { ReactNode } from 'react';

export type IconName = 'heart' | 'comment' | 'share';

interface IconProps {
  name: IconName;
  className?: string;
}

const STROKE_PATHS: Record<IconName, ReactNode> = {
  heart: (
    <path d="M12 21s-7-4.6-9.5-8.5C.6 9.4 2.4 5.5 6 5.5c2.2 0 3.6 1.2 6 3.8 2.4-2.6 3.8-3.8 6-3.8 3.6 0 5.4 3.9 3.5 7C19 16.4 12 21 12 21z" />
  ),
  comment: (
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 9 9 0 0 1-3.8-.8L3 21l2-5.1a8 8 0 0 1-1.5-4.4A8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.3z" />
  ),
  share: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
};

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {STROKE_PATHS[name]}
    </svg>
  );
}

// The hero's scroll cue. A line with a head rather than a chevron alone, so
// it reads as "keep going" instead of "expand this".
export function ArrowDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2.5v11M3.5 9.5 8 14l4.5-4.5" />
    </svg>
  );
}

export function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M3 2v12l10-6z" fill="currentColor" />
    </svg>
  );
}

// The midsesh m: a lowercase m knocked out of a solid disc, anymark-style.
// Masked so the letter stays transparent on any background.
export function LogoMark({ size = 25 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <mask id="ms-m">
        <rect width="64" height="64" fill="#fff" />
        <path
          fill="#000"
          d="M17 44 V30.5 C17 25.3 21.3 21 26.5 21 c2.1 0 4 .7 5.5 1.9 A9.4 9.4 0 0 1 37.5 21 C42.7 21 47 25.3 47 30.5 V44 h-7 V31 a2.6 2.6 0 0 0-5.2 0 V44 h-5.6 V31 a2.6 2.6 0 0 0-5.2 0 V44 z"
        />
      </mask>
      <circle cx="32" cy="32" r="26" fill="#1D1D1F" mask="url(#ms-m)" />
    </svg>
  );
}
