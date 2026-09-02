import { timecode } from '@/lib/frames';
import type { Revision, RevisionCut } from '@/lib/orderRevisions';

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

function Stage({ cut, label }: { cut: RevisionCut; label: string }) {
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
      {cut.frames && cut.frames.length > 0 && (
        <ol className="rv-shots">
          {cut.frames.map((frame) => (
            <li key={frame.n}>
              <span className="rv-t">{timecode(frame.t)}</span>
              <span className="rv-name">{frame.name}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function RevisionTrail({
  revisions,
  heading = 'What changed after your notes',
}: {
  revisions: Revision[];
  heading?: string;
}) {
  if (revisions.length === 0) return null;

  return (
    <section className="rv">
      <h2>{heading}</h2>

      {revisions.map((round) => {
        const listed = round.feedback.lines.flatMap((line) => {
          const split = bullets(line.text);
          return split.length > 0
            ? split.map((text) => ({ frame: line.frame, text }))
            : [line];
        });

        return (
          <article className="rv-round" key={round.round}>
            <div className="rv-grid">
              <Stage cut={round.before} label={`Version ${round.before.version}`} />

              <div className="rv-mid">
                {/* Their words, under a heading that says so. The page carries
                    our reasoning elsewhere and the two must not blur: this
                    column is the only place on the order that is theirs. */}
                <span className="ord-sub">What you asked for</span>
                <ul className="rv-notes">
                  {listed.map((line, i) => (
                    <li key={`${line.frame ?? 'all'}-${i}`}>
                      {line.frame !== null && (
                        <span className="rv-frame">Shot {line.frame}</span>
                      )}
                      <span className="rv-said">{line.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {round.after ? (
                // The watermark is named here rather than left to be noticed.
                // The clean file is what approving buys, and a client who
                // thinks the mark is in the delivery asks for a fix nobody
                // needs to make.
                <Stage
                  cut={round.after}
                  label={`Version ${round.after.version}, watermarked`}
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
