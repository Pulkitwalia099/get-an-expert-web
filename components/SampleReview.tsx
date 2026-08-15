'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_NOTE, frameAt, span, type Frame, type FrameNote } from '@/lib/frames';
import { BEYOND_REVISIONS, INCLUDED_REVISIONS } from '@/lib/order-status';

// The sample, and the two answers, in one component.
//
// They are together because the feedback points at the picture. Tapping a frame
// has to move the player and the player has to say which frame is on screen,
// and a video rendered by the page with the notes in a sibling component can do
// neither without reaching across the DOM for an element it does not own.
//
// What the customer never does is type a timecode. Pranav asked for feedback
// "by frame" on 15 Aug because that is already how he talks to editors, and the
// numbers, names and times all come from the shot list stored with the sample.
// His whole job is tap, write, send.

type Mode = 'idle' | 'commenting' | 'sending' | 'done';

export default function SampleReview({
  id,
  sampleUrl,
  frames,
  used,
  awaiting,
  heading,
  context,
}: {
  id: string;
  sampleUrl: string;
  /** The shot list, or null. A sample without one still plays and still takes notes. */
  frames: Frame[] | null;
  used: number | null;
  /** True while this is the customer's move. False once it is approved or delivered. */
  awaiting: boolean;
  heading: string;
  /**
   * The brief, the references and what we delivered, rendered between the
   * player and the two buttons.
   *
   * A prop rather than two more sections on the page, because the order is the
   * point. Pranav was asked to approve a cut with his own references printed
   * below the buttons, which is why he could not remember what he had sent.
   * Whatever a decision needs sits above the decision.
   */
  context?: React.ReactNode;
}) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const section = useRef<HTMLElement>(null);
  const [at, setAt] = useState(0);
  const [mode, setMode] = useState<Mode>('idle');
  // Null means the whole cut. It is a first class choice, not a fallback:
  // colour, pacing and music belong to the whole thing, and making somebody
  // pin those to a frame would invent a moment that is not the point.
  const [picked, setPicked] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState<FrameNote[]>([]);
  const [error, setError] = useState('');

  // Null means the count could not be read. No warning then, rather than a
  // guess: telling somebody they are out of revisions when they are not is
  // worse than saying nothing.
  const beyond = used !== null && used >= INCLUDED_REVISIONS;
  const playing = frames ? frameAt(frames, at) : null;

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const onTime = () => setAt(el.currentTime);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('seeked', onTime);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('seeked', onTime);
    };
  }, []);

  // Land a little inside the shot rather than exactly on its first frame. A cut
  // is often a dark frame or the tail of the previous one, so seeking to the
  // boundary shows black and looks like the wrong shot.
  const goTo = useCallback((frame: Frame) => {
    setPicked(frame.n);
    const el = video.current;
    if (!el) return;
    el.pause();
    el.currentTime = frame.t + Math.min(0.25, frame.d / 3);
    setAt(el.currentTime);
  }, []);

  // Opening the box moves the player to the top of the screen, so the shot, the
  // strip and the words being typed are all in view at once. Without this the
  // box opens below the fold and the first thing somebody does is scroll.
  function openChanges() {
    setMode('commenting');
    requestAnimationFrame(() => {
      const stage = section.current?.querySelector('.ord-stage');
      stage?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    setNotes((all) => [...all, { frame: picked, text: text.slice(0, MAX_NOTE) }]);
    setDraft('');
  }

  function removeNote(index: number) {
    setNotes((all) => all.filter((_, i) => i !== index));
  }

  async function send(action: 'approve' | 'changes') {
    if (mode === 'sending') return;
    // Words still in the box are words somebody wrote. Sending without them
    // because they did not press Add is how feedback gets silently dropped.
    const pending = draft.trim();
    const payload = pending ? [...notes, { frame: picked, text: pending.slice(0, MAX_NOTE) }] : notes;
    setMode('sending');
    setError('');
    try {
      const res = await fetch(`/api/marketplace/${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, notes: action === 'changes' ? payload : undefined }),
      });
      if (res.ok) {
        setMode('done');
        // The status lives on the server, so the page is asked again rather
        // than patched here. Two copies of "what state is this order in" is
        // how a page ends up disagreeing with the database it came from.
        router.refresh();
        return;
      }
      const parsed: unknown = await res.json().catch(() => null);
      const message =
        res.status < 500 && typeof parsed === 'object' && parsed !== null
          ? (parsed as { error?: unknown }).error
          : null;
      setError(typeof message === 'string' ? message : 'That did not save. Try again.');
      setMode(action === 'changes' ? 'commenting' : 'idle');
    } catch {
      setError('That did not save. Check your connection and try again.');
      setMode(action === 'changes' ? 'commenting' : 'idle');
    }
  }

  const sendable = notes.length > 0 || draft.trim().length > 0;
  // While somebody is writing, the picture is the thing they are writing about.
  // The player pins to the top of the screen and the frames and the box sit
  // directly under it, because a phone that makes you scroll up to see the shot
  // and back down to describe it is a phone you stop giving feedback on.
  const writing = mode === 'commenting' || mode === 'sending';

  const actions = mode === 'done' ? (
    <p className="oa-done" role="status">
      Got it. This page will update in a moment.
    </p>
  ) : (
    awaiting && (
      <div className="oa">
            {mode === 'idle' ? (
              <div className="oa-row">
                <button className="oa-btn oa-solid" type="button" onClick={() => void send('approve')}>
                  Approve this ad
                </button>
                <button className="oa-btn" type="button" onClick={openChanges}>
                  Request changes
                </button>
              </div>
            ) : (
              <div className="oa-box">
                {/* Shown before the box, not after the send. A warning that
                    arrives once the request is gone is an excuse. */}
                {beyond && (
                  <p className="oa-warn" role="status">
                    {BEYOND_REVISIONS}
                  </p>
                )}

                {/* The strip above the video is the picker, so there is one
                    control rather than two saying the same thing. This only
                    has to offer the way out of it. */}
                {frames && (
                  <div className="fr-scope">
                    <span className="fr-scope-k">This note is about</span>
                    <span className="fr-scope-v">
                      {picked === null
                        ? 'the whole video'
                        : `frame ${picked}, ${frames.find((f) => f.n === picked)?.name ?? ''}`}
                    </span>
                    {picked !== null && (
                      <button
                        type="button"
                        className="fr-whole"
                        onClick={() => setPicked(null)}
                        disabled={mode === 'sending'}
                      >
                        Whole video instead
                      </button>
                    )}
                  </div>
                )}

                <label className="oa-label" htmlFor="oa-comment">
                  What should change?
                </label>
                <textarea
                  id="oa-comment"
                  rows={4}
                  maxLength={MAX_NOTE}
                  autoFocus
                  placeholder={
                    picked === null
                      ? 'Pacing, colour, music, anything about the whole cut.'
                      : 'Say it however you like. The editor reads this.'
                  }
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={mode === 'sending'}
                />

                {frames && (
                  <div className="oa-row">
                    <button
                      className="oa-btn oa-sm"
                      type="button"
                      disabled={!draft.trim() || mode === 'sending'}
                      onClick={addNote}
                    >
                      Add and write another
                    </button>
                  </div>
                )}

                {notes.length > 0 && (
                  <ul className="fr-notes">
                    {notes.map((note, i) => {
                      const frame = note.frame === null ? null : frames?.find((f) => f.n === note.frame);
                      return (
                        <li key={`${note.frame}-${i}`} className="fr-note">
                          <div className="fr-note-b">
                            {frame ? (
                              <button type="button" className="fr-note-who" onClick={() => goTo(frame)}>
                                <span className="fr-note-n">{frame.n}</span> {frame.name}
                              </button>
                            ) : (
                              <span className="fr-note-who">Whole video</span>
                            )}
                            <p className="fr-note-t">{note.text}</p>
                          </div>
                          <button
                            type="button"
                            className="fr-x"
                            aria-label="Remove this note"
                            onClick={() => removeNote(i)}
                            disabled={mode === 'sending'}
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="oa-row">
                  <button
                    className="oa-btn oa-solid"
                    type="button"
                    disabled={mode === 'sending' || !sendable}
                    onClick={() => void send('changes')}
                  >
                    {mode === 'sending' ? 'Sending' : beyond ? 'Send them anyway' : 'Send these notes'}
                  </button>
                  <button
                    className="oa-btn"
                    type="button"
                    disabled={mode === 'sending'}
                    onClick={() => {
                      setMode('idle');
                      setError('');
                    }}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
        {error && (
          <p className="oa-error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  );

  return (
    <section ref={section} className={writing ? 'ord-sample ord-sample-writing' : 'ord-sample'}>
      <h2>{heading}</h2>

      {/* The player and the strip pin together. Pinning only the player left
          the strip scrolling underneath it, which hid the thing being pointed
          at behind the thing pointing at it. */}
      <div className="ord-pin">
      <div className="ord-stage">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={video} src={sampleUrl} controls playsInline preload="metadata" />
      </div>

      {/* Under the picture, never over it. Drawn on the frame it competed with
          the work for attention, which is the opposite of what a sample is for.
          Down here the same information is a timeline: each block is a shot, as
          wide as the shot is long, and the one you are watching is filled in. */}
      {frames && (
        <div className="fr-strip-wrap">
          <div className="fr-strip" role="group" aria-label="Frames in this cut">
            {frames.map((f) => (
              <button
                key={f.n}
                type="button"
                className={
                  'fr-seg' +
                  (f.n === picked ? ' fr-on' : '') +
                  (playing && f.n === playing.n && f.n !== picked ? ' fr-now' : '')
                }
                style={{ flexGrow: f.d }}
                aria-pressed={f.n === picked}
                aria-label={`Frame ${f.n}, ${f.name}, ${span(f)}`}
                onClick={() => goTo(f)}
              >
                {f.n}
              </button>
            ))}
          </div>
          {playing && (
            <p className="fr-nowline">
              <span className="fr-nowline-n">Frame {playing.n}</span>
              <span className="fr-nowline-name">{playing.name}</span>
              <span className="fr-nowline-tc">{span(playing)}</span>
            </p>
          )}
        </div>
      )}
      </div>

      {!writing && (
        <p className="ord-sample-note">
          Trouble playing it?{' '}
          <a href={sampleUrl} target="_blank" rel="noreferrer noopener">
            Open it directly
          </a>
          .
        </p>
      )}

      {/* The brief and what we delivered sit above the decision while there is
          a decision to make, and drop below the box once somebody is writing in
          it. Same two blocks either way, ordered by what is being done. */}
      {writing ? (
        <>
          {actions}
          {context}
        </>
      ) : (
        <>
          {context}
          {actions}
        </>
      )}
    </section>
  );
}
