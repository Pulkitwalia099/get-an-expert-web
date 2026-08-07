import type { Metadata } from 'next';
import Link from 'next/link';
import ExpertJoinForm from '@/components/ExpertJoinForm';
import { WorkflowLoopDiagram } from '@/components/ExpertDiagrams';
import ExpertHeroDemo from '@/components/ExpertHeroDemo';
import ExpertMachineDiagram from '@/components/ExpertMachineDiagram';

export const metadata: Metadata = {
  title: 'Become an expert · Get An Expert',
  description:
    'Experts everywhere are turning their craft into agents. We help you do that. You keep the final say and 90 percent of every sale.',
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

        {/* 1. The hook, then the two looping panels that act it out. The
            panels carry their own titles, so no paragraph in between. No
            CTA, nothing is earned this early. */}
        <header className="exp-hero">
          <span className="exp-tag">For experts</span>
          <h1>Experts everywhere are turning their craft into agents. We help you do that.</h1>
          <ExpertHeroDemo />
        </header>

        {/* 2. How it works. Four steps, written so no sentence leans on an
            unexplained pronoun: every "it" from the old copy is now named. */}
        <section className="exp-section">
          <h2>How it works</h2>
          <ol className="exp-steps">
            <li className="exp-step">
              <span className="n">1</span>
              <span className="t">
                <b>You explain your craft.</b> You sit with our AI engineers and walk them through
                how you do the work, step by step.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">2</span>
              <span className="t">
                <b>We turn your steps into agents.</b> Each step of your process becomes a small
                agent, and together the agents run your workflow end to end.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">3</span>
              <span className="t">
                <b>You review the results.</b> Every run ends on your desk, and nothing goes to a
                client until you approve the work.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">4</span>
              <span className="t">
                <b>Your agents get sharper.</b> Every correction you make is saved, so the next
                run comes back closer to how you would have done the work yourself.
              </span>
            </li>
          </ol>
          <figure className="exp-figure">
            <WorkflowLoopDiagram />
          </figure>

          <h3>What agentized work looks like</h3>
          <p>
            One example from many. If you write LinkedIn posts, your work agentized runs like
            this. Cold email, video, Reddit, enrichment: your craft will have its own shape.
          </p>
          <figure className="exp-figure wide">
            <ExpertMachineDiagram />
          </figure>
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
            <ExpertJoinForm />
          </div>
        </section>
      </main>
    </>
  );
}
