'use client';

import { Drop } from '@/components/OperatorDrop';

// The file half of an order, on the operator side.
//
// The other half is components/OperatorDraft.tsx, and the dashboard picks one
// or the other from what the service delivers. Split out when the page passed
// 400 lines, and worth splitting on this line in particular: a video order and
// a LinkedIn order share a queue, a status ladder and a set of buttons, and
// share nothing at all about what is handed over.
//
// One drop target, normally. The second appears only when the server has said
// it will not produce the sample, and never silently: `twoFiles` carries the
// sentence saying why and its presence is what puts the target on screen.

export default function OperatorFiles({
  parked,
  sample,
  uploading,
  marking,
  twoFiles,
  onFile,
}: {
  parked: string | null;
  sample: string | null;
  /** Which slot is uploading and how far, or null when none is. */
  uploading: { slot: string; pct: number } | null;
  marking: boolean;
  twoFiles: string;
  onFile: (file: File, slot: 'sample' | 'final') => void;
}) {
  return (
    <section className="opq-block">
      <h2>Files</h2>
      <Drop
        label="Clean file"
        hint={
          twoFiles
            ? 'Uploaded now, kept back until they approve.'
            : 'Drop the finished cut. The watermarked sample is made from it here.'
        }
        url={parked ?? ''}
        pct={uploading?.slot === 'final' ? uploading.pct : null}
        working={marking ? 'Watermarking' : null}
        workingHint="About as long again as the clip. This is saved even if you close the page."
        onFile={(f) => onFile(f, 'final')}
      />

      {twoFiles && (
        <>
          <p className="opq-why opq-why-warn">{twoFiles}</p>
          <Drop
            label="Watermarked sample"
            url={sample ?? ''}
            pct={uploading?.slot === 'sample' ? uploading.pct : null}
            working={null}
            onFile={(f) => onFile(f, 'sample')}
          />
        </>
      )}

      {sample && !marking && !twoFiles && (
        <p className="opq-why opq-why-done">
          Sample made.{' '}
          <a href={sample} target="_blank" rel="noreferrer noopener">
            Watch it before you send it
          </a>
          .
        </p>
      )}
    </section>
  );
}
