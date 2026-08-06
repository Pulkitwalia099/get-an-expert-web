// Two plain SVG diagrams for the experts page. No interactivity, so these stay
// server components. Colours are pulled from the same palette as globals.css
// (accent #C4593C, ink #211E1A, ink-2 #5F594E) so they sit with the rest of
// the site. Both scale to their container; the wrapper handles overflow.

// The life of an expert's agent: we build it with them, it does the work, they
// keep the final say, the client gets the result, and their feedback loops back.
export function WorkflowLoopDiagram() {
  return (
    <svg
      viewBox="0 0 900 236"
      role="img"
      aria-label="Your agent, start to finish. You, then the workflow we build with you, then your review where the final say is yours, then the client result. Your feedback loops back and improves the workflow."
    >
      <defs>
        <marker
          id="wl-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
        </marker>
      </defs>

      {/* You */}
      <rect x="12" y="40" width="180" height="74" rx="14" fill="#F7E7E0" stroke="#C4593C" strokeWidth="1.5" />
      <text x="102" y="72" textAnchor="middle" fontSize="16" fontWeight="650" fill="#211E1A">You</text>
      <text x="102" y="94" textAnchor="middle" fontSize="12.5" fill="#5F594E">the expert</text>

      {/* Your workflow */}
      <rect x="248" y="40" width="180" height="74" rx="14" fill="#FFFFFF" stroke="#DAD3C7" strokeWidth="1.5" />
      <text x="338" y="72" textAnchor="middle" fontSize="15.5" fontWeight="650" fill="#211E1A">Your workflow</text>
      <text x="338" y="94" textAnchor="middle" fontSize="12.5" fill="#5F594E">built with you</text>

      {/* You review */}
      <rect x="484" y="40" width="180" height="74" rx="14" fill="#F7E7E0" stroke="#C4593C" strokeWidth="1.5" />
      <text x="574" y="72" textAnchor="middle" fontSize="15.5" fontWeight="650" fill="#211E1A">You review</text>
      <text x="574" y="94" textAnchor="middle" fontSize="12.5" fill="#5F594E">final say is yours</text>

      {/* Client result */}
      <rect x="720" y="40" width="168" height="74" rx="14" fill="#FFFFFF" stroke="#DAD3C7" strokeWidth="1.5" />
      <text x="804" y="72" textAnchor="middle" fontSize="15.5" fontWeight="650" fill="#211E1A">Client result</text>
      <text x="804" y="94" textAnchor="middle" fontSize="12.5" fill="#5F594E">they get the output</text>

      {/* Forward arrows */}
      <line x1="196" y1="77" x2="244" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-arrow)" />
      <line x1="432" y1="77" x2="480" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-arrow)" />
      <line x1="668" y1="77" x2="716" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-arrow)" />

      {/* Feedback loop: your review flows back into the workflow */}
      <path
        d="M574 114 L574 176 L338 176 L338 117"
        fill="none"
        stroke="#C4593C"
        strokeWidth="2"
        strokeDasharray="5 5"
        markerEnd="url(#wl-arrow)"
      />
      <text x="456" y="200" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#A8452C">
        your feedback improves the workflow
      </text>
    </svg>
  );
}

// A worked example: what a LinkedIn agent looks like under the hood. Small
// agents each do one job and hand off to the next; the expert comes in near the
// end, where judgment matters most.
export function LinkedInWorkflowDiagram() {
  const W = 130;
  const H = 64;
  const GAP = 14;
  const Y = 30;
  const cy = Y + H / 2;
  const x = (i: number) => 12 + i * (W + GAP);

  const nodes = [
    { label: 'Topic in', kind: 'end' },
    { label: 'Research', kind: 'agent' },
    { label: 'Hook', kind: 'agent' },
    { label: 'Draft', kind: 'agent' },
    { label: 'Voice & edit', kind: 'agent' },
    { label: 'Format', kind: 'agent' },
    { label: 'You review', kind: 'you' },
    { label: 'Post live', kind: 'end' },
  ] as const;

  const fill: Record<string, string> = { end: '#F7E7E0', agent: '#FFFFFF', you: '#C4593C' };
  const stroke: Record<string, string> = { end: '#C4593C', agent: '#DAD3C7', you: '#A8452C' };
  const ink: Record<string, string> = { end: '#211E1A', agent: '#211E1A', you: '#FFFFFF' };

  return (
    <svg
      viewBox="0 0 1164 118"
      role="img"
      aria-label="An example LinkedIn workflow. A topic goes in, then small agents hand off in order: research, hook, draft, voice and edit, format. Then you review, and the post goes live."
    >
      <defs>
        <marker
          id="li-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
        </marker>
      </defs>

      {nodes.map((n, i) =>
        i < nodes.length - 1 ? (
          <line
            key={`arrow-${i}`}
            x1={x(i) + W}
            y1={cy}
            x2={x(i + 1)}
            y2={cy}
            stroke="#C4593C"
            strokeWidth="2"
            markerEnd="url(#li-arrow)"
          />
        ) : null
      )}

      {nodes.map((n, i) => (
        <g key={n.label}>
          <rect
            x={x(i)}
            y={Y}
            width={W}
            height={H}
            rx="13"
            fill={fill[n.kind]}
            stroke={stroke[n.kind]}
            strokeWidth="1.5"
          />
          {n.kind === 'agent' ? (
            <>
              <text x={x(i) + W / 2} y={cy - 2} textAnchor="middle" fontSize="14.5" fontWeight="650" fill={ink[n.kind]}>
                {n.label}
              </text>
              <text x={x(i) + W / 2} y={cy + 16} textAnchor="middle" fontSize="11" fill="#8B8375">
                agent
              </text>
            </>
          ) : (
            <text x={x(i) + W / 2} y={cy + 5} textAnchor="middle" fontSize="14.5" fontWeight="650" fill={ink[n.kind]}>
              {n.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
