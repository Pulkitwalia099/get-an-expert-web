import { ImageResponse } from 'next/og';

// The social card. Until now a link to midsesh.com unfurled with no image at
// all, so this is the mark's largest placement and its first impression in a
// feed. Kept to the brand kit: paper ground, the seam, the typed wordmark.
//
// The mark is drawn as JSX svg paths. An <img> holding the same svg as a data
// URI renders as nothing here: the card comes back a valid png with a hole
// where the logo should be, so it has to be checked by eye, not by status code.
export const runtime = 'edge';
export const alt = 'midsesh';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F6F3ED',
          color: '#211E1A',
        }}
      >
        <svg width="220" height="220" viewBox="0 0 64 64">
          <path
            d="M13 50 L13 28 Q13 18 22.5 18 Q32 18 32 28 L32 50"
            fill="none"
            stroke="#211E1A"
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
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, marginTop: 8 }}>midsesh</div>
        <div style={{ fontSize: 32, color: '#5F594E', marginTop: 14 }}>
          {/* The line the page it represents actually leads with. The
              previous one described the expert search, which moved to
              /search-experts when the marketplace took the front door, so
              every shared link was unfurling a different product. */}
          An agent does the work. A human expert owns the outcome.
        </div>
      </div>
    ),
    size,
  );
}
