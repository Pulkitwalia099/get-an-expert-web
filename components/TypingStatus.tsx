'use client';

import { useEffect, useState } from 'react';

const WORDS = ['Thinking', 'Reading that back', 'Getting specific', 'Sizing it up', 'Nearly there'];
const FIRST_WORD_MS = 1_500;
const CYCLE_MS = 2_600;
const FADE_MS = 250;

// Dots first; after a moment, short cycling words so a slow model reply
// still feels alive.
export default function TypingStatus() {
  const [idx, setIdx] = useState(-1);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const first = window.setTimeout(() => setIdx(0), FIRST_WORD_MS);
    const cycle = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIdx((i) => (i < 0 ? 0 : (i + 1) % WORDS.length));
        setVisible(true);
      }, FADE_MS);
    }, CYCLE_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(cycle);
    };
  }, []);

  return (
    <div className="typing-wrap">
      <div className="typing">
        <i />
        <i />
        <i />
      </div>
      {idx >= 0 && (
        <span className="typing-word" style={{ opacity: visible ? 1 : 0 }}>
          {WORDS[idx]}
        </span>
      )}
    </div>
  );
}
