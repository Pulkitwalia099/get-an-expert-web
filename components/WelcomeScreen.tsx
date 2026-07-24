'use client';

import type { FlowConfig } from '@/components/flows';

// The first screen: the greeting and the starter chips. Picking a suggestion
// sends it as the opening message; the catch-all chip only opens the
// conversation, so the parent handles it separately.
export default function WelcomeScreen({
  config,
  onPick,
  onElse,
}: {
  config: FlowConfig;
  onPick: (text: string) => void;
  onElse: () => void;
}) {
  return (
    <div className="s1">
      <div className="greet">
        <div className="orb">✳︎</div>
        <h1>{config.headline}</h1>
        {config.sub && <div className="sub">{config.sub}</div>}
      </div>
      <div className="chips">
        {config.suggestions.map((s) => (
          <button key={s} className="chip" onClick={() => onPick(s)}>
            {s}
          </button>
        ))}
        {config.elseChip && (
          <button className="chip ghost" onClick={onElse}>
            {config.elseChip}
          </button>
        )}
      </div>
    </div>
  );
}
