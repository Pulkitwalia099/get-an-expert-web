const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

// palette - midsesh.com, no orange
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

const W = 13.333;

function chip(s, label, dark) {
  s.addText(label.toUpperCase(), { x: 0.6, y: 0.38, w: 8, h: 0.3, fontFace: SANS, fontSize: 10.5, color: dark ? SAGE : FOREST, charSpacing: 3, bold: true, margin: 0 });
}
function title(s, txt, opts) {
  s.addText(txt, Object.assign({ x: 0.6, y: 0.68, w: 12.1, h: 0.85, fontFace: SERIF, fontSize: 34, color: INK, margin: 0 }, opts || {}));
}
function pageNum(s, n) {
  s.addText(String(n), { x: 12.65, y: 7.05, w: 0.4, h: 0.3, fontFace: SANS, fontSize: 9, color: MUTE, align: "right", margin: 0 });
}

// ---------- S1 cover ----------
let s = p.addSlide();
s.background = { color: FOREST };
s.addText("Laoh", { x: 0.7, y: 0.55, w: 3, h: 0.45, fontFace: SANS, fontSize: 17, color: CREAM, bold: true, margin: 0 });
s.addText([
  { text: "Your portfolio bought AI.", options: { color: CREAM, breakLine: true } },
  { text: "The P&L can't see it.", options: { color: SAGE_LT, italic: true } },
], { x: 0.7, y: 2.15, w: 11.9, h: 2.4, fontFace: SERIF, fontSize: 54, margin: 0, lineSpacingMultiple: 1.05 });
s.addText("A capability diagnostic for mid-market portcos - who can actually use AI, what's blocking them, and what to fix first.", { x: 0.72, y: 4.75, w: 9.2, h: 0.8, fontFace: SANS, fontSize: 15, color: BEIGE, margin: 0 });
s.addText("Pulkit Walia  ·  Rohit Jain  ·  laoh.ai  ·  San Francisco", { x: 0.72, y: 6.75, w: 9, h: 0.35, fontFace: SANS, fontSize: 11, color: SAGE, margin: 0 });

// ---------- S2 deploy plateau ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "01 · the gap");
title(s, "Licenses went out. Value didn't show up.");
s.addChart(p.ChartType.line, [
  { name: "AI tool spend", labels: ["Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8"], values: [10,18,26,35,44,55,66,78] },
  { name: "EBITDA impact", labels: ["Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8"], values: [0,1,1,2,2,2,3,3] },
], {
  x: 0.6, y: 1.75, w: 6.7, h: 3.9,
  chartColors: [FOREST, MUTE],
  lineSize: 3, lineSmooth: true, lineDataSymbol: "none",
  showLegend: true, legendPos: "b", legendColor: INK, legendFontSize: 11, legendFontFace: SANS,
  catAxisLabelColor: MUTE, catAxisLabelFontSize: 10, catAxisLabelFontFace: SANS,
  valAxisLabelColor: MUTE, valAxisLabelFontSize: 10, valAxisLabelFontFace: SANS,
  valGridLine: { color: BEIGE, size: 0.5 }, catGridLine: { style: "none" },
  valAxisLineShow: false, serAxisLineShow: false,
});
s.addText([
  { text: "the Deploy plateau", options: { italic: true, bold: true, color: FOREST } },
  { text: " - tools everywhere, operating model unchanged (BCG, 2026)", options: { color: MUTE } },
], { x: 0.6, y: 5.85, w: 6.9, h: 0.6, fontFace: SANS, fontSize: 12.5, margin: 0 });

const sectors = [
  ["Trades roll-ups", "Every add-on is an integration bill. Team capability decides its size."],
  ["Healthcare services", "RCM gains are real - and only measured impact survives diligence (PwC)."],
  ["Tech-enabled services", "Margin is labor arithmetic. Capacity per head is the EBITDA line."],
];
s.addText("WHERE IT LANDS IN YOUR PORTFOLIO", { x: 7.75, y: 1.72, w: 5, h: 0.3, fontFace: SANS, fontSize: 10, color: MUTE, charSpacing: 2.5, margin: 0 });
sectors.forEach((c, i) => {
  const y = 2.12 + i * 1.5;
  s.addShape(p.ShapeType.roundRect, { x: 7.75, y, w: 5.0, h: 1.3, fill: { color: WHITE }, line: { color: BEIGE, width: 1 }, rectRadius: 0.08, shadow: { type: "outer", color: "1C1A16", opacity: 0.08, blur: 6, offset: 2, angle: 90 } });
  s.addText(c[0], { x: 8.0, y: y + 0.14, w: 4.5, h: 0.35, fontFace: SANS, fontSize: 13.5, bold: true, color: FOREST, margin: 0 });
  s.addText(c[1], { x: 8.0, y: y + 0.5, w: 4.55, h: 0.7, fontFace: SANS, fontSize: 11.5, color: INK, margin: 0 });
});
pageNum(s, 2);

