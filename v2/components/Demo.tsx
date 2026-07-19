/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { c, ink, forest, bronze, black } from "@/lib/palette";

/* Faithful port of the live demo timeline logic (the DCLogic Component in the
   static index.html). The splitscreen shows a Claude Code app pane (left) and a
   consumer chat pane (right). Timings, scene boundaries, and copy are preserved
   1:1; only the rendering layer is React instead of the Pretext template. */

type Line = { kind: string; text: string };

type State = {
  termLines: Line[];
  offer: boolean;
  pressed: boolean;
  connected: boolean;
  expertMsgs: Line[];
  solved: boolean;
  demoStep: number;
};

const INITIAL: State = {
  termLines: [],
  offer: false,
  pressed: false,
  connected: false,
  expertMsgs: [],
  solved: false,
  demoStep: 0,
};

// Shared line/message definitions. Left: Claude Code app. Right: consumer chat.
const L: Record<string, Line> = {
  u1: { kind: "user", text: "The landing page is done. Can you make a demo video for the launch?" },
  t1: { kind: "tool", text: "Drafted storyboard.md" },
  t2: { kind: "tool", text: "Rendered rough-cut.mp4 · basic motion" },
  a1: { kind: "agent", text: "Script and storyboard are done, and I've made a basic motion cut. For a launch this important, you'll want a professional video." },
  u2: { kind: "user", text: "Get me an expert to build a professional one." },
  ok1: { kind: "ok", text: "Received demo-launch.mp4 · 45s" },
  a2: { kind: "agent", text: "Video's in. Adding it to the landing page hero now." },
  x1: { kind: "eng", text: "Hi, picked this up. Just went through what you're building. Love the checkout flow. Recording now." },
  c1: { kind: "act", text: "Opened localhost:3000 in browser" },
  c2: { kind: "act", text: "Recorded walkthrough · 3 takes" },
  c3: { kind: "act", text: "Edited demo-launch.mp4 · captions + brand colors" },
  x2: { kind: "eng", text: "Done. 45-second cut. Link below." },
  xu: { kind: "mine", text: "Looks amazing. Thank you!" },
  done: { kind: "done", text: "✓ Delivered · demo video in 40 min" },
  rate: { kind: "rate", text: "Rate Senjal ★★★★★ · pay only if you're satisfied" },
};

// State at each scene BOUNDARY (the boundary event itself is excluded by the
// t > offset filter, so snapshots MUST include what that event does).
function sceneState(n: number): Partial<State> | null {
  const base = [L.u1, L.t1, L.t2, L.a1, L.u2];
  const scenes: Record<number, Partial<State>> = {
    1: { termLines: [L.u1], offer: false, pressed: false, connected: false, expertMsgs: [], solved: false, demoStep: 1 },
    2: { termLines: base, offer: false, pressed: true, connected: true, expertMsgs: [], solved: false, demoStep: 2 },
    3: { termLines: base, offer: false, pressed: true, connected: true, expertMsgs: [L.x1, L.c1], solved: true, demoStep: 3 },
  };
  return scenes[n] || null;
}

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const mono = "ui-monospace,Menlo,monospace";
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
const rowIn = "demoRowIn 0.5s cubic-bezier(0.22,1,0.36,1) both";
const bubIn = "demoIn 0.46s cubic-bezier(0.34,1.4,0.5,1) both";

const toolRow: CSSProperties = {
  display: "flex", flex: "none", gap: "8px", alignItems: "center",
  overflow: "hidden", minHeight: 0, paddingTop: "6px", paddingLeft: "21px", animation: rowIn,
};

