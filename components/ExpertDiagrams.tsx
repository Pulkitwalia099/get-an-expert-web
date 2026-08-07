// Small SVG diagrams for the experts page. Server components, no
// interactivity. Palette matches globals.css (accent #C4593C, ink #211E1A,
// ink-2 #5F594E). Each diagram ships a landscape and a portrait variant,
// swapped by CSS (.d-desktop / .d-mobile), so phones never sideways-scroll.
// The dense machine diagram lives in ExpertMachineDiagram.

// The reframe, drawn instead of written: the chat window an expert already
// knows next to the agent network we build. One message at a time versus a
// whole job running on its own.

const CVA_DOTS = [
  { x: 105, y: 66 },
  { x: 170, y: 36 },
  { x: 235, y: 81 },
  { x: 145, y: 126 },
  { x: 215, y: 161 },
  { x: 290, y: 41 },
  { x: 305, y: 126 },
  { x: 100, y: 176 },
  { x: 180, y: 206 },
  { x: 275, y: 201 },
];
const CVA_LINKS: Array<[number, number]> = [
  [0, 1], [0, 3], [1, 2], [1, 5], [2, 4], [2, 6], [3, 4], [3, 7],
  [4, 8], [4, 9], [5, 6], [6, 9], [7, 8], [8, 9], [2, 5], [0, 4],
];

// Chat bubbles as {x, y, w, dark} within a 400-wide panel.
const CVA_BUBBLES = [
  { x: 160, y: 46, w: 216, dark: true },
  { x: 24, y: 88, w: 250, dark: false },
  { x: 130, y: 130, w: 246, dark: true },
  { x: 24, y: 172, w: 190, dark: false },
];

function ChatPanel({ ox, oy }: { ox: number; oy: number }) {
  return (
    <g>
      <rect x={ox} y={oy} width="400" height="236" rx="16" fill="#FFFFFF" stroke="#DAD3C7" strokeWidth="1.5" />
      <circle cx={ox + 24} cy={oy + 22} r="5" fill="#FF5F57" />
      <circle cx={ox + 40} cy={oy + 22} r="5" fill="#FEBC2E" />
      <circle cx={ox + 56} cy={oy + 22} r="5" fill="#28C840" />
      {CVA_BUBBLES.map((b) => (
        <rect key={b.y} x={ox + b.x} y={oy + b.y} width={b.w} height="30" rx="13" fill={b.dark ? '#262019' : '#F1EDE4'} />
      ))}
    </g>
  );
}

function AgentsPanel({ ox, oy, id }: { ox: number; oy: number; id: string }) {
  return (
    <g>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
        </marker>
      </defs>
      <rect x={ox} y={oy} width="400" height="236" rx="16" fill="#FFFFFF" stroke="#DAD3C7" strokeWidth="1.5" />
      {CVA_LINKS.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={ox + CVA_DOTS[a].x}
          y1={oy + CVA_DOTS[a].y}
          x2={ox + CVA_DOTS[b].x}
          y2={oy + CVA_DOTS[b].y}
          stroke="#C4593C"
          strokeWidth="1.3"
          opacity="0.55"
        />
      ))}
      {CVA_DOTS.map((d, i) => (
        <circle key={i} cx={ox + d.x} cy={oy + d.y} r="11" fill="#F7E7E0" stroke="#C4593C" strokeWidth="1.5" />
      ))}
      {/* The work exits through you */}
      <line x1={ox + 316} y1={oy + 126} x2={ox + 326} y2={oy + 126} stroke="#C4593C" strokeWidth="1.7" markerEnd={`url(#${id})`} />
      <circle cx={ox + 348} cy={oy + 126} r="18" fill="#C4593C" />
      <text x={ox + 348} y={oy + 130} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#FFFFFF">you</text>
    </g>
  );
}

function PanelTitle({ x, y, title, sub }: { x: number; y: number; title: string; sub: string }) {
  return (
    <g>
      <text x={x} y={y} textAnchor="middle" fontSize="14.5" fontWeight="650" fill="#211E1A">{title}</text>
      <text x={x} y={y + 19} textAnchor="middle" fontSize="12" fill="#8B8375">{sub}</text>
    </g>
  );
}

export function ChatVsAgentsDiagram() {
  const aria =
    'Two panels. First, the AI you use today: a chat window answering one message at a time. Second, where it can go: a network of agents running the whole job, ending at you for sign off.';
  return (
    <>
      <svg viewBox="0 0 900 320" className="d-desktop" role="img" aria-label={aria}>
        <ChatPanel ox={20} oy={24} />
        <PanelTitle x={220} y={290} title="Your AI today" sub="answers one message at a time" />
        <AgentsPanel ox={480} oy={24} id="cva-l" />
        <PanelTitle x={680} y={290} title="Your AI, agentized" sub="runs the whole job, you sign off" />
      </svg>
      <svg viewBox="0 0 440 660" className="d-mobile" role="img" aria-label={aria}>
        <ChatPanel ox={20} oy={16} />
        <PanelTitle x={220} y={280} title="Your AI today" sub="answers one message at a time" />
        <AgentsPanel ox={20} oy={352} id="cva-p" />
        <PanelTitle x={220} y={616} title="Your AI, agentized" sub="runs the whole job, you sign off" />
      </svg>
    </>
  );
}

// The deal in one picture: we build it with you, it works, you keep the final
// say, the client gets the result, and your feedback loops back in.

const LOOP_STEPS = [
  { label: 'You', sub: 'the expert', kind: 'end' },
  { label: 'Your workflow', sub: 'agents run it end to end', kind: 'agent' },
  { label: 'You review', sub: 'final say is yours', kind: 'end' },
  { label: 'Client result', sub: 'they get the output', kind: 'agent' },
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
    'Your agent, start to finish. You, then the workflow where agents run it end to end, then your review where the final say is yours, then the client result. Your feedback loops back and improves the workflow.';
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
