import type { Metadata } from 'next';
import Link from 'next/link';
import { COLLECTED, PROCESSORS, RETENTION } from '@/components/legal/privacy-data';

// Replaces the four paragraph version. That page covered analytics and email
// and said nothing about the expert access model, which is now the part that
// actually matters: an expert can be given scoped access to a customer's own
// machine, and a policy that does not describe that is not describing the
// product.
//
// Two rules held throughout. Nothing here claims a control the code does not
// implement, and nothing states a deadline we have no process to meet. Where a
// commitment would be a promise rather than a description, it says what we
// actually do instead. See privacy-data.ts for where each fact came from.
export const metadata: Metadata = {
  title: 'Privacy and security · midsesh',
  description:
    'What midsesh collects, why, who else sees it, how long we keep it, how expert access to your machine works, and how to get it all deleted.',
};

const UPDATED = '3 August 2026';
const CONTACT = 'midsesh.social@gmail.com';

export default function Privacy() {
  return (
    <main className="legal">
      <Link href="/" className="legal-back">
        Back to midsesh
      </Link>

      <h1>Privacy and security</h1>
      <p className="lead">
        This explains what we collect, why we collect it, who else sees it, how long we keep it,
        and what you can make us do about it. It also explains exactly what an expert can and
        cannot reach when you invite one into your own machine, because that is the part worth
        reading twice.
      </p>
      <p className="legal-meta">Last updated {UPDATED}</p>

      <h2>The short version</h2>
      <p>
        We read the conversations, because that is the only way to tell where people get stuck. We
        keep your email separate from everything else so it can be handed back or deleted on its
        own. We never take payment, so we never hold your card details. We do not sell your
        information, and we do not share it for advertising. If you invite an expert onto your
        machine, they work inside limits you set, everything they do is logged in front of you, and
        you can cut the access off at any moment.
      </p>

      <h2>Who this covers</h2>
      <p>
        midsesh (&quot;we&quot;, &quot;us&quot;) operates this website and the Get An Expert agent.
        We are the controller of the information described here. You can reach a person at{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>What we collect</h2>
      <dl className="legal-list">
        {COLLECTED.map((c) => (
          <div key={c.what} className="legal-item">
            <dt>{c.what}</dt>
            <dd>{c.detail}</dd>
          </div>
        ))}
      </dl>
      <p>
        We do not collect payment card details at any point. You pay the expert directly, after the
        work is delivered, so that information never passes through us.
      </p>

      <h2>Session replay, stated plainly</h2>
      <p>
        We record a replay of your visit, and that replay includes the conversation: what you wrote
        and what the assistant wrote back. This is deliberate. Knowing that someone left tells us
        nothing on its own. Knowing what the assistant had just asked them tells us what to fix.
      </p>
      <p>
        Email and name fields are the exception. Those fields are blocked at the moment of
        recording, so what you type into them is never transmitted to our analytics provider at
        all. If you would rather not be recorded, enabling Do Not Track or blocking analytics in
        your browser will stop it, and the service works normally without it.
      </p>

      <h2>How expert access to your machine works</h2>
      <p>
        This section applies only if you install the Get An Expert agent and ask for help inside
        your own editor. Nothing on this website gives anyone access to anything on your computer.
      </p>
      <dl className="legal-list">
        <div className="legal-item">
          <dt>Nothing is granted until you grant it</dt>
          <dd>
            Access is split into three separate permissions: files, terminal and browser. Each one
            is granted by you explicitly. An expert who has not been given a permission cannot use
            the tools that depend on it.
          </dd>
        </div>
        <div className="legal-item">
          <dt>Confined to one project</dt>
          <dd>
            File and terminal access are limited to the project directory you started in. Attempts
            to reach a path outside it are refused. Browser access is pinned to the single port you
            approved.
          </dd>
        </div>
        <div className="legal-item">
          <dt>Secrets are excluded from file access</dt>
          <dd>
            Environment files, private keys, certificates, SSH and cloud credential directories and
            anything matching your project&apos;s own ignore rules are refused by the file tools.
          </dd>
        </div>
        <div className="legal-item">
          <dt>We never receive any of it</dt>
          <dd>
            Session data travels directly between your machine and the expert&apos;s, encrypted.
            Our relay performs the introduction and is then out of the path. It does not receive
            your files, your terminal output or your browser contents, so there is no copy of them
            for us to hold, hand over or lose.
          </dd>
        </div>
        <div className="legal-item">
          <dt>You watch it happen</dt>
          <dd>
            Every action an expert takes is written to a log you can read while the session is
            running. The log records the action and what it was aimed at, never the contents of
            your files or the output of your commands.
          </dd>
        </div>
        <div className="legal-item">
          <dt>You can end it instantly</dt>
          <dd>
            You can withdraw any single permission or all of them at once. The next action that
            relies on a withdrawn permission fails immediately. Ending the session withdraws
            everything.
          </dd>
        </div>
        <div className="legal-item">
          <dt>Reconnecting after a restart</dt>
          <dd>
            So that a request survives closing your editor, the agent keeps a small record on your
            own computer of the permissions you approved, and can restore them when it reconnects
            without asking again. That record is readable only by your user account, expires after
            72 hours, and restoring it is written into the activity log. You can switch this off.
          </dd>
        </div>
      </dl>

      <h2>Why we are allowed to use it</h2>
      <p>
        Where the UK and EU General Data Protection Regulation applies, we rely on the following
        legal bases. We process your messages and brief because it is necessary to perform the
        service you asked for. We use your email address to send you the introduction you requested
        on the same basis, and your consent is recorded at the moment you submit it. We keep
        analytics, replay, rate limiting counters and security records on the basis of our
        legitimate interest in understanding, running and defending the service, having weighed
        that against your interests. Where we rely on consent, you can withdraw it at any time.
      </p>

      <h2>Who else sees it</h2>
      <p>
        We use the following providers. They act on our instructions and are not permitted to use
        your information for their own purposes.
      </p>
      <div className="legal-table">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>What they do</th>
              <th>What they receive</th>
            </tr>
          </thead>
          <tbody>
            {PROCESSORS.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.purpose}</td>
                <td>{p.gets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Beyond these, we share your brief with the expert we introduce you to, which is the entire
        point of the service. Every expert is under a signed confidentiality agreement before they
        take any work. We may also disclose information if the law requires it, or to establish or
        defend a legal claim.
      </p>
      <p>
        <strong>We do not sell your personal information, and we do not share it for cross context
        behavioural advertising.</strong> We have not done so in the preceding twelve months. This
        includes the personal information of anyone under sixteen.
      </p>

      <h2>Where it goes</h2>
      <p>
        We and our providers are based in, and store information in, the United States. If you are
        in the United Kingdom, the European Economic Area or Switzerland, using this service
        involves transferring your information there. We rely on the transfer mechanisms our
        providers have in place, which for these providers are standard contractual clauses. You
        can ask us for details.
      </p>

      <h2>How long we keep it</h2>
      <p>Deletion runs automatically, once a day, on this schedule.</p>
      <dl className="legal-list">
        {RETENTION.map((r) => (
          <div key={r.what} className="legal-item">
            <dt>{r.what}</dt>
            <dd>Deleted after {r.period}.</dd>
          </div>
        ))}
      </dl>
      <p>
        Email addresses are stored separately from everything else, on purpose, so that a request
        to export or delete yours can be honoured without unpicking anything.
      </p>

      <h2>How we protect it</h2>
      <p>
        Database access is closed by default and no public key can read or write any table. Every
        endpoint that changes something checks the request came from our own site, and is rate
        limited so it cannot be hammered. Text arriving from visitors and from the open web is
        stripped of hidden characters before it reaches anything else. The site sends a content
        security policy and the usual protective headers. No secret is present in anything the
        browser downloads.
      </p>
      <p>
        We do not currently hold a SOC 2 or ISO 27001 certification, and we would rather say so
        than imply one. No system is perfectly secure, and we do not claim otherwise.
      </p>
      <p>
        If a breach affects your information, we will notify you and the relevant regulator where
        the law requires it, without undue delay and within the timeframes those laws set.
      </p>

      <h2>Your rights</h2>
      <p>
        Wherever you live, you can ask us for a copy of what we hold about you, ask us to correct
        it, or ask us to delete it. Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we
        will action it. We will not charge you, and we will not treat you differently for asking.
      </p>
      <p>
        If the UK or EU GDPR applies to you, you also have the right to object to processing based
        on legitimate interests, to ask us to restrict processing, to receive your information in a
        portable format, and to complain to your data protection authority. In the United Kingdom
        that is the Information Commissioner&apos;s Office.
      </p>
      <p>
        If you are a California resident, you have the right to know what we collect and why, the
        right to delete it, the right to correct it, and the right to opt out of sale or sharing.
        As set out above, we do not sell or share your personal information, so there is nothing to
        opt out of. You may use an authorised agent to make a request on your behalf.
      </p>

      <h2>Children</h2>
      <p>
        This service is for adults and is not directed at children. We do not knowingly collect
        information from anyone under sixteen. If you believe a child has given us information,
        tell us and we will delete it.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update the date at the top. If a change materially affects
        what we do with information we already hold, we will tell the people it affects rather than
        relying on them noticing.
      </p>

      <h2>Contact</h2>
      <p>
        Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and a person will answer. If you are
        writing about your own information, say so in the subject line and it will be handled
        first.
      </p>
    </main>
  );
}
