import { ink } from "@/lib/palette";

const faqs: { q: string; a: string }[] = [
  {
    q: "What exactly gets sent?",
    a: "With your OK: your stated goal, what was already tried, any errors you hit, a short summary of the session, and your tech stack. Never your source files, never your full transcript, never your keys or secrets: those are stripped out before anything is shared. You see the exact payload before it goes, every single time.",
  },
  {
    q: "Who does the work?",
    a: "Hand-picked senior experts, not a marketplace. Every expert on our bench is vetted, committed, and accountable to you, and every fix is reviewed before it reaches you.",
  },
  {
    q: "What does it cost?",
    a: "Every request is quoted upfront: a price and a response time, before the expert starts. You approve first. No subscriptions, no hourly billing, and installing is free.",
  },
  {
    q: "What if the work isn't right?",
    a: "Keep talking. The expert stays in your thread until it's delivered the way you wanted. And if it isn't delivered as promised, you don't pay.",
  },
  {
    q: "Do I need to change how I build?",
    a: "No. One install command and you keep building in Claude Code, Codex, Cursor, or Windsurf. The expert option appears mid-session at the moments it can move you faster, and only acts when you say yes.",
  },
  {
    q: "How long is my data kept?",
    a: "Requests auto-delete after 30 days, and every submission includes a one-click deletion link. We never sell your data, never use it for advertising, and never train models on it.",
  },
];

export default function Faq() {
  return (
    <div
      style={{
        marginTop: "clamp(72px,8vw,110px)",
        padding: "0 clamp(24px,3.3vw,48px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h2
        style={{
          margin: "0 0 clamp(28px,3vw,44px)",
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(34px,3.2vw,46px)",
          lineHeight: 1.2,
          textAlign: "center",
          maxWidth: "720px",
          textWrap: "balance",
        }}
      >
        Questions, answered.
      </h2>
      <div
        style={{
          width: "min(680px,100%)",
          borderBottom: `1px solid ${ink(0.1)}`,
        }}
      >
        {faqs.map((f) => (
          <details
            key={f.q}
            data-faq
            style={{ borderTop: `1px solid ${ink(0.1)}` }}
          >
            <summary
              style={{
                padding: "22px 0",
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                fontSize: "clamp(19px,1.65vw,22px)",
                lineHeight: 1.35,
              }}
            >
              <span>{f.q}</span>
              <span data-faq-plus>+</span>
            </summary>
            <p
              style={{
                margin: "0 0 22px",
                fontSize: "15.5px",
                lineHeight: 1.7,
                color: ink(0.75),
                maxWidth: "600px",
                textWrap: "pretty",
              }}
            >
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
