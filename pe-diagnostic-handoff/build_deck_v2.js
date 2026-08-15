const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

// palette - no orange
const INK = "1C1A16";
const FOREST = "2F4A38";
const SAGE = "8FB89B";
const SAGE_LT = "9CC5A5";
const CREAM = "FAF7F0";
const CREAM2 = "F7F3E9";
const BEIGE = "E8DFC9";
const WHITE = "FFFFFF";
const MUTE = "7A756A";
const FOREST_DK = "27402F";

const SERIF = "Cormorant Garamond";
const SANS = "Hanken Grotesk";

const SHADOW = { type: "outer", color: "1C1A16", opacity: 0.08, blur: 6, offset: 2, angle: 90 };

function chip(s, label, dark) {
  s.addText(label.toUpperCase(), { x: 0.6, y: 0.38, w: 10, h: 0.3, fontFace: SANS, fontSize: 10.5, color: dark ? SAGE : FOREST, charSpacing: 3, bold: true, margin: 0 });
}
function title(s, txt, opts) {
  s.addText(txt, Object.assign({ x: 0.6, y: 0.68, w: 12.1, h: 0.85, fontFace: SERIF, fontSize: 33, color: INK, margin: 0 }, opts || {}));
}
function pageNum(s, n) {
  s.addText(String(n), { x: 12.65, y: 7.05, w: 0.4, h: 0.3, fontFace: SANS, fontSize: 9, color: MUTE, align: "right", margin: 0 });
}
function card(s, o) {
  s.addShape(p.ShapeType.roundRect, Object.assign({ fill: { color: WHITE }, line: { color: BEIGE, width: 1 }, rectRadius: 0.1, shadow: SHADOW }, o));
}

// ---------- S1 cover (forest) ----------
let s = p.addSlide();
s.background = { color: FOREST };
s.addText("Laoh", { x: 0.7, y: 0.55, w: 3, h: 0.45, fontFace: SANS, fontSize: 17, color: CREAM, bold: true, margin: 0 });
s.addText([
  { text: "Your portfolio bought AI.", options: { color: CREAM, breakLine: true } },
  { text: "The P&L can't see it.", options: { color: SAGE_LT, italic: true } },
], { x: 0.7, y: 2.0, w: 11.9, h: 2.4, fontFace: SERIF, fontSize: 54, margin: 0, lineSpacingMultiple: 1.05 });
s.addText("A capability diagnostic for the engineering teams inside your portcos - who can actually use AI, what's blocking them, what to fix first.", { x: 0.72, y: 4.6, w: 9.6, h: 0.85, fontFace: SANS, fontSize: 15, color: BEIGE, margin: 0 });
s.addText("From the team that screens forward-deployed engineers for frontier AI labs and 3 vertical AI companies.", { x: 0.72, y: 5.75, w: 9.6, h: 0.4, fontFace: SANS, fontSize: 12, color: SAGE_LT, margin: 0 });
s.addText("Pulkit Walia  ·  Rohit Jain  ·  laoh.ai  ·  San Francisco", { x: 0.72, y: 6.75, w: 9, h: 0.35, fontFace: SANS, fontSize: 11, color: SAGE, margin: 0 });

// ---------- S2 why now (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "01 · why now");
title(s, "AI impact has moved from story to diligence requirement.");

