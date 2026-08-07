'use client';

import type { Suggestion } from '@/components/flows';
import s from '@/components/TryChips.module.css';

// One line of chips that scrolls by hand, not by itself. It used to drift as
// a marquee, copied three times in the DOM for a seamless loop. That was the
// wrong trade: a few seconds in, there was always a chip sliced in half at the
// left edge and the tap targets were never still. On a row whose whole job is
// to tell a first-time visitor what they can ask for, moving the answers past
// them costs more than the motion is worth. It scrolls, it fades on the right
// to say there is more, and it stays put.
export default function TryChips({
  suggestions,
  onPick,
  elseChip,
  onElse,
}: {
  suggestions: Suggestion[];
  onPick: (message: string) => void;
  elseChip: string | null;
  onElse: () => void;
}) {

  return (
    <div className={s.wrap}>
      <div className={s.rail}>
        <span className={s.label}>Try:</span>
        <div className={s.viewport}>
          <div className={s.track}>
            {suggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                className={s.chip}
                onClick={() => onPick(item.message)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {elseChip && (
        <button type="button" className={s.else} onClick={onElse}>
          {elseChip}
        </button>
      )}
    </div>
  );
}
