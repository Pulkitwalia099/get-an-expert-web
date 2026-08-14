// Small SVG diagrams for the experts page. Server components, no
// interactivity. Palette matches globals.css (accent #C4593C, ink #211E1A,
// ink-2 #5F594E). Each diagram ships a landscape and a portrait variant,
// swapped by CSS (.d-desktop / .d-mobile), so phones never sideways-scroll.
// The hero comparison lives in ExpertHeroDemo, the dense machine diagram in
// ExpertMachineDiagram.

// The deal in one picture: we build it with you, agents run the steps, you
// keep the final say, the client gets the result, and your feedback loops
// back in.

const LOOP_STEPS = [
  { label: 'You', sub: 'the expert', kind: 'end' },
  { label: 'Your workflow', sub: 'agents run every step', kind: 'agent' },
  { label: 'You review', sub: 'final say is yours', kind: 'end' },
  { label: 'Client result', sub: 'the finished work, delivered', kind: 'agent' },
] as const;

function LoopBox({ cx, cy, w, h, step }: { cx: number; cy: number; w: number; h: number; step: (typeof LOOP_STEPS)[number] }) {
  const end = step.kind === 'end';
  return (
    <g>
      <rect
        x={cx - w / 2}
        y={cy - h / 2}
        width={w}
        height={h}
        rx="14"
        fill={end ? '#F7E7E0' : '#FFFFFF'}
        stroke={end ? '#C4593C' : '#DAD3C7'}
        strokeWidth="1.5"
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15.5" fontWeight="650" fill="#211E1A">{step.label}</text>
      <text x={cx} y={cy + 17} textAnchor="middle" fontSize="12.5" fill="#5F594E">{step.sub}</text>
    </g>
  );
}

export function WorkflowLoopDiagram() {
  const aria =
    'Your agent, start to finish. You, then your workflow where agents run every step, then your review where the final say is yours, then the client result. Your feedback loops back and improves the workflow.';
  return (
    <>
      <svg viewBox="0 0 900 236" className="d-desktop" role="img" aria-label={aria}>
        <defs>
          <marker id="wl-l" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
          </marker>
        </defs>
        {LOOP_STEPS.map((s, i) => (
          <LoopBox key={s.label} cx={102 + i * 234} cy={77} w={182} h={74} step={s} />
        ))}
        <line x1="194" y1="77" x2="244" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-l)" />
        <line x1="428" y1="77" x2="478" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-l)" />
        <line x1="662" y1="77" x2="712" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-l)" />
        <path d="M570 114 L570 176 L336 176 L336 117" fill="none" stroke="#C4593C" strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#wl-l)" />
        <text x="453" y="168" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#A8452C">
          feedback
        </text>
      </svg>
      <svg viewBox="0 0 340 452" className="d-mobile" role="img" aria-label={aria}>
        <defs>
          <marker id="wl-p" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
          </marker>
        </defs>
        {LOOP_STEPS.map((s, i) => (
          <LoopBox key={s.label} cx={150} cy={55 + i * 114} w={220} h={70} step={s} />
        ))}
        <line x1="150" y1="90" x2="150" y2="130" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-p)" />
        <line x1="150" y1="204" x2="150" y2="244" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-p)" />
        <line x1="150" y1="318" x2="150" y2="358" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-p)" />
        <path d="M262 288 Q318 231 264 176" fill="none" stroke="#C4593C" strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#wl-p)" />
        <text x="300" y="152" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#A8452C">
          feedback
        </text>
      </svg>
    </>
  );
}
