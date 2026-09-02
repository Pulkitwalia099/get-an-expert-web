'use client';

import { useState } from 'react';
import { upload } from '@vercel/blob/client';
import type { Avatar } from '@/lib/orderAvatars';
import type { Change } from '@/lib/orderChanges';

// Putting one round of changes together, in the order it actually happens.
//
// The cut, then the line on each thing they asked for, then the faces, then a
// look at it as the customer, then Send. Nothing here emails anybody: saving is
// its own button and can be pressed as many times as it takes, and the customer
// hears about it exactly once, when Send is pressed at the bottom.
//
// That split is the whole design. The old way to put a recut on somebody's page
// was to upload it from the queue, which sent the email in the same press, so
// the only way to see what they would see was to have already told them to look.

export interface RoundAvatar {
  slug: string;
  name: string;
  imageUrl: string;
  picked: boolean;
}

type Busy = null | 'cut' | 'save' | 'send';

/** Three, because that is what a lineup is. A fourth is one more row. */
const BLANK_FACE: RoundAvatar = { slug: '', name: '', imageUrl: '', picked: false };
const BLANK_CHANGE: Change = { text: '', done: true, note: null };

function pad<T>(rows: T[], blank: T, to: number): T[] {
  return rows.length >= to ? rows : [...rows, ...Array.from({ length: to - rows.length }, () => ({ ...blank }))];
}