// ---------- S3 METR ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "02 · the blind spot");
title(s, "Every adoption report you've seen is noise.");
s.addText("+20%", { x: 0.9, y: 1.9, w: 5.6, h: 2.0, fontFace: SERIF, fontSize: 120, color: SAGE, align: "center", margin: 0 });
s.addText("how much faster developers believed AI made them", { x: 1.15, y: 4.05, w: 5.1, h: 0.75, fontFace: SANS, fontSize: 14, color: MUTE, align: "center", margin: 0 });
s.addText("-19%", { x: 6.9, y: 1.9, w: 5.6, h: 2.0, fontFace: SERIF, fontSize: 120, color: INK, align: "center", margin: 0 });
s.addText("how much slower they actually were - randomized trial, 246 real tasks (METR, 2025)", { x: 7.15, y: 4.05, w: 5.1, h: 0.75, fontFace: SANS, fontSize: 14, color: MUTE, align: "center", margin: 0 });
s.addShape(p.ShapeType.line, { x: 6.66, y: 2.25, w: 0, h: 2.3, line: { color: BEIGE, width: 1.5 } });
s.addText("You can't survey your way to this number. You have to watch people work.", { x: 0.6, y: 5.6, w: 12.1, h: 0.6, fontFace: SANS, fontSize: 17, bold: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 3);

// ---------- S4 quadrant ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "03 · the second blocker");
title(s, "Skill is not the whole story. The org gates it.");
// plot area
const qx = 0.95, qy = 1.8, qw = 6.4, qh = 4.4;
// value quadrant tint (top-right)
s.addShape(p.ShapeType.rect, { x: qx + qw/2, y: qy, w: qw/2, h: qh/2, fill: { color: SAGE_LT, transparency: 70 }, line: { type: "none" } });
// axes
s.addShape(p.ShapeType.line, { x: qx, y: qy, w: 0, h: qh, line: { color: INK, width: 1.75 } });
s.addShape(p.ShapeType.line, { x: qx, y: qy + qh, w: qw, h: 0, line: { color: INK, width: 1.75 } });
// mid gridlines
s.addShape(p.ShapeType.line, { x: qx + qw/2, y: qy, w: 0, h: qh, line: { color: BEIGE, width: 1, dashType: "dash" } });
s.addShape(p.ShapeType.line, { x: qx, y: qy + qh/2, w: qw, h: 0, line: { color: BEIGE, width: 1, dashType: "dash" } });
// axis labels
s.addText("org readiness  →", { x: qx, y: qy + qh + 0.12, w: qw, h: 0.3, fontFace: SANS, fontSize: 11.5, color: INK, align: "center", margin: 0 });
s.addText("people capability  →", { x: qx - 2.95, y: qy + qh/2 - 0.16, w: 5.2, h: 0.32, fontFace: SANS, fontSize: 11.5, color: INK, align: "center", rotate: 270, margin: 0 });
// dot cloud bottom-left
const dots = [[0.55,3.55],[0.85,3.85],[1.15,3.5],[0.7,3.15],[1.45,3.8],[1.1,3.05],[1.7,3.45],[0.5,3.0],[1.5,3.15],[2.0,3.7],[1.9,3.05],[0.95,2.72]];
dots.forEach(d => s.addShape(p.ShapeType.ellipse, { x: qx + d[0], y: qy + d[1] - 0.4, w: 0.16, h: 0.16, fill: { color: FOREST }, line: { type: "none" } }));
s.addText("most portcos today", { x: qx + 0.35, y: qy + qh - 0.52, w: 2.6, h: 0.3, fontFace: SANS, fontSize: 10.5, italic: true, color: FOREST, margin: 0 });
// failure mode labels
s.addText('"AI-native hires,\nnothing changed"', { x: qx + 0.18, y: qy + 0.25, w: 2.6, h: 0.75, fontFace: SANS, fontSize: 11, italic: true, color: MUTE, margin: 0 });
s.addText('"platform ready,\nnobody uses it"', { x: qx + qw - 2.55, y: qy + qh - 1.35, w: 2.4, h: 0.75, fontFace: SANS, fontSize: 11, italic: true, color: MUTE, align: "right", margin: 0 });
// value dot
s.addShape(p.ShapeType.ellipse, { x: qx + qw - 1.25, y: qy + 0.62, w: 0.24, h: 0.24, fill: { color: FOREST }, line: { color: CREAM, width: 1.5 } });
s.addText("value", { x: qx + qw - 1.62, y: qy + 0.92, w: 1.0, h: 0.3, fontFace: SANS, fontSize: 11.5, bold: true, color: FOREST, align: "center", margin: 0 });
// right column
s.addText("AI amplifies what's already there.", { x: 8.05, y: 2.0, w: 4.7, h: 0.95, fontFace: SERIF, fontSize: 26, color: INK, margin: 0 });
s.addText("Google DORA, ~5,000 professionals: returns hinge on org capability - data, platforms, policy - not tool adoption.", { x: 8.05, y: 3.1, w: 4.6, h: 1.0, fontFace: SANS, fontSize: 13, color: MUTE, margin: 0 });
s.addText([
  { text: "So we score both. ", options: { bold: true, color: FOREST } },
  { text: "Every person on a six-level ladder. Every portco on a five-dimension readiness scorecard.", options: { color: INK } },
], { x: 8.05, y: 4.35, w: 4.6, h: 1.2, fontFace: SANS, fontSize: 14, margin: 0 });
pageNum(s, 4);

// ---------- S5 instrument ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "04 · the instrument");
title(s, "We measure it. Live, in simulation.");
const steps = [
  ["A simulation, not a survey", "90-120 min observed work session, role-matched. Same method we use to screen FDEs for frontier labs - the sim is the job, nowhere to fake it."],
  ["Two scores", "Each person: a level, with evidence. Each portco: a readiness scorecard - what the org itself blocks."],
  ["A sequence", "A 100-day plan: what to fix first, people or infrastructure, function by function."],
];
steps.forEach((c, i) => {
  const x = 0.6 + i * 4.28;
  s.addShape(p.ShapeType.roundRect, { x, y: 1.95, w: 3.95, h: 3.4, fill: { color: WHITE }, line: { color: BEIGE, width: 1 }, rectRadius: 0.1, shadow: { type: "outer", color: "1C1A16", opacity: 0.08, blur: 6, offset: 2, angle: 90 } });
  s.addShape(p.ShapeType.ellipse, { x: x + 0.32, y: 2.3, w: 0.58, h: 0.58, fill: { color: FOREST }, line: { type: "none" } });
  s.addText(String(i + 1), { x: x + 0.32, y: 2.3, w: 0.58, h: 0.58, fontFace: SERIF, fontSize: 22, color: CREAM, align: "center", valign: "middle", margin: 0 });
  s.addText(c[0], { x: x + 0.32, y: 3.12, w: 3.35, h: 0.65, fontFace: SANS, fontSize: 16.5, bold: true, color: INK, margin: 0 });
  s.addText(c[1], { x: x + 0.32, y: 3.8, w: 3.35, h: 1.45, fontFace: SANS, fontSize: 12, color: MUTE, margin: 0 });
});
s.addText("Measured impact survives diligence. Claims don't.", { x: 0.6, y: 5.85, w: 12.1, h: 0.55, fontFace: SERIF, fontSize: 20, italic: true, color: FOREST, align: "center", margin: 0 });
pageNum(s, 5);

// ---------- S6 skill report preview ----------
s = p.addSlide();
s.background = { color: CREAM2 };
chip(s, "05 · what you get · the skill report");
title(s, "Every person gets a report like this.", { fontSize: 30 });
// big card
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 1.6, w: 12.15, h: 5.5, fill: { color: WHITE }, line: { color: BEIGE, width: 1 }, rectRadius: 0.1, shadow: { type: "outer", color: "1C1A16", opacity: 0.1, blur: 8, offset: 3, angle: 90 } });
// header
s.addText("A. Mehta", { x: 1.0, y: 1.85, w: 3.4, h: 0.5, fontFace: SERIF, fontSize: 26, color: INK, margin: 0 });
s.addText("Integrations engineer · Portco A · assessed 12 Jun", { x: 1.0, y: 2.38, w: 4.6, h: 0.3, fontFace: SANS, fontSize: 10.5, color: MUTE, margin: 0 });
// ladder strip L0..L5
const lvls = ["L0","L1","L2","L3","L4","L5"];
lvls.forEach((l, i) => {
  const lx = 5.9 + i * 0.78;
  const active = i <= 2;
  s.addShape(p.ShapeType.roundRect, { x: lx, y: 1.95, w: 0.68, h: 0.5, fill: { color: active ? FOREST : CREAM2 }, line: { color: active ? FOREST : BEIGE, width: 1 }, rectRadius: 0.06 });
  s.addText(l, { x: lx, y: 1.95, w: 0.68, h: 0.5, fontFace: SANS, fontSize: 12, bold: true, color: active ? CREAM : MUTE, align: "center", valign: "middle", margin: 0 });
});
s.addText([
  { text: "operates at L2", options: { bold: true, color: FOREST } },
  { text: " - pairs with AI, still reviews every line", options: { color: MUTE } },
], { x: 5.9, y: 2.52, w: 5.6, h: 0.3, fontFace: SANS, fontSize: 11, margin: 0 });
// dimension bars
const dims = [["Delegation",3],["Spec quality",2],["Verification",1],["Context",2],["Orchestration",1],["Judgment",4]];
s.addText("SCORED DIMENSIONS", { x: 1.0, y: 2.95, w: 4, h: 0.28, fontFace: SANS, fontSize: 9.5, color: MUTE, charSpacing: 2.5, margin: 0 });
dims.forEach((d, i) => {
  const y = 3.32 + i * 0.51;
  s.addText(d[0], { x: 1.0, y, w: 1.75, h: 0.32, fontFace: SANS, fontSize: 11.5, color: INK, margin: 0, valign: "middle" });
  s.addShape(p.ShapeType.roundRect, { x: 2.85, y: y + 0.055, w: 3.1, h: 0.2, fill: { color: CREAM2 }, line: { color: BEIGE, width: 0.75 }, rectRadius: 0.05 });
  s.addShape(p.ShapeType.roundRect, { x: 2.85, y: y + 0.055, w: Math.max(0.35, 3.1 * d[1] / 5), h: 0.2, fill: { color: d[1] >= 3 ? FOREST : SAGE }, line: { type: "none" }, rectRadius: 0.05 });
  s.addText(d[1] + "/5", { x: 6.05, y, w: 0.6, h: 0.32, fontFace: SANS, fontSize: 10.5, color: MUTE, margin: 0, valign: "middle" });
});
// evidence column
s.addText("WHAT WE SAW", { x: 7.35, y: 2.95, w: 4, h: 0.28, fontFace: SANS, fontSize: 9.5, color: MUTE, charSpacing: 2.5, margin: 0 });
const ev = [
  '"hand-edited 40% of the agent\'s output"',
  '"ran the code once and called it verified"',
  '"knew exactly when not to use the agent - strongest signal"',
];
ev.forEach((e, i) => {
  s.addText(e, { x: 7.35, y: 3.32 + i * 0.78, w: 4.95, h: 0.7, fontFace: SERIF, fontSize: 14.5, italic: true, color: INK, margin: 0 });
});
// path strip
s.addShape(p.ShapeType.roundRect, { x: 1.0, y: 6.35, w: 11.3, h: 0.52, fill: { color: SAGE_LT, transparency: 55 }, line: { type: "none" }, rectRadius: 0.08 });
s.addText([
  { text: "path to L3:  ", options: { bold: true, color: FOREST } },
  { text: "run parallel sessions  ·  stop hand-editing output  ·  build the repo context file", options: { color: INK } },
], { x: 1.25, y: 6.35, w: 10.9, h: 0.52, fontFace: SANS, fontSize: 12, valign: "middle", margin: 0 });
pageNum(s, 6);

