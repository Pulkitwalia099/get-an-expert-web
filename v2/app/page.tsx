import Reveal from "@/components/Reveal";
import SiteHeader from "@/components/SiteHeader";
import Hero from "@/components/Hero";
import Demo from "@/components/Demo";
import Moments from "@/components/Moments";
import Experts from "@/components/Experts";
import Faq from "@/components/Faq";
import Install from "@/components/Install";
import Waitlist from "@/components/Waitlist";
import SiteFooter from "@/components/SiteFooter";

/* Day 2 port: the live static marketing site rebuilt as React sections at 1:1
   visual parity. Hero is a faithful static port that the Day 3 hero-film track
   replaces. Reveal wrappers reproduce the original scroll-in entrance. */
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
        <Hero />
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