// timeline base line
const tlY = 3.35;
s.addShape(p.ShapeType.line, { x: 1.0, y: tlY, w: 11.3, h: 0, line: { color: BEIGE, width: 2 } });
const nodes = [
  ["2023", "copilot licenses roll out"],
  ["2024", "pilots everywhere"],
  ["2025", "‘AI-native’ hires"],
];
const nodeX = [1.5, 4.15, 6.8];
nodes.forEach((n, i) => {
  const cx = nodeX[i];
  s.addShape(p.ShapeType.ellipse, { x: cx - 0.09, y: tlY - 0.09, w: 0.18, h: 0.18, fill: { color: MUTE }, line: { type: "none" } });
  s.addText(n[0], { x: cx - 1.1, y: tlY - 0.75, w: 2.2, h: 0.45, fontFace: SERIF, fontSize: 22, color: MUTE, align: "center", margin: 0 });
  s.addText(n[1], { x: cx - 1.2, y: tlY + 0.22, w: 2.4, h: 0.65, fontFace: SANS, fontSize: 12, color: INK, align: "center", margin: 0 });
});
// 2026 heavy node
const hx = 10.35;
s.addShape(p.ShapeType.ellipse, { x: hx - 0.19, y: tlY - 0.19, w: 0.38, h: 0.38, fill: { color: FOREST }, line: { color: CREAM, width: 2 } });
s.addText("2026", { x: hx - 1.3, y: tlY - 0.88, w: 2.6, h: 0.55, fontFace: SERIF, fontSize: 30, bold: true, color: FOREST, align: "center", margin: 0 });
card(s, { x: hx - 1.75, y: tlY + 0.28, w: 3.5, h: 1.15 });
s.addText([
  { text: "buyers ask for measured impact in diligence", options: { bold: true, color: FOREST, breakLine: true } },
  { text: "PwC, 2026 deals", options: { color: MUTE, fontSize: 10.5 } },
], { x: hx - 1.5, y: tlY + 0.4, w: 3.0, h: 0.95, fontFace: SANS, fontSize: 12.5, align: "center", margin: 0 });

s.addText("Most portfolios remain at Deploy - licenses out, operating model unchanged (BCG, 2026).", { x: 0.6, y: 5.3, w: 12.1, h: 0.4, fontFace: SANS, fontSize: 13, italic: true, color: MUTE, align: "center", margin: 0 });

// bottom strip
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 5.95, w: 12.13, h: 0.95, fill: { color: CREAM2 }, line: { color: BEIGE, width: 1 }, rectRadius: 0.08 });
s.addText([
  { text: "Vista built an in-house Agentic AI Factory. Mega-funds hire AI operating partners (Korn Ferry). ", options: { color: INK } },
  { text: "Mid-market firms rent the playbook.", options: { bold: true, color: FOREST } },
], { x: 0.95, y: 5.95, w: 11.45, h: 0.95, fontFace: SANS, fontSize: 13.5, valign: "middle", margin: 0 });
pageNum(s, 2);

// ---------- S3 the levels (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "02 · the levels");
title(s, "Engineering teams sit at six distinct levels of AI capability.");

