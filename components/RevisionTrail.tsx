import { timecode } from '@/lib/frames';
import type { Revision, RevisionCut } from '@/lib/orderRevisions';
import type { Change } from '@/lib/orderChanges';

// What you watched, what you said, and what we did about it.
//
// One row per round, read left to right. The order is the argument: a client
// who opens this three weeks later should be able to see that the second cut
// answers something they asked for, without holding the first one in their
// head. That is why the old cut stays on the page rather than being replaced
// by the new one, which is what the order page did until this existed.
//
// A round whose new cut is not made yet still renders, with the third column
// saying so. Hiding the round until we finish would take their own notes off
// the screen for exactly as long as they are waiting to hear back, which is
// the window they most want to see them.

/**
 * A block of feedback split into the bullets it was written as.
 *
 * Somebody typing three requests into one box writes them as a list, and
 * printing that back as one paragraph loses the shape they gave it. Lines that
 * are not bulleted are left exactly as typed rather than guessed at.
 */
function bullets(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const marked = lines.filter((line) => /^[-*•]\s+/.test(line));
  // Only treated as a list when most of it is one. A single stray dash inside
  // a paragraph is punctuation, not a bullet.
  if (marked.length < 2) return [];
  return marked.map((line) => line.replace(/^[-*•]\s+/, ''));
}

function Stage({
  cut,
  label,
  foot,
}: {
  cut: RevisionCut;
  label: string;
  /** Rendered under this cut. The two buttons, on the one it decides. */
  foot?: React.ReactNode;
}) {
  return (
    <div className="rv-side">
      <span className="ord-sub">{label}</span>
      <div className="ord-stage">
        {/* metadata only. A round is two files and a phone should not pull
            either before somebody presses play. */}
        <video src={cut.url} controls playsInline preload="metadata" />
      </div>
      {/* Carried over from SampleReview, which no longer renders under a
          finished round. A codec the browser will not play is the one failure
          that leaves somebody staring at a black rectangle with no way out. */}
      <p className="rv-direct">
        Trouble playing it?{' '}
        <a href={cut.url} target="_blank" rel="noreferrer noopener">
          Open it directly
        </a>
        .
      </p>
      {/* The shot list, behind the same control as the feedback. Printed in
          full it was the tallest thing in the column and pushed the other cut
          off the screen, which is the one comparison this view exists to make.
          Somebody reading it wants a specific moment, and that is a thing you
          go and look for rather than something you scroll past twice. */}
      {cut.frames && cut.frames.length > 0 && (
        <details className="rv-more">
          <summary className="rv-transcript">View the transcript</summary>
          <ol className="rv-shots">
            {cut.frames.map((frame) => (
              <li key={frame.n}>
                <span className="rv-t">{timecode(frame.t)}</span>
                <span className="rv-name">{frame.name}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
      {foot && <div className="rv-foot">{foot}</div>}
    </div>
  );
}

export default function RevisionTrail({
  revisions,
  /**
   * The two buttons, or the download once they have decided.
   *
   * Rendered under the newest cut rather than under the page, so what is being
   * approved is the thing directly above the button. At the foot of the page
   * they sat below the faces we tried, which is a section about a decision
   * already made, and the nearest video was the wrong one.
   */
  actions,
  /**
   * Our line on each thing they asked for, keyed by the version that answered.
   *
   * Empty is the normal state and the column falls back to printing their note,
   * which is what it did before the ticks existed.
   */
  changes = new Map<number, Change[]>(),
  heading = 'What changed after your notes',
}: {
  revisions: Revision[];
  actions?: React.ReactNode;
  changes?: Map<number, Change[]>;
  heading?: string;
}) {
  if (revisions.length === 0) return null;

  return (
    <section className="rv">
      <h2>{heading}</h2>

      {revisions.map((round, index) => {
        // Only the newest round carries them. An older one is settled, and a
        // button under it would offer a decision on a cut two versions back.
        const newest = index === revisions.length - 1;
        const listed = round.feedback.lines.flatMap((line) => {
          const split = bullets(line.text);
          return split.length > 0
            ? split.map((text) => ({ frame: line.frame, text }))
            : [line];
        });
        // Keyed to the cut that answered, so a second round cannot render the
        // first round's list. A round with no answering cut has nothing to
        // tick yet and falls through to their words.
        const ticks = (round.after && changes.get(round.after.version)) || [];
        const said = listed.map((line, i) => (
          <li key={`${line.frame ?? 'all'}-${i}`}>
            {line.frame !== null && <span className="rv-frame">Shot {line.frame}</span>}
            <span className="rv-said">{line.text}</span>
          </li>
        ));

        return (
          <article className="rv-round" key={round.round}>
            <div className="rv-grid">
              <Stage cut={round.before} label={`Version ${round.before.version}`} />

              <div className="rv-mid">
                {ticks.length > 0 ? (
                  <>
                    {/* The answer to their notes, not the notes. Somebody
                        opening this wants to know whether the thing they asked
                        for happened, and three paragraphs of their own writing
                        makes them work that out for themselves. */}
                    <span className="ord-sub">What we changed</span>
                    {/* Panelled, so the three columns read as three of the
                        same thing. A bare list between two framed players made
                        the middle look like a caption on the pair rather than
                        the answer they came for. */}
                    <div className="rv-panel">
                      <ul className="rv-ticks">
                        {ticks.map((change, i) => (
                          <li
                            key={`${i}-${change.text.slice(0, 24)}`}
                            className={change.done ? 'rv-tick rv-done' : 'rv-tick'}
                          >
                          {/* The glyph is decoration; the state is the word
                              beside it, which is the only thing a screen
                              reader gets. */}
                          <span className="rv-mark" aria-hidden="true" />
                          <span className="rv-said">
                            <span className="rv-only">
                              {change.done ? 'Done. ' : 'Not done. '}
                            </span>
                            {change.text}
                            {!change.done && change.note && (
                              <span className="rv-why">{change.note}</span>
                            )}
                          </span>
                        </li>
                        ))}
                      </ul>
                    </div>

                    {/* Their words are kept, one press away. A summary that
                        replaces the thing it summarises is a summary nobody can
                        check, and this one is us marking our own work.
                        A details rather than state, so it works with no
                        JavaScript and the trail stays a server component. */}
                    <details className="rv-more">
                      {/* Their words, not a transcript. The transcript is the
                          shot list under each player, and calling both the
                          same thing would send somebody looking for one and
                          hand them the other. */}
                      <summary className="rv-transcript">Read full feedback</summary>
                      <ul className="rv-notes rv-notes-fold">{said}</ul>
                    </details>
                  </>
                ) : (
                  <>
                    {/* No list written yet, so their words carry the column.
                        This is what every round looked like before the ticks
                        existed, and it stays the honest fallback. */}
                    <span className="ord-sub">What you asked for</span>
                    <ul className="rv-notes">{said}</ul>
                  </>
                )}
              </div>

              {round.after ? (
                // The watermark is named here rather than left to be noticed.
                // The clean file is what approving buys, and a client who
                // thinks the mark is in the delivery asks for a fix nobody
                // needs to make.
                <Stage
                  cut={round.after}
                  label={`Version ${round.after.version}, watermarked`}
                  foot={newest ? actions : null}
                />
              ) : (
                <div className="rv-side rv-pending">
                  <span className="ord-sub">The new version</span>
                  <div className="rv-slot">
                    <p>
                      We are cutting this now. It lands here next to your notes, and
                      you will get an email the moment it does.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
