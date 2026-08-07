// The "wow" diagram: one expert's work, agentized, shown as a LinkedIn
// example. Two layouts of the same 15-node machine: landscape for desktop,
// portrait for phones, swapped by CSS (.d-desktop / .d-mobile). Dense enough
// to feel like a serious machine, always ending at YOU.

type Kind = 'end' | 'agent' | 'gate' | 'you' | 'mem';

interface Node {
  x: number; // centre
  y: number; // centre
  w: number;
  h: number;
  label: string;
  sub?: string;
  kind: Kind;
}

interface Layout {
  viewBox: string;
  nodes: Record<string, Node>;
  lanes: Array<{ x: number; y: number; label: string; anchor: 'middle' | 'start' }>;
  dashed: string[];
  labels: Array<{ x: number; y: number; text: string; anchor: 'middle' | 'start' | 'end' }>;
}

const FILL: Record<Kind, string> = {
  end: '#F7E7E0',
  agent: '#FFFFFF',
  gate: '#FBF3E2',
  you: '#C4593C',
  mem: '#F1EDE4',
};
const STROKE: Record<Kind, string> = {
  end: '#C4593C',
  agent: '#DAD3C7',
  gate: '#D98E28',
  you: '#A8452C',
  mem: '#C8BFA9',
};
const INK: Record<Kind, string> = {
  end: '#211E1A',
  agent: '#211E1A',
  gate: '#211E1A',
  you: '#FFFFFF',
  mem: '#5F594E',
};

const FLOW: Array<[string, string]> = [
  ['topic', 'trend'],
  ['topic', 'audience'],
  ['topic', 'deep'],
  ['trend', 'merge'],
  ['audience', 'merge'],
  ['deep', 'merge'],
  ['merge', 'hookA'],
  ['merge', 'hookB'],
  ['merge', 'hookC'],
  ['merge', 'draft'],
  ['hookA', 'judge'],
  ['hookB', 'judge'],
  ['hookC', 'judge'],
  ['judge', 'draft'],
  ['draft', 'voice'],
  ['voice', 'fact'],
  ['voice', 'tone'],
  ['fact', 'you'],
  ['tone', 'you'],
  ['you', 'live'],
];

const LANDSCAPE: Layout = {
  viewBox: '0 0 1032 600',
  nodes: {
    topic: { x: 62, y: 280, w: 96, h: 52, label: 'Topic in', kind: 'end' },
    trend: { x: 215, y: 110, w: 128, h: 50, label: 'Trend scan', sub: 'agent', kind: 'agent' },
    audience: { x: 215, y: 230, w: 128, h: 50, label: 'Audience mine', sub: 'agent', kind: 'agent' },
    deep: { x: 215, y: 350, w: 128, h: 50, label: 'Deep research', sub: 'agent', kind: 'agent' },
    merge: { x: 380, y: 230, w: 122, h: 52, label: 'Insight merge', sub: 'expert review', kind: 'agent' },
    hookA: { x: 540, y: 90, w: 100, h: 44, label: 'Hook A', sub: 'agent', kind: 'agent' },
    hookB: { x: 540, y: 170, w: 100, h: 44, label: 'Hook B', sub: 'agent', kind: 'agent' },
    hookC: { x: 540, y: 250, w: 100, h: 44, label: 'Hook C', sub: 'agent', kind: 'agent' },
    judge: { x: 670, y: 170, w: 108, h: 48, label: 'Hook judge', sub: 'expert review', kind: 'agent' },
    draft: { x: 540, y: 360, w: 100, h: 48, label: 'Draft', sub: 'agent', kind: 'agent' },
    voice: { x: 670, y: 360, w: 112, h: 48, label: 'Voice match', sub: 'expert review', kind: 'agent' },
    fact: { x: 810, y: 180, w: 110, h: 44, label: 'Fact check', sub: 'expert review', kind: 'gate' },
    tone: { x: 810, y: 300, w: 110, h: 44, label: 'Tone check', sub: 'expert review', kind: 'gate' },
    you: { x: 945, y: 240, w: 130, h: 80, label: 'YOU', sub: 'final say', kind: 'you' },
    live: { x: 945, y: 80, w: 104, h: 50, label: 'Post live', kind: 'end' },
    voiceMem: { x: 540, y: 510, w: 126, h: 48, label: 'Voice memory', sub: 'memory', kind: 'mem' },
    engage: { x: 810, y: 510, w: 140, h: 48, label: 'Engagement data', sub: 'memory', kind: 'mem' },
  },
  lanes: [
    { x: 215, y: 24, label: '1 · RESEARCH', anchor: 'middle' },
    { x: 605, y: 24, label: '2 · WRITE', anchor: 'middle' },
    { x: 810, y: 24, label: '3 · CHECK', anchor: 'middle' },
    { x: 945, y: 24, label: '4 · YOU', anchor: 'middle' },
  ],
  // Learning loops, routed through the empty lanes below and beside the
  // grid so no path crosses a box: YOU down and left into voice memory,
  // voice memory up into the voice agent, the live post around the right
  // edge into engagement data.
  dashed: [
    'M945 284 L945 540 Q945 574 911 574 L640 574 Q590 574 586 538',
    'M583 484 Q622 448 655 390',
    'M997 88 Q1018 92 1018 132 L1018 468 Q1018 510 972 510 L884 510',
  ],
  labels: [{ x: 770, y: 564, text: 'your edits teach your agents', anchor: 'middle' }],
};

