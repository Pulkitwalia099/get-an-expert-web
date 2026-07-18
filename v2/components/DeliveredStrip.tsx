/* A slim ticker strip of delivered outcomes, sitting just under the hero film.
   Outcomes map to the roster's specialties (code, deploys, design, AI, security,
   growth). No client names, no metrics we can't ground: each line is an outcome
   plus a status, in the same in-session / fixed-live language as the demo. */

type Outcome = { outcome: string; tag: string };

const outcomes: Outcome[] = [
  { outcome: "Launch demo video", tag: "in session" },
  { outcome: "Checkout flow bug", tag: "fixed live" },
  { outcome: "Production deploy", tag: "unblocked" },
  { outcome: "Pricing page redesign", tag: "handed back" },
  { outcome: "RAG pipeline", tag: "shipped" },
  { outcome: "Security review", tag: "cleared" },
  { outcome: "Go-to-market copy", tag: "rewritten" },
];

function StripSet({ hidden }: { hidden?: boolean }) {
  return (
    <div data-deliver-set aria-hidden={hidden || undefined}>
      <span data-deliver-label>Delivered today</span>
      {outcomes.map((o) => (
        <span data-deliver-item key={o.outcome}>
          <span data-deliver-dot />
          <b>{o.outcome}</b>
          <span data-deliver-tag>{o.tag}</span>
        </span>
      ))}
    </div>
  );
}

export default function DeliveredStrip() {
  return (
    <section data-deliver aria-label="Delivered today">
      <div data-deliver-track>
        <StripSet />
        <StripSet hidden />
      </div>
    </section>
  );
}
