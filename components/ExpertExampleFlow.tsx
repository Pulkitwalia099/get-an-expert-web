// The input-to-output flow from the LinkedIn Marketeer page
// (marketplace-preview/hifi/linkedin.html), re-homed on the experts page
// and put on a loop: three inputs pop in, the arrow pulses, and a finished
// post assembles and goes live. Server component; the animation is the
// xio* keyframes in globals.css, and reduced-motion browsers see the
// finished frame.
//
// The reader here is the expert, not the buyer, so the three inputs are
// what a client hands the expert's agent rather than "your profile".

export default function ExpertExampleFlow() {
  return (
    <div className="xio">
      <div className="xio-in">
        <div className="xio-card xio-c1">
          <span className="xio-th xio-li" aria-hidden="true">
            in
          </span>
          <span className="xio-meta">
            <b>The client&rsquo;s LinkedIn</b>
            <i>the account your agent runs</i>
          </span>
        </div>
        <div className="xio-card xio-c2">
          <span className="xio-th xio-aud" aria-hidden="true" />
          <span className="xio-meta">
            <b>Their audience</b>
            <i>who the posts should reach</i>
          </span>
        </div>
        <div className="xio-card xio-c3">
          <span className="xio-th xio-voice" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="xio-meta">
            <b>Their voice</b>
            <i>posts they like, topics they care about</i>
          </span>
        </div>
      </div>
      <div className="xio-arrow" aria-hidden="true">
        &rarr;
      </div>
      <div className="xio-post" aria-hidden="true">
        <span className="xio-live">LIVE</span>
        <div className="xio-pk-head">
          <span className="xio-pk-av" />
          <span>
            <span className="xio-pk-name" />
            <span className="xio-pk-sub" />
          </span>
        </div>
        <span className="xio-pk-line" />
        <span className="xio-pk-line" />
        <span className="xio-pk-line xio-pk-short" />
        <span className="xio-pk-media" />
        <div className="xio-pk-bar">
          <span className="xio-pk-dot" />
          <span className="xio-pk-pill" />
          <span className="xio-pk-pill" />
          <span className="xio-pk-pill" />
        </div>
      </div>
    </div>
  );
}
