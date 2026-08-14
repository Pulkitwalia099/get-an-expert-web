'use client';

import { useState } from 'react';

// The file drop on the operator dashboard, and the one question the browser
// can answer about a video before it is uploaded.
//
// Split out of app/operator/orders/page.tsx when that page passed 400 lines.
// Nothing here knows about orders: it takes a file and reports progress, and
// the page decides what that means.

export interface VideoShape {
  seconds: number | null;
  width: number | null;
  height: number | null;
}

const UNKNOWN: VideoShape = { seconds: null, width: null, height: null };

/**
 * How long a file is and how large its frame, according to the browser that is
 * about to upload it.
 *
 * Free, because the metadata is read locally and nothing is sent. All nulls
 * for anything that is not a video, anything the browser cannot decode, and
 * anything slow enough to be holding the upload up: each of those means the
 * guard falls through to the server, which is the correct place for it to be
 * decided anyway.
 *
 * The frame size matters as much as the duration. Two minutes of 4K is four
 * times the work of two minutes of 1080p and cannot finish inside a function,
 * and the only way to say so before the upload rather than four minutes after
 * it is to read the dimensions here.
 *
 * `videoWidth` is the size after any rotation flag is applied, which is the
 * same number ffprobe is made to report on the server.
 */
export function videoShape(file: File): Promise<VideoShape> {
  if (!file.type.startsWith('video/')) return Promise.resolve(UNKNOWN);

  return new Promise((resolve) => {
    const el = document.createElement('video');
    const src = URL.createObjectURL(file);
    let settled = false;

    const done = (value: VideoShape) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(src);
      el.removeAttribute('src');
      resolve(value);
    };

    el.preload = 'metadata';
    el.onloadedmetadata = () =>
      done({
        seconds: Number.isFinite(el.duration) ? el.duration : null,
        width: el.videoWidth || null,
        height: el.videoHeight || null,
      });
    el.onerror = () => done(UNKNOWN);
    window.setTimeout(() => done(UNKNOWN), 5000);
    el.src = src;
  });
}

/** A drop target that is also a file input, because a phone has no drag. */
export function Drop({
  label,
  hint,
  url,
  pct,
  working,
  workingHint,
  onFile,
}: {
  label: string;
  hint?: string;
  url: string;
  pct: number | null;
  /** What the server is doing with this file right now, or null when nothing. */
  working?: string | null;
  workingHint?: string;
  onFile: (file: File) => void;
}) {
  const [over, setOver] = useState(false);
  const busy = pct !== null || Boolean(working);
  const done = Boolean(url) && !busy;

  return (
    <label
      className={
        `opq-drop${over ? ' opq-drop-over' : ''}` +
        `${done ? ' opq-drop-done' : ''}${working ? ' opq-drop-busy' : ''}`
      }
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      <input
        type="file"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <span className="opq-drop-label">{label}</span>
      {/* Announced, because the encode is long enough that somebody using a
          screen reader would otherwise have no idea it had started. */}
      <span className="opq-drop-state" role="status">
        {working
          ? working
          : pct !== null
            ? `Uploading ${pct}%`
            : done
              ? 'Attached'
              : 'Drop a file, or tap to pick one'}
      </span>
      {working && workingHint && <span className="opq-drop-hint">{workingHint}</span>}
      {!working && hint && !done && <span className="opq-drop-hint">{hint}</span>}
      {pct !== null && (
        <span className="opq-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.max(pct, 2) / 100})` }} />
        </span>
      )}
      {/* No percentage exists for an encode: ffmpeg is not asked for progress
          and the wait is short enough that a fake one would be a lie. */}
      {working && (
        <span className="opq-bar opq-bar-run" aria-hidden="true">
          <span />
        </span>
      )}
    </label>
  );
}
