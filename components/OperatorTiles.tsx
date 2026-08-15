'use client';

import type { Tile } from '@/lib/operator-lanes';

// The four counts at the top of the queue.
//
// Every one of them is a control. A number you cannot tap is a number you have
// to go and find in the list underneath, which is the whole reason the list
// used to get scrolled past.
//
// A zero renders disabled rather than disappearing. A grid that reflows as
// work lands is one nobody can build muscle memory for, and the position of
// Late is the thing worth knowing without looking.

const TILES: { key: Tile; label: string }[] = [
  { key: 'late', label: 'Late' },
  { key: 'yours', label: 'Your turn' },
  { key: 'theirs', label: 'On them' },
  { key: 'quotes', label: 'Quotes' },
];

export default function OperatorTiles({
  counts,
  active,
  onPick,
}: {
  counts: Record<Tile, number>;
  active: Tile | null;
  onPick: (tile: Tile | null) => void;
}) {
  return (
    <div className="opq-tiles">
      {TILES.map(({ key, label }) => {
        const on = active === key;
        return (
          <button
            key={key}
            type="button"
            className={`opq-tile${on ? ' opq-tile-on' : ''}${key === 'late' && counts.late > 0 ? ' opq-tile-late' : ''}`}
            // Tapping the active tile clears the filter, so there is no fifth
            // control on screen doing nothing but saying "all".
            onClick={() => onPick(on ? null : key)}
            disabled={counts[key] === 0}
            aria-pressed={on}
          >
            <span className="opq-tile-n">{counts[key]}</span>
            <span className="opq-tile-k">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