const termKinds: Record<string, { prefix: string; row: CSSProperties; prefixStyle: CSSProperties; text: CSSProperties }> = {
  user: {
    prefix: "",
    row: { display: "flex", flex: "none", justifyContent: "flex-end", overflow: "hidden", minHeight: 0, paddingTop: "10px", animation: rowIn },
    prefixStyle: { display: "none" },
    text: { maxWidth: "82%", background: c.raised, border: `1px solid ${c.border}`, color: c.ink, padding: "8px 13px", borderRadius: "14px 14px 4px 14px", fontSize: "13px", lineHeight: 1.55, animation: bubIn },
  },
  agent: {
    prefix: "✳",
    row: { display: "flex", flex: "none", gap: "9px", overflow: "hidden", minHeight: 0, paddingTop: "10px", animation: rowIn },
    prefixStyle: { flex: "none", fontSize: "12px", color: ink(0.55), lineHeight: 1.6 },
    text: { maxWidth: "92%", fontSize: "13px", lineHeight: 1.6, color: ink(0.85), animation: bubIn },
  },
  tool: {
    prefix: "⏺",
    row: toolRow,
    prefixStyle: { flex: "none", fontSize: "9px", color: c.sage },
    text: { fontFamily: mono, fontSize: "11px", color: ink(0.6), animation: bubIn },
  },
  toolfail: {
    prefix: "⏺",
    row: toolRow,
    prefixStyle: { flex: "none", fontSize: "9px", color: c.rust },
    text: { fontFamily: mono, fontSize: "11px", color: c.rust, animation: bubIn },
  },
  ok: {
    prefix: "✓",
    row: toolRow,
    prefixStyle: { flex: "none", fontSize: "10px", color: c.forest },
    text: { fontFamily: mono, fontSize: "11px", color: c.forest, animation: bubIn },
  },
};

const baseRow: CSSProperties = {
  display: "flex", flex: "none", boxSizing: "border-box", overflow: "hidden",
  minHeight: 0, paddingTop: "8px", animation: rowIn,
};
const hideLabel: CSSProperties = { display: "none" };

type ChatItem = { text: string; label: string; rowStyle: CSSProperties; colStyle: CSSProperties; labelStyle: CSSProperties; bubbleStyle: CSSProperties };

