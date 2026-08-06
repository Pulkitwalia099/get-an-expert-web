// Small SVG diagrams for the experts page. Server components, no
// interactivity. Palette matches globals.css (accent #C4593C, ink #211E1A,
// ink-2 #5F594E). The dense machine diagram lives in ExpertMachineDiagram.

// The reframe, drawn instead of written: the chat window an expert already
// knows next to the agent network we build. One message at a time versus a
// whole job running on its own.
export function ChatVsAgentsDiagram() {
  // Scattered agent network for the right panel. Positions are hand-placed;
  // the "you" node sits at the exit, where the work stops for approval.
  const dots = [
    { x: 545, y: 90 },
    { x: 610, y: 60 },
    { x: 675, y: 105 },
    { x: 585, y: 150 },
    { x: 655, y: 185 },
    { x: 730, y: 65 },
    { x: 745, y: 150 },
    { x: 540, y: 200 },
    { x: 620, y: 230 },
    { x: 715, y: 225 },
  ];
  const links: Array<[number, number]> = [
    [0, 1], [0, 3], [1, 2], [1, 5], [2, 4], [2, 6], [3, 4], [3, 7],
    [4, 8], [4, 9], [5, 6], [6, 9], [7, 8], [8, 9], [2, 5], [0, 4],
  ];
  return (
    <svg
      viewBox="0 0 900 320"
      role="img"
      aria-label="Two panels. Left, the AI you use today: a chat window answering one message at a time. Right, where it can go: a network of agents running the whole job, ending at you for sign off."
    >
      <defs>
        <marker id="cva-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
        </marker>
      </defs>

      {/* Left: the chat window they know */}
      <rect x="20" y="24" width="400" height="236" rx="16" fill="#FFFFFF" stroke="#DAD3C7" strokeWidth="1.5" />
      <circle cx="44" cy="46" r="5" fill="#FF5F57" />
      <circle cx="60" cy="46" r="5" fill="#FEBC2E" />
      <circle cx="76" cy="46" r="5" fill="#28C840" />
      <rect x="180" y="70" width="216" height="30" rx="13" fill="#262019" />
      <rect x="44" y="112" width="250" height="30" rx="13" fill="#F1EDE4" />
      <rect x="150" y="154" width="246" height="30" rx="13" fill="#262019" />
      <rect x="44" y="196" width="190" height="30" rx="13" fill="#F1EDE4" />
      <text x="220" y="290" textAnchor="middle" fontSize="14.5" fontWeight="650" fill="#211E1A">Your AI today</text>
      <text x="220" y="309" textAnchor="middle" fontSize="12" fill="#8B8375">answers one message at a time</text>

      {/* Right: the agent network we build */}
      <rect x="480" y="24" width="400" height="236" rx="16" fill="#FFFFFF" stroke="#DAD3C7" strokeWidth="1.5" />
      {links.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={dots[a].x}
          y1={dots[a].y}
          x2={dots[b].x}
          y2={dots[b].y}
          stroke="#C4593C"
          strokeWidth="1.3"
          opacity="0.55"
        />
      ))}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="11" fill="#F7E7E0" stroke="#C4593C" strokeWidth="1.5" />
      ))}
      {/* The work exits through you */}
      <line x1="756" y1="150" x2="806" y2="150" stroke="#C4593C" strokeWidth="1.7" markerEnd="url(#cva-a)" />
      <circle cx="828" cy="150" r="18" fill="#C4593C" />
      <text x="828" y="154" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#FFFFFF">you</text>
      <text x="680" y="290" textAnchor="middle" fontSize="14.5" fontWeight="650" fill="#211E1A">Your AI, agentized</text>
      <text x="680" y="309" textAnchor="middle" fontSize="12" fill="#8B8375">runs the whole job, you sign off</text>
    </svg>
  );
}

// The deal in one picture: we build it with you, it works, you keep the final
// say, the client gets the result, and your feedback loops back in.
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

      <rect x="12" y="40" width="180" height="74" rx="14" fill="#F7E7E0" stroke="#C4593C" strokeWidth="1.5" />
      <text x="102" y="72" textAnchor="middle" fontSize="16" fontWeight="650" fill="#211E1A">You</text>
      <text x="102" y="94" textAnchor="middle" fontSize="12.5" fill="#5F594E">the expert</text>

      <rect x="248" y="40" width="180" height="74" rx="14" fill="#FFFFFF" stroke="#DAD3C7" strokeWidth="1.5" />
      <text x="338" y="72" textAnchor="middle" fontSize="15.5" fontWeight="650" fill="#211E1A">Your workflow</text>
      <text x="338" y="94" textAnchor="middle" fontSize="12.5" fill="#5F594E">agents run it end to end</text>

      <rect x="484" y="40" width="180" height="74" rx="14" fill="#F7E7E0" stroke="#C4593C" strokeWidth="1.5" />
      <text x="574" y="72" textAnchor="middle" fontSize="15.5" fontWeight="650" fill="#211E1A">You review</text>
      <text x="574" y="94" textAnchor="middle" fontSize="12.5" fill="#5F594E">final say is yours</text>

      <rect x="720" y="40" width="168" height="74" rx="14" fill="#FFFFFF" stroke="#DAD3C7" strokeWidth="1.5" />
      <text x="804" y="72" textAnchor="middle" fontSize="15.5" fontWeight="650" fill="#211E1A">Client result</text>
      <text x="804" y="94" textAnchor="middle" fontSize="12.5" fill="#5F594E">they get the output</text>

      <line x1="196" y1="77" x2="244" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-arrow)" />
      <line x1="432" y1="77" x2="480" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-arrow)" />
      <line x1="668" y1="77" x2="716" y2="77" stroke="#C4593C" strokeWidth="2" markerEnd="url(#wl-arrow)" />

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
