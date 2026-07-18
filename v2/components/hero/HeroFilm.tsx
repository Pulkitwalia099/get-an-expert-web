"use client";

/* HeroFilm.tsx - the hero film restructured to "The Wall".
 *
 * The beats, in scroll order (all from docs/hero-film-v2-spec.html):
 *   01 THE WALL   - you open INSIDE a Claude Code session; agent lines stream on
 *                   load and end on the bronze wall line; the ask auto-types in
 *                   the composer docked inside the session (never scroll-gated).
 *   02 THE SEARCH - the session recedes in depth (scales down + blurs + drops
 *                   behind the globe); the composer detaches upward as a probe on
 *                   a dashed tether; the R3F globe, radar sweep, candidate faces,
 *                   scan cards and live counter play the search theatre.
 *   03 THE MATCH  - one dot holds green; a flash rings it; the expert head pops
 *                   out from that dot's projected screen point, then the card
 *                   unfolds. The session returns from depth, the expert chat docks
 *                   to its right, and the probe flies home into the composer.
 *   04 DELIVERED  - the context payload travels session -> chat; the expert reply
 *                   types "On it."; the video attachment lands; confetti bursts;
 *                   the finale dims the panes and closes with the whisper + CTAs.
 *
 * A Lenis smooth-scroll drives a scrubbed GSAP ScrollTrigger, which advances a
 * single film-progress value. A rAF loop applies that value imperatively across
 * every DOM layer each frame, and shares it (progressRef) plus the projected
 * match dot (matchDotRef) with the R3F globe so the two stay locked. All phase
 * boundaries live in film.ts. */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  ASK,
  PHASES,
  TRACK_VH,
  actForProgress,
  clamp,
  easeBack,
  easeIO,
  lerp,
  seg,
} from "./film";
import styles from "./hero.module.css";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

/* candidate glyph field: position + a token-derived gradient class (people green
   and expert bronze, cycled). No real faces, silhouettes only. */
const FACES: { l: string; t: string; c: keyof typeof styles }[] = [
  { l: "30%", t: "38%", c: "faceA" },
  { l: "70%", t: "36%", c: "faceB" },
  { l: "24%", t: "58%", c: "faceF" },
  { l: "76%", t: "60%", c: "faceE" },
  { l: "34%", t: "78%", c: "faceD" },
  { l: "66%", t: "80%", c: "faceF" },
  { l: "50%", t: "26%", c: "faceA" },
  { l: "17%", t: "31%", c: "faceB" },
  { l: "80%", t: "47%", c: "faceA" },
  { l: "40%", t: "32%", c: "faceD" },
  { l: "60%", t: "84%", c: "faceE" },
  { l: "28%", t: "70%", c: "faceB" },
];

