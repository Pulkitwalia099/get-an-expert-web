/* Day 1 shell: proves tokens, fonts, and the deploy pipeline.
   Day 2 replaces the placeholders with ported sections.
   Day 3 replaces the hero placeholder with the scroll film. */

const sections = [
  { id: "hero", label: "Hero: the search that travels", day: "Day 3" },
  { id: "ticker", label: "Delivered today strip", day: "Day 4" },
  { id: "demo", label: "Splitscreen live demo (1:1 port)", day: "Day 2" },
  { id: "moments", label: "Moments worth delegating", day: "Day 2" },
  { id: "experts", label: "The bench", day: "Day 2" },
  { id: "install", label: "Install in 30 seconds", day: "Day 2" },
  { id: "faq", label: "FAQ", day: "Day 2" },
  { id: "waitlist", label: "Waitlist + footer", day: "Day 2" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
        get an expert · v2 scaffold
      </p>
      <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.12] text-balance">
        Build like the world&apos;s best are <em className="text-forest">beside you</em>.
      </h1>
      <p className="mt-5 max-w-xl text-ink-2">
        Day 1 shell. Tokens, fonts, and the deploy pipeline are live; every block
        below gets replaced by its real section during the sprint.
      </p>

      <div className="mt-12 flex flex-col gap-4">
        {sections.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-card border-2 border-dashed border-border-2 bg-surface/60 px-6 py-8"
          >
            <span className="font-serif text-xl text-ink-2">{s.label}</span>
            <span className="rounded-pill bg-sage-soft px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-forest">
              {s.day}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center gap-4">
        <span className="rounded-pill bg-forest px-6 py-3 text-sm font-semibold text-paper shadow-raised">
          Token check: forest
        </span>
        <span className="rounded-pill border border-bronze bg-bronze-soft px-6 py-3 font-mono text-xs text-bronze-ink">
          bronze · activity
        </span>
        <span className="rounded-pill border border-sage bg-sage-soft px-6 py-3 text-sm font-semibold text-forest">
          sage · people
        </span>
      </div>
    </main>
  );
}
