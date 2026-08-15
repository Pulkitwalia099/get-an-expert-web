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
s.addText("From the team that screens forward-deployed engineers for a frontier AI lab, a vertical AI company, and 3 YC-backed AI cos.", { x: 0.72, y: 5.75, w: 9.6, h: 0.4, fontFace: SANS, fontSize: 12, color: SAGE_LT, margin: 0 });
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

// the gap: spend up, EBITDA unanswered
card(s, { x: 0.6, y: 5.3, w: 5.9, h: 1.55 });
s.addText("AI license spend", { x: 0.95, y: 5.52, w: 5.2, h: 0.55, fontFace: SERIF, fontSize: 28, color: FOREST, margin: 0 });
s.addText("up and to the right since 2023 - copilot seats, agent tools, pilots", { x: 0.95, y: 6.2, w: 5.2, h: 0.5, fontFace: SANS, fontSize: 12, color: MUTE, margin: 0 });
s.addShape(p.ShapeType.roundRect, { x: 6.85, y: 5.3, w: 5.88, h: 1.55, fill: { color: FOREST }, line: { type: "none" }, rectRadius: 0.1, shadow: SHADOW });
s.addText("EBITDA impact", { x: 7.2, y: 5.52, w: 5.3, h: 0.55, fontFace: SERIF, fontSize: 28, color: CREAM, margin: 0 });
s.addText("the question everyone is asking - in every board meeting, and now in every sale process", { x: 7.2, y: 6.2, w: 5.3, h: 0.5, fontFace: SANS, fontSize: 12, color: SAGE_LT, margin: 0 });
pageNum(s, 2);

// ---------- S3 the levels (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "02 · the levels");
title(s, "Engineering teams sit at five distinct levels of AI capability.");

