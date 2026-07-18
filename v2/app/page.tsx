import Reveal from "@/components/Reveal";
import SiteHeader from "@/components/SiteHeader";
import HeroFilm from "@/components/hero/HeroFilm";
import Demo from "@/components/Demo";
import Moments from "@/components/Moments";
import Experts from "@/components/Experts";
import Faq from "@/components/Faq";
import Install from "@/components/Install";
import Waitlist from "@/components/Waitlist";
import SiteFooter from "@/components/SiteFooter";

/* Day 2 port + Day 3 hero film merged: the ported sections at 1:1 visual parity,
   with the static hero replaced by the scroll film (Acts 1+2; Acts 3+4 land on
   Day 4). Reveal wrappers reproduce the original scroll-in entrance. */
export default function Home() {
  return (
    <div
      style={{
        width: "100%",
        background: "var(--color-paper)",
        color: "var(--color-ink)",
        fontFamily: "var(--font-sans)",
        overflowX: "hidden",
      }}
    >
      <SiteHeader />
      <main>
        <HeroFilm />
        <Reveal>
          <Demo />
        </Reveal>
        <Reveal>
          <Moments />
        </Reveal>
        <Reveal>
          <Experts />
        </Reveal>
        <Reveal>
          <Faq />
        </Reveal>
        <Reveal>
          <Install />
        </Reveal>
        <Reveal>
          <Waitlist />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