export default function HeroFilm() {
  // structural
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  // the session duo
  const duoRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const composerTxRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  // probe + tether
  const probeRef = useRef<HTMLDivElement>(null);
  const tetherRef = useRef<HTMLDivElement>(null);

  // search theatre
  const theatreRef = useRef<HTMLDivElement>(null);
  const searchlineRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const scanRefs = useRef<(HTMLDivElement | null)[]>([]);
  const faceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flashRef = useRef<HTMLDivElement>(null);

  // match card
  const matchRef = useRef<HTMLDivElement>(null);
  const matchInfoRef = useRef<HTMLDivElement>(null);
  const matchDotRef = useRef<[number, number]>([58, 62]);

  // chat contents
  const slotRef = useRef<HTMLDivElement>(null);
  const residentRef = useRef<HTMLDivElement>(null);
  const ctxMsgRef = useRef<HTMLDivElement>(null);
  const payloadRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const replyTxRef = useRef<HTMLSpanElement>(null);
  const deliverRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  // finale
  const whisperRef = useRef<HTMLDivElement>(null);
  const whisperSubRef = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // driver + one-shot state
  const progressRef = useRef(0);
  const typedRef = useRef(false);
  const replyStartedRef = useRef(false);
  const burstArmedRef = useRef(true);
  const confettiTimers = useRef<number[]>([]);

  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);

  // detect environment after mount (SSR-safe; avoids hydration mismatch)
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const mq = window.matchMedia("(max-width: 760px)");
    setMobile(mq.matches);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const isReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // the expert reply types once, when its beat arrives
    const typeReply = () => {
      if (replyStartedRef.current) return;
      replyStartedRef.current = true;
      const T = "I know what you're looking for. On it.";
      let i = 0;
      const iv = window.setInterval(() => {
        if (replyTxRef.current) replyTxRef.current.textContent = T.slice(0, ++i);
        if (i >= T.length) window.clearInterval(iv);
      }, 26);
    };

    // time-based intro: the agent lines stream in on load
    const lineEls = streamRef.current
      ? Array.from(streamRef.current.querySelectorAll<HTMLElement>("[data-line]"))
      : [];
    const lineTimers = lineEls.map((l, i) =>
      window.setTimeout(() => l.classList.add(styles.on), 500 + i * 850)
    );

    // the ask auto-types after the wall lands (never scroll-gated)
    let typeIv = 0;
    const typeTimer = window.setTimeout(() => {
      let i = 0;
      typeIv = window.setInterval(() => {
        if (composerTxRef.current)
          composerTxRef.current.textContent = ASK.slice(0, ++i);
        if (i >= ASK.length) {
          window.clearInterval(typeIv);
          typedRef.current = true;
          if (caretRef.current) caretRef.current.style.display = "none";
        }
      }, 32);
    }, 500 + lineEls.length * 850 + 500);

    // Reduced motion: static composed poster, no pin. The .reduced CSS stacks
    // the duo with the chat expanded; fill the ask + reply text and stop.
    if (isReduced) {
      typedRef.current = true;
      if (composerTxRef.current) composerTxRef.current.textContent = ASK;
      if (caretRef.current) caretRef.current.style.display = "none";
      typeReply();
      return () => {
        window.clearTimeout(typeTimer);
        window.clearInterval(typeIv);
        lineTimers.forEach((t) => window.clearTimeout(t));
      };
    }

    // one satisfying delivery confetti burst, re-armed when scrolling back
    const burst = () => {
      if (!burstArmedRef.current) return;
      burstArmedRef.current = false;
      const stage = stageRef.current;
      const cr = chatRef.current?.getBoundingClientRect();
      if (!stage || !cr) return;
      const cssVar = (v: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      const colors = [
        cssVar("--color-forest"),
        cssVar("--color-bronze"),
        cssVar("--color-sage"),
        cssVar("--color-bronze-ink"),
        cssVar("--color-ink"),
      ];
      const ox = ((cr.left + cr.width * 0.5) / window.innerWidth) * 100;
      const oy = Math.max(8, ((cr.top + 70) / window.innerHeight) * 100);
      for (let i = 0; i < 46; i++) {
        const e = document.createElement("i");
        e.className = styles.confetti;
        e.style.left = `${ox}%`;
        e.style.top = `${oy}%`;
        e.style.background = colors[i % colors.length];
        stage.appendChild(e);
        e.style.width = `${6 + Math.random() * 7}px`;
        e.style.height = `${10 + Math.random() * 8}px`;
        const a = Math.random() * Math.PI * 2;
        const d = 80 + Math.random() * 230;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            e.style.transform = `translate(${Math.cos(a) * d}px, ${
              Math.sin(a) * d + 100
            }px) rotate(${Math.random() * 540 - 270}deg)`;
            e.style.opacity = "0";
          })
        );
        confettiTimers.current.push(window.setTimeout(() => e.remove(), 1900));
      }
    };

    // apply one film-progress value across every DOM layer
    const apply = (p: number) => {
      const ih = window.innerHeight;

      // headline lifts away; scroll cue fades
      const ho = easeIO(seg(p, PHASES.headOut[0], PHASES.headOut[1]));
      if (headRef.current) {
        headRef.current.style.opacity = String(1 - ho);
        headRef.current.style.transform = `translateX(-50%) translateY(${-ho * 70}px)`;
      }
      if (cueRef.current)
        cueRef.current.style.opacity = String(1 - easeIO(seg(p, 0.03, 0.09)));

      // the duo recedes in depth, then returns
      const rec =
        easeIO(seg(p, PHASES.duoRecede[0], PHASES.duoRecede[1])) -
        easeIO(seg(p, PHASES.duoReturn[0], PHASES.duoReturn[1]));
      const duo = duoRef.current;
      if (duo) {
        duo.style.transform = `translate(-50%,-50%) translateY(${-rec * 5}vh) scale(${
          1 - rec * 0.52
        })`;
        duo.style.opacity = String(1 - rec * 0.82);
        duo.style.filter = `blur(${rec * 2.5}px) saturate(${1 - rec * 0.3})`;
        duo.style.zIndex = rec > 0.45 ? "4" : "10";
      }

      // composer detaches to the probe, then flies home into the session
      const pi = easeIO(seg(p, PHASES.probeIn[0], PHASES.probeIn[1]));
      const pr = easeIO(seg(p, 0.56, 0.66));
      if (composerRef.current)
        composerRef.current.style.opacity = String(Math.min(1 - pi + pr, 1));
      const compR = composerRef.current?.getBoundingClientRect();
      const homeT =
        compR && compR.height ? ((compR.top + compR.height / 2) / ih) * 100 : 66;
      const probe = probeRef.current;
      if (probe) {
        probe.style.opacity = String(Math.min(pi, 1 - seg(p, 0.645, 0.672)));
        probe.style.top = `${lerp(lerp(34, 17, pi), homeT, pr)}%`;
        probe.style.transform = `translateX(-50%) scale(${1 - pr * 0.22})`;
      }
      if (tetherRef.current) {
        tetherRef.current.style.opacity = String(pi - easeIO(seg(p, 0.5, 0.58)));
        tetherRef.current.style.top = "24%";
        tetherRef.current.style.height = "18vh";
      }

      // the search theatre (globe wrapper + searchline + counter)
      const th =
        easeIO(seg(p, PHASES.theatre[0], PHASES.theatre[1])) -
        easeIO(seg(p, 0.52, 0.6));
      if (theatreRef.current) theatreRef.current.style.opacity = String(th);
      if (searchlineRef.current) searchlineRef.current.style.opacity = String(th);
      if (counterRef.current) counterRef.current.style.opacity = String(th);
      const scan = seg(p, 0.26, 0.52);
      if (countRef.current)
        countRef.current.textContent = Math.floor(
          lerp(0, 4183, scan)
        ).toLocaleString();
      if (searchlineRef.current) {
        if (p < 0.26)
          searchlineRef.current.innerHTML =
            "searching <b>4,183 experts</b> across <b>61 countries</b>…";
        else if (p < 0.5)
          searchlineRef.current.innerHTML =
            "matching on <b>craft</b>, <b>track record</b>, <b>availability</b>…";
        else searchlineRef.current.innerHTML = "<b>one profile holds.</b>";
      }

      // scan cards flicker through their verdicts
      const csA = PHASES.scanCards[0];
      const csB = PHASES.scanCards[1];
      const span = (csB - csA) / 4;
      scanRefs.current.forEach((c, i) => {
        if (!c) return;
        const s = csA + i * span;
        const vis =
          seg(p, s, s + span * 0.35) -
          (i < 3 ? seg(p, s + span * 0.8, s + span) : seg(p, 0.56, 0.6));
        const v = clamp(vis, 0, 1);
        c.style.opacity = String(v);
        c.style.transform = `translateY(${(1 - v) * 14}px)`;
      });

      // candidate faces flicker around the globe during the scan
      const scn = seg(p, 0.24, 0.5);
      faceRefs.current.forEach((f, i) => {
        if (!f) return;
        const st = i * 0.068;
        const loc = seg(scn, st, st + 0.16);
        let vis = Math.sin(Math.min(loc, 1) * Math.PI);
        vis *= 1 - seg(p, 0.5, 0.545);
        f.style.opacity = String(vis * 0.95);
        f.style.transform = `translate(-50%,-50%) scale(${0.4 + vis * 0.7})`;
      });

      // the match: head pops from the projected dot, then the card unfolds
      const mrRaw = seg(p, PHASES.matchResolve[0], PHASES.matchResolve[1]);
      const mr = easeIO(mrRaw);
      const headT = seg(mrRaw, 0, 0.5);
      const cardT = seg(mrRaw, 0.45, 1);
      const pop = headT > 0 ? easeBack(headT) : 0;
      const fly = easeIO(seg(p, PHASES.matchFly[0], PHASES.matchFly[1]));
      const dot = matchDotRef.current;
      if (matchRef.current) {
        matchRef.current.style.opacity = String(
          (mrRaw > 0 ? Math.min(1, mrRaw * 3.5) : 0) - easeIO(seg(p, 0.72, 0.75))
        );
        matchRef.current.style.left = `${lerp(lerp(dot[0], 50, mr), 71, fly)}%`;
        matchRef.current.style.top = `${lerp(lerp(dot[1], 44, mr), 42, fly)}%`;
        matchRef.current.style.transform = `translate(-50%,-50%) scale(${lerp(
          lerp(0.25, 1, pop),
          0.72,
          fly
        )})`;
        matchRef.current.style.borderRadius = `${lerp(40, 14, cardT)}px`;
        matchRef.current.style.padding = `${lerp(5, 13, cardT)}px ${lerp(
          5,
          18,
          cardT
        )}px`;
      }
      if (matchInfoRef.current) {
        matchInfoRef.current.style.maxWidth = `${cardT * 240}px`;
        matchInfoRef.current.style.opacity = String(cardT);
        matchInfoRef.current.style.marginLeft = `${cardT * 2}px`;
      }
      if (flashRef.current) {
        flashRef.current.style.left = `${dot[0]}%`;
        flashRef.current.style.top = `${dot[1]}%`;
        flashRef.current.style.opacity = String(
          Math.sin(Math.min(mrRaw * 2.2, 1) * Math.PI)
        );
        flashRef.current.style.transform = `translate(-50%,-50%) scale(${
          1 + mrRaw * 5
        })`;
      }

      // the expert chat pane docks to the right of the returning session
      const dock = easeIO(seg(p, PHASES.chatDock[0], PHASES.chatDock[1]));
      const chat = chatRef.current;
      if (chat) {
        chat.style.height =
          dock >= 1
            ? "auto"
            : dock > 0
            ? `${sessionRef.current?.offsetHeight ?? 0}px`
            : "0";
        chat.style.width = `${dock * 330}px`;
        chat.style.opacity = String(dock);
        chat.style.marginLeft = `${dock * 14}px`;
      }
      const slot = slotRef.current;
      if (slot) {
        slot.style.opacity = String(dock * (1 - seg(p, 0.72, 0.74)));
        slot.classList.toggle(styles.glow, fly > 0.3 && fly < 1);
      }
      if (p > 0.73) {
        if (slot) slot.style.display = "none";
        residentRef.current?.classList.add(styles.on);
      } else {
        if (slot) slot.style.display = "grid";
        residentRef.current?.classList.remove(styles.on);
      }

      // context payload travels session -> chat, lands as a sent message
      const pay = seg(p, PHASES.payload[0], PHASES.payload[1]);
      if (payloadRef.current) {
        payloadRef.current.style.opacity = String(
          pay > 0 && pay < 1 ? Math.min(1, pay * 4) * (1 - seg(pay, 0.85, 1)) : 0
        );
        payloadRef.current.style.left = `${lerp(36, 64, easeIO(pay))}%`;
        payloadRef.current.style.top = `${
          lerp(60, 42, easeIO(pay)) - Math.sin(pay * Math.PI) * 6
        }%`;
      }
      if (ctxMsgRef.current) {
        ctxMsgRef.current.style.opacity = String(
          pay >= 1 || p > PHASES.payload[1] ? 1 : 0
        );
        ctxMsgRef.current.style.transform = "none";
      }

      // expert reply, then delivery
      if (p > PHASES.reply[0]) typeReply();
      const rep = easeIO(seg(p, PHASES.reply[0], PHASES.reply[1]));
      if (replyRef.current) {
        replyRef.current.style.opacity = String(rep);
        replyRef.current.style.transform = `translateY(${(1 - rep) * 8}px)`;
      }
      if (p > PHASES.deliver[0] + 0.015) burst();
      if (p < 0.8) burstArmedRef.current = true;
      const del = easeIO(seg(p, PHASES.deliver[0], PHASES.deliver[1]));
      if (deliverRef.current) {
        deliverRef.current.style.opacity = String(del);
        deliverRef.current.style.transform = `translateY(${(1 - del) * 8}px)`;
      }
      if (chipRef.current) {
        chipRef.current.style.opacity = String(easeIO(seg(p, 0.88, 0.91)));
        chipRef.current.style.transform = "none";
      }

      // finale: dim the panes, whisper, sub-line, CTAs
      const dim = easeIO(seg(p, PHASES.dim[0], PHASES.dim[1]));
      if (duo)
        duo.style.opacity = String(
          Math.min(parseFloat(duo.style.opacity || "1"), 1 - dim * 0.92)
        );
      if (whisperRef.current)
        whisperRef.current.style.opacity = String(
          easeIO(seg(p, PHASES.whisper[0], PHASES.whisper[1]))
        );
      const wsub = easeIO(seg(p, 0.93, 0.97));
      if (whisperSubRef.current) {
        whisperSubRef.current.style.opacity = String(wsub);
        whisperSubRef.current.style.transform = `translateX(-50%) translateY(${
          (1 - wsub) * 10
        }px)`;
      }
      if (finaleRef.current) {
        finaleRef.current.style.opacity = String(
          easeIO(seg(p, PHASES.finale[0], PHASES.finale[1]))
        );
        finaleRef.current.style.pointerEvents = p > 0.96 ? "auto" : "none";
      }

      // act rail
      const act = actForProgress(p);
      actRefs.current.forEach((a, i) => a?.classList.toggle(styles.on, i === act));
    };

    gsap.registerPlugin(ScrollTrigger);
    apply(0);

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    const lenisRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    // scrubbed master timeline: a single progress value drives everything, both
    // scroll directions. Lenis + scrub give the smoothed "lerp" feel per spec.
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
        progressRef.current = driver.v;
      },
    });

    // a rAF loop applies each frame so the match origin tracks the rotating globe
    let rafId = 0;
    const tick = () => {
      apply(progressRef.current);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    ScrollTrigger.refresh();

    // capture refs for cleanup (stable for this component's lifetime)
    const confettiTimersAtCleanup = confettiTimers.current;
    const stageAtCleanup = stageRef.current;

    return () => {
      window.clearTimeout(typeTimer);
      window.clearInterval(typeIv);
      lineTimers.forEach((t) => window.clearTimeout(t));
      confettiTimersAtCleanup.forEach((t) => window.clearTimeout(t));
      stageAtCleanup
        ?.querySelectorAll(`.${styles.confetti}`)
        .forEach((n) => n.remove());
      cancelAnimationFrame(rafId);
      gsap.ticker.remove(lenisRaf);
      tl.scrollTrigger?.kill();
      tl.kill();
      lenis.destroy();
    };
  }, []);

  const person = (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="8.2" r="4.2" />
      <path d="M3.5 21c1.6-4.4 5-6.4 8.5-6.4s6.9 2 8.5 6.4z" />
    </svg>
  );

  return (
    <section
      ref={trackRef}
      className={`${styles.track}${reduced ? ` ${styles.reduced}` : ""}`}
      style={{ height: reduced ? "auto" : `${TRACK_VH}vh` }}
      aria-label="Get an expert: you hit a wall, the world's best joins, delivered"
    >
      <div className={styles.stage} ref={stageRef}>
        <div className={styles.head} ref={headRef}>
          <h1 className={styles.h1}>
            {"Build like the world's best are "}
            <em>beside you.</em>
          </h1>
          <p className={styles.sub}>
            {'Ask for something impossibly specific. The right human says "on it."'}
          </p>
        </div>

        {/* the session duo */}
        <div className={styles.duo} ref={duoRef}>
          <div className={`${styles.pane} ${styles.session}`} ref={sessionRef}>
            <div className={styles.bar}>
              <span className={styles.dots}>
                <i />
                <i />
                <i />
              </span>
              <b>Claude Code</b>
              <span className={styles.tag}>your session</span>
            </div>
            <div className={styles.body} ref={streamRef}>
              <div className={styles.line} data-line>
                <span className={styles.p}>you</span> · finish the launch page and
                the launch video
              </div>
              <div className={styles.line} data-line>
                building launch page · hero, pricing, waitlist ✓
              </div>
              <div className={styles.line} data-line>
                script + storyboard done · basic motion cut rendered
              </div>
              <div className={`${styles.line} ${styles.wall}`} data-line>
                {
                  "Script and storyboard are done, and I've made a basic motion cut. For a launch this important, you'll want a professional video."
                }
              </div>
            </div>
            <div className={styles.composer} ref={composerRef}>
              <span className={styles.composerTx} ref={composerTxRef} />
              <span className={styles.caret} ref={caretRef} />
              <span className={styles.go}>↑</span>
            </div>
          </div>

          <div className={`${styles.pane} ${styles.chat}`} ref={chatRef}>
            <div className={styles.bar}>
              <span className={styles.dots}>
                <i />
                <i />
                <i />
              </span>
              <b>Expert chat</b>
              <span className={styles.tag}>joins your session</span>
            </div>
            <div className={styles.body}>
              <div className={styles.expertSlot} ref={slotRef}>
                expert joins here
              </div>
              <div className={styles.resident} ref={residentRef}>
                <span className={styles.ava} />
                <div>
                  <b>Motion graphic designer</b>
                  <span>100+ launch videos · since 2016</span>
                </div>
              </div>
              <div className={`${styles.msg} ${styles.you}`} ref={ctxMsgRef}>
                <span className={styles.who}>shared from your session</span>
                Your full context · script, storyboard, motion cut v1
              </div>
              <div className={`${styles.msg} ${styles.them}`} ref={replyRef}>
                <span className={styles.who}>expert</span>
                <span ref={replyTxRef} />
              </div>
              <div className={`${styles.msg} ${styles.them}`} ref={deliverRef}>
                <span className={styles.who}>expert</span>
                <div className={styles.video}>
                  <span className={styles.play}>▶</span>
                  <div>
                    <b>launch-video-final.mp4</b>
                    <span>68 MB · two aspect ratios, captions baked in</span>
                  </div>
                </div>
              </div>
              <div className={styles.chip} ref={chipRef}>
                Delivered in 40 minutes
              </div>
            </div>
          </div>
        </div>

        {/* search theatre */}
        <div className={styles.probe} ref={probeRef}>
          <span className={styles.tx}>Get an expert to build the launch video</span>
          <span className={styles.go}>↑</span>
        </div>
        <div className={styles.tether} ref={tetherRef} />
        <div className={styles.searchline} ref={searchlineRef}>
          searching <b>4,183 experts</b> across <b>61 countries</b>…
        </div>
        <div className={styles.theatre} ref={theatreRef}>
          <div className={styles.sweep} />
          <Globe
            className={styles.globe}
            progressRef={progressRef}
            matchDotRef={matchDotRef}
            mobile={mobile}
            reduced={reduced}
          />
        </div>
        <div className={styles.counter} ref={counterRef}>
          <b ref={countRef}>0</b> profiles scanned · craft, track record,
          availability
        </div>

        <div
          className={styles.scanCard}
          ref={(el) => {
            scanRefs.current[0] = el;
          }}
          style={{ left: "12%" }}
        >
          <b>Film editor</b>
          <span>Seoul · 9 yrs</span>
          <div className={styles.verdict}>passed over · wrong craft</div>
        </div>
        <div
          className={styles.scanCard}
          ref={(el) => {
            scanRefs.current[1] = el;
          }}
          style={{ right: "15%" }}
        >
          <b>3D generalist</b>
          <span>Berlin · 7 yrs</span>
          <div className={styles.verdict}>passed over · booked</div>
        </div>
        <div
          className={styles.scanCard}
          ref={(el) => {
            scanRefs.current[2] = el;
          }}
          style={{ left: "10%" }}
        >
          <b>Brand animator</b>
          <span>São Paulo · 11 yrs</span>
          <div className={styles.verdict}>close · fewer launches</div>
        </div>
        <div
          className={`${styles.scanCard} ${styles.hold}`}
          ref={(el) => {
            scanRefs.current[3] = el;
          }}
          style={{ right: "17%" }}
        >
          <b>Motion graphic designer</b>
          <span>Barcelona · since 2016</span>
          <div className={styles.verdict}>100+ launch videos · available now</div>
        </div>

        {FACES.map((f, i) => (
          <div
            key={i}
            className={`${styles.face} ${styles[f.c]}`}
            ref={(el) => {
              faceRefs.current[i] = el;
            }}
            style={{ left: f.l, top: f.t }}
          >
            {person}
          </div>
        ))}
        <div className={styles.flash} ref={flashRef} />

        <div className={styles.match} ref={matchRef}>
          <span className={styles.ava} />
          <div className={styles.matchInfo} ref={matchInfoRef}>
            <b>Motion graphic designer</b>
            <span>100+ launch videos · since 2016</span>
          </div>
        </div>

        <div className={styles.payload} ref={payloadRef}>
          <span className={styles.who}>shared from your session</span>
          Your full context · script, storyboard, motion cut v1
        </div>

        <div className={styles.whisper} ref={whisperRef}>
          You never left your session.
        </div>
        <div className={styles.whisperSub} ref={whisperSubRef}>
          Keep building your most ambitious ideas.
        </div>
        <div className={styles.finale} ref={finaleRef}>
          <div className={styles.steps}>
            <span className={styles.step}>
              <i>01</i> you hit a wall
            </span>
            <span className={styles.step}>
              <i>02</i> the world&apos;s best joins
            </span>
            <span className={styles.step}>
              <i>03</i> delivered
            </span>
          </div>
          <div className={styles.ctas}>
            <a className={`${styles.btn} ${styles.btnPrimary}`} href="#waitlist">
              Join the waitlist
            </a>
            <a className={`${styles.btn} ${styles.btnGhost}`} href="#install">
              Install in 30 seconds
            </a>
          </div>
        </div>

        <div className={styles.rail}>
          {["01 THE WALL", "02 THE SEARCH", "03 THE MATCH", "04 DELIVERED"].map(
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
        <div className={styles.cue} ref={cueRef}>
          scroll
        </div>
      </div>
    </section>
  );
}