// column geometry
const c3x = [0.6, 2.75, 5.7, 9.55];
const c3w = [2.0, 2.8, 3.7, 3.18];
["", "what it is", "what you'd see them doing", "what comes out"].forEach((h, i) => {
  if (h) s.addText(h.toUpperCase(), { x: c3x[i] + 0.05, y: 1.58, w: c3w[i], h: 0.28, fontFace: SANS, fontSize: 9.5, color: MUTE, charSpacing: 2, margin: 0 });
});
const levels = [
  ["L1", "chat-window operator", CREAM2, INK, "AI as a better search box", "pastes questions into a chat window; no repo context; accepts answers on vibes", "snippets; the same work, slightly faster"],
  ["L2", "agent-native, context-naive", SAGE_LT, INK, "agent tools driven like a chat window", "one-shot prompts in Cursor or Claude Code; no instructions file; doesn't read the diff", "unreviewed output piles up; feels fast, ships slop"],
  ["L3", "context engineer", SAGE, INK, "supplies context on purpose - the dividing line", "keeps a persistent instructions file; picks the right files, conventions and constraints; writes a spec before prompting; reviews the output", "the agent starts right; real gains begin"],
  ["L4", "high-context + verified", FOREST, CREAM, "rich context plus a hard oracle", "adds screenshots, diagrams and worked examples instead of prose; writes tests first so passing is proof; reads every diff", "verified changes at speed; quality stops depending on judgment calls"],
  ["L5", "fan-out + refusal", FOREST_DK, CREAM, "parallel agents, deliberate limits", "decomposes work and fans it out to parallel agents - safe because verification is automated; has found where AI is negative and stopped using it there", "several verified workstreams per person; judgment becomes the output"],
];
let ry = 1.92;
levels.forEach((lv) => {
  const isL2 = lv[0] === "L2";
  const rh = isL2 ? 1.05 : 0.82;
  card(s, { x: 0.6, y: ry, w: 12.13, h: rh, fill: { color: isL2 ? CREAM2 : WHITE }, line: { color: isL2 ? SAGE : BEIGE, width: isL2 ? 1.5 : 1 } });
  s.addShape(p.ShapeType.roundRect, { x: 0.75, y: ry + 0.12, w: 1.85, h: 0.44, fill: { color: lv[2] }, line: lv[2] === CREAM2 ? { color: BEIGE, width: 1 } : { type: "none" }, rectRadius: 0.06 });
  s.addText([
    { text: lv[0] + "  ", options: { bold: true, fontSize: 12 } },
    { text: lv[1], options: { fontSize: 10.5 } },
  ], { x: 0.87, y: ry + 0.12, w: 1.7, h: 0.44, fontFace: SANS, color: lv[3], valign: "middle", margin: 0 });
  const cellY = isL2 ? ry + 0.06 : ry;
  const cellH = isL2 ? 0.62 : rh;
  for (let c = 0; c < 3; c++) {
    s.addText(lv[4 + c], { x: c3x[c + 1] + 0.05, y: cellY, w: c3w[c + 1] - 0.15, h: cellH, fontFace: SANS, fontSize: 11, color: INK, valign: "middle", margin: 0 });
  }
  if (isL2) {
    s.addText("the trap - the tools look advanced, so it feels like mastery; most self-described AI-native engineers are here", { x: c3x[1] + 0.05, y: ry + 0.68, w: 9.8, h: 0.3, fontFace: SANS, fontSize: 11, italic: true, bold: true, color: FOREST, margin: 0 });
  }
  ry += rh + 0.08;
});
s.addText("Every level is claimed in interviews. Each one is verifiable only by watching the work - which is the diagnostic.", { x: 0.6, y: 6.78, w: 12.1, h: 0.4, fontFace: SERIF, fontSize: 16, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 3);

// ---------- S4 the economics (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "03 · the economics");
title(s, "A team at L5 ships several times the output of the same team at L2.", { fontSize: 31 });

const colX = [0.6, 2.35, 5.75, 9.35];
const colW = [1.6, 3.25, 3.45, 3.38];
const heads = ["", "what goes in", "what happens", "what comes out"];
heads.forEach((h, i) => {
  if (h) s.addText(h.toUpperCase(), { x: colX[i] + 0.15, y: 1.62, w: colW[i], h: 0.3, fontFace: SANS, fontSize: 9.5, color: MUTE, charSpacing: 2, margin: 0 });
});
const rows = [
  ["L2", "one-shot prompts into an agent tool", "no context supplied, no spec, diffs land unread", "feels fast; slop and rework eat the gain", false],
  ["L3", "a spec and deliberately chosen context", "the agent starts right; the person reviews every output", "the dividing line - real gains begin, one stream at a time", false],
  ["L5", "decomposed tasks fanned out to parallel agents", "tests-first verification gates every change; AI kept off tasks where it's negative", "several verified workstreams per person; cycle time collapses", true],
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
  { text: "Why the order matters.  ", options: { bold: true, color: FOREST } },
  { text: "L5 fan-out is only safe because L4 verification is automated - parallel agents without tests-first just multiply unreviewed diffs.", options: { color: INK } },
], { x: 0.95, y: 5.85, w: 11.45, h: 0.78, fontFace: SANS, fontSize: 11.5, valign: "middle", margin: 0 });
s.addText("Capacity per head and cycle time are the lines a value-creation plan is priced on.", { x: 0.6, y: 6.85, w: 12.1, h: 0.4, fontFace: SERIF, fontSize: 16, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 4);

// ---------- S4b the two disciplines (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "04 · the method");
s.addText([
  { text: "Two disciplines move a team up the ladder -", options: { breakLine: true } },
  { text: "checkpoints and context engineering.", options: {} },
], { x: 0.6, y: 0.62, w: 12.1, h: 1.3, fontFace: SERIF, fontSize: 30, color: INK, margin: 0, lineSpacingMultiple: 1.0 });

// left card: checkpoint-driven development
card(s, { x: 0.6, y: 2.05, w: 5.9, h: 2.9, line: { color: FOREST, width: 1.5 } });
s.addText("CHECKPOINT-DRIVEN DEVELOPMENT", { x: 0.95, y: 2.25, w: 5.2, h: 0.28, fontFace: SANS, fontSize: 10, bold: true, color: FOREST, charSpacing: 2, margin: 0 });
// row A: one-shot miss
s.addShape(p.ShapeType.line, { x: 1.05, y: 2.98, w: 3.6, h: 0, line: { color: BEIGE, width: 1.25, dashType: "dash" } });
s.addShape(p.ShapeType.line, { x: 1.05, y: 2.52, w: 3.8, h: 0.46, flipV: true, line: { color: INK, width: 1.75 } });
s.addShape(p.ShapeType.ellipse, { x: 0.95, y: 2.89, w: 0.18, h: 0.18, fill: { color: INK }, line: { type: "none" } });
s.addShape(p.ShapeType.ellipse, { x: 4.62, y: 2.78, w: 0.4, h: 0.4, fill: { color: CREAM }, line: { color: FOREST, width: 1.25 } });
s.addShape(p.ShapeType.ellipse, { x: 4.74, y: 2.9, w: 0.16, h: 0.16, fill: { color: FOREST }, line: { type: "none" } });
s.addText("one-shot - the L2 way; a wide miss", { x: 5.2, y: 2.55, w: 1.25, h: 0.85, fontFace: SANS, fontSize: 9.5, italic: true, color: MUTE, margin: 0 });
// row B: checkpointed hit
const pts = [[1.05, 3.85], [1.95, 3.7], [2.85, 3.98], [3.75, 3.78], [4.7, 3.85]];
for (let i = 0; i < pts.length - 1; i++) {
  const a = pts[i], b = pts[i + 1];
  s.addShape(p.ShapeType.line, { x: a[0], y: Math.min(a[1], b[1]), w: b[0] - a[0], h: Math.abs(b[1] - a[1]), flipV: b[1] < a[1], line: { color: FOREST, width: 1.75 } });
}
s.addShape(p.ShapeType.ellipse, { x: 0.95, y: 3.76, w: 0.18, h: 0.18, fill: { color: INK }, line: { type: "none" } });
[pts[1], pts[2], pts[3]].forEach(pt => {
  s.addShape(p.ShapeType.ellipse, { x: pt[0] - 0.08, y: pt[1] - 0.08, w: 0.16, h: 0.16, fill: { color: SAGE }, line: { color: FOREST, width: 1 } });
});
s.addShape(p.ShapeType.ellipse, { x: 4.62, y: 3.65, w: 0.4, h: 0.4, fill: { color: CREAM }, line: { color: FOREST, width: 1.25 } });
s.addShape(p.ShapeType.ellipse, { x: 4.74, y: 3.77, w: 0.16, h: 0.16, fill: { color: FOREST }, line: { type: "none" } });
s.addText("checkpointed - the L4 way; hits", { x: 5.2, y: 3.5, w: 1.25, h: 0.85, fontFace: SANS, fontSize: 9.5, italic: true, color: FOREST, margin: 0 });
s.addText("Plan meticulously. Read what the AI built at every gate, correct, move. Feels slower - ships several times faster, without the slop.", { x: 0.95, y: 4.32, w: 5.25, h: 0.6, fontFace: SANS, fontSize: 11, color: INK, margin: 0 });

// right card: context engineering
card(s, { x: 6.85, y: 2.05, w: 5.88, h: 2.9, line: { color: FOREST, width: 1.5 } });
s.addText("CONTEXT ENGINEERING", { x: 7.2, y: 2.25, w: 5.2, h: 0.28, fontFace: SANS, fontSize: 10, bold: true, color: FOREST, charSpacing: 2, margin: 0 });
const ctxChips = [["instructions file", 7.2, 1.6], ["the right files", 9.2, 1.45], ["spec first", 11.05, 1.5]];
ctxChips.forEach((c, i) => {
  s.addShape(p.ShapeType.roundRect, { x: c[1], y: 2.75, w: c[2], h: 0.55, fill: { color: i === 2 ? FOREST : CREAM2 }, line: i === 2 ? { type: "none" } : { color: BEIGE, width: 1 }, rectRadius: 0.08 });
  s.addText(c[0], { x: c[1], y: 2.75, w: c[2], h: 0.55, fontFace: SANS, fontSize: 10, bold: true, color: i === 2 ? CREAM : FOREST, align: "center", valign: "middle", margin: 0 });
  if (i < 2) s.addText("→", { x: c[1] + c[2] + 0.02, y: 2.75, w: 0.36, h: 0.55, fontFace: SANS, fontSize: 15, color: MUTE, align: "center", valign: "middle", margin: 0 });
});
s.addText("context supplied on purpose, every time - the L3 dividing line", { x: 7.2, y: 3.42, w: 5.2, h: 0.3, fontFace: SANS, fontSize: 10.5, italic: true, color: MUTE, margin: 0 });
s.addText("A dumped context degrades the model with every turn. Choosing it deliberately - conventions, constraints, the files that matter - is the L3 dividing line. Screenshots, worked examples and tests-first make it L4.", { x: 7.2, y: 3.85, w: 5.25, h: 1.0, fontFace: SANS, fontSize: 11, color: INK, margin: 0 });

// bottom strip: learn-by-applying + anti-hype
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 5.2, w: 12.13, h: 1.55, fill: { color: CREAM2 }, line: { color: BEIGE, width: 1 }, rectRadius: 0.08 });
s.addText([
  { text: "Simple to learn, real only when applied. ", options: { bold: true, color: FOREST } },
  { text: "Like sales or leadership, courses alone get you a tenth of the way - these skills are built inside the live workflow, or not at all.", options: { color: INK, breakLine: true } },
  { text: "And skip the hype. ", options: { bold: true, color: FOREST } },
  { text: "“Loop engineering”, “Ralph loops”, fully autonomous everything - influencer content, counterproductive for enterprise production code. Engineers inside frontier labs don't build this way.", options: { color: INK } },
], { x: 0.95, y: 5.32, w: 11.45, h: 1.35, fontFace: SANS, fontSize: 12, margin: 0, lineSpacingMultiple: 1.12 });
pageNum(s, 5);