const chatKinds: Record<string, (m: Line) => ChatItem> = {
  eng: (m) => ({
    text: m.text, label: "SENJAL",
    rowStyle: { ...baseRow, justifyContent: "flex-start" },
    colStyle: { display: "flex", flexDirection: "column", gap: "3px", maxWidth: "86%", alignItems: "flex-start" },
    labelStyle: { fontFamily: mono, fontSize: "8.5px", letterSpacing: "0.06em", color: ink(0.45), padding: "0 4px" },
    bubbleStyle: { maxWidth: "100%", background: c.surface, border: `1px solid ${c.border}`, color: c.ink, padding: "8px 12px", borderRadius: "14px 14px 14px 4px", fontSize: "12.5px", lineHeight: 1.5, animation: bubIn },
  }),
  mine: (m) => ({
    text: m.text, label: "",
    rowStyle: { ...baseRow, justifyContent: "flex-end" },
    colStyle: { display: "flex", flexDirection: "column", maxWidth: "86%", alignItems: "flex-end" },
    labelStyle: hideLabel,
    bubbleStyle: { maxWidth: "100%", background: c.forest, color: c.paper, padding: "8px 12px", borderRadius: "14px 14px 4px 14px", fontSize: "12.5px", lineHeight: 1.5, animation: bubIn },
  }),
  act: (m) => ({
    text: m.text, label: "",
    rowStyle: { ...baseRow, justifyContent: "stretch" },
    colStyle: { display: "flex", flexDirection: "column", width: "100%" },
    labelStyle: hideLabel,
    bubbleStyle: { background: c.bronzeSoft, border: `1px solid ${bronze(0.3)}`, color: c.bronzeInk, padding: "4px 12px", borderRadius: "999px", fontFamily: mono, fontSize: "10px", lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", animation: bubIn },
  }),
  done: (m) => ({
    text: m.text, label: "",
    rowStyle: { ...baseRow, justifyContent: "center" },
    colStyle: { display: "flex", flexDirection: "column", alignItems: "center" },
    labelStyle: hideLabel,
    bubbleStyle: { background: c.sageSoft, border: `1px solid ${c.sage}`, color: c.forest, padding: "5px 14px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700, animation: bubIn },
  }),
  rate: (m) => ({
    text: m.text, label: "",
    rowStyle: { ...baseRow, justifyContent: "center", paddingTop: "4px" },
    colStyle: { display: "flex", flexDirection: "column", alignItems: "center" },
    labelStyle: hideLabel,
    bubbleStyle: { background: "none", color: ink(0.6), fontSize: "10px", animation: bubIn },
  }),
};

const fillMs: Record<number, number> = { 1: 11600, 2: 5300, 3: 14300 };
const stepDefs = [
  { num: "01", tag: "Stuck", title: "Your agent hits a wall and offers a way out." },
  { num: "02", tag: "Expert joins", title: "A real person picks it up. Face, name, track record." },
  { num: "03", tag: "Fixed live", title: "Watch the work happen, then get it handed back." },
];

const cursorSvg =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M4 2 L4 19 L8.5 14.5 L11.5 21.5 L14 20.5 L11 13.5 L18 13.5 Z' fill='%231C1A16' stroke='%23FAF7F0' stroke-width='1.3' stroke-linejoin='round'/></svg>\")";

export default function Demo() {
  const [st, setSt] = useState<State>(INITIAL);
  const [narrow, setNarrow] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startRef = useRef<(from?: number) => void>(() => {});

  const fadeDemoGrid = useCallback((to: number) => {
    const g = gridRef.current;
    if (!g) return;
    g.style.transition = "opacity 0.55s ease";
    g.style.opacity = String(to);
  }, []);

  const renderStill = useCallback(() => {
    setSt({
      termLines: [L.u1, L.t1, L.t2, L.a1, L.u2, L.ok1, L.a2],
      offer: false, pressed: false, connected: true,
      expertMsgs: [L.x1, L.c1, L.c2, L.c3, L.x2, L.xu, L.done, L.rate],
      solved: true, demoStep: 0,
    });
  }, []);

  const startDemo = useCallback((fromScene?: number) => {
    timers.current.forEach(clearTimeout);
    barRefs.current.forEach((b) => { if (b) delete b.dataset.barState; });
    fadeDemoGrid(1);
    const boundaries: Record<number, number> = { 1: 600, 2: 12200, 3: 17500 };
    const offset = fromScene ? boundaries[fromScene] || 0 : 0;
    if (fromScene) {
      const s = sceneState(fromScene);
      if (s) setSt((prev) => ({ ...prev, pressed: false, ...s }));
    }
    const term = (line: Line) => setSt((s) => ({ ...s, termLines: s.termLines.concat([line]) }));
    const expert = (msg: Line) => setSt((s) => ({ ...s, expertMsgs: s.expertMsgs.concat([msg]) }));
    const steps: [number, () => void][] = [
      [600, () => { setSt((s) => ({ ...s, demoStep: 1 })); term(L.u1); }],
      [2600, () => term(L.t1)],
      [4400, () => term(L.t2)],
      [6200, () => term(L.a1)],
      // The user asks for an expert; the MCP answers with a consent card first.
      [8400, () => term(L.u2)],
      [9800, () => setSt((s) => ({ ...s, offer: true }))],
      [11600, () => setSt((s) => ({ ...s, pressed: true }))],
      [12200, () => setSt((s) => ({ ...s, offer: false, connected: true, demoStep: 2 }))],
      [13600, () => expert(L.x1)],
      // The expert works within approved access; each action shows live in the chat.
      [17500, () => { setSt((s) => ({ ...s, solved: true, demoStep: 3 })); expert(L.c1); }],
      [19300, () => expert(L.c2)],
      [21100, () => expert(L.c3)],
      [23000, () => { expert(L.x2); term(L.ok1); }],
      [24800, () => term(L.a2)],
      [26400, () => expert(L.xu)],
      [28000, () => { expert(L.done); expert(L.rate); }],
      // Smooth loop boundary: hold the resolved state, cross-fade out, reset
      // while invisible, and fade back in with no flicker.
      [31800, () => fadeDemoGrid(0)],
      [32350, () => setSt(INITIAL)],
      [32450, () => { fadeDemoGrid(1); startRef.current(); }],
    ];
    timers.current = steps
      .filter(([t]) => t > offset)
      .map(([t, fn]) => setTimeout(fn, t - offset));
  }, [fadeDemoGrid]);

  startRef.current = startDemo;

  // Responsive: narrow reflow at width < 720 (mirrors applyResponsive).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 719px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Start demo when the card scrolls into view; reduced motion shows the still.
  useEffect(() => {
    if (reduceMotion()) {
      renderStill();
      return;
    }
    const card = cardRef.current;
    if (!card || !("IntersectionObserver" in window)) {
      startDemo();
      return () => timers.current.forEach(clearTimeout);
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          startDemo();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(card);
    return () => {
      obs.disconnect();
      timers.current.forEach(clearTimeout);
    };
  }, [startDemo, renderStill]);

  // Step-card highlight + progress bars driven by demoStep (mirrors applyStepHighlight).
  useEffect(() => {
    const step = st.demoStep || 0;
    const reduced = reduceMotion();
    stepRefs.current.forEach((el, idx) => {
      if (!el) return;
      const n = idx + 1;
      const active = step === n;
      const past = step > n;
      if (active) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
      el.style.transition = "opacity 0.6s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)";
      el.style.opacity = active ? "1" : past ? "0.7" : step > 0 ? "0.5" : "1";
      el.style.transform = active && !reduced ? "scale(1.025)" : "scale(1)";
      const tag = el.querySelector("[data-step-tag]") as HTMLElement | null;
      if (tag) tag.style.color = active ? ink(0.8) : ink(0.45);
      const bar = barRefs.current[idx];
      if (!bar) return;
      bar.style.background = c.forest;
      const want = active ? "fill" : past ? "full" : "empty";
      if (bar.dataset.barState === want) return;
      bar.dataset.barState = want;
      if (reduced) {
        bar.style.transition = "none";
        bar.style.transform = want === "empty" ? "scaleX(0)" : "scaleX(1)";
        return;
      }
      if (want === "fill") {
        bar.style.transition = "none";
        bar.style.transform = "scaleX(0)";
        void bar.offsetWidth;
        bar.style.transition = "transform " + fillMs[n] + "ms linear";
        bar.style.transform = "scaleX(1)";
      } else {
        const m = getComputedStyle(bar).transform;
        bar.style.transition = "none";
        bar.style.transform = m && m !== "none" ? m : "scaleX(0)";
        void bar.offsetWidth;
        bar.style.transition = want === "full" ? "transform 0.6s cubic-bezier(0.22,1,0.36,1)" : "transform 0.4s ease";
        bar.style.transform = want === "full" ? "scaleX(1)" : "scaleX(0)";
      }
    });
  }, [st.demoStep]);

  // Derived flags (renderVals).
  const connected = st.connected;
  const solved = st.solved;
  const showOffer = st.offer;
  const isPressing = st.pressed && st.offer;
  const notConnected = !connected;
  const showCard = connected && !solved;
  const showMini = connected && solved;

  const offerYesStyle: CSSProperties = {
    display: "flex", alignItems: "center", position: "relative", flex: "none",
    background: c.forest, color: c.cream,
    fontSize: "12.5px", fontWeight: 600, letterSpacing: "0.01em",
    padding: "9px 18px", borderRadius: "999px", cursor: "pointer",
    boxShadow: `0 8px 18px -8px ${black(0.5)}`,
    transition: "transform 0.18s ease",
    transform: st.pressed ? "scale(0.95)" : "scale(1)",
    animation: "demoIn 0.5s " + ease + " both",
  };
  const chatComposerStyle: CSSProperties = {
    flex: "none", display: "flex", gap: "8px", padding: "9px 14px 12px",
    borderTop: `1px solid ${c.border}`, background: c.paper,
    opacity: connected ? 1 : 0.45, transition: "opacity 0.4s ease",
  };

  const cardStyle: CSSProperties = {
    position: "relative", marginTop: 0,
    width: narrow ? "min(380px,100%)" : "min(1120px,100%)",
    background: c.surface,
    border: narrow ? `1px solid ${ink(0.18)}` : `1px solid ${ink(0.12)}`,
    borderRadius: narrow ? "30px" : "20px",
    overflow: "hidden",
    boxShadow: narrow
      ? `0 30px 60px -30px ${ink(0.35)}, inset 0 0 0 3px ${ink(0.05)}`
      : `0 2px 6px ${ink(0.06)},0 12px 32px -8px ${ink(0.12)},0 48px 96px -32px ${ink(0.22)}`,
  };

  return (
    <>
      <section
        id="demo"
        aria-labelledby="demo-anchor"
        style={{
          padding: "clamp(52px,5.6vw,84px) clamp(24px,3.3vw,48px) 0",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}
      >
        <h2
          id="demo-anchor"
          style={{
            margin: "0 0 clamp(28px,3vw,40px)", scrollMarginTop: "22px",
            fontFamily: "var(--font-serif)", fontWeight: 600,
            fontSize: "clamp(34px,3.2vw,46px)", lineHeight: 1.2,
            textAlign: "center", maxWidth: "720px", textWrap: "balance",
          }}
        >
          Mid-session support, right where you build.
        </h2>

        <div ref={cardRef} style={cardStyle}>
          {/* Mobile status bar */}
          <div
            style={{
              display: narrow ? "flex" : "none", alignItems: "center",
              justifyContent: "space-between", height: "46px", padding: "0 20px",
              borderBottom: `1px solid ${ink(0.08)}`,
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.02em", width: "52px" }}>9:41</div>
            <div style={{ height: "26px", padding: "0 16px", borderRadius: "13px", background: c.raised, display: "flex", alignItems: "center", fontFamily: mono, fontSize: "11px", color: ink(0.45) }}>claude code</div>
            <div style={{ display: "flex", gap: "5px", alignItems: "center", justifyContent: "flex-end", width: "52px" }}>
              <span style={{ width: "15px", height: "9px", borderRadius: "2px", border: `1px solid ${ink(0.4)}`, position: "relative", display: "inline-block" }}>
                <span style={{ position: "absolute", left: "1px", top: "1px", bottom: "1px", width: "9px", background: ink(0.4), borderRadius: "1px" }} />
              </span>
            </div>
          </div>

          {/* Desktop browser bar */}
          <div
            style={{
              display: narrow ? "none" : "flex", alignItems: "center", gap: "16px",
              height: "48px", padding: "0 18px", borderBottom: `1px solid ${ink(0.08)}`,
            }}
          >
            <div style={{ display: "flex", gap: "7px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: ink(0.14) }} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: ink(0.14) }} />
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: ink(0.14) }} />
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div style={{ width: "min(400px,80%)", height: "28px", borderRadius: "14px", background: c.raised, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: "12px", color: ink(0.45) }}>
                Claude Code · ~/checkout-app
              </div>
            </div>
            <div style={{ width: "44px" }} />
          </div>

          {/* Splitscreen stage */}
          <div style={{ height: narrow ? "640px" : "clamp(360px,min(36vw,100svh - 445px),500px)", background: c.paperLit, position: "relative", overflow: "hidden" }}>
            <div
              ref={gridRef}
              style={{
                position: "absolute", inset: 0, display: "grid",
                gridTemplateColumns: narrow ? "1fr" : "1fr minmax(280px,360px)",
                gridTemplateRows: narrow ? "minmax(0,1fr) 300px" : undefined,
              }}
            >
              {/* Left: Claude Code terminal pane */}
              <div style={{ background: c.paperLit, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "16px 20px 10px", overflow: "hidden" }}>
                  {st.termLines.map((t, i) => {
                    const k = termKinds[t.kind] || termKinds.agent;
                    return (
                      <div key={i} style={k.row}>
                        <span style={k.prefixStyle}>{k.prefix}</span>
                        <span style={k.text}>{t.text}</span>
                      </div>
                    );
                  })}
                  {showOffer && (
                    <div style={{ marginTop: "13px", border: `1px solid ${c.sage}`, borderRadius: "12px", background: c.sageSoft, padding: "13px 15px", animation: "demoIn 0.5s cubic-bezier(0.34,1.4,0.5,1) both" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: c.forest }}>
                        <span style={{ fontSize: "13px" }}>🙋</span>
                        <span>get an expert</span>
                      </div>
                      <div style={{ marginTop: "7px", fontSize: "13px", lineHeight: 1.55, color: c.ink }}>On it. First, approve exactly what&apos;s shared:</div>
                      <div style={{ marginTop: "4px", fontSize: "11.5px", lineHeight: 1.55, color: ink(0.62) }}>Your goal, attempts, and errors. Never your code, never your secrets.</div>
                      <div style={{ marginTop: "11px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={offerYesStyle}>
                          Bring in an expert
                          {isPressing && (
                            <>
                              <div style={{ position: "absolute", left: "50%", top: "50%", width: "100%", height: "100%", borderRadius: "999px", border: `1.5px solid ${c.sage}`, pointerEvents: "none", animation: "demoTap 0.95s ease-out both" }} />
                              <div style={{ position: "absolute", right: "-9px", bottom: "-11px", width: "20px", height: "20px", pointerEvents: "none", zIndex: 3, animation: "demoCursorIn 0.4s ease both", backgroundRepeat: "no-repeat", backgroundSize: "contain", filter: `drop-shadow(0 2px 3px ${ink(0.3)})`, backgroundImage: cursorSvg }} />
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: ink(0.5), padding: "8px 10px", cursor: "pointer" }}>Not now</div>
                      </div>
                    </div>
                  )}
                  {connected && (
                    <div style={{ alignSelf: "center", display: "inline-flex", alignItems: "center", gap: "6px", background: c.sageSoft, border: `1px solid ${c.sage}`, borderRadius: "999px", padding: "5px 13px", fontSize: "11px", fontWeight: 600, color: c.forest, marginTop: "12px", animation: "demoIn 0.5s cubic-bezier(0.34,1.4,0.5,1) both" }}>✓ Context sent · secrets redacted</div>
                  )}
                </div>
                <div style={{ flex: "none", display: "flex", alignItems: "center", gap: "9px", padding: "10px 16px 13px", borderTop: `1px solid ${ink(0.08)}` }}>
                  <div style={{ flex: 1, border: `1px solid ${ink(0.12)}`, borderRadius: "10px", padding: "8px 14px", background: c.surface, fontSize: "12.5px", color: ink(0.35) }}>Reply to Claude…</div>
                </div>
              </div>

              {/* Right: consumer chat pane */}
              <div style={{ background: c.paper, borderLeft: narrow ? "none" : `1px solid ${ink(0.08)}`, borderRadius: narrow ? "20px 20px 0 0" : 0, marginTop: narrow ? "-16px" : 0, position: narrow ? "relative" : undefined, zIndex: narrow ? 2 : undefined, boxShadow: narrow ? `0 -12px 28px -18px ${ink(0.6)}` : "none", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ display: narrow ? "flex" : "none", justifyContent: "center", padding: "10px 0 0" }}>
                  <span style={{ width: "36px", height: "4px", borderRadius: "2px", background: ink(0.18) }} />
                </div>
                <div style={{ display: narrow ? "none" : "block", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${c.border}` }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "16px", color: c.ink }}>get an <span style={{ color: c.forest }}>expert</span></span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: mono, fontSize: "9px", letterSpacing: "0.05em", color: ink(0.5) }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: c.forest }} />CONNECTED
                  </span>
                </div>

                {showCard && (
                  <div style={{ flex: "none", padding: "8px 16px", fontSize: "11px", lineHeight: 1.5, background: c.sageSoft, color: c.forest, borderBottom: `1px solid ${c.border}` }}>Senjal joined. They see only what you approved.</div>
                )}
                {showCard && (
                  <div style={{ flex: "none", borderBottom: `1px solid ${c.border}` }}>
                    <div style={{ fontFamily: mono, fontSize: "8.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: ink(0.45), padding: "8px 16px 0" }}>Your expert</div>
                    <div style={{ display: "flex", gap: "11px", padding: "7px 16px 10px", alignItems: "flex-start", animation: "demoIn 0.7s cubic-bezier(0.21,0.61,0.35,1) both" }}>
                      <img src="/assets/senjal.jpg" alt="Senjal Pandharpatte" style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: `1px solid ${c.border}`, boxShadow: `0 0 0 3px ${c.sageSoft}` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <span style={{ fontFamily: "var(--font-serif)", fontSize: "17px", fontWeight: 600, lineHeight: 1.15, color: c.ink }}>Senjal Pandharpatte</span>
                          <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: "10.5px", color: c.forest }}>★ 4.8</span>
                        </div>
                        <div style={{ fontSize: "11.5px", color: ink(0.65) }}>Senior UX designer</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "3px", fontSize: "10px", color: ink(0.65) }}>
                          <img src="/assets/lightbox.jpg" alt="" style={{ width: "12px", height: "12px", borderRadius: "3px", objectFit: "cover" }} /><span>LightBox</span>
                          <span style={{ color: c.border2 }}>·</span>
                          <img src="/assets/rit.jpg" alt="" style={{ width: "12px", height: "12px", borderRadius: "3px", objectFit: "cover" }} /><span>RIT</span>
                          <span style={{ color: c.border2 }}>·</span><span>14 fixes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {showMini && (
                  <div style={{ flex: "none", display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderBottom: `1px solid ${c.border}`, fontSize: "11px", color: ink(0.7), animation: "demoIn 0.4s ease both" }}>
                    <img src="/assets/senjal.jpg" alt="" style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover", border: `1px solid ${c.border}` }} />
                    <span><b>Senjal Pandharpatte</b> is working, with only the access you approved</span>
                  </div>
                )}

                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "8px", padding: "12px 14px", overflow: "hidden" }}>
                  {notConnected && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "24px", textAlign: "center" }}>
                      <div style={{ fontSize: "22px", opacity: 0.5 }}>🙋</div>
                      <div style={{ fontSize: "12px", lineHeight: 1.6, color: ink(0.45), maxWidth: "200px" }}>No expert connected.<br />Nothing is shared until you say yes.</div>
                    </div>
                  )}
                  {st.expertMsgs.map((m, i) => {
                    const item = (chatKinds[m.kind] || chatKinds.eng)(m);
                    return (
                      <div key={i} style={item.rowStyle}>
                        <div style={item.colStyle}>
                          <div style={item.labelStyle}>{item.label}</div>
                          <div style={item.bubbleStyle}>{item.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={chatComposerStyle}>
                  <div style={{ flex: 1, border: `1px solid ${c.border2}`, borderRadius: "999px", padding: "7px 14px", fontSize: "11.5px", color: ink(0.4), background: c.paper }}>Message your expert</div>
                  <div style={{ borderRadius: "999px", background: c.forest, color: c.paper, fontSize: "11.5px", fontWeight: 600, padding: "7px 14px" }}>Send</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps rail (driven by demoStep). Clicking a card jumps to that scene. */}
      <div style={{ padding: "clamp(32px,3.4vw,48px) clamp(24px,3.3vw,48px) 0", maxWidth: "1216px", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "44px 48px" }}>
          {stepDefs.map((s, i) => (
            <div
              key={s.num}
              ref={(el) => { stepRefs.current[i] = el; }}
              role="button"
              tabIndex={0}
              aria-label={`Jump to step ${i + 1}: ${s.tag}`}
              onClick={() => startDemo(i + 1)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  startDemo(i + 1);
                }
              }}
              style={{ position: "relative", paddingTop: "22px", cursor: "pointer" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "2px", background: ink(0.12) }}>
                <div ref={(el) => { barRefs.current[i] = el; }} style={{ width: "100%", height: "100%", background: c.forest, transform: "scaleX(0)", transformOrigin: "left center" }} />
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "16px", letterSpacing: "0.08em", color: c.forest }}>{s.num}</span>
                <span data-step-tag style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: ink(0.45), transition: "color 0.5s ease" }}>{s.tag}</span>
              </div>
              <div style={{ marginTop: "12px", fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: "25px", lineHeight: 1.32, textWrap: "pretty" }}>{s.title}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: "clamp(40px,4.5vw,60px) auto 0", textAlign: "center", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "clamp(19px,1.8vw,23px)", color: ink(0.85) }}>You pay only when you&rsquo;re satisfied.</p>
      </div>
    </>
  );
}