const levels = [
  // [tag, name, desc, fill, textColor, descLines]
  ["L5", "software factory", "Builds the system that builds software - spec pipelines, agent fleets, a held-out test library the agents never see, so they can't game the checks. No human reads the code; humans approve outcomes.", FOREST_DK, CREAM],
  ["L4", "spec-driven", "Writes the full spec before any code exists - what to build, what “correct” means, the tests that prove it. Agents then build for hours unsupervised; the person ships on passing evidence, sampling the code rather than reading it.", FOREST, CREAM],
  ["L3", "agent manager", "Runs 2-3 agents at once on separate tasks in parallel copies of the codebase. Reviews each agent's change summary instead of writing code. Keeps a written project brief so agents start with full context.", SAGE, INK],
  ["L2", "pair programming", "An AI agent writes whole files; the person still reads and corrects every line before anything ships. Feels very fast.", SAGE_LT, INK],
  ["L1", "task delegation", "Asks AI for small pieces - a test, a snippet - and pastes them in by hand.", BEIGE, INK],
  ["L0", "manual", "Types every line themselves; AI is a search box.", CREAM2, INK],
];
let ry = 1.58;
levels.forEach((lv, i) => {
  const L = 5 - i; // level number
  const isL2 = lv[0] === "L2";
  const rh = isL2 ? 1.02 : 0.72;
  const bx = 0.6 + L * 0.5;
  s.addShape(p.ShapeType.roundRect, { x: bx, y: ry, w: 1.95, h: rh, fill: { color: lv[3] }, line: lv[3] === CREAM2 ? { color: BEIGE, width: 1 } : { type: "none" }, rectRadius: 0.06 });
  s.addText([
    { text: lv[0] + "  ", options: { bold: true, fontSize: 13 } },
    { text: lv[1], options: { fontSize: 11.5 } },
  ], { x: bx + 0.12, y: ry, w: 1.75, h: rh, fontFace: SANS, color: lv[4], valign: "middle", margin: 0, lineSpacingMultiple: 0.95 });
  const dx = bx + 2.15;
  if (isL2) {
    s.addText(lv[2], { x: dx, y: ry + 0.03, w: 12.73 - dx, h: 0.5, fontFace: SANS, fontSize: 11, color: INK, valign: "top", margin: 0 });
    s.addText("the trap - it feels like mastery, and most self-described AI-native engineers are here (Dan Shapiro, The Five Levels, 2026)", { x: dx, y: ry + 0.55, w: 12.73 - dx, h: 0.42, fontFace: SANS, fontSize: 11, italic: true, bold: true, color: FOREST, valign: "top", margin: 0 });
  } else {
    s.addText(lv[2], { x: dx, y: ry, w: 12.73 - dx, h: rh, fontFace: SANS, fontSize: 11, color: INK, valign: "middle", margin: 0 });
  }
  ry += rh + 0.08;
});
s.addText("Every level is claimed in interviews. Each one is verifiable only by watching the work - which is the diagnostic.", { x: 0.6, y: 6.72, w: 12.1, h: 0.4, fontFace: SERIF, fontSize: 16, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 3);

// ---------- S4 the economics (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "03 · the economics");
title(s, "A team at L4 ships several times the output of the same team at L2.", { fontSize: 31 });

const colX = [0.6, 2.35, 5.75, 9.35];
const colW = [1.6, 3.25, 3.45, 3.38];
const heads = ["", "what goes in", "what happens", "what comes out"];
heads.forEach((h, i) => {
  if (h) s.addText(h.toUpperCase(), { x: colX[i] + 0.15, y: 1.62, w: colW[i], h: 0.3, fontFace: SANS, fontSize: 9.5, color: MUTE, charSpacing: 2, margin: 0 });
});
const rows = [
  ["L2", "one task per person", "person and AI write together; every line human-read", "one feature at a time; output scales only with headcount", false],
  ["L3", "three tasks per person", "three agents build in parallel; person reviews change summaries", "several workstreams move at once; throughput per head multiplies", false],
  ["L4", "a written spec, tests defined upfront", "agents build unsupervised for hours; an independent test suite verifies", "shipped software, proven by passing tests; cycle time collapses", true],
];
rows.forEach((r, i) => {
  const y = 2.0 + i * 1.22;
  const em = r[4];
  card(s, { x: 0.6, y, w: 12.13, h: 1.08, fill: { color: em ? FOREST : WHITE }, line: em ? { type: "none" } : { color: BEIGE, width: 1 } });
  s.addText(r[0], { x: colX[0] + 0.25, y, w: 1.1, h: 1.08, fontFace: SERIF, fontSize: 30, bold: true, color: em ? CREAM : FOREST, valign: "middle", margin: 0 });
  for (let c = 1; c <= 3; c++) {
    s.addText(r[c], { x: colX[c] + 0.15, y: y + 0.1, w: colW[c] - 0.3, h: 0.88, fontFace: SANS, fontSize: 12, color: em ? CREAM : INK, valign: "middle", margin: 0 });
  }
});
// proof chip
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 5.85, w: 12.13, h: 0.78, fill: { color: CREAM2 }, line: { color: BEIGE, width: 1 }, rectRadius: 0.08 });
s.addText([
  { text: "L5 runs in production today.  ", options: { bold: true, color: FOREST } },
  { text: "StrongDM's software factory turns specs into verified software with no human reading code, at ~$1k/day/engineer in tokens. A lighthouse for where this goes.", options: { color: INK } },
], { x: 0.95, y: 5.85, w: 11.45, h: 0.78, fontFace: SANS, fontSize: 11.5, valign: "middle", margin: 0 });
s.addText("Capacity per head and cycle time are the lines a value-creation plan is priced on.", { x: 0.6, y: 6.85, w: 12.1, h: 0.4, fontFace: SERIF, fontSize: 16, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 4);

// ---------- S5 the measurement problem (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "04 · the measurement problem");
title(s, "Developers misjudge their own AI productivity by about 40 points.", { fontSize: 31 });
s.addText("+20%", { x: 0.9, y: 1.95, w: 5.6, h: 2.0, fontFace: SERIF, fontSize: 120, color: SAGE, align: "center", margin: 0 });
s.addText("how much faster developers believed AI made them", { x: 1.15, y: 4.1, w: 5.1, h: 0.75, fontFace: SANS, fontSize: 14, color: MUTE, align: "center", margin: 0 });
s.addText("-19%", { x: 6.9, y: 1.95, w: 5.6, h: 2.0, fontFace: SERIF, fontSize: 120, color: INK, align: "center", margin: 0 });
s.addText("how much slower they actually were", { x: 7.15, y: 4.1, w: 5.1, h: 0.75, fontFace: SANS, fontSize: 14, color: MUTE, align: "center", margin: 0 });
s.addShape(p.ShapeType.line, { x: 6.66, y: 2.3, w: 0, h: 2.3, line: { color: BEIGE, width: 1.5 } });
s.addText("Randomized trial, 246 real tasks (METR, 2025)", { x: 0.6, y: 5.15, w: 12.1, h: 0.35, fontFace: SANS, fontSize: 11.5, color: MUTE, align: "center", margin: 0 });
s.addText("Every adoption survey in your portfolio carries this same gap. Placing people on the ladder requires watching them work.", { x: 1.3, y: 5.85, w: 10.7, h: 0.85, fontFace: SANS, fontSize: 16.5, bold: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 5);

// ---------- S6 how we measure (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "05 · how we measure");
title(s, "We measure capability by observing days of real work.");

const msteps = [
  ["Observability agents go onto laptops and repos", "Announced and approved. A few days. Zero engineer hours lost."],
  ["They record how work happens", "Which tasks go to agents, how much agent output gets hand-corrected, whether specs and project briefs exist, how results get verified."],
  ["We score each person against the level definitions", "A level - plus the observed evidence behind it."],
];
msteps.forEach((m, i) => {
  const y = 1.75 + i * 1.42;
  card(s, { x: 0.6, y, w: 7.9, h: 1.26 });
  s.addShape(p.ShapeType.ellipse, { x: 0.92, y: y + 0.34, w: 0.58, h: 0.58, fill: { color: FOREST }, line: { type: "none" } });
  s.addText(String(i + 1), { x: 0.92, y: y + 0.34, w: 0.58, h: 0.58, fontFace: SERIF, fontSize: 22, color: CREAM, align: "center", valign: "middle", margin: 0 });
  s.addText(m[0], { x: 1.75, y: y + 0.14, w: 6.55, h: 0.45, fontFace: SANS, fontSize: 14.5, bold: true, color: INK, margin: 0 });
  s.addText(m[1], { x: 1.75, y: y + 0.6, w: 6.55, h: 0.6, fontFace: SANS, fontSize: 11.5, color: MUTE, margin: 0 });
});
// side chip (forest)
s.addShape(p.ShapeType.roundRect, { x: 8.85, y: 1.75, w: 3.88, h: 4.1, fill: { color: FOREST }, line: { type: "none" }, rectRadius: 0.1, shadow: SHADOW });
s.addText("THE CALIBRATION", { x: 9.2, y: 2.1, w: 3.2, h: 0.3, fontFace: SANS, fontSize: 10, color: SAGE, charSpacing: 2.5, margin: 0 });
s.addText("A role-matched live simulation calibrates every score.", { x: 9.2, y: 2.55, w: 3.2, h: 1.5, fontFace: SERIF, fontSize: 22, color: CREAM, margin: 0 });
s.addText("The same instrument we use to screen forward-deployed engineers for frontier labs.", { x: 9.2, y: 4.3, w: 3.2, h: 1.3, fontFace: SANS, fontSize: 12.5, color: SAGE_LT, margin: 0 });
// trust strip
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 6.2, w: 12.13, h: 0.85, fill: { color: CREAM2 }, line: { color: BEIGE, width: 1 }, rectRadius: 0.08 });
s.addText("Workflow signals only - code never leaves the portco's environment  ·  reports go to the person and the CEO  ·  one 30-min security review with the portco CTO is the full approval", { x: 0.95, y: 6.2, w: 11.45, h: 0.85, fontFace: SANS, fontSize: 11.5, color: INK, valign: "middle", margin: 0 });
pageNum(s, 6);

