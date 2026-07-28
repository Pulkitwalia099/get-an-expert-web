'use client';

import type { FlowConfig } from '@/components/flows';
import TryChips from '@/components/TryChips';

// The first screen: the greeting and the starter chips. Picking a suggestion
// sends its full message as the opening line, not the short chip label, so the
// model gets a sentence to work with. The catch-all chip only opens the
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
      {/* No orb. The wordmark in the titlebar already says whose window this
          is, and a second mark directly above the headline pushed the question
          down the screen to say the same thing twice. */}
      <div className="greet">
        <h1>{config.headline}</h1>
        {config.sub && <div className="sub">{config.sub}</div>}
      </div>
      <TryChips
        suggestions={config.suggestions}
        onPick={onPick}
        elseChip={config.elseChip}
        onElse={onElse}
      />
    </div>
  );
}
