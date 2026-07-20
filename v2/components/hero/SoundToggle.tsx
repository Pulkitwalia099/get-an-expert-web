"use client";

/* SoundToggle.tsx - the hero film's mute/unmute control.
 *
 * Self-contained: reads and drives the `filmAudio` singleton from audio.ts,
 * persists its own visibility under prefers-reduced-motion, and never talks
 * to HeroFilm directly. See audio.ts's integration comment for how this
 * plugs in.
 *
 * Positioning: this uses `position: fixed` (SoundToggle.module.css) rather
 * than anchoring to a stage element, because Task 1 of the motion plan
 * moves most of the film onto per-frame `transform` writes - and any
 * transformed ancestor becomes a new containing block that would hijack a
 * fixed-position descendant. Mount this as a sibling OUTSIDE the animated
 * subtree (a direct child of HeroFilm's top-level returned element) so it
 * stays pinned to the viewport corner for the whole film regardless of
 * which elements underneath it are being transformed on any given frame.
 */

import { useEffect, useState } from "react";
import { filmAudio } from "./audio";
import styles from "./SoundToggle.module.css";

export default function SoundToggle() {
  // SSR-safe defaults (mirrors the reduced/mobile pattern elsewhere in the
  // hero: assume the safe state, correct after mount to avoid a hydration
  // mismatch).
  const [reduced, setReduced] = useState(false);
  const [muted, setMuted] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMuted(filmAudio.isMuted());
  }, []);

  // audio never plays under reduced motion, so there's nothing to toggle
  if (!mounted || reduced) return null;

  const onClick = () => {
    setMuted(filmAudio.toggleMuted());
  };

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onClick}
      aria-pressed={!muted}
      aria-label={muted ? "Unmute film sound" : "Mute film sound"}
      title={muted ? "Unmute sound" : "Mute sound"}
    >
      {muted ? <MutedIcon /> : <SoundIcon />}
    </button>
  );
}

function SoundIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M4 9v6h4l5 4V5L8 9H4Z"
        fill="currentColor"
      />
      <path
        d="M16.5 8.5a5 5 0 0 1 0 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M18.8 6.2a8.5 8.5 0 0 1 0 11.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M4 9v6h4l5 4V5L8 9H4Z"
        fill="currentColor"
      />
      <path
        d="M16 9.5 20.5 14M20.5 9.5 16 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
