"use client";

/* HeroFilm.tsx - Acts 1 and 2 of the hero film ("the search that travels").
 *
 * Act 1: the headline + composer; the ask auto-types on load (never scroll-gated).
 * Act 2: the composer shrinks to a probe and flies over the R3F globe while the
 *        search scans cities; one arc holds green and the match card resolves.
 *
 * A Lenis smooth-scroll drives a scrubbed GSAP ScrollTrigger master timeline
 * (both directions). The timeline advances a single film-progress value that
 * this component applies imperatively to the DOM layers, and shares (via a ref)
 * with the globe so the two stay locked. Acts 3+4 are Day 4; the constants in
 * film.ts (ACT2_END, TRACK_VH) are the two knobs that turn them on.
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  ACT2_END,
  ASK,
  CITIES,
  PHASES,
  TRACK_VH,
  actForProgress,
  easeIO,
  lerp,
  seg,
} from "./film";
import styles from "./hero.module.css";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

export default function HeroFilm() {
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const txRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const searchlineRef = useRef<HTMLDivElement>(null);
  const matchRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Act 3+4 layers
  const productRef = useRef<HTMLDivElement>(null);
  const residentRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const replyRef = useRef<HTMLDivElement>(null);
  const agentLineRef = useRef<HTMLDivElement>(null);
  const deliverRef = useRef<HTMLDivElement>(null);
  const whisperRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef(0);
  const typedRef = useRef(false);
  const typeTimerRef = useRef<number>(0);
  const typeIntervalRef = useRef<number>(0);

  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);

  // detect environment after mount (SSR-safe; avoids hydration mismatch)
  useEffect(() => {
    setReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    const mq = window.matchMedia("(max-width: 700px)");
    setMobile(mq.matches);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const isReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Reduced motion: no pin, no scrub. Freeze the composed frame; the CSS
    // .reduced layout stacks the poster and the globe renders one static frame.
    if (isReduced) {
      typedRef.current = true;
      if (txRef.current) txRef.current.textContent = ASK;
      if (caretRef.current) caretRef.current.style.display = "none";
      return;
    }

    // apply one film-progress value across every DOM layer
    const applyDOM = (p: number) => {
      const vw = window.innerWidth;

      // headline lifts away
      const hs = easeIO(seg(p, PHASES.headOut[0], PHASES.headOut[1]));
      if (headRef.current) {
        headRef.current.style.opacity = String(1 - hs);
        headRef.current.style.transform = `translateX(-50%) translateY(${-hs * 90}px)`;
      }

      // probe departs, shrinks, sways, holds through Act 2's finish
      const ps = easeIO(seg(p, PHASES.probeFly[0], PHASES.probeFly[1]));
      const probeTop = lerp(47, 24, ps);
      const probeW = lerp(Math.min(620, vw * 0.92), Math.min(400, vw * 0.86), ps);
      const sway =
        Math.sin(p * 16) *
        10 *
        easeIO(seg(p, PHASES.probeSway[0], PHASES.probeSway[1])) *
        (1 - easeIO(seg(p, PHASES.probeSwaySettle[0], PHASES.probeSwaySettle[1])));
      const fade = easeIO(seg(p, PHASES.probeOut[0], PHASES.probeOut[1]));
      if (probeRef.current) {
        probeRef.current.style.width = `${probeW}px`;
        probeRef.current.style.top = `${probeTop}%`;
        probeRef.current.style.transform = `translateX(calc(-50% + ${sway}px))`;
        probeRef.current.style.opacity = String(1 - fade);
        probeRef.current.classList.toggle(
          styles.lit,
          typedRef.current && p > 0.08
        );
        probeRef.current.classList.toggle(
          styles.searching,
          p > PHASES.searchingClass[0] && p < PHASES.searchingClass[1]
        );
      }

      // the city-scan search line, sitting just under the probe
      if (searchlineRef.current) {
        searchlineRef.current.style.top = `calc(${probeTop}% + 72px)`;
        searchlineRef.current.style.opacity =
          p > PHASES.searchlineOn[0] && p < PHASES.searchlineOn[1] ? "1" : "0";
        const scan = seg(p, PHASES.scan[0], PHASES.scan[1]);
        if (p < 0.18) {
          searchlineRef.current.innerHTML =
            "searching <b>4,000+ experts</b> across <b>60 countries</b>…";
        } else if (p < 0.52) {
          const city =
            CITIES[Math.min(CITIES.length - 1, Math.floor(scan * CITIES.length))];
          searchlineRef.current.innerHTML = `scanning <b>${city}</b>…`;
        } else {
          searchlineRef.current.innerHTML =
            "matched on <b>craft</b>, <b>track record</b>, <b>availability</b>";
        }
      }

      // ---------- Act 2 finish -> Act 3: the match flies into the session ----------
      // The match card resolves under the probe, then flies to the chat slot of
      // the product panel and dissolves as the resident card takes over (a FLIP
      // handoff: fixed start/end tuned by eye, not a pixel-locked rect measure).
      const ms = easeIO(seg(p, PHASES.matchResolve[0], PHASES.matchResolve[1]));
      const fly = easeIO(seg(p, PHASES.matchFly[0], PHASES.matchFly[1]));
      const flyOut = easeIO(seg(p, PHASES.matchFlyOut[0], PHASES.matchFlyOut[1]));
      if (matchRef.current) {
        const curL = lerp(50, 69, fly); // % across the stage: center -> chat side
        const curTop = lerp(probeTop + 10, 40, fly) - Math.sin(fly * Math.PI) * 7;
        matchRef.current.style.left = `${curL}%`;
        matchRef.current.style.top = `${curTop}%`;
        matchRef.current.style.transform = `translate(-50%, -50%) translateY(${lerp(
          28,
          0,
          ms
        )}px) scale(${lerp(0.94, lerp(1, 0.82, fly), ms)})`;
        matchRef.current.style.opacity = String(ms * (1 - flyOut));
      }

      // the real product splitscreen rises into view
      const rise = easeIO(seg(p, PHASES.productRise[0], PHASES.productRise[1]));
      if (productRef.current) {
        productRef.current.style.opacity = rise > 0.01 ? "1" : "0";
        productRef.current.style.transform = `translate(-50%, calc(-50% + ${lerp(
          64,
          0,
          rise
        )}vh)) scale(${lerp(0.96, 1, rise)})`;
      }

      // the match resolves inside the chat slot with a receiving glow
      const land = easeIO(seg(p, PHASES.matchLand[0], PHASES.matchLand[1]));
      if (residentRef.current) {
        residentRef.current.style.opacity = String(land);
        residentRef.current.style.transform = `translateY(${lerp(10, 0, land)}px) scale(${lerp(
          0.94,
          1,
          land
        )})`;
        const glow = Math.sin(land * Math.PI); // peaks mid-landing, eases off
        residentRef.current.style.boxShadow = `0 0 0 ${lerp(
          0,
          5,
          glow
        )}px color-mix(in srgb, var(--color-sage) ${lerp(
          0,
          42,
          glow
        )}%, transparent), 0 18px 40px -18px color-mix(in srgb, var(--color-forest) 35%, transparent)`;
      }

      // context chips arc from the app pane to the chat side (staggered)
      chipRefs.current.forEach((el, i) => {
        if (!el) return;
        const cp = easeIO(seg(p, PHASES.chips[0] + i * 0.11, PHASES.chips[1]));
        const x = lerp(31, 66, cp);
        const y = lerp(58, 44, cp) - Math.sin(cp * Math.PI) * 11;
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.style.opacity = String(rise > 0.4 ? Math.sin(cp * Math.PI) : 0);
      });

      // expert reply: immediate, "On it."
      const rep = easeIO(seg(p, PHASES.reply[0], PHASES.reply[1]));
      if (replyRef.current) {
        replyRef.current.style.opacity = String(rep);
        replyRef.current.style.transform = `translateY(${lerp(10, 0, rep)}px)`;
      }

      // ---------- Act 4: delivered ----------
      // the agent continues in the app pane
      const agentEase = easeIO(seg(p, PHASES.agentOn[0], PHASES.agentOn[1]));
      if (agentLineRef.current) {
        agentLineRef.current.style.opacity = String(agentEase);
        agentLineRef.current.style.transform = `translateY(${lerp(8, 0, agentEase)}px)`;
      }

      // delivery lands in the session
      const del = easeIO(seg(p, PHASES.deliver[0], PHASES.deliver[1]));
      if (deliverRef.current) {
        deliverRef.current.style.opacity = String(del);
        deliverRef.current.style.transform = `translateY(${lerp(
          10,
          0,
          del
        )}px) scale(${lerp(0.9, 1, del)})`;
      }

      // whisper line
      const whisp = easeIO(seg(p, PHASES.whisper[0], PHASES.whisper[1]));
      if (whisperRef.current) {
        whisperRef.current.style.opacity = String(whisp);
        whisperRef.current.style.transform = `translateX(-50%) translateY(${lerp(
          8,
          0,
          whisp
        )}px)`;
      }

      // closing CTAs rise
      const cta = easeIO(seg(p, PHASES.ctas[0], PHASES.ctas[1]));
      if (ctaRef.current) {
        ctaRef.current.style.opacity = String(cta);
        ctaRef.current.style.transform = `translateX(-50%) translateY(${lerp(
          14,
          0,
          cta
        )}px)`;
        ctaRef.current.style.pointerEvents = cta > 0.9 ? "auto" : "none";
      }

      // act rail
      const act = actForProgress(p);
      actRefs.current.forEach((el, i) => {
        if (el) el.classList.toggle(styles.on, i + 1 === act);
      });

      // scroll cue fades out as the search takes over
      if (cueRef.current) {
        cueRef.current.style.opacity = String(
          1 - easeIO(seg(p, PHASES.cueOut[0], PHASES.cueOut[1]))
        );
      }
    };

    const autoType = (done: () => void) => {
      let i = 0;
      typeIntervalRef.current = window.setInterval(() => {
        if (!txRef.current) return;
        txRef.current.textContent = ASK.slice(0, ++i);
        if (i >= ASK.length) {
          window.clearInterval(typeIntervalRef.current);
          typedRef.current = true;
          if (caretRef.current) caretRef.current.style.display = "none";
          done();
        }
      }, 34);
    };

    gsap.registerPlugin(ScrollTrigger);
    applyDOM(0);

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // scrubbed master timeline: a single progress value drives everything.
    const driver = { v: 0 };
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: trackRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    tl.to(driver, {
      v: 1,
      ease: "none",
      duration: 1,
      onUpdate: () => {
        // map the whole scroll onto Acts 1+2 (0 -> ACT2_END)
        let filmP = driver.v * ACT2_END;
        // the film cannot advance past the ask until it has typed itself
        if (!typedRef.current) filmP = Math.min(filmP, 0.05);
        progressRef.current = filmP;
        applyDOM(filmP);
      },
    });

    typeTimerRef.current = window.setTimeout(() => {
      autoType(() => {
        ScrollTrigger.update();
        applyDOM(progressRef.current);
      });
    }, 700);

    ScrollTrigger.refresh();

    return () => {
      window.clearTimeout(typeTimerRef.current);
      window.clearInterval(typeIntervalRef.current);
      gsap.ticker.remove(raf);
      tl.scrollTrigger?.kill();
      tl.kill();
      lenis.destroy();
    };
  }, []);

  return (
    <section
      ref={trackRef}
      className={`${styles.track}${reduced ? ` ${styles.reduced}` : ""}`}
      style={{ height: reduced ? "auto" : `${TRACK_VH}vh` }}
      aria-label="Get an expert: the search that travels"
    >
      <div className={styles.stage} ref={stageRef}>
        <Globe
          className={styles.globe}
          progressRef={progressRef}
          mobile={mobile}
          reduced={reduced}
        />

        <div className={styles.head} ref={headRef}>
          <h1 className={styles.h1}>
            {"Build like the world's best are "}
            <em>beside you</em>.
          </h1>
          <div className={styles.sub}>
            {
              'Ask for something impossibly specific. The right human says "on it."'
            }
          </div>
        </div>

        <div className={styles.probe} ref={probeRef}>
          <span className={styles.ping} />
          <span className={`${styles.ping} ${styles.p2}`} />
          <div className={styles.tx} ref={txRef}>
            <span className={styles.ph}>Ask for anything…</span>
          </div>
          <span className={styles.caret} ref={caretRef} />
          <div className={styles.go}>↑</div>
        </div>

        <div className={styles.searchline} ref={searchlineRef} />

        <div className={styles.match} ref={matchRef}>
          <span className={styles.morb} />
          <div>
            <div className={styles.matchTitle}>Motion graphic designer</div>
            <div className={styles.matchCred}>
              <b>100+ launch videos</b> · since 2016
            </div>
          </div>
        </div>

        {/* Act 3: the real product splitscreen rises; the match lands in the chat */}
        <div className={styles.product} ref={productRef}>
          <div className={styles.browserbar}>
            <div className={styles.dots}>
              <i />
              <i />
              <i />
            </div>
            <div className={styles.urlpill}>Claude Code · ~/launch</div>
            <span className={styles.barpad} />
          </div>
          <div className={styles.split}>
            {/* left: the app pane, where the agent keeps working */}
            <div className={styles.appPane}>
              <div className={styles.uRow}>
                <span className={styles.uBubble}>
                  Get an expert to build the launch video
                </span>
              </div>
              <div className={styles.tRow}>
                <span className={styles.tDot}>⏺</span>
                <span className={styles.tTx}>storyboard.md · rough-cut.mp4</span>
              </div>
              <div className={styles.agentLine} ref={agentLineRef}>
                <span className={styles.aDot}>✳</span>
                <span className={styles.aTx}>
                  Video&apos;s in. Dropping it into your hero now.
                </span>
              </div>
              <div className={styles.shareRow}>
                <span className={styles.shareLabel}>sharing</span>
                <span className={styles.shareItems}>goal · attempts · errors</span>
              </div>
            </div>
            {/* right: the consumer chat, where the expert answers */}
            <div className={styles.chatPane}>
              <div className={styles.chatHead}>
                <span className={styles.chatMark}>
                  get an <em>expert</em>
                </span>
                <span className={styles.chatConn}>
                  <i />
                  CONNECTED
                </span>
              </div>
              <div className={styles.chatSlot}>
                <div className={styles.resident} ref={residentRef}>
                  <span className={styles.morb} />
                  <div>
                    <div className={styles.matchTitle}>Motion graphic designer</div>
                    <div className={styles.matchCred}>
                      <b>100+ launch videos</b> · since 2016
                    </div>
                  </div>
                </div>
                <div className={styles.reply} ref={replyRef}>
                  I know what you&apos;re looking for. On it.
                </div>
                <div className={styles.deliver} ref={deliverRef}>
                  ✓ Delivered · launch video in the session
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* context chips arcing from the app pane to the chat side */}
        {["goal", "attempts", "errors"].map((label, i) => (
          <span
            key={label}
            className={styles.chip}
            ref={(el) => {
              chipRefs.current[i] = el;
            }}
          >
            {label}
          </span>
        ))}

        {/* Act 4: the whisper and the closing CTAs */}
        <div className={styles.whisper} ref={whisperRef}>
          You never left your session.
        </div>
        <div className={styles.cta} ref={ctaRef}>
          <a className={styles.ctaPrimary} href="#waitlist">
            Get an expert
          </a>
          <a className={styles.ctaGhost} href="#demo">
            See how it works
          </a>
        </div>

        <div className={styles.acts}>
          {["01 the ask", "02 the search", "03 the match", "04 delivered"].map(
            (label, i) => (
              <span
                key={label}
                className={styles.act}
                ref={(el) => {
                  actRefs.current[i] = el;
                }}
              >
                <i />
                {label}
              </span>
            )
          )}
        </div>

        <div className={styles.scrollcue} ref={cueRef}>
          Scroll<span>↓</span>
        </div>
      </div>
    </section>
  );
}