// ---------- S7 monitoring preview ----------
s = p.addSlide();
s.background = { color: CREAM2 };
chip(s, "06 · what you get · the monitoring view");
title(s, "Then you watch it move.", { fontSize: 30 });
const wk = Array.from({length:12}, (_,i)=>"w"+(i+1));
s.addChart(p.ChartType.line, [
  { name: "work agent-authored, %", labels: wk, values: [12,14,15,19,22,27,30,34,38,41,45,48] },
  { name: "hand edits on agent output, %", labels: wk, values: [41,40,38,35,31,28,24,20,17,15,13,12] },
], {
  x: 0.6, y: 1.75, w: 7.1, h: 4.3,
  chartColors: [FOREST, SAGE],
  lineSize: 3, lineSmooth: true, lineDataSymbol: "none",
  showLegend: true, legendPos: "b", legendColor: INK, legendFontSize: 11, legendFontFace: SANS,
  catAxisLabelColor: MUTE, catAxisLabelFontSize: 9.5, catAxisLabelFontFace: SANS,
  valAxisLabelColor: MUTE, valAxisLabelFontSize: 10, valAxisLabelFontFace: SANS,
  valGridLine: { color: BEIGE, size: 0.5 }, catGridLine: { style: "none" },
});
s.addShape(p.ShapeType.roundRect, { x: 5.35, y: 2.0, w: 1.85, h: 0.45, fill: { color: FOREST }, line: { type: "none" }, rectRadius: 0.08 });
s.addText("L2 → L3 · week 9", { x: 5.35, y: 2.0, w: 1.85, h: 0.45, fontFace: SANS, fontSize: 11, bold: true, color: CREAM, align: "center", valign: "middle", margin: 0 });
const tiles = [
  ["41% → 12%", "hand edits on agent output"],
  ["0 → 3", "repo context files maintained"],
  ["1 → 2.4", "parallel agent sessions, avg"],
];
tiles.forEach((t, i) => {
  const y = 1.85 + i * 1.42;
  s.addShape(p.ShapeType.roundRect, { x: 8.1, y, w: 4.6, h: 1.22, fill: { color: WHITE }, line: { color: BEIGE, width: 1 }, rectRadius: 0.08, shadow: { type: "outer", color: "1C1A16", opacity: 0.08, blur: 6, offset: 2, angle: 90 } });
  s.addText(t[0], { x: 8.4, y: y + 0.12, w: 4.0, h: 0.55, fontFace: SERIF, fontSize: 26, color: FOREST, margin: 0 });
  s.addText(t[1], { x: 8.4, y: y + 0.72, w: 4.0, h: 0.35, fontFace: SANS, fontSize: 11, color: MUTE, margin: 0 });
});
s.addText("Telemetry corroborates. The quarterly simulation confirms. Both numbers go to your IC.", { x: 0.6, y: 6.4, w: 12.1, h: 0.5, fontFace: SANS, fontSize: 13.5, color: INK, align: "center", margin: 0 });
pageNum(s, 7);