const PORTRAIT: Layout = {
  viewBox: '0 0 480 1010',
  nodes: {
    topic: { x: 240, y: 40, w: 110, h: 50, label: 'Topic in', kind: 'end' },
    trend: { x: 90, y: 130, w: 120, h: 48, label: 'Trend scan', sub: 'agent', kind: 'agent' },
    audience: { x: 240, y: 130, w: 128, h: 48, label: 'Audience mine', sub: 'agent', kind: 'agent' },
    deep: { x: 390, y: 130, w: 120, h: 48, label: 'Deep research', sub: 'agent', kind: 'agent' },
    merge: { x: 240, y: 230, w: 122, h: 50, label: 'Insight merge', sub: 'expert review', kind: 'agent' },
    hookA: { x: 90, y: 330, w: 96, h: 44, label: 'Hook A', sub: 'agent', kind: 'agent' },
    hookB: { x: 240, y: 330, w: 96, h: 44, label: 'Hook B', sub: 'agent', kind: 'agent' },
    hookC: { x: 390, y: 330, w: 96, h: 44, label: 'Hook C', sub: 'agent', kind: 'agent' },
    judge: { x: 240, y: 420, w: 108, h: 46, label: 'Hook judge', sub: 'expert review', kind: 'agent' },
    // Draft sits beside the judge so the merge-to-draft edge threads the
    // gap between Hook A and Hook B instead of crossing either box.
    draft: { x: 90, y: 420, w: 96, h: 46, label: 'Draft', sub: 'agent', kind: 'agent' },
    voice: { x: 240, y: 505, w: 110, h: 46, label: 'Voice match', sub: 'expert review', kind: 'agent' },
    fact: { x: 140, y: 600, w: 104, h: 42, label: 'Fact check', sub: 'expert review', kind: 'gate' },
    tone: { x: 340, y: 600, w: 104, h: 42, label: 'Tone check', sub: 'expert review', kind: 'gate' },
    you: { x: 240, y: 720, w: 140, h: 80, label: 'YOU', sub: 'final say', kind: 'you' },
    live: { x: 240, y: 850, w: 110, h: 48, label: 'Post live', kind: 'end' },
    voiceMem: { x: 150, y: 945, w: 130, h: 46, label: 'Voice memory', sub: 'memory', kind: 'mem' },
    engage: { x: 355, y: 945, w: 150, h: 46, label: 'Engagement data', sub: 'memory', kind: 'mem' },
  },
  lanes: [
    { x: 16, y: 95, label: '1 · RESEARCH', anchor: 'start' },
    { x: 16, y: 296, label: '2 · WRITE', anchor: 'start' },
    { x: 16, y: 566, label: '3 · CHECK', anchor: 'start' },
    { x: 16, y: 668, label: '4 · YOU', anchor: 'start' },
  ],
  // Same learning loops as landscape, minus voice memory into the voice
  // agent, which has no clear lane on a phone. Both curves run through the
  // empty margins beside the YOU and live boxes.
  dashed: [
    'M215 762 Q150 830 150 919',
    'M268 876 Q355 898 355 919',
  ],
  labels: [{ x: 240, y: 998, text: 'your edits teach your agents', anchor: 'middle' }],
};

