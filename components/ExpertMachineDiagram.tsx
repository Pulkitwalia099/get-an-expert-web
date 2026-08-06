// The "wow" diagram: one LinkedIn post under the hood. Deliberately dense,
// twelve agents in parallel lanes with checks, memory and learning loops, so
// an expert feels this is a serious machine they could not build alone. The
// spine stays readable left to right: topic in, research, write, check, YOU,
// live. Palette matches globals.css.

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
  topic: { x: 70, y: 300, w: 104, h: 56, label: 'Topic in', kind: 'end' },
  planner: { x: 225, y: 300, w: 118, h: 56, label: 'Planner', sub: 'agent', kind: 'agent' },

  trend: { x: 395, y: 80, w: 130, h: 50, label: 'Trend scan', sub: 'agent', kind: 'agent' },
  rival: { x: 395, y: 175, w: 130, h: 50, label: 'Rival scan', sub: 'agent', kind: 'agent' },
  audience: { x: 395, y: 270, w: 130, h: 50, label: 'Audience mine', sub: 'agent', kind: 'agent' },
  deep: { x: 395, y: 365, w: 130, h: 50, label: 'Deep research', sub: 'agent', kind: 'agent' },
  merge: { x: 560, y: 220, w: 126, h: 52, label: 'Insight merge', sub: 'agent', kind: 'agent' },

  hookA: { x: 720, y: 80, w: 104, h: 44, label: 'Hook A', sub: 'agent', kind: 'agent' },
  hookB: { x: 720, y: 160, w: 104, h: 44, label: 'Hook B', sub: 'agent', kind: 'agent' },
  hookC: { x: 720, y: 240, w: 104, h: 44, label: 'Hook C', sub: 'agent', kind: 'agent' },
  judge: { x: 860, y: 160, w: 112, h: 48, label: 'Hook judge', sub: 'agent', kind: 'agent' },
  draft: { x: 720, y: 350, w: 104, h: 50, label: 'Draft', sub: 'agent', kind: 'agent' },
  voice: { x: 860, y: 350, w: 116, h: 50, label: 'Voice match', sub: 'agent', kind: 'agent' },

  fact: { x: 1000, y: 160, w: 114, h: 46, label: 'Fact check', kind: 'gate' },
  tone: { x: 1000, y: 250, w: 114, h: 46, label: 'Tone check', kind: 'gate' },
  format: { x: 1000, y: 340, w: 114, h: 46, label: 'Format check', kind: 'gate' },

  you: { x: 1142, y: 250, w: 150, h: 84, label: 'YOU', sub: 'final say', kind: 'you' },
  live: { x: 1142, y: 80, w: 110, h: 52, label: 'Post live', kind: 'end' },

  winners: { x: 560, y: 560, w: 130, h: 50, label: 'Past winners', sub: 'memory', kind: 'mem' },
  voiceMem: { x: 720, y: 560, w: 130, h: 50, label: 'Voice memory', sub: 'memory', kind: 'mem' },
  engage: { x: 1000, y: 560, w: 142, h: 50, label: 'Engagement data', sub: 'memory', kind: 'mem' },
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
  ['topic', 'planner'],
  ['planner', 'trend'],
  ['planner', 'rival'],
  ['planner', 'audience'],
  ['planner', 'deep'],
  ['trend', 'merge'],
  ['rival', 'merge'],
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
  ['voice', 'format'],
  ['fact', 'you'],
  ['tone', 'you'],
  ['format', 'you'],
  ['you', 'live'],
];

const LANES = [
  { x: 395, label: '1 · Research' },
  { x: 790, label: '2 · Write' },
  { x: 1000, label: '3 · Check' },
  { x: 1142, label: '4 · You' },
];

export default function ExpertMachineDiagram() {
  return (
    <svg
      viewBox="0 0 1240 650"
      role="img"
      aria-label="One LinkedIn post under the hood. A topic goes to a planner agent, which fans out to four research agents in parallel. Their findings merge, three hook agents compete and a judge picks the winner, a draft agent writes, a voice match agent applies your voice, and three checks run for facts, tone and format. Then everything stops at you, the final say, before the post goes live. Below, memory of past winners, your voice and engagement data feeds back, so the whole machine learns from your edits."
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

      {/* Learning loops, dashed grey: you to memory, live to engagement, and back up into the machine */}
      <path d="M1142 292 Q1142 560 790 560" fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />
      <path d="M745 535 Q790 450 848 378" fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />
      <path d="M1197 80 Q1240 340 1075 552 " fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />
      <path d="M929 572 Q780 622 629 572" fill="none" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />
      <path d="M560 535 L560 250" stroke="#8B8375" strokeWidth="1.7" strokeDasharray="5 5" markerEnd="url(#m-d)" />

      <text x="1120" y="455" fontSize="11.5" fontWeight="600" fill="#8B8375">your edits teach it</text>
      <text x="779" y="618" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#8B8375">what worked comes back</text>

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
