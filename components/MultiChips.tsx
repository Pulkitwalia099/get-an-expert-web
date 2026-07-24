'use client';

import { useState } from 'react';
import styles from '@/components/MultiChips.module.css';

// Chips for a turn where several answers can be true at once. Clicking
// toggles instead of sending, and one confirm sends every pick as a single
// message. The picks live here, so the parent clears them by handing this a
// new key when the next reply lands.
export default function MultiChips({
  chips,
  onConfirm,
}: {
  chips: string[];
  onConfirm: (picks: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(chip: string) {
    setPicked((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        {chips.map((c) => {
          const on = picked.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              className={on ? `${styles.chip} ${styles.on}` : styles.chip}
              onClick={() => toggle(c)}
            >
              {c}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.confirm}
        disabled={picked.length === 0}
        onClick={() => onConfirm(picked)}
      >
        {picked.length === 0 ? 'Pick any that apply' : `Continue with ${picked.length}`}
      </button>
    </div>
  );
}