// ---------- S8 why us ----------
s = p.addSlide();
s.background = { color: CREAM };
chip(s, "07 · why us");
title(s, "We've watched deployment fail from the other side.");
const flow = [
  ["Frontier labs deploy FDEs", "into companies like your portcos"],
  ["Deployment lands", "absorption doesn't - and nobody on that side is paid to fix it"],
  ["We assess the absorbers", "the same instrument, pointed at your teams"],
];
flow.forEach((f, i) => {
  const x = 0.6 + i * 4.35;
  const last = i === 2;
  s.addShape(p.ShapeType.roundRect, { x, y: 1.95, w: 3.75, h: 1.75, fill: { color: last ? FOREST : WHITE }, line: { color: last ? FOREST : BEIGE, width: 1 }, rectRadius: 0.1, shadow: { type: "outer", color: "1C1A16", opacity: 0.08, blur: 6, offset: 2, angle: 90 } });
  s.addText(f[0], { x: x + 0.28, y: 2.18, w: 3.25, h: 0.5, fontFace: SANS, fontSize: 15.5, bold: true, color: last ? CREAM : INK, margin: 0 });
  s.addText(f[1], { x: x + 0.28, y: 2.72, w: 3.25, h: 0.8, fontFace: SANS, fontSize: 11.5, color: last ? SAGE_LT : MUTE, margin: 0 });
  if (i < 2) s.addText("→", { x: x + 3.78, y: 2.5, w: 0.55, h: 0.6, fontFace: SANS, fontSize: 26, color: FOREST, align: "center", margin: 0 });
});
s.addText([
  { text: "We screen forward deployed engineers for  ", options: { color: MUTE } },
  { text: "ElevenLabs · Retell · +3 YC-backed AI cos", options: { bold: true, color: INK } },
], { x: 0.6, y: 4.15, w: 12.1, h: 0.45, fontFace: SANS, fontSize: 15, align: "center", margin: 0 });
// cred cards
const cred = [
  ["$0 → $3B IPO", "assessment + skilling systems behind Urban Company - built in exactly your sectors", "Pulkit Walia · HBS"],
  ["25,000+ engineers", "trained for big-tech loops · hundreds of interviews run from the other side of the table", "Rohit Jain · Amazon, Square"],
];
cred.forEach((c, i) => {
  const x = 1.7 + i * 5.2;
  s.addShape(p.ShapeType.roundRect, { x, y: 4.85, w: 4.75, h: 1.85, fill: { color: WHITE }, line: { color: BEIGE, width: 1 }, rectRadius: 0.1, shadow: { type: "outer", color: "1C1A16", opacity: 0.08, blur: 6, offset: 2, angle: 90 } });
  s.addText(c[0], { x: x + 0.3, y: 5.02, w: 4.15, h: 0.5, fontFace: SERIF, fontSize: 24, color: FOREST, margin: 0 });
  s.addText(c[1], { x: x + 0.3, y: 5.57, w: 4.15, h: 0.68, fontFace: SANS, fontSize: 11.5, color: INK, margin: 0 });
  s.addText(c[2], { x: x + 0.3, y: 6.3, w: 4.15, h: 0.3, fontFace: SANS, fontSize: 10, color: MUTE, margin: 0 });
});
pageNum(s, 8);