// ---------- S4c the visibility (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "05 · the visibility");
title(s, "Value per token rises with every level your people climb.", { fontSize: 31 });

// left: what we watch / what it shows
s.addText("WHAT WE WATCH", { x: 0.6, y: 1.85, w: 5, h: 0.3, fontFace: SANS, fontSize: 10, color: MUTE, charSpacing: 2.5, margin: 0 });
s.addText("Where each person applied the disciplines - and where they didn't. Task by task: did a plan and checkpoints exist, was the work reviewed at each gate, was context engineered or dumped.", { x: 0.6, y: 2.25, w: 5.5, h: 1.3, fontFace: SANS, fontSize: 13, color: INK, margin: 0 });
s.addText("WHAT THAT SHOWS", { x: 0.6, y: 3.75, w: 5, h: 0.3, fontFace: SANS, fontSize: 10, color: MUTE, charSpacing: 2.5, margin: 0 });
s.addText("Exactly where the productivity gap sits, person by person - the tasks where a discipline should have been applied and wasn't. That visibility alone shows where value per token is leaking.", { x: 0.6, y: 4.15, w: 5.5, h: 1.3, fontFace: SANS, fontSize: 13, color: INK, margin: 0 });

// right: spend flat, value rising
card(s, { x: 6.6, y: 1.85, w: 6.13, h: 4.0 });
s.addText("ILLUSTRATIVE", { x: 6.95, y: 2.02, w: 3, h: 0.25, fontFace: SANS, fontSize: 8.5, color: MUTE, charSpacing: 2.5, margin: 0 });
s.addChart(p.ChartType.line, [
  { name: "spend per token", labels: ["L2", "L3", "L4", "L5"], values: [100, 100, 100, 100] },
  { name: "value per token", labels: ["L2", "L3", "L4", "L5"], values: [100, 220, 340, 480] },
], {
  x: 6.95, y: 2.35, w: 5.45, h: 3.25,
  chartColors: [MUTE, FOREST],
  lineSize: 3, lineSmooth: false, lineDataSymbol: "circle", lineDataSymbolSize: 8,
  showLegend: true, legendPos: "b", legendColor: INK, legendFontSize: 11, legendFontFace: SANS,
  catAxisLabelColor: INK, catAxisLabelFontSize: 12, catAxisLabelFontFace: SANS,
  valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
  valAxisLineShow: false, serAxisLineShow: false,
});
s.addText("So we hand you exactly that - a scorecard for every person, and the map for every team.", { x: 0.6, y: 6.35, w: 12.1, h: 0.5, fontFace: SERIF, fontSize: 20, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 6);

// ---------- S5 the measurement problem (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "06 · the measurement problem");
title(s, "Developers misjudge their own AI productivity by about 40 points.", { fontSize: 31 });
s.addText("+20%", { x: 0.9, y: 1.95, w: 5.6, h: 2.0, fontFace: SERIF, fontSize: 120, color: SAGE, align: "center", margin: 0 });
s.addText("how much faster developers believed AI made them", { x: 1.15, y: 4.1, w: 5.1, h: 0.75, fontFace: SANS, fontSize: 14, color: MUTE, align: "center", margin: 0 });
s.addText("-19%", { x: 6.9, y: 1.95, w: 5.6, h: 2.0, fontFace: SERIF, fontSize: 120, color: INK, align: "center", margin: 0 });
s.addText("how much slower they actually were", { x: 7.15, y: 4.1, w: 5.1, h: 0.75, fontFace: SANS, fontSize: 14, color: MUTE, align: "center", margin: 0 });
s.addShape(p.ShapeType.line, { x: 6.66, y: 2.3, w: 0, h: 2.3, line: { color: BEIGE, width: 1.5 } });
s.addText("Randomized trial, 246 real tasks (METR, 2025)", { x: 0.6, y: 5.15, w: 12.1, h: 0.35, fontFace: SANS, fontSize: 11.5, color: MUTE, align: "center", margin: 0 });
s.addText("Every adoption survey in your portfolio carries this same gap. Placing people on the ladder requires watching them work.", { x: 1.3, y: 5.85, w: 10.7, h: 0.85, fontFace: SANS, fontSize: 16.5, bold: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 7);

// ---------- S6 how we measure (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "07 · how we measure");
title(s, "We measure capability by observing days of real work.");

const msteps = [
  ["Observability agents sit in the coding sessions", "Coding sessions only - never the rest of the laptop. Announced, approved, zero engineer hours lost."],
  ["They record how work happens", "Engineering leads decide what gets measured for each role - which tasks go to agents, whether checkpoints and engineered context were applied, how results get verified."],
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
pageNum(s, 8);

// ---------- S7 what you get (cream2) ----------
s = p.addSlide();
s.background = { color: CREAM2 };
chip(s, "08 · what you get");
title(s, "Every person's level comes with the evidence behind it.", { fontSize: 31 });
// big card
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 1.55, w: 12.15, h: 5.1, fill: { color: WHITE }, line: { color: BEIGE, width: 1 }, rectRadius: 0.1, shadow: { type: "outer", color: "1C1A16", opacity: 0.1, blur: 8, offset: 3, angle: 90 } });
// header
s.addText("A. Mehta", { x: 1.0, y: 1.78, w: 3.4, h: 0.5, fontFace: SERIF, fontSize: 26, color: INK, margin: 0 });
s.addText("Integrations engineer · Portco A · assessed 12 Jun", { x: 1.0, y: 2.31, w: 4.6, h: 0.3, fontFace: SANS, fontSize: 10.5, color: MUTE, margin: 0 });
// ladder strip L0..L5
const lvls = ["L1","L2","L3","L4","L5"];
lvls.forEach((l, i) => {
  const lx = 5.9 + i * 0.78;
  const active = i <= 1;
  s.addShape(p.ShapeType.roundRect, { x: lx, y: 1.88, w: 0.68, h: 0.5, fill: { color: active ? FOREST : CREAM2 }, line: { color: active ? FOREST : BEIGE, width: 1 }, rectRadius: 0.06 });
  s.addText(l, { x: lx, y: 1.88, w: 0.68, h: 0.5, fontFace: SANS, fontSize: 12, bold: true, color: active ? CREAM : MUTE, align: "center", valign: "middle", margin: 0 });
});
s.addText([
  { text: "operates at L2", options: { bold: true, color: FOREST } },
  { text: " - agent-native, context-naive; drives the tool like a chat window", options: { color: MUTE } },
], { x: 5.9, y: 2.45, w: 5.6, h: 0.3, fontFace: SANS, fontSize: 11, margin: 0 });
// dimension bars
const dims = [["Context",2],["Spec quality",2],["Tests-first",1],["Diff review",3],["Fan-out",1],["Judgment",4]];
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
  "“one-shot prompt, then merged the diff unread”",
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
  { text: "build the instructions file  ·  supply files on purpose  ·  write the spec before prompting", options: { color: INK } },
], { x: 1.25, y: 5.95, w: 10.9, h: 0.52, fontFace: SANS, fontSize: 12, valign: "middle", margin: 0 });
s.addText("A growth map, never a report card.", { x: 0.6, y: 6.85, w: 12.1, h: 0.42, fontFace: SERIF, fontSize: 17, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 9);

// ---------- S8 the path (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "09 · the path");
title(s, "Three moves take a portco from baseline to proven capability gains.", { fontSize: 31 });
const moves = [
  ["Measure", "2-3 weeks, one portco: capability map, readiness scorecard, sequenced 100-day plan.", true],
  ["Move the levels", "12-week cohorts by assessed level - skills like checkpoints and context engineering, drilled on the team's real tickets inside the live workflow.", false],
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
  { text: "Only what's measured improves:   ", options: { bold: true, color: FOREST } },
  { text: "hand-corrected agent output ↓  +  agent-authored share ↑", options: { color: INK } },
  { text: "    →    ", options: { color: MUTE } },
  { text: "cycle time on comparable tickets ↓", options: { color: INK } },
  { text: "    →    ", options: { color: MUTE } },
  { text: "capacity per head ↑", options: { bold: true, color: FOREST } },
], { x: 0.95, y: 5.3, w: 11.45, h: 0.5, fontFace: SANS, fontSize: 12.5, valign: "middle", margin: 0 });
s.addText("An ugly baseline seen now is pre-diligence on your terms.", { x: 0.6, y: 6.35, w: 12.1, h: 0.5, fontFace: SERIF, fontSize: 20, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 10);

// ---------- S9 why us (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "10 · why us");
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
  { text: "a frontier AI lab · a vertical AI company · 3 YC-backed AI cos", options: { bold: true, color: INK } },
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
pageNum(s, 11);

// ---------- S10 offer (forest) ----------
s = p.addSlide();
s.background = { color: FOREST };
chip(s, "start here", true);
s.addText("Start with one portco - $1,000 a seat, results in three weeks.", { x: 0.6, y: 0.72, w: 12.1, h: 0.85, fontFace: SERIF, fontSize: 34, color: CREAM, margin: 0 });

// left: what you get
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 1.75, w: 6.3, h: 3.6, fill: { color: FOREST_DK }, line: { color: SAGE, width: 0.75 }, rectRadius: 0.1 });
s.addText("WHAT YOU GET", { x: 0.95, y: 1.95, w: 4, h: 0.3, fontFace: SANS, fontSize: 10, color: SAGE, charSpacing: 2.5, margin: 0 });
const gets = [
  ["A level scorecard for every person", "with the observed evidence behind it"],
  ["The team map by function", "where the whole portco sits, L1-L5"],
  ["The leak map", "where value per token is being lost, task by task"],
  ["A sequenced 100-day plan", "what to fix first - people or infrastructure"],
];
gets.forEach((g, i) => {
  const y = 2.33 + i * 0.62;
  s.addText([
    { text: g[0], options: { bold: true, fontSize: 13, color: CREAM, breakLine: true } },
    { text: g[1], options: { fontSize: 10.5, color: SAGE_LT } },
  ], { x: 0.95, y, w: 5.7, h: 0.58, fontFace: SANS, margin: 0, lineSpacingMultiple: 1.02 });
});
s.addShape(p.ShapeType.line, { x: 0.95, y: 4.88, w: 5.6, h: 0, line: { color: SAGE, width: 0.75 } });
s.addText([
  { text: "TYPICAL RUN   ", options: { fontSize: 9.5, color: SAGE, charSpacing: 2 } },
  { text: "30-40 seats · $30-40k · fund or portco budget", options: { fontSize: 12, color: CREAM } },
], { x: 0.95, y: 4.98, w: 5.7, h: 0.32, fontFace: SANS, valign: "middle", margin: 0 });