// ---------- S7 what you get (cream2) ----------
s = p.addSlide();
s.background = { color: CREAM2 };
chip(s, "06 · what you get");
title(s, "Every person's level comes with the evidence behind it.", { fontSize: 31 });
// big card
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 1.55, w: 12.15, h: 5.1, fill: { color: WHITE }, line: { color: BEIGE, width: 1 }, rectRadius: 0.1, shadow: { type: "outer", color: "1C1A16", opacity: 0.1, blur: 8, offset: 3, angle: 90 } });
// header
s.addText("A. Mehta", { x: 1.0, y: 1.78, w: 3.4, h: 0.5, fontFace: SERIF, fontSize: 26, color: INK, margin: 0 });
s.addText("Integrations engineer · Portco A · assessed 12 Jun", { x: 1.0, y: 2.31, w: 4.6, h: 0.3, fontFace: SANS, fontSize: 10.5, color: MUTE, margin: 0 });
// ladder strip L0..L5
const lvls = ["L0","L1","L2","L3","L4","L5"];
lvls.forEach((l, i) => {
  const lx = 5.9 + i * 0.78;
  const active = i <= 2;
  s.addShape(p.ShapeType.roundRect, { x: lx, y: 1.88, w: 0.68, h: 0.5, fill: { color: active ? FOREST : CREAM2 }, line: { color: active ? FOREST : BEIGE, width: 1 }, rectRadius: 0.06 });
  s.addText(l, { x: lx, y: 1.88, w: 0.68, h: 0.5, fontFace: SANS, fontSize: 12, bold: true, color: active ? CREAM : MUTE, align: "center", valign: "middle", margin: 0 });
});
s.addText([
  { text: "operates at L2", options: { bold: true, color: FOREST } },
  { text: " - pairs with AI, still reviews every line", options: { color: MUTE } },
], { x: 5.9, y: 2.45, w: 5.6, h: 0.3, fontFace: SANS, fontSize: 11, margin: 0 });
// dimension bars
const dims = [["Delegation",3],["Spec quality",2],["Verification",1],["Context",2],["Orchestration",1],["Judgment",4]];
s.addText("SCORED DIMENSIONS", { x: 1.0, y: 2.85, w: 4, h: 0.28, fontFace: SANS, fontSize: 9.5, color: MUTE, charSpacing: 2.5, margin: 0 });
dims.forEach((d, i) => {
  const y = 3.2 + i * 0.46;
  s.addText(d[0], { x: 1.0, y, w: 1.75, h: 0.32, fontFace: SANS, fontSize: 11.5, color: INK, margin: 0, valign: "middle" });
  s.addShape(p.ShapeType.roundRect, { x: 2.85, y: y + 0.055, w: 3.1, h: 0.2, fill: { color: CREAM2 }, line: { color: BEIGE, width: 0.75 }, rectRadius: 0.05 });
  s.addShape(p.ShapeType.roundRect, { x: 2.85, y: y + 0.055, w: Math.max(0.35, 3.1 * d[1] / 5), h: 0.2, fill: { color: d[1] >= 3 ? FOREST : SAGE }, line: { type: "none" }, rectRadius: 0.05 });
  s.addText(d[1] + "/5", { x: 6.05, y, w: 0.6, h: 0.32, fontFace: SANS, fontSize: 10.5, color: MUTE, margin: 0, valign: "middle" });
});
// evidence column
s.addText("WHAT WE SAW", { x: 7.35, y: 2.85, w: 4, h: 0.28, fontFace: SANS, fontSize: 9.5, color: MUTE, charSpacing: 2.5, margin: 0 });
const ev = [
  "“hand-edited 40% of the agent's output”",
  "“ran the code once and called it verified”",
  "“knew exactly when not to use the agent - strongest signal”",
];
ev.forEach((e, i) => {
  s.addText(e, { x: 7.35, y: 3.2 + i * 0.75, w: 4.95, h: 0.7, fontFace: SERIF, fontSize: 14.5, italic: true, color: INK, margin: 0 });
});
// path strip
s.addShape(p.ShapeType.roundRect, { x: 1.0, y: 5.95, w: 11.3, h: 0.52, fill: { color: SAGE_LT, transparency: 55 }, line: { type: "none" }, rectRadius: 0.08 });
s.addText([
  { text: "path to L3:  ", options: { bold: true, color: FOREST } },
  { text: "run parallel sessions  ·  stop hand-editing output  ·  build the repo context file", options: { color: INK } },
], { x: 1.25, y: 5.95, w: 10.9, h: 0.52, fontFace: SANS, fontSize: 12, valign: "middle", margin: 0 });
s.addText("A growth map, never a report card.", { x: 0.6, y: 6.85, w: 12.1, h: 0.42, fontFace: SERIF, fontSize: 17, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 7);

// ---------- S8 the path (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "07 · the path");
title(s, "Three moves take a portco from baseline to proven capability gains.", { fontSize: 31 });
const moves = [
  ["Measure", "2-3 weeks, one portco: capability map, readiness scorecard, sequenced 100-day plan.", true],
  ["Move the levels", "12-week cohorts grouped by assessed level, practiced on real tickets.", false],
  ["Prove it moved", "Quarterly re-measure with telemetry on - movement in numbers your IC can read.", false],
];
moves.forEach((m, i) => {
  const x = 0.6 + i * 4.28;
  const em = m[2];
  card(s, { x, y: 1.9, w: 3.95, h: 2.65, fill: { color: em ? FOREST : WHITE }, line: em ? { type: "none" } : { color: BEIGE, width: 1 } });
  s.addShape(p.ShapeType.ellipse, { x: x + 0.32, y: 2.22, w: 0.58, h: 0.58, fill: { color: em ? CREAM : FOREST }, line: { type: "none" } });
  s.addText(String(i + 1), { x: x + 0.32, y: 2.22, w: 0.58, h: 0.58, fontFace: SERIF, fontSize: 22, color: em ? FOREST : CREAM, align: "center", valign: "middle", margin: 0 });
  s.addText(m[0], { x: x + 0.32, y: 3.0, w: 3.35, h: 0.55, fontFace: SERIF, fontSize: 24, color: em ? CREAM : INK, margin: 0 });
  s.addText(m[1], { x: x + 0.32, y: 3.6, w: 3.35, h: 0.85, fontFace: SANS, fontSize: 12, color: em ? SAGE_LT : MUTE, margin: 0 });
});
// illustrative metrics strip
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 4.95, w: 12.13, h: 0.95, fill: { color: CREAM2 }, line: { color: BEIGE, width: 1 }, rectRadius: 0.08 });
s.addText("ILLUSTRATIVE", { x: 0.95, y: 5.06, w: 3, h: 0.25, fontFace: SANS, fontSize: 8.5, color: MUTE, charSpacing: 2.5, margin: 0 });
s.addText([
  { text: "hand-corrected agent output ↓  +  agent-authored share ↑", options: { color: INK } },
  { text: "    →    ", options: { color: MUTE } },
  { text: "cycle time on comparable tickets ↓", options: { color: INK } },
  { text: "    →    ", options: { color: MUTE } },
  { text: "capacity per head ↑", options: { bold: true, color: FOREST } },
], { x: 0.95, y: 5.3, w: 11.45, h: 0.5, fontFace: SANS, fontSize: 12.5, valign: "middle", margin: 0 });
s.addText("An ugly baseline seen now is pre-diligence on your terms.", { x: 0.6, y: 6.35, w: 12.1, h: 0.5, fontFace: SERIF, fontSize: 20, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 8);

// ---------- S9 why us (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "08 · why us");
title(s, "We've watched AI deployment fail from the other side of the table.", { fontSize: 31 });
const flow = [
  ["Frontier labs deploy engineers", "into companies like your portcos"],
  ["Deployment lands; absorption doesn't", "and no one deploying is paid to fix that"],
  ["We assess the absorbers", "the same instrument, pointed at your teams"],
];
flow.forEach((f, i) => {
  const x = 0.6 + i * 4.35;
  const last = i === 2;
  card(s, { x, y: 1.9, w: 3.75, h: 1.75, fill: { color: last ? FOREST : WHITE }, line: last ? { type: "none" } : { color: BEIGE, width: 1 } });
  s.addText(f[0], { x: x + 0.28, y: 2.1, w: 3.25, h: 0.75, fontFace: SANS, fontSize: 14.5, bold: true, color: last ? CREAM : INK, margin: 0 });
  s.addText(f[1], { x: x + 0.28, y: 2.85, w: 3.25, h: 0.65, fontFace: SANS, fontSize: 11.5, color: last ? SAGE_LT : MUTE, margin: 0 });
  if (i < 2) s.addText("→", { x: x + 3.78, y: 2.45, w: 0.55, h: 0.6, fontFace: SANS, fontSize: 26, color: FOREST, align: "center", margin: 0 });
});
s.addText([
  { text: "We screen FDEs for  ", options: { color: MUTE } },
  { text: "ElevenLabs · Retell · +3 YC-backed AI cos", options: { bold: true, color: INK } },
], { x: 0.6, y: 4.05, w: 12.1, h: 0.45, fontFace: SANS, fontSize: 15, align: "center", margin: 0 });
// cred cards
const cred = [
  ["Pulkit Walia", "Built the engineering assessment and skilling system at Urban Company ($3B IPO), a tech-enabled trades marketplace."],
  ["Rohit Jain", "25,000+ engineers trained. Hundreds of big-tech interview loops run from the other side of the table."],
];
cred.forEach((c, i) => {
  const x = 1.7 + i * 5.2;
  card(s, { x, y: 4.8, w: 4.75, h: 1.95 });
  s.addText(c[0], { x: x + 0.3, y: 5.0, w: 4.15, h: 0.5, fontFace: SERIF, fontSize: 24, color: FOREST, margin: 0 });
  s.addText(c[1], { x: x + 0.3, y: 5.6, w: 4.15, h: 1.0, fontFace: SANS, fontSize: 11.5, color: INK, margin: 0 });
});
pageNum(s, 9);

// ---------- S10 offer (forest) ----------
s = p.addSlide();
s.background = { color: FOREST };
chip(s, "start here", true);
s.addText("Start with one portco - $1,000 a seat, results in three weeks.", { x: 0.6, y: 0.72, w: 12.1, h: 0.9, fontFace: SERIF, fontSize: 34, color: CREAM, margin: 0 });
// left: what you get
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 1.85, w: 5.9, h: 3.35, fill: { color: FOREST_DK }, line: { color: SAGE, width: 0.75 }, rectRadius: 0.1 });
s.addText("WHAT YOU GET", { x: 0.95, y: 2.08, w: 4, h: 0.3, fontFace: SANS, fontSize: 10, color: SAGE, charSpacing: 2.5, margin: 0 });
const gets = [
  "2-3 weeks, one portco",
  "level map by function, with evidence",
  "readiness scorecard",
  "sequenced 100-day plan",
  "typical run: 30-40 seats, $30-40k, fund or portco budget",
];
gets.forEach((g, i) => {
  s.addText([{ text: g }], { x: 0.95, y: 2.5 + i * 0.53, w: 5.3, h: 0.48, fontFace: SANS, fontSize: 13.5, color: CREAM, bullet: { characterCode: "2013", indent: 18 }, margin: 0 });
});
// right: chevrons
s.addText("THEN, IF IT EARNS IT", { x: 7.1, y: 2.08, w: 4, h: 0.3, fontFace: SANS, fontSize: 10, color: SAGE, charSpacing: 2.5, margin: 0 });
const chev = ["one portco", "portfolio dashboard", "upskilling / deal diligence"];
chev.forEach((c, i) => {
  const y = 2.5 + i * 0.92;
  s.addShape(p.ShapeType.roundRect, { x: 7.1 + i * 0.55, y, w: 4.6, h: 0.72, fill: { color: i === 0 ? SAGE_LT : (i === 1 ? SAGE : CREAM) }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText(c, { x: 7.1 + i * 0.55, y, w: 4.6, h: 0.72, fontFace: SANS, fontSize: 14, bold: true, color: FOREST, align: "center", valign: "middle", margin: 0 });
});
s.addText("Start where engineering cost is the thesis.", { x: 7.1, y: 5.32, w: 5.3, h: 0.35, fontFace: SANS, fontSize: 12, italic: true, color: SAGE_LT, margin: 0 });
// IC-forwardable line
s.addText("“For $40k and three weeks we get a measured answer on whether [portco]'s AI spend is building capability or shelfware - before a buyer's diligence team asks.”", { x: 1.3, y: 5.72, w: 10.7, h: 0.8, fontFace: SERIF, fontSize: 17, italic: true, color: CREAM, align: "center", margin: 0 });
s.addText("30 mins to scope it. We'll bring the instrument.", { x: 0.6, y: 6.62, w: 12.1, h: 0.4, fontFace: SANS, fontSize: 14, bold: true, color: SAGE_LT, align: "center", margin: 0 });
s.addText("Pulkit Walia  ·  laoh.ai", { x: 0.6, y: 7.02, w: 12.1, h: 0.32, fontFace: SANS, fontSize: 11, color: SAGE, align: "center", margin: 0 });

p.writeFile({ fileName: "pe-capability-diagnostic-v2.pptx" }).then(() => console.log("done"));
