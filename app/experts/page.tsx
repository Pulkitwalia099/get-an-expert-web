import type { Metadata } from 'next';
import Link from 'next/link';
import ExpertSignup from '@/components/ExpertSignup';
import { ChatVsAgentsDiagram, WorkflowLoopDiagram } from '@/components/ExpertDiagrams';
import ExpertMachineDiagram from '@/components/ExpertMachineDiagram';

export const metadata: Metadata = {
  title: 'Become an expert · Get An Expert',
  description:
    'You are already the expert. We turn the way you work into an agent you own, so you do ten times the work and keep the part only you can do.',
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

        {/* 1. Context: the 10x value prop, one line each */}
        <header className="exp-hero">
          <span className="exp-tag">For experts</span>
          <h1>You are the expert. Let agents do the other 80 percent.</h1>
          <p className="exp-lead">
            Agents take the repetitive 80 percent. You keep the creative 20 percent, and serve ten
            times the clients.
          </p>
          <div className="exp-hero-cta">
            <a href="#join" className="cta">
              Join as an expert
            </a>
            <span className="exp-hero-note">Free to join. You keep 90 percent of every sale.</span>
          </div>
        </header>

        {/* The reframe, drawn instead of written */}
        <section className="exp-section">
          <h2>You already use AI. You have only seen the edge of it.</h2>
          <figure className="exp-figure">
            <ChatVsAgentsDiagram />
          </figure>
          <p className="exp-figcap">
            People are quietly agentizing whole workflows. We build that for you, around the thing
            you are already great at.
          </p>
        </section>

        {/* 2. How it works: four short beats, then the deal in one picture */}
        <section className="exp-section">
          <h2>How it works</h2>
          <ol className="exp-steps">
            <li className="exp-step">
              <span className="n">1</span>
              <span className="t">
                <b>You talk.</b> Our AI interviews you like a sharp apprentice.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">2</span>
              <span className="t">
                <b>We build.</b> Agents take over every repetitive step.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">3</span>
              <span className="t">
                <b>You approve.</b> Nothing ships without your final say.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">4</span>
              <span className="t">
                <b>It learns.</b> Every note you give makes it sharper.
              </span>
            </li>
          </ol>
          <figure className="exp-figure">
            <WorkflowLoopDiagram />
          </figure>

          <h3>One LinkedIn post, under the hood</h3>
          <p>
            Twelve agents research, write and check, in parallel. Then everything stops and waits
            for you.
          </p>
          <figure className="exp-figure wide">
            <ExpertMachineDiagram />
          </figure>
          <p className="exp-figcap">
            12 agents · 3 checks · 1 you. Looks like a lot. It is. We build it, it runs in minutes,
            and nothing goes live until you say so.
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
                No. Agents do the grunt work. Every final call is yours, and that judgment is what
                clients pay for.
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

        {/* CTA */}
        <section className="exp-section" id="join">
          <h2>Join as an expert</h2>
          <div className="exp-join">
            <p>Tell us what you are great at. We build your first agent with you.</p>
            <ExpertSignup />
          </div>
        </section>
      </main>
    </>
  );
}
