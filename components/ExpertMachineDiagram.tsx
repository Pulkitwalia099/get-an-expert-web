// The "wow" diagram: one expert's work, agentized. Shown as a LinkedIn
// example on the page, with copy making clear it is one shape of many.
// Dense enough to feel like a serious machine, trimmed enough to survive a
// phone screen: three research agents in parallel, competing hooks with a
// judge, drafting and voice, two checks, then everything stops at YOU.
// Palette matches globals.css.

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

const N: Record<string, Node> = {
  topic: { x: 62, y: 280, w: 96, h: 52, label: 'Topic in', kind: 'end' },

  trend: { x: 215, y: 110, w: 128, h: 50, label: 'Trend scan', sub: 'agent', kind: 'agent' },
  audience: { x: 215, y: 230, w: 128, h: 50, label: 'Audience mine', sub: 'agent', kind: 'agent' },
  deep: { x: 215, y: 350, w: 128, h: 50, label: 'Deep research', sub: 'agent', kind: 'agent' },
  merge: { x: 380, y: 230, w: 122, h: 52, label: 'Insight merge', sub: 'agent', kind: 'agent' },

  hookA: { x: 540, y: 90, w: 100, h: 44, label: 'Hook A', sub: 'agent', kind: 'agent' },
  hookB: { x: 540, y: 170, w: 100, h: 44, label: 'Hook B', sub: 'agent', kind: 'agent' },
  hookC: { x: 540, y: 250, w: 100, h: 44, label: 'Hook C', sub: 'agent', kind: 'agent' },
  judge: { x: 670, y: 170, w: 108, h: 48, label: 'Hook judge', sub: 'agent', kind: 'agent' },
  draft: { x: 540, y: 360, w: 100, h: 48, label: 'Draft', sub: 'agent', kind: 'agent' },
  voice: { x: 670, y: 360, w: 112, h: 48, label: 'Voice match', sub: 'agent', kind: 'agent' },

  fact: { x: 810, y: 180, w: 110, h: 44, label: 'Fact check', kind: 'gate' },
  tone: { x: 810, y: 300, w: 110, h: 44, label: 'Tone check', kind: 'gate' },

  you: { x: 945, y: 240, w: 130, h: 80, label: 'YOU', sub: 'final say', kind: 'you' },
  live: { x: 945, y: 80, w: 104, h: 50, label: 'Post live', kind: 'end' },

  voiceMem: { x: 540, y: 510, w: 126, h: 48, label: 'Voice memory', sub: 'memory', kind: 'mem' },
  engage: { x: 810, y: 510, w: 140, h: 48, label: 'Engagement data', sub: 'memory', kind: 'mem' },
};

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

// Where a line from node a toward node b leaves a's rectangle.
function anchor(a: Node, b: Node) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const sx = dx === 0 ? Infinity : a.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : a.h / 2 / Math.abs(dy);
  const t = Math.min(sx, sy);
  return { x: a.x + dx * t, y: a.y + dy * t };
}

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

const LANES = [
  { x: 215, label: '1 · Research' },
  { x: 605, label: '2 · Write' },
  { x: 810, label: '3 · Check' },
  { x: 945, label: '4 · You' },
];

export default function ExpertMachineDiagram() {
  return (
    <svg
      viewBox="0 0 1020 600"
      role="img"
      aria-label="One expert's work, agentized, using a LinkedIn post as the example. A topic fans out to three research agents in parallel. Their findings merge, three hook agents compete and a judge picks the winner, a draft agent writes and a voice match agent applies your voice, then fact and tone checks run. Everything stops at you, the final say, before the post goes live. Below, voice memory and engagement data feed back, so the machine learns from your edits."
    >
      <defs>
        <marker id="m-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
        </marker>
        <marker id="m-d" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#8B8375" />
        </marker>
      </defs>

      {LANES.map((l) => (
        <text key={l.label} x={l.x} y="24" textAnchor="middle" fontSize="11.5" fontWeight="700" letterSpacing="0.08em" fill="#8B8375">
          {l.label.toUpperCase()}
        </text>
      ))}

      {FLOW.map(([a, b]) => {
        const p1 = anchor(N[a], N[b]);
        const p2 = anchor(N[b], N[a]);
        return (
          <line key={`${a}-${b}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#C4593C" strokeWidth="1.7" opacity="0.85" markerEnd="url(#m-a)" />
        );
      })}

      {/* Learning loops, dashed grey: your edits and live results feed back in */}
      <path d="M945 282 Q945 512 608 512" fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />
      <path d="M565 486 Q610 440 650 388" fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />
      <path d="M997 82 Q1030 320 883 500" fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />
      <path d="M740 522 Q400 570 378 260" fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />

      <text x="925" y="368" textAnchor="end" fontSize="11.5" fontWeight="600" fill="#8B8375">your edits teach it</text>
      <text x="620" y="576" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#8B8375">what worked comes back</text>

      {Object.entries(N).map(([key, n]) => (
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
            <text x={n.x} y={n.y + 16} textAnchor="middle" fontSize="10" fill={n.kind === 'you' ? 'rgba(255,255,255,.85)' : '#8B8375'}>
              {n.sub}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
