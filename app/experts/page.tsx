import type { Metadata } from 'next';
import Link from 'next/link';
import ExpertSignup from '@/components/ExpertSignup';
import { ChatVsAgentsDiagram, WorkflowLoopDiagram } from '@/components/ExpertDiagrams';
import ExpertMachineDiagram from '@/components/ExpertMachineDiagram';

export const metadata: Metadata = {
  title: 'Become an expert · Get An Expert',
  description:
    'Almost everything you deliver can be agentized. Agents run the work, you make the final call, and your judgment goes ten times further.',
};

export default function Experts() {
  return (
    <>
      <div className="bg" />
      <div className="grain" />
      <main className="exp">
        <Link href="/" className="exp-nav">
          Back to Get An Expert
        </Link>

        {/* 1. The hook: their judgment is the scarce thing, agents multiply it.
            No CTA yet, nothing is earned this early. */}
        <header className="exp-hero">
          <span className="exp-tag">For experts</span>
          <h1>Your work can run without you. Your judgment cannot.</h1>
          <p className="exp-lead">
            Almost everything you deliver can be agentized. Agents run the work end to end. You
            review, tweak and sign off. Ten times the output, the same you.
          </p>
        </header>

        {/* The lift, drawn instead of written: what they do with AI today is
            good, and it can carry far more. */}
        <section className="exp-section">
          <h2>You already use AI well. It can carry far more of your work.</h2>
          <figure className="exp-figure">
            <ChatVsAgentsDiagram />
          </figure>
          <p className="exp-figcap">
            Experts everywhere are turning their craft into agents. This is the new way work ships.
            We build it with you.
          </p>
        </section>

        {/* 2. How it works: humans learn your workflow, agents run it,
            you keep the final say, it improves on your feedback. */}
        <section className="exp-section">
          <h2>How it works</h2>
          <ol className="exp-steps">
            <li className="exp-step">
              <span className="n">1</span>
              <span className="t">
                <b>You talk.</b> Our AI engineers sit with you and learn exactly how you work.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">2</span>
              <span className="t">
                <b>We agentize it.</b> Your process becomes agents that run it end to end.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">3</span>
              <span className="t">
                <b>You review and tweak.</b> Every result waits for your final say.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">4</span>
              <span className="t">
                <b>It improves.</b> Each review you give feeds back and sharpens it.
              </span>
            </li>
          </ol>
          <figure className="exp-figure">
            <WorkflowLoopDiagram />
          </figure>

          <h3>What agentized work looks like</h3>
          <p>
            One example from many. If you write LinkedIn posts, your work agentized looks like
            this. Cold email, video, Reddit, enrichment, yours will have its own shape.
          </p>
          <figure className="exp-figure wide">
            <ExpertMachineDiagram />
          </figure>
          <p className="exp-figcap">
            10 agents · 2 checks · 1 you. We build this for you. It runs in minutes and waits for
            your sign off.
          </p>
        </section>

        {/* 3. The details: pricing in one line */}
        <section className="exp-section">
          <h2>What you earn</h2>
          <p>You keep 90 percent of every sale. We take 10. That is the whole model.</p>
          <ul className="exp-earn">
            <li>
              <b>Free to join.</b> Building your agent costs nothing.
            </li>
            <li>
              <b>We bring the clients.</b> No chasing leads.
            </li>
            <li>
              <b>You set the price.</b> Your rate, your call.
            </li>
          </ul>
        </section>

        {/* FAQ: one-line answers */}
        <section className="exp-section">
          <h2>Questions experts ask</h2>
          <div className="exp-faq">
            <div>
              <div className="exp-q">Will this replace me?</div>
              <div className="exp-a">
                No. Agents run the work, but nothing ships without your review, and that judgment is
                what clients pay for.
              </div>
            </div>
            <div>
              <div className="exp-q">Do I need to be technical?</div>
              <div className="exp-a">
                No. If you can explain your process to a new hire, you can do this.
              </div>
            </div>
            <div>
              <div className="exp-q">Is the work still mine?</div>
              <div className="exp-a">Yes. Built from your process, owned by you, priced by you.</div>
            </div>
            <div>
              <div className="exp-q">How long does setup take?</div>
              <div className="exp-a">One conversation. We do the building.</div>
            </div>
            <div>
              <div className="exp-q">What can I turn into an agent?</div>
              <div className="exp-a">Anything you do again and again.</div>
            </div>
          </div>
        </section>

        {/* CTA: earned by now. Email plus what they are great at. */}
        <section className="exp-section" id="join">
          <h2>Join as an expert</h2>
          <div className="exp-join">
            <p>Pick what you are great at. We reach out and build your first agent with you.</p>
            <ExpertSignup />
          </div>
        </section>
      </main>
    </>
  );
}