// ---------- S9 offer ----------
s = p.addSlide();
s.background = { color: FOREST };
chip(s, "08 · start here", true);
s.addText("Start with one portco. $1,000 a seat.", { x: 0.6, y: 0.75, w: 12.1, h: 0.9, fontFace: SERIF, fontSize: 38, color: CREAM, margin: 0 });
// left: what you get
s.addShape(p.ShapeType.roundRect, { x: 0.6, y: 2.0, w: 5.7, h: 3.6, fill: { color: FOREST_DK }, line: { color: SAGE, width: 0.75 }, rectRadius: 0.1 });
s.addText("WHAT YOU GET", { x: 0.95, y: 2.25, w: 4, h: 0.3, fontFace: SANS, fontSize: 10, color: SAGE, charSpacing: 2.5, margin: 0 });
const gets = ["2-3 weeks, one portco, remote or on site", "level map by function - with evidence", "org readiness scorecard", "sequenced 100-day fix-first plan"];
gets.forEach((g, i) => {
  s.addText([{ text: g }], { x: 0.95, y: 2.68 + i * 0.68, w: 5.1, h: 0.55, fontFace: SANS, fontSize: 14.5, color: CREAM, bullet: { characterCode: "2013", indent: 18 }, margin: 0 });
});
// right: chevrons
s.addText("THEN, IF IT EARNS IT", { x: 7.0, y: 2.25, w: 4, h: 0.3, fontFace: SANS, fontSize: 10, color: SAGE, charSpacing: 2.5, margin: 0 });
const chev = ["one portco", "portfolio dashboard", "upskilling / deal diligence"];
chev.forEach((c, i) => {
  const y = 2.68 + i * 1.0;
  s.addShape(p.ShapeType.roundRect, { x: 7.0 + i * 0.55, y, w: 4.6, h: 0.78, fill: { color: i === 0 ? SAGE_LT : (i === 1 ? SAGE : CREAM) }, line: { type: "none" }, rectRadius: 0.1 });
  s.addText(c, { x: 7.0 + i * 0.55, y, w: 4.6, h: 0.78, fontFace: SANS, fontSize: 14.5, bold: true, color: FOREST, align: "center", valign: "middle", margin: 0 });
});
s.addText("30 mins to scope it - no sales, we'll just show you the instrument.", { x: 0.6, y: 6.05, w: 12.1, h: 0.55, fontFace: SERIF, fontSize: 21, italic: true, color: CREAM, align: "center", margin: 0 });
s.addText("Pulkit Walia  ·  laoh.ai", { x: 0.6, y: 6.85, w: 12.1, h: 0.35, fontFace: SANS, fontSize: 12, color: SAGE, align: "center", margin: 0 });

p.writeFile({ fileName: "pe-capability-diagnostic.pptx" }).then(() => console.log("done"));
