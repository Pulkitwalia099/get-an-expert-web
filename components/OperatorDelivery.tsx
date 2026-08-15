'use client';

import { parseFrameLines } from '@/lib/frames';

// What the customer reads under the player, written on this side.
//
// Three boxes, all optional, and none of them the private note. That one lives
// below this block and still says the customer never sees it, which is now true
// again: what a customer reads is only ever what was typed here.
//
// Save is separate from Send. Sending a sample is an event in the life of the
// order and emails somebody; fixing a paragraph on a sample that already went
// out is neither, so it patches the row in place and tells nobody.

export default function OperatorDelivery({
  cut,
  diff,
  frames,
  sent,
  saving,
  onCut,
  onDiff,
  onFrames,
  onSave,
}: {
  cut: string;
  diff: string;
  /** The shot list as lines, which is what an operator types and edits. */
  frames: string;
  /** True once a sample has gone out, which is when Save has something to patch. */
  sent: boolean;
  saving: boolean;
  onCut: (value: string) => void;
  onDiff: (value: string) => void;
  onFrames: (value: string) => void;
  onSave: () => void;
}) {
  // Parsed on every keystroke so the count below the box is the truth rather
  // than a promise. A line that will not become a frame silently vanishing at
  // send time is the failure this is here to prevent.
  const parsed = parseFrameLines(frames);
  const typed = frames.split('\n').filter((line) => line.trim().length > 0).length;
  const lost = parsed ? typed - parsed.length : typed;

  return (
    <section className="opq-block">
      <h2>What the customer reads</h2>

      <label className="opq-field">
        <span>The cut</span>
        <textarea
          value={cut}
          onChange={(e) => onCut(e.target.value)}
          placeholder="23 seconds, 9:16, no dialogue. Eighteen shots, locked camera throughout."
          rows={3}
        />
      </label>

      <label className="opq-field">
        <span>Where it differs from the brief, and why</span>
        <textarea
          value={diff}
          onChange={(e) => onDiff(e.target.value)}
          placeholder="Their reference is a crockery set, styled for how it looks on a table. A tawa earns its place by what it does, so we shot the cook rather than the object."
          rows={4}
        />
      </label>

      <label className="opq-field">
        <span>Frames</span>
        <textarea
          className="opq-mono"
          value={frames}
          onChange={(e) => onFrames(e.target.value)}
          placeholder={'0:00.0-0:00.6  Black, and one sound\n0:00.6  Two hands lower it in\n0:02.4  The hands leave'}
          rows={8}
        />
      </label>
      <p className="opq-hint">
        One shot per line, a time then a name. The end is optional: the next line already says where a
        shot stops. Cuts, not slices, so the customer taps a number and lands on something real.
        {parsed ? ` ${parsed.length} frame${parsed.length === 1 ? '' : 's'}.` : ' No frames yet.'}
        {lost > 0 && ` ${lost} line${lost === 1 ? '' : 's'} will be skipped.`}
      </p>

      {sent && (
        <div className="opq-save-row">
          <button className="opq-btn" type="button" onClick={onSave} disabled={saving}>
            {saving ? 'Saving' : 'Save without resending'}
          </button>
          <span className="opq-hint">Edits the sample already sent. No email, no status change.</span>
        </div>
      )}
    </section>
  );
}