export default function OperatorRound({
  id,
  email,
  version,
  sampleUrl,
  avatars,
  changes,
}: {
  id: string;
  email: string;
  /** Which version this round will publish. */
  version: number;
  /** The cut currently parked for this round, if one has been uploaded. */
  sampleUrl: string | null;
  avatars: Avatar[];
  changes: Change[];
}) {
  const [cut, setCut] = useState<string | null>(sampleUrl);
  const [faces, setFaces] = useState<RoundAvatar[]>(
    pad(avatars.map((a) => ({ slug: a.slug, name: a.name, imageUrl: a.imageUrl, picked: a.picked })), BLANK_FACE, 3),
  );
  const [ticks, setTicks] = useState<Change[]>(pad(changes, BLANK_CHANGE, 3));
  const [busy, setBusy] = useState<Busy>(null);
  const [said, setSaid] = useState('');
  const [error, setError] = useState('');

  function patchFace(i: number, next: Partial<RoundAvatar>) {
    setFaces((rows) => rows.map((r, j) => (j === i ? { ...r, ...next } : r)));
  }
  function patchTick(i: number, next: Partial<Change>) {
    setTicks((rows) => rows.map((r, j) => (j === i ? { ...r, ...next } : r)));
  }

  /**
   * The clean file goes up, and the server draws the mark on a copy.
   *
   * Same two step flow the queue uses. The clean file is parked under `final/`
   * so approving has something to hand over, and what the customer watches is
   * the watermarked copy this returns.
   */
  async function putCut(file: File) {
    setBusy('cut');
    setError('');
    setSaid('');
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/operator/upload',
        clientPayload: `${id}:final`,
      });
      const res = await fetch('/api/operator/watermark', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: id, finalUrl: blob.url }),
      });
      const body = (await res.json().catch(() => null)) as { sampleUrl?: string; error?: string } | null;
      if (!res.ok || !body?.sampleUrl) {
        setError(body?.error ?? 'The watermark did not run. Upload the sample yourself from the queue.');
        return;
      }
      setCut(body.sampleUrl);
      setSaid('Cut uploaded and marked. Nobody was emailed.');
    } catch {
      setError('That upload did not finish.');
    } finally {
      setBusy(null);
    }
  }

  async function putFace(i: number, file: File) {
    setBusy('cut');
    setError('');
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/operator/upload',
        clientPayload: `${id}:avatar`,
      });
      // The slug is ours and has to survive a URL, so it comes from the row's
      // position rather than from the filename somebody dragged in.
      patchFace(i, { imageUrl: blob.url, slug: faces[i].slug || `face-${i + 1}` });
    } catch {
      setError('That picture did not upload.');
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy('save');
    setError('');
    setSaid('');
    try {
      const res = await fetch('/api/operator/round', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          version,
          // Only rows somebody actually filled in. A blank third face is an
          // empty row on screen, not a face to publish.
          avatars: faces.filter((f) => f.imageUrl && f.name.trim()),
          changes: ticks.filter((t) => t.text.trim()),
        }),
      });
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? 'That did not save.');
        return;
      }
      setSaid(body?.message ?? 'Saved.');
    } catch {
      setError('That did not save. Check your connection.');
    } finally {
      setBusy(null);
    }
  }

  /** The one button that tells the customer anything. */
  async function send() {
    if (!cut) {
      setError('Upload the cut first.');
      return;
    }
    setBusy('send');
    setError('');
    setSaid('');
    try {
      const res = await fetch('/api/operator/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: id, status: 'sample_sent', assetUrl: cut }),
      });
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? 'That did not send.');
        return;
      }
      setSaid(body?.message ?? 'Sent.');
    } catch {
      setError('That did not send.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rnd">
      <ol className="rnd-steps">
        <li className="rnd-block">
          <h2>1 · The new cut</h2>
          <p className="rnd-hint">
            Drop the clean file. The mark is drawn on a copy, so what they watch is
            watermarked and what they download is not.
          </p>
          <input
            type="file"
            accept="video/*"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void putCut(file);
            }}
          />
          {cut && (
            <div className="ord-stage rnd-stage">
              <video src={cut} controls playsInline preload="metadata" />
            </div>
          )}
        </li>

        <li className="rnd-block">
          <h2>2 · What changed</h2>
          <p className="rnd-hint">
            One line per thing they asked for. Untick anything you did not do, and say
            why: a list that only ever ticks is one they stop reading.
          </p>
          {ticks.map((tick, i) => (
            <div className="rnd-tick" key={i}>
              <label className="rnd-check">
                <input
                  type="checkbox"
                  checked={tick.done}
                  onChange={(e) => patchTick(i, { done: e.target.checked })}
                />
                <span>Done</span>
              </label>
              <input
                type="text"
                value={tick.text}
                placeholder="Call to action to book a fitting added to the end"
                onChange={(e) => patchTick(i, { text: e.target.value })}
              />
              {!tick.done && (
                <input
                  type="text"
                  value={tick.note ?? ''}
                  placeholder="Why not, in one line"
                  onChange={(e) => patchTick(i, { note: e.target.value })}
                />
              )}
            </div>
          ))}
        </li>

        <li className="rnd-block">
          <h2>3 · The faces</h2>
          <p className="rnd-hint">
            The ones we generated for this brand. Mark the one that ended up in the ad.
          </p>
          <div className="rnd-faces">
            {faces.map((face, i) => (
              <div className="rnd-face" key={i}>
                <div className="rnd-face-shot">
                  {face.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face.imageUrl} alt={face.name || `Face ${i + 1}`} />
                  ) : (
                    <span className="rnd-face-empty">No picture</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  disabled={busy !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void putFace(i, file);
                  }}
                />
                <input
                  type="text"
                  value={face.name}
                  placeholder="What we call this face"
                  onChange={(e) => patchFace(i, { name: e.target.value })}
                />
                <label className="rnd-check">
                  <input
                    type="radio"
                    name="picked"
                    checked={face.picked}
                    onChange={() =>
                      setFaces((rows) => rows.map((r, j) => ({ ...r, picked: j === i })))
                    }
                  />
                  <span>In the ad</span>
                </label>
              </div>
            ))}
          </div>
        </li>
      </ol>

      <div className="rnd-row">
        <button className="opq-btn" type="button" onClick={() => void save()} disabled={busy !== null}>
          {busy === 'save' ? 'Saving' : 'Save'}
        </button>
        {/* Their page, their session, read only. The one honest answer to
            "what will this look like" is the page itself. */}
        <a className="opq-btn" href={`/orders/${id}?preview=1`} target="_blank" rel="noreferrer noopener">
          See it as {email}
        </a>
        <button
          className="opq-btn opq-solid"
          type="button"
          onClick={() => void send()}
          disabled={busy !== null || !cut}
        >
          {busy === 'send' ? 'Sending' : 'Send it and email them'}
        </button>
      </div>

      <p className="rnd-hint">
        Save as often as you like. Only the last button tells {email} anything.
      </p>

      {said && (
        <p className="rnd-said" role="status">
          {said}
        </p>
      )}
      {error && (
        <p className="oa-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
