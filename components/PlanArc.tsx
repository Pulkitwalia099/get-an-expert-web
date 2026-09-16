// The three months as one drawing: the time we spend building assets falls,
// what we know works for the brand rises, and month three onward is shaded as
// the part where the mix is built from the brand's own numbers.
//
// A server component with no props, because the shape is the promise and the
// promise is the same for every plan. The words under it are per plan and
// live in lib/plans.ts.

export default function PlanArc() {
  return (
    <div className="plan-arc">
      <svg
        viewBox="0 0 720 226"
        role="img"
        aria-label="Three phases across three months: set up, test, compound. Time spent building assets falls; what we know works rises."
      >
        <rect className="plan-arc-band" x="480" y="34" width="240" height="160" rx="8" />
        <line className="plan-arc-grid" x1="240" y1="34" x2="240" y2="194" />
        <line className="plan-arc-grid" x1="480" y1="34" x2="480" y2="194" />
        <line className="plan-arc-grid" x1="0" y1="194" x2="720" y2="194" />
        <text className="plan-arc-lbl" x="0" y="20">
          Month 1
        </text>
        <text className="plan-arc-lbl" x="248" y="20">
          Month 2
        </text>
        <text className="plan-arc-lbl" x="488" y="20">
          Month 3 onward
        </text>
        <text className="plan-arc-ttl" x="0" y="216">
          Set up the faces and formats
        </text>
        <text className="plan-arc-ttl" x="248" y="216">
          Test which formats move
        </text>
        <text className="plan-arc-ttl" x="488" y="216">
          Double what worked
        </text>
        <path className="plan-arc-build" d="M8,60 C120,64 180,120 240,140 C320,166 420,176 712,182" />
        <path className="plan-arc-know" d="M8,184 C120,182 200,160 300,120 C400,80 520,58 712,50" />
        <circle className="plan-arc-end" cx="712" cy="50" r="4" />
        <text className="plan-arc-leg" x="14" y="52">
          Time we spend building assets
        </text>
        <text className="plan-arc-leg" x="440" y="46" textAnchor="end">
          What we know works for the brand
        </text>
      </svg>
    </div>
  );
}
