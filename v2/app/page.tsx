/* Day 3: the hero placeholder is replaced by the real scroll film (Acts 1+2).
   The remaining placeholders below stay until their sections land (Day 2 port,
   Day 4 later acts + ticker). */

import HeroFilm from "@/components/hero/HeroFilm";

const sections = [
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
    <main className="flex-1">
      <HeroFilm />

      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-4">
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
      </div>
    </main>
  );
}