// right: chevrons
s.addText("THEN, IF IT EARNS IT", { x: 7.35, y: 1.95, w: 4, h: 0.3, fontFace: SANS, fontSize: 10, color: SAGE, charSpacing: 2.5, margin: 0 });
const chev = ["one portco", "portfolio dashboard", "upskilling"];
chev.forEach((c, i) => {
  const y = 2.33 + i * 0.86;
  s.addShape(p.ShapeType.roundRect, { x: 7.35 + i * 0.5, y, w: 4.5, h: 0.72, fill: { color: i === 0 ? SAGE_LT : (i === 1 ? SAGE : CREAM) }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText(c, { x: 7.35 + i * 0.5, y, w: 4.5, h: 0.72, fontFace: SANS, fontSize: 14, bold: true, color: FOREST, align: "center", valign: "middle", margin: 0 });
});
s.addText("Start where engineering cost is the thesis.", { x: 7.35, y: 5.0, w: 5.2, h: 0.35, fontFace: SANS, fontSize: 12, italic: true, color: SAGE_LT, margin: 0 });

// IC-forwardable line
s.addShape(p.ShapeType.line, { x: 0.9, y: 5.62, w: 0, h: 0.95, line: { color: SAGE, width: 2 } });
s.addText("THE LINE TO FORWARD TO YOUR IC", { x: 1.2, y: 5.58, w: 6, h: 0.26, fontFace: SANS, fontSize: 9.5, color: SAGE, charSpacing: 2.5, margin: 0 });
s.addText("“For $40k and three weeks we get a measured answer on whether [portco]'s AI spend is building capability or shelfware - before a buyer's diligence team asks.”", { x: 1.2, y: 5.88, w: 11.3, h: 0.72, fontFace: SERIF, fontSize: 17, italic: true, color: CREAM, margin: 0 });

s.addText([
  { text: "30 mins to scope it. We'll bring the instrument.", options: { bold: true, fontSize: 14, color: SAGE_LT } },
  { text: "      Pulkit Walia · laoh.ai", options: { fontSize: 11.5, color: SAGE } },
], { x: 0.6, y: 6.88, w: 12.1, h: 0.4, fontFace: SANS, align: "center", valign: "middle", margin: 0 });

// ---------- Backup: team map (cream) ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "backup · the team map");
title(s, "Person scorecards roll up into a team map by function.", { fontSize: 31 });

const lvlCols = ["L1", "L2", "L3", "L4", "L5"];
const colX0 = 2.85, tmColW = 1.92;
lvlCols.forEach((l, i) => {
  s.addText(l, { x: colX0 + i * tmColW, y: 1.78, w: tmColW, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: MUTE, align: "center", margin: 0 });
});
const teams = [
  ["Backend", 12, [2, 7, 3, 0, 0]],
  ["Frontend", 8, [1, 5, 2, 0, 0]],
  ["Platform", 5, [2, 3, 0, 0, 0]],
  ["Data", 6, [1, 3, 2, 0, 0]],
];
teams.forEach((t, r) => {
  const y = 2.15 + r * 0.97;
  s.addText([
    { text: t[0], options: { bold: true, fontSize: 14, color: INK, breakLine: true } },
    { text: t[1] + " engineers", options: { fontSize: 10.5, color: MUTE } },
  ], { x: 0.6, y, w: 2.1, h: 0.85, fontFace: SANS, valign: "middle", margin: 0 });
  t[2].forEach((n, c) => {
    const cx = colX0 + c * tmColW + 0.08;
    const fill = n === 0 ? CREAM2 : (n <= 2 ? SAGE_LT : (n <= 4 ? SAGE : FOREST));
    s.addShape(p.ShapeType.roundRect, { x: cx, y, w: tmColW - 0.16, h: 0.85, fill: { color: fill }, line: n === 0 ? { color: BEIGE, width: 1 } : { type: "none" }, rectRadius: 0.06 });
    s.addText(n === 0 ? "–" : String(n), { x: cx, y, w: tmColW - 0.16, h: 0.85, fontFace: SANS, fontSize: 16, bold: n > 0, color: n === 0 ? MUTE : (n >= 5 ? CREAM : INK), align: "center", valign: "middle", margin: 0 });
  });
});
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 6.2, w: 12.13, h: 0.85, fill: { color: CREAM2 }, line: { color: BEIGE, width: 1 }, rectRadius: 0.08 });
s.addText([
  { text: "SAMPLE PORTCO   ", options: { fontSize: 8.5, color: MUTE, charSpacing: 2.5 } },
  { text: "The read: ", options: { bold: true, color: FOREST } },
  { text: "most engineers sit at L2 - agent tools adopted, context discipline missing. No one past L3. The 100-day plan starts at the L3 dividing line, backend first.", options: { color: INK } },
], { x: 0.95, y: 6.2, w: 11.45, h: 0.85, fontFace: SANS, fontSize: 12.5, valign: "middle", margin: 0 });
pageNum(s, 13);

p.writeFile({ fileName: "pe-capability-diagnostic-v2.pptx" }).then(() => console.log("done"));