function MachineSvg({ layout, id, className }: { layout: Layout; id: string; className: string }) {
  const { nodes, lanes, dashed, labels } = layout;

  // Where a line from node a toward node b leaves a's rectangle.
  const anchorPt = (a: Node, b: Node) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const sx = dx === 0 ? Infinity : a.w / 2 / Math.abs(dx);
    const sy = dy === 0 ? Infinity : a.h / 2 / Math.abs(dy);
    const t = Math.min(sx, sy);
    return { x: a.x + dx * t, y: a.y + dy * t };
  };

  return (
    <svg
      viewBox={layout.viewBox}
      className={className}
      role="img"
      aria-label="One expert's work, agentized, using a LinkedIn post as the example. A topic fans out to three research agents in parallel. Their findings merge, three hook agents compete and a judge picks the winner, a draft agent writes and a voice match agent applies your voice, then fact and tone checks run. The merge, the judge, the voice match and both checks are marked expert review: places where you, the expert, look at the work. Everything stops at you, the final say, before the post goes live. Your edits flow into voice memory and live results into engagement data, so your agents learn from you."
    >
      <defs>
        <marker id={`${id}-a`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
        </marker>
        <marker id={`${id}-d`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#8B8375" />
        </marker>
      </defs>

      {lanes.map((l) => (
        <text key={l.label} x={l.x} y={l.y} textAnchor={l.anchor} fontSize="11.5" fontWeight="700" letterSpacing="0.08em" fill="#8B8375">
          {l.label}
        </text>
      ))}

      {FLOW.map(([a, b]) => {
        const p1 = anchorPt(nodes[a], nodes[b]);
        const p2 = anchorPt(nodes[b], nodes[a]);
        return (
          <line key={`${a}-${b}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#C4593C" strokeWidth="1.7" opacity="0.85" markerEnd={`url(#${id}-a)`} />
        );
      })}

      {dashed.map((d) => (
        <path key={d} d={d} fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd={`url(#${id}-d)`} />
      ))}

      {labels.map((l) => (
        <text key={l.text} x={l.x} y={l.y} textAnchor={l.anchor} fontSize="11.5" fontWeight="600" fill="#8B8375">
          {l.text}
        </text>
      ))}

      {Object.entries(nodes).map(([key, n]) => (
        <g key={key}>
          <rect
            x={n.x - n.w / 2}
            y={n.y - n.h / 2}
            width={n.w}
            height={n.h}
            rx={n.kind === 'mem' ? 20 : 12}
            fill={FILL[n.kind]}
            stroke={STROKE[n.kind]}
            strokeWidth={n.kind === 'you' ? 2 : 1.4}
          />
          <text
            x={n.x}
            y={n.sub ? n.y - 1 : n.y + 4.5}
            textAnchor="middle"
            fontSize={n.kind === 'you' ? 19 : 13}
            fontWeight="650"
            fill={INK[n.kind]}
          >
            {n.label}
          </text>
          {n.sub ? (
            <text
              x={n.x}
              y={n.y + 16}
              textAnchor="middle"
              fontSize="10"
              fontWeight={n.sub === 'expert review' ? 600 : 400}
              fill={n.kind === 'you' ? 'rgba(255,255,255,.85)' : n.sub === 'expert review' ? '#A8452C' : '#8B8375'}
            >
              {n.sub}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export default function ExpertMachineDiagram() {
  return (
    <>
      <MachineSvg layout={LANDSCAPE} id="mml" className="d-desktop" />
      <MachineSvg layout={PORTRAIT} id="mmp" className="d-mobile" />
    </>
  );
}
