import type { Metadata } from 'next';
import Link from 'next/link';
import ExpertSignup from '@/components/ExpertSignup';
import { WorkflowLoopDiagram, LinkedInWorkflowDiagram } from '@/components/ExpertDiagrams';

export const metadata: Metadata = {
  title: 'Become an expert · Get An Expert',
  description:
    'You are already the expert. We help you turn the way you work into an agent you own, so you do ten times the work and keep the part only you can do.',
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

        {/* 1. Set the context: the hero and the 10x value prop */}
        <header className="exp-hero">
          <span className="exp-tag">For experts</span>
          <h1>You are the expert. Let an agent do the other 80 percent.</h1>
          <p className="exp-lead">
            You already do great work. It just takes hours. When an agent handles the repetitive
            80 percent, you keep doing the creative 20 percent that only you can do, and you serve
            ten times the clients in the same day.
          </p>
          <div className="exp-hero-cta">
            <a href="#join" className="cta">
              Join as an expert
            </a>
            <span className="exp-hero-note">No cost to join. You keep 90 percent of every sale.</span>
          </div>
        </header>

        {/* The relatable reframe, framed as a lift not a knock */}
        <section className="exp-section">
          <h2>You already use AI. You have only seen the edge of it.</h2>
          <p>
            When you open Claude or ChatGPT and start typing, it feels like you are using AI. You
            are. But a chat window is the smallest part of what AI can do.
          </p>
          <p>
            All around you, people are quietly turning whole workflows into agents, for almost any
            task you can picture. An agent is AI you hand a whole task to, so it runs on its own
            instead of answering one message at a time. That is the part you have not seen yet. It
            is exactly what we build with you, around the thing you are already great at.
          </p>
        </section>

        {/* 2. Explain what we are doing, carried by the diagrams */}
        <section className="exp-section">
          <h2>How it works</h2>
          <p>
            We turn the way you already work into an agent that you own. You talk, we build. Here is
            the whole thing, start to finish.
          </p>
          <ol className="exp-steps">
            <li className="exp-step">
              <span className="n">1</span>
              <span className="t">
                <b>We learn how you work.</b> Our AI expert interviews you the way a sharp
                apprentice would, until it understands your process.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">2</span>
              <span className="t">
                <b>We build your workflow.</b> Small agents are set up to handle each repetitive
                step, working together in the right order.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">3</span>
              <span className="t">
                <b>You keep the final say.</b> Every result comes to you before it goes out. You
                approve it, fix it, or send it back.
              </span>
            </li>
            <li className="exp-step">
              <span className="n">4</span>
              <span className="t">
                <b>It gets better with you.</b> Every edit and note you give flows back and sharpens
                the workflow for next time.
              </span>
            </li>
          </ol>
          <figure className="exp-figure">
            <WorkflowLoopDiagram />
          </figure>

          <h3>An example: a LinkedIn workflow</h3>
          <p>
            Say you are known for LinkedIn posts that land. Here is what your agent looks like under
            the hood. Each small agent does one job and hands off to the next. You come in at the
            end, where your judgment matters most.
          </p>
          <figure className="exp-figure">
            <LinkedInWorkflowDiagram />
          </figure>
          <p className="exp-figcap">
            Nothing ships without your review. The agents do the legwork. You do the part clients
            actually pay you for.
          </p>
        </section>

        {/* 3. The details: pricing */}
        <section className="exp-section">
          <h2>What you earn</h2>
          <p>
            You keep 90 percent of every sale. We take 10 percent. That is the whole pricing model,
            and there is nothing else to read.
          </p>
          <ul className="exp-earn">
            <li>
              <b>Nothing to join.</b> Setting up your agent costs you nothing.
            </li>
            <li>
              <b>We bring the clients.</b> You do not have to chase leads or pitch.
            </li>
            <li>
              <b>You set your price.</b> Your rate is yours to decide.
            </li>
          </ul>
        </section>

        {/* FAQ: the real objections */}
        <section className="exp-section">
          <h2>Questions experts ask</h2>
          <div className="exp-faq">
            <div>
              <div className="exp-q">Will this replace me?</div>
              <div className="exp-a">
                No. The agent does the repetitive work. You make the final call on everything that
                goes out, and that judgment is what clients are paying for.
              </div>
            </div>
            <div>
              <div className="exp-q">Do I need to be technical?</div>
              <div className="exp-a">
                No. You never touch code. If you can explain how you work to a new hire, you can do
                this. You talk, we build.
              </div>
            </div>
            <div>
              <div className="exp-q">Is the work still mine?</div>
              <div className="exp-a">
                Yes. The agent is built from your process and stays yours. You decide how it is used
                and what it charges.
              </div>
            </div>
            <div>
              <div className="exp-q">How long does it take to set up?</div>
              <div className="exp-a">
                It starts with one conversation. We do the building. Most of your time goes into
                reviewing, not making.
              </div>
            </div>
            <div>
              <div className="exp-q">What can I turn into an agent?</div>
              <div className="exp-a">
                Any repeatable thing you are known for. Writing, outreach, research, editing,
                campaigns, and more. If you do it again and again, we can turn it into an agent.
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="exp-section" id="join">
          <h2>Join as an expert</h2>
          <div className="exp-join">
            <p>Tell us what you are great at. We will reach out and build your first agent with you.</p>
            <ExpertSignup />
          </div>
        </section>
      </main>
    </>
  );
}
