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
 *   04 DELIVERED  - the context payload flies in from the left; the expert reply
 *                   types "On it."; a "one hour later" wait beat holds; the video
 *                   attachment lands; confetti bursts; the finale dims the panes
 *                   and closes with the whisper + CTAs.
 *
 * An isolated, strippable dusk color grade darkens the room toward warm ink over
 * the search and returns it to day as the session comes back (one --grade scalar
 * driving a veil + graded searchline/counter + the globe's dome dots).
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
import SoundToggle from "./SoundToggle";
import { filmAudio } from "./audio";
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
  { l: "37%", t: "45%", c: "faceD" }, // moved off the searchline band (was 40%/32%)
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
  const matchInnerRef = useRef<HTMLDivElement>(null);
  const matchInfoRef = useRef<HTMLDivElement>(null);
  const matchInfoInnerRef = useRef<HTMLDivElement>(null);
  // fallback origin = the globe's lower-right quadrant (used until the WebGL globe
  // projects the held dot's live screen position)
  const matchDotRef = useRef<[number, number]>([61, 66]);

  // chat contents
  const slotRef = useRef<HTMLDivElement>(null);
  const residentRef = useRef<HTMLDivElement>(null);
  const ctxMsgRef = useRef<HTMLDivElement>(null);
  const payloadRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const replyTxRef = useRef<HTMLSpanElement>(null);
  const deliverRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  // B8 the wait + finale
  const waitRef = useRef<HTMLDivElement>(null);
  const whisperRef = useRef<HTMLDivElement>(null);
  const whisperSubRef = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const actRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // driver + one-shot state
  const progressRef = useRef(0);
  const gradeRef = useRef(0); // dusk grade scalar shared with the globe
  const frozenComposerRef = useRef<{ x: number; y: number } | null>(null);
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

    /* Confetti colours are static design tokens, so they are resolved once here,
       at mount, rather than inside a frame. getComputedStyle forces a style
       flush; doing it during the delivery beat put that flush on the one frame
       of the film already doing the most work. */
    const cssVar = (v: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    const CONFETTI_COLORS = [
      cssVar("--color-forest"),
      cssVar("--color-bronze"),
      cssVar("--color-sage"),
      cssVar("--color-bronze-ink"),
      cssVar("--color-ink"),
    ];

    /* One satisfying delivery confetti burst, re-armed when scrolling back.
       The chat's rect arrives from the frame's batched read phase (the caller
       passes it) rather than being read here: a getBoundingClientRect() after
       the frame's style writes forces a synchronous layout, and this fires on
       the delivery beat, which is meant to feel rewarding rather than dropped.
       Every node is fully styled while still detached and the whole set lands in
       one insertion, so 46 nodes cost one DOM mutation instead of 46. */
    const burst = (cr?: DOMRect) => {
      const stage = stageRef.current;
      if (!burstArmedRef.current || !stage || !cr) return;
      burstArmedRef.current = false;
      const ox = ((cr.left + cr.width * 0.5) / window.innerWidth) * 100;
      const oy = Math.max(8, ((cr.top + 70) / window.innerHeight) * 100);
      const frag = document.createDocumentFragment();
      const nodes: HTMLElement[] = [];
      const flights: string[] = [];
      for (let i = 0; i < 46; i++) {
        const e = document.createElement("i");
        e.className = styles.confetti;
        e.style.left = `${ox}%`;
        e.style.top = `${oy}%`;
        e.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        e.style.width = `${6 + Math.random() * 7}px`;
        e.style.height = `${10 + Math.random() * 8}px`;
        const a = Math.random() * Math.PI * 2;
        const d = 80 + Math.random() * 230;
        flights.push(
          `translate(${Math.cos(a) * d}px, ${
            Math.sin(a) * d + 100
          }px) rotate(${Math.random() * 540 - 270}deg)`
        );
        frag.appendChild(e);
        nodes.push(e);
      }
      stage.appendChild(frag);
      // let the start state commit, then hand every node to the compositor
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          nodes.forEach((e, i) => {
            e.style.transform = flights[i];
            e.style.opacity = "0";
          });
        })
      );
      confettiTimers.current.push(
        window.setTimeout(() => nodes.forEach((e) => e.remove()), 1900)
      );
    };

    /* Memoized style writes. Setting a property to the value it already holds
       still costs a style invalidation, and most elements hold one value for most
       of the film, so every write in apply() goes through this cache. */
    const styleCache = new WeakMap<HTMLElement, Record<string, string>>();
    const set = (el: HTMLElement | null, prop: string, val: string) => {
      if (!el) return;
      let rec = styleCache.get(el);
      if (!rec) {
        rec = {};
        styleCache.set(el, rec);
      }
      if (rec[prop] === val) return;
      rec[prop] = val;
      el.style.setProperty(prop, val);
    };
    const px = (n: number) => `${Math.round(n * 100) / 100}px`;
    const num = (n: number) => String(Math.round(n * 10000) / 10000);
    /* signed term for calc(): calc(-50% + 12px) / calc(-50% - 12px) */
    const addPx = (n: number) => (n < 0 ? `- ${px(-n)}` : `+ ${px(n)}`);
    const op = (el: HTMLElement | null, v: number) => set(el, "opacity", num(v));
    const tf = (el: HTMLElement | null, v: string) => set(el, "transform", v);

    /* The match card's FLIP rects. The card is laid out ONCE at its resting size;
       its pill start state is that same rect minus the box deltas the film used to
       animate (padding 5px -> 13px/18px, .matchInfo max-width 0 -> 240px,
       margin-left 0 -> 2px). Per frame we interpolate a single transform between
       the two rects and counter-scale the inner content so nothing distorts. */
    /* the scan counter's ceiling, and the granularity it reports in (see the
       write site for why it is quantized rather than continuous) */
    const SCAN_TOTAL = 4183;
    const SCAN_STEP = 100;

    const MATCH_PAD_X_DELTA = 26; // 2 * (18 - 5)
    const MATCH_PAD_Y_DELTA = 16; // 2 * (13 - 5)
    const MATCH_INFO_MAX = 240;
    const MATCH_INFO_ML = 2;
    const geo = { w: 1, h: 1, infoW: 1, baseW: 1 };
    const measure = () => {
      const m = matchRef.current;
      const inner = matchInfoInnerRef.current;
      if (!m || !inner) return;
      // offsetWidth/Height are layout box dims, unaffected by the live transform
      geo.w = m.offsetWidth || 1;
      geo.h = m.offsetHeight || 1;
      geo.infoW = inner.offsetWidth || 1;
      geo.baseW = geo.w - MATCH_PAD_X_DELTA - MATCH_INFO_ML - geo.infoW;
    };

    // last position of the chat pane the wait beat parked over (see the read phase)
    const waitPos = { x: -1, y: -1 };
    let lastSearchline = "";

    // apply one film-progress value across every DOM layer
    const apply = (p: number) => {
      // the sound layer edge-triggers its own cues off film progress; it is
      // muted by default and does its scheduling off the render path
      filmAudio.update(p);
      const ih = window.innerHeight;
      const iw = window.innerWidth;

      // dusk grade (isolated experiment): day -> dusk over the search, and daylight
      // returns exactly as "one profile holds" (matchResolve .52). The fall is retimed
      // to .44-.52 so the dark veil is fully GONE before the emergence: the match head
      // surfaces from a lit day-cream globe, never a dark veil that occludes the canvas.
      // One scalar drives the veil + graded text (CSS) + the globe dome dots (gradeRef).
      /* ---- 1. scalars. Pure math, no DOM touched. ---- */
      const grade = clamp(
        easeIO(seg(p, 0.15, 0.3)) - easeIO(seg(p, 0.44, 0.52)),
        0,
        1
      );
      const ho = easeIO(seg(p, PHASES.headOut[0], PHASES.headOut[1]));
      const rec =
        easeIO(seg(p, PHASES.duoRecede[0], PHASES.duoRecede[1])) -
        easeIO(seg(p, PHASES.duoReturn[0], PHASES.duoReturn[1]));
      const rise = easeIO(seg(p, PHASES.probeRise[0], PHASES.probeRise[1]));
      // probe settles home with a soft overshoot (easeOutBack)
      const home = easeBack(seg(p, PHASES.probeHome[0], PHASES.probeHome[1]));
      const detach = seg(p, 0.12, 0.17); // composer hands the pill off to the probe
      const reattach = seg(p, 0.63, 0.68); // composer restored as the probe lands home
      const searchFade =
        easeIO(seg(p, PHASES.theatre[0], PHASES.theatre[1])) -
        easeIO(seg(p, 0.56, 0.63));
      // The theatre WRAPPER holds full opacity through the globe's visible life so
      // the WebGL canvas is never composited at a fractional ancestor opacity (which
      // drops the dome on some GPUs). Its short in/out fades sit where the globe's
      // in-shader alpha is already ~0, so the sweep fades cleanly and nothing pops.
      const theatreOn = easeIO(seg(p, 0.18, 0.24)) - easeIO(seg(p, 0.6, 0.66));
      const scan = seg(p, 0.26, 0.52);
      const mrRaw = seg(p, PHASES.matchResolve[0], PHASES.matchResolve[1]);
      const mr = easeIO(mrRaw);
      const headT = seg(mrRaw, 0, 0.5);
      const cardT = seg(mrRaw, 0.45, 1);
      const pop = headT > 0 ? easeBack(headT) : 0;
      const flyRaw = seg(p, PHASES.matchFly[0], PHASES.matchFly[1]);
      const fly = easeBack(flyRaw); // settles into the chat slot with a soft overshoot
      const dock = easeIO(seg(p, PHASES.chatDock[0], PHASES.chatDock[1]));
      const pay = seg(p, PHASES.payload[0], PHASES.payload[1]);
      const rep = easeIO(seg(p, PHASES.reply[0], PHASES.reply[1]));
      const waitIn = easeIO(seg(p, 0.81, 0.845));
      const waitOut = easeIO(seg(p, 0.885, 0.915));
      const waitVis = clamp(waitIn - waitOut, 0, 1);
      const del = easeIO(seg(p, PHASES.deliver[0], PHASES.deliver[1]));
      const finFade = easeIO(seg(p, 0.93, 0.975));
      const wsub = easeIO(seg(p, 0.95, 0.98));

      /* ---- 2. reads. Every layout read in the frame happens here, before the
         first write, so no read can force a synchronous layout mid-frame. The
         values are one frame old; at scrub 0.6 that is not perceptible. ---- */
      const composerR = composerRef.current?.getBoundingClientRect();
      const chatR =
        waitIn > 0 ? chatRef.current?.getBoundingClientRect() : undefined;
      const sessionH =
        dock > 0 && dock < 1 ? sessionRef.current?.offsetHeight ?? 0 : 0;

      /* ---- 3. writes. transform, opacity and custom properties only. ---- */
      gradeRef.current = grade;
      set(stageRef.current, "--grade", num(grade));

      // headline lifts away; scroll cue fades
      op(headRef.current, 1 - ho);
      tf(headRef.current, `translate3d(-50%, ${px(-ho * 70)}, 0)`);
      op(cueRef.current, 1 - easeIO(seg(p, 0.03, 0.09)));

      // the duo recedes in depth, then returns. The stacking order is fixed in
      // CSS rather than flipped mid-film.
      const duo = duoRef.current;
      tf(
        duo,
        `translate3d(-50%, calc(-50% ${addPx(-rec * 0.05 * ih)}), 0) scale(${num(
          1 - rec * 0.52
        )})`
      );
      // dusk: sink the receded pane further so it does not read as a muddy
      // slab over the globe; it returns to normal as the day grade returns.
      // B10 finale dims it the rest of the way (one write, not two).
      op(
        duo,
        Math.min((1 - rec * 0.82) * (1 - grade * 0.6), 1 - finFade * 0.92)
      );
      /* The depth blur stays a filter, but quantized to 0.2px / 0.05 steps and
         pushed through the memo, so it re-rasterizes ~13 times across the recede
         instead of on all ~900 frames. A stacked statically-blurred copy was the
         first attempt: backdrop-filter produced no blur at all inside the duo's
         compositing group, and a cloned copy desyncs once the chat starts docking
         while rec is still falling. Quantizing keeps the look exact.
         filter is paint-only, so this costs no layout either way. */
      const blur = Math.round(rec * 2.5 * 5) / 5;
      const sat = Math.round((1 - rec * 0.3) * 20) / 20;
      set(duo, "filter", blur > 0 ? `blur(${blur}px) saturate(${sat})` : "none");

      // B2 detach: the probe freezes at the composer's resting rect while the
      // session recedes behind it (duoRecede), then rises to the search position
      // (probeRise). B5: it travels down-left home, following the live composer
      // (which has shifted left as the chat docks).
      if (p < PHASES.duoRecede[0] && composerR && composerR.height) {
        // capture the composer's rest position before the recede moves it
        frozenComposerRef.current = {
          x: ((composerR.left + composerR.width / 2) / iw) * 100,
          y: ((composerR.top + composerR.height / 2) / ih) * 100,
        };
      }
      const froze = frozenComposerRef.current || { x: 50, y: 66 };
      const liveX =
        composerR && composerR.width
          ? ((composerR.left + composerR.width / 2) / iw) * 100
          : froze.x;
      const liveY =
        composerR && composerR.height
          ? ((composerR.top + composerR.height / 2) / ih) * 100
          : froze.y;

      op(composerRef.current, clamp(1 - detach + reattach, 0, 1));
      // appears as the recede starts, holds pinned through search, fades home
      op(probeRef.current, clamp(seg(p, 0.12, 0.135) - seg(p, 0.665, 0.69), 0, 1));
      // froze (pinned during recede) -> search (50, 17) -> live composer (down-left).
      // The CSS anchor is left 50% / top 20%; we only translate away from it.
      const probeX = lerp(lerp(froze.x, 50, rise), liveX, home);
      const probeY = lerp(lerp(froze.y, 17, rise), liveY, home);
      tf(
        probeRef.current,
        `translate3d(calc(-50% ${addPx((probeX / 100) * iw - iw * 0.5)}), ${px(
          (probeY / 100) * ih - ih * 0.2
        )}, 0) scale(${num(lerp(lerp(1, 0.9, rise), 1, home))})`
      );
      // the tether's top/height are constants; they live in CSS now
      op(tetherRef.current, clamp(rise - easeIO(seg(p, 0.5, 0.58)) - home, 0, 1));

      // searchline + counter are plain DOM: fade them with the search itself.
      op(searchlineRef.current, searchFade);
      op(counterRef.current, searchFade);
      op(theatreRef.current, theatreOn);
      /* The counter is a scanning readout, not a precise figure. A textContent
         write dirties layout exactly as a width write does, and an unquantized
         climb (0 -> 4,183 across a 26% window) changes the string on essentially
         every frame of that window: the single largest source of residual layout
         in the film. Quantizing to hundreds cuts that by roughly 5x and changes
         nothing about what the beat says - the number still climbs live, it just
         batches the way a real scanner reports. The window's end lands on the
         exact figure so the readout still resolves to 4,183. */
      const scanned =
        scan >= 1
          ? SCAN_TOTAL
          : Math.floor((SCAN_TOTAL * scan) / SCAN_STEP) * SCAN_STEP;
      const count = scanned.toLocaleString();
      if (countRef.current && countRef.current.textContent !== count)
        countRef.current.textContent = count;
      const line =
        p < 0.26
          ? "searching <b>4,183 experts</b> across <b>61 countries</b>…"
          : p < 0.5
          ? "matching on <b>craft</b>, <b>track record</b>, <b>availability</b>…"
          : "<b>one profile holds.</b>";
      if (searchlineRef.current && line !== lastSearchline) {
        lastSearchline = line;
        searchlineRef.current.innerHTML = line;
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
        op(c, v);
        tf(c, `translate3d(0, ${px((1 - v) * 14)}, 0)`);
      });

      // candidate faces flicker around the globe during the scan
      const scn = seg(p, 0.24, 0.5);
      faceRefs.current.forEach((f, i) => {
        if (!f) return;
        const st = i * 0.068;
        const loc = seg(scn, st, st + 0.16);
        let vis = Math.sin(Math.min(loc, 1) * Math.PI);
        vis *= 1 - seg(p, 0.5, 0.545);
        op(f, vis * 0.95);
        tf(f, `translate3d(-50%, -50%, 0) scale(${num(0.4 + vis * 0.7)})`);
      });

      // the match: head pops from the projected dot, then the card unfolds.
      // matchStartX/Y is the FLIP's start point and the ONLY place the origin
      // enters; Task 2 swaps these two lines for pixels projected out of the globe.
      const dot = matchDotRef.current;
      const matchStartX = (dot[0] / 100) * iw;
      const matchStartY = (dot[1] / 100) * ih;

      // the card's live rect, interpolated between the pill start and the rest rect
      const infoVis = Math.min(MATCH_INFO_MAX * cardT, geo.infoW);
      const cardW =
        geo.baseW + (MATCH_PAD_X_DELTA + MATCH_INFO_ML) * cardT + infoVis;
      const cardH = geo.h - MATCH_PAD_Y_DELTA * (1 - cardT);
      const kx = cardW / geo.w;
      const ky = cardH / geo.h;
      const mScale = lerp(lerp(0.25, 1, pop), 0.72, fly);
      const mcx = lerp(lerp(matchStartX, iw * 0.5, mr), iw * 0.71, fly);
      const mcy = lerp(lerp(matchStartY, ih * 0.44, mr), ih * 0.42, fly);
      const m = matchRef.current;
      if (m) {
        op(
          m,
          Math.max(
            0.001, // never 0: keep the layer alive so it does not promote at .52
            (mrRaw > 0 ? Math.min(1, mrRaw * 3.5) : 0) -
              easeIO(seg(p, 0.705, 0.73))
          )
        );
        // transform-origin is the card's left edge / vertical centre, so the
        // rendered centre lands exactly where left/top used to put it
        tf(
          m,
          `translate3d(${px(mcx - (geo.w * kx * mScale) / 2)}, ${px(
            mcy - geo.h / 2
          )}, 0) scale(${num(mScale * kx)}, ${num(mScale * ky)})`
        );
        // border-radius rides two custom properties (a paint-only write) and is
        // pre-divided by the FLIP scale so the rendered corner stays circular
        const r = Math.min(lerp(40, 14, cardT), cardW / 2, cardH / 2);
        set(m, "--match-rx", px(r / kx));
        set(m, "--match-ry", px(r / ky));
      }
      // counter-scale the card's contents so type and the avatar never distort
      tf(matchInnerRef.current, `scale(${num(1 / kx)}, ${num(1 / ky)})`);
      // the info reveal: scaleX + counter-scale reproduces the old max-width clip
      const infoF = Math.max(infoVis / geo.infoW, 0.02);
      op(matchInfoRef.current, cardT);
      tf(matchInfoRef.current, `scaleX(${num(infoF)})`);
      tf(matchInfoInnerRef.current, `scaleX(${num(1 / infoF)})`);

      op(
        flashRef.current,
        Math.max(0.001, Math.sin(Math.min(mrRaw * 2.2, 1) * Math.PI))
      );
      tf(
        flashRef.current,
        `translate3d(calc(-50% ${addPx(matchStartX)}), calc(-50% ${addPx(
          matchStartY
        )}), 0) scale(${num(1 + mrRaw * 5)})`
      );

      // The expert chat pane docks to the right of the returning session. This is
      // the one animation still on layout: docking narrows the session pane and
      // reflows its text, which no transform reproduces. The writes are memoized,
      // so they only fire while `dock` is actually moving (a ~8% window of the
      // film), and they sit after every read, so they never force a layout.
      const chat = chatRef.current;
      if (chat) {
        set(
          chat,
          "height",
          dock >= 1 ? "auto" : dock > 0 ? px(sessionH) : "0"
        );
        set(chat, "width", px(dock * 330));
        set(chat, "margin-left", px(dock * 14));
        op(chat, dock * (1 - waitVis * 0.34));
      }
      const slot = slotRef.current;
      if (slot) {
        // slot fades out .70-.725 while the resident cross-fades in .72-.75.
        // Both stay in the layout; only opacity moves (the resident is an overlay).
        op(slot, dock * (1 - seg(p, 0.7, 0.725)));
        slot.classList.toggle(styles.glow, flyRaw > 0.3 && flyRaw < 1);
      }
      op(residentRef.current, easeIO(seg(p, 0.72, 0.75)));

      // B6 context payload flies in horizontally from the left (session text area)
      // into the chat, lands as the sent message. No bottom arc: top is fixed.
      op(
        payloadRef.current,
        Math.max(
          0.001, // never 0: keep the layer alive (pre-promotion)
          pay > 0 && pay < 1 ? Math.min(1, pay * 4) * (1 - seg(pay, 0.82, 1)) : 0
        )
      );
      tf(
        payloadRef.current,
        // CSS anchors it at left 30%; the soft settle only translates from there
        `translate3d(${px(((lerp(30, 64, easeBack(pay)) - 30) / 100) * iw)}, 0, 0)`
      );
      // sent message cross-fades in under the payload's fade-out (no snap)
      op(ctxMsgRef.current, easeIO(seg(p, 0.745, 0.765)));
      tf(ctxMsgRef.current, "translate3d(0, 0, 0)");

      // B7 expert reply
      if (p > PHASES.reply[0]) typeReply();
      op(replyRef.current, rep);
      tf(replyRef.current, `translate3d(0, ${px((1 - rep) * 8)}, 0)`);

      // B8 the wait: the "one hour later" clock overlays the chat pane itself
      // (tracked via its live rect); the chat dims beneath it so delivery has weight.
      if (chatR && chatR.width > 40) {
        waitPos.x = chatR.left + chatR.width / 2;
        waitPos.y = chatR.top + chatR.height / 2;
      }
      op(waitRef.current, Math.max(0.001, waitVis));
      tf(
        waitRef.current,
        `translate3d(calc(-50% ${addPx(
          waitPos.x >= 0 ? waitPos.x - iw * 0.5 : 0
        )}), calc(-50% ${addPx(
          (waitPos.y >= 0 ? waitPos.y - ih * 0.5 : 0) + (1 - waitIn) * 8
        )}), 0)`
      );

      // B9 delivery + confetti
      // chatR comes from this frame's read phase (waitIn is 1 well before the
      // delivery beat), so the burst never reads layout after a write
      if (p > PHASES.deliver[0] + 0.008) burst(chatR);
      if (p < 0.8) burstArmedRef.current = true;
      op(deliverRef.current, del);
      tf(deliverRef.current, `translate3d(0, ${px((1 - del) * 8)}, 0)`);
      op(chipRef.current, easeIO(seg(p, 0.925, 0.95)));
      tf(chipRef.current, "translate3d(0, 0, 0)");

      // B10 finale: whisper, sub-line, CTAs (the duo's dim is folded in above)
      op(
        whisperRef.current,
        Math.max(0.001, easeIO(seg(p, PHASES.whisper[0], PHASES.whisper[1])))
      );
      op(whisperSubRef.current, wsub);
      tf(whisperSubRef.current, `translate3d(-50%, ${px((1 - wsub) * 10)}, 0)`);
      op(
        finaleRef.current,
        easeIO(seg(p, PHASES.finale[0], PHASES.finale[1]))
      );
      set(finaleRef.current, "pointer-events", p > 0.97 ? "auto" : "none");

      // act rail
      const act = actForProgress(p);
      actRefs.current.forEach((a, i) => a?.classList.toggle(styles.on, i === act));
    };

    gsap.registerPlugin(ScrollTrigger);
    // the FLIP needs the card's resting rect before the first frame, and again
    // whenever the viewport or the loaded font changes it
    measure();
    apply(0);
    const onResize = () => {
      measure();
      apply(progressRef.current);
    };
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(() => {
      measure();
      apply(progressRef.current);
    });

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
      window.removeEventListener("resize", onResize);
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
        {/* dusk grade veil (isolated): darkens only the room backdrop */}
        <div className={styles.duskVeil} />

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
                Delivered in one hour
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
            gradeRef={gradeRef}
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
        {/* #match and #flash live in a fixed overlay OUTSIDE the stage (see below),
           so their layer promotion cannot re-layerize the WebGL globe canvas. */}

        <div className={styles.payload} ref={payloadRef}>
          <span className={styles.who}>shared from your session</span>
          Your full context · script, storyboard, motion cut v1
        </div>

        {/* B8 the wait: "one hour later" */}
        <div className={styles.wait} ref={waitRef}>
          <div className={styles.clock}>
            <span className={styles.dial} />
            <span className={styles.sweep2} />
            <span className={styles.hand2} />
            <span className={styles.pin2} />
            <span className={styles.ring} />
          </div>
          <span className={styles.wlabel}>one hour later</span>
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

      {/* The emergence layer lives OUTSIDE the stage, in its own fixed, isolated
         overlay. #match/#flash promote at matchResolve, and keeping them out of the
         WebGL canvas's compositing subtree stops that promotion from dropping the
         dome to black on GPU. The stage is pinned at the viewport (top:0, 100vw x
         100vh) throughout the film, so the same left/top % values land identically
         here in viewport space. Positions are set imperatively in apply(). */}
      <div className={styles.matchOverlay}>
        <div className={styles.flash} ref={flashRef} />
        {/* The card is laid out once at its resting size. .matchInner counter-scales
           the FLIP so the avatar and type never distort; .matchInfo's scaleX (with
           its own counter-scaled inner) reproduces the old max-width reveal. */}
        <div className={styles.match} ref={matchRef}>
          <div className={styles.matchInner} ref={matchInnerRef}>
            <span className={styles.ava} />
            <div className={styles.matchInfo} ref={matchInfoRef}>
              <div className={styles.matchInfoInner} ref={matchInfoInnerRef}>
                <b>Motion graphic designer</b>
                <span>100+ launch videos · since 2016</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* A DIRECT child of the track, deliberately outside .stage and outside the
         duo/overlay subtrees. The toggle is position: fixed, and any ancestor
         carrying a per-frame transform would become its containing block and
         drag it around with the film. Nothing in the film occupies the bottom
         right corner (.rail is vertically centred, .cue is bottom centre), so it
         sits clear at every width. */}
      <SoundToggle />
    </section>
  );
}
