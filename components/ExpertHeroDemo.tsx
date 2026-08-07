// The hero comparison, animated. Two looping panels built from the same
// LinkedIn post: on the left the way experts use AI today, a chat where the
// person does every step between prompts; on the right the same job
// agentized, sub-agents running the steps and the expert dropping feedback
// at the review points. Server component: the loop is pure CSS keyframes
// (xd* rules in globals.css), so there is no client JS and reduced-motion
// browsers get the finished picture instead of the loop.
//
// Class contract with globals.css: .xa1 to .xa5 stage chat items into the
// five phases of a 15 second cycle, .xg1 to .xg5 do the same for graph
// nodes, .ca1 to .ca5 swap the caption line, .xd-youc pulses during the
// review phase. Phase timing lives entirely in the CSS.

const A_CAPTIONS = [
  'You ask for research',
  'You read all of it and pick an idea',
  'You ask for a draft',
  'You rewrite the draft by hand',
  'You go check what is trending yourself',
];

const B_CAPTIONS = [
  'One topic goes in',
  'Sub-agents research in parallel',
  'More agents draft and check the work',
  'Everything pauses for your review',
  'The post ships and your feedback is saved',
];

function CaptionLine({ items, prefix }: { items: string[]; prefix: string }) {
  return (
    <div className="xd-cap">
      {items.map((text, i) => (
        <span key={text} className={`${prefix}${i + 1}`}>
          <i>{i + 1}</i>
          {text}
        </span>
      ))}
    </div>
  );
}

function ChatTodayPanel() {
  return (
    <div className="xd-panel">
      <div className="xd-head">
        <span className="xd-title">Your AI today</span>
        <span className="xd-sub">You ask. The AI answers. Every step in between is still yours.</span>
      </div>
      <div className="xd-win" aria-hidden="true">
        <div className="xd-lights">
          <i />
          <i />
          <i />
        </div>
        <div className="xd-bub xd-you xa1">What should I post on LinkedIn this week?</div>
        <div className="xd-bub xd-ai xa2">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="xd-chip xa2">you read everything, you pick one idea</div>
        <div className="xd-bub xd-you xa3">Draft a post on the second idea</div>
        <div className="xd-bub xd-ai xa4">
          <i />
          <i />
          <i />
        </div>
        <div className="xd-chip xa4">you rewrite the draft in your voice</div>
        <div className="xd-chip xa5">you scroll LinkedIn to see what works</div>
      </div>
      <CaptionLine items={A_CAPTIONS} prefix="ca" />
    </div>
  );
}

// Mini agent graph: topic in, three research agents in parallel, draft and
// check agents, the expert's review, the live post, and the memory loop.
function AgentizedPanel() {
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    phase: string,
    kind: 'end' | 'agent' = 'agent',
  ) => (
    <g className={`xd-g ${phase}`}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="10"
        fill={kind === 'end' ? '#F7E7E0' : '#FFFFFF'}
        stroke={kind === 'end' ? '#C4593C' : '#DAD3C7'}
        strokeWidth="1.4"
      />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#211E1A">
        {label}
      </text>
    </g>
  );
  const edge = (x1: number, y1: number, x2: number, y2: number, phase: string) => (
    <line
      className={`xd-g ${phase}`}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="#C4593C"
      strokeWidth="1.6"
      markerEnd="url(#xd-arrow)"
    />
  );

  return (
    <div className="xd-panel">
      <div className="xd-head">
        <span className="xd-title">Your work, agentized</span>
        <span className="xd-sub">Sub-agents run the steps. You give feedback at the review points.</span>
      </div>
      <div className="xd-win xd-win-graph" aria-hidden="true">
        <svg viewBox="0 0 440 262" className="xd-graph">
          <defs>
            <marker id="xd-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#C4593C" />
            </marker>
            <marker id="xd-arrow-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#8B8375" />
            </marker>
          </defs>

          {edge(82, 120, 112, 60, 'xg2')}
          {edge(82, 130, 112, 130, 'xg2')}
          {edge(82, 140, 112, 200, 'xg2')}
          {edge(214, 56, 229, 78, 'xg3')}
          {edge(214, 126, 229, 98, 'xg3')}
          {edge(214, 202, 244, 112, 'xg3')}
          {edge(273, 108, 273, 150, 'xg3')}
          {edge(315, 168, 344, 147, 'xg4')}
          {edge(368, 105, 373, 54, 'xg5')}

          {/* Your feedback, back into the draft agents */}
          <line className="xd-g xg4" x1={346} y1={114} x2={319} y2={93} stroke="#A8452C" strokeWidth="1.5" strokeDasharray="4 4" markerEnd="url(#xd-arrow)" />
          <text className="xd-g xg4" x={342} y={99} fontSize="9" fontWeight="600" fill="#A8452C">
            feedback
          </text>

          {/* Memory: what shipped and what you changed, kept for the next run */}
          <path className="xd-g xg5" d="M418 34 Q432 34 432 60 L432 228 Q432 246 410 246 L186 246 Q164 246 164 231" fill="none" stroke="#8B8375" strokeWidth="1.5" strokeDasharray="4 4" markerEnd="url(#xd-arrow-dim)" />
          <text className="xd-g xg5" x={300} y={241} textAnchor="middle" fontSize="9" fontWeight="600" fill="#8B8375">
            memory
          </text>

          {box(14, 112, 68, 36, 'Topic', 'xg1', 'end')}
          {box(114, 34, 100, 36, 'Trend agent', 'xg2')}
          {box(114, 112, 100, 36, 'Audience agent', 'xg2')}
          {box(114, 190, 100, 36, 'Research agent', 'xg2')}
          {box(231, 72, 84, 36, 'Draft agents', 'xg3')}
          {box(231, 152, 84, 36, 'Fact checks', 'xg3')}
          {box(330, 18, 88, 32, 'Post live', 'xg5', 'end')}

          <g className="xd-g xg4">
            <g className="xd-youc">
              <circle cx="366" cy="130" r="25" fill="#C4593C" stroke="#A8452C" strokeWidth="1.6" />
              <text x="366" y="134" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#FFFFFF">
                you
              </text>
            </g>
            <text x="366" y="172" textAnchor="middle" fontSize="9.5" fill="#8B8375">
              your review
            </text>
          </g>
        </svg>
      </div>
      <CaptionLine items={B_CAPTIONS} prefix="cb" />
    </div>
  );
}

export default function ExpertHeroDemo() {
  return (
    <div className="xd">
      <ChatTodayPanel />
      <AgentizedPanel />
    </div>
  );
}
