export function pageHtml(token: string): string {
  return PAGE.replace("__TOKEN__", JSON.stringify(token).replace(/</g, "\\u003c"));
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Analysis window</title>
<style>
:root {
  --bg: #f7f7f5; --panel: #ffffff; --ink: #1c1c1e; --dim: #6b6b70; --line: #d8d8d4;
  --accent: #2f6fdb; --warn: #b26a00; --bad: #c0392b; --ok: #1f8a4c; --stale: #c9c9c4;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #141416; --panel: #1d1d20; --ink: #ececee; --dim: #9a9aa2; --line: #36363b;
    --accent: #6ea2ff; --warn: #e0a040; --bad: #ff7a6b; --ok: #5fd28a; --stale: #55555b;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, sans-serif; }
header { padding: 10px 16px; border-bottom: 1px solid var(--line); display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
header h1 { font-size: 16px; margin: 0; }
header .dim { color: var(--dim); font-size: 13px; }
main { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; padding: 16px; }
@media (max-width: 800px) { main { grid-template-columns: minmax(0, 1fr); padding: 12px 16px; } }
section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px; min-width: 0; }
h2 { font-size: 14px; margin: 0 0 8px; color: var(--dim); font-weight: 600; text-transform: none; }
#graph { overflow: auto; max-height: 60vh; border: 1px solid var(--line); border-radius: 6px; }
#graph svg { display: block; }
.node rect { fill: var(--panel); stroke: var(--line); stroke-width: 1.2; cursor: pointer; }
.node.sel rect { stroke: var(--accent); stroke-width: 2.4; }
.node.stale rect { fill: url(#hatch); stroke: var(--stale); stroke-dasharray: 4 3; }
.node text { fill: var(--ink); font-size: 12px; pointer-events: none; }
.node text.id { fill: var(--dim); font-size: 11px; }
.edge { fill: none; stroke: var(--dim); stroke-width: 1.3; }
#hatch path { stroke: var(--stale); stroke-width: 1; }
#detail { margin-top: 12px; }
#detail dl { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; }
#detail dt { color: var(--dim); }
#detail dd { margin: 0; overflow-wrap: anywhere; }
#detail img { max-width: 100%; border: 1px solid var(--line); border-radius: 4px; margin-top: 6px; }
.tag { display: inline-block; font-size: 12px; padding: 0 6px; border-radius: 4px; border: 1px solid var(--line); color: var(--dim); }
.tag.stale { color: var(--warn); border-color: var(--warn); }
details.t { border-bottom: 1px solid var(--line); padding: 6px 0; }
details.t summary { cursor: pointer; }
details.t.stale summary { color: var(--warn); }
details.t dl { margin: 6px 0 0 18px; display: grid; grid-template-columns: max-content 1fr; gap: 2px 10px; font-size: 13px; }
details.t dt { color: var(--dim); }
details.t dd { margin: 0; overflow-wrap: anywhere; }
.card { border: 1px solid var(--accent); border-radius: 8px; padding: 10px; margin-bottom: 12px; }
.card h3 { margin: 0 0 4px; font-size: 15px; }
.card pre { white-space: pre-wrap; margin: 6px 0; font: 12px/1.4 ui-monospace, monospace; }
.card .rec { color: var(--ok); font-size: 13px; }
button { font: inherit; padding: 8px 12px; margin: 4px 6px 0 0; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; min-height: 40px; }
button.primary { border-color: var(--accent); }
input[type=text] { font: inherit; padding: 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); width: 100%; margin-top: 6px; }
.empty { color: var(--dim); }
#live { color: var(--ok); }
</style>
</head>
<body>
<header>
  <h1>Analysis window</h1>
  <span class="dim" id="sid"></span>
  <span class="dim" id="live">connecting</span>
</header>
<main>
  <section>
    <h2>Analysis graph</h2>
    <div id="graph"></div>
    <div id="detail"></div>
  </section>
  <section>
    <div id="questions"></div>
    <h2>Audit trail</h2>
    <div id="trail"></div>
  </section>
</main>
<script>
const TOKEN = __TOKEN__;
const BOX_W = 210, BOX_H = 58, GAP_X = 50, GAP_Y = 24, PAD = 16;
let state = null;
let selected = null;
const openLines = new Set();

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const svgNS = "http://www.w3.org/2000/svg";
function s(tag, attrs, ...kids) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  for (const kid of kids) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  return el;
}
const show = (v) => (typeof v === "string" ? v : JSON.stringify(v));
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
const api = (path) => path + (path.includes("?") ? "&" : "?") + "t=" + encodeURIComponent(TOKEN);

function layout(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id));
  const parents = new Map(nodes.map((n) => [n.id, []]));
  for (const [p, c] of edges) if (ids.has(p) && ids.has(c)) parents.get(c).push(p);
  const depth = new Map();
  const visit = (id, seen) => {
    if (depth.has(id)) return depth.get(id);
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parents.get(id);
    const d = ps.length ? 1 + Math.max(...ps.map((p) => visit(p, seen))) : 0;
    depth.set(id, d);
    return d;
  };
  nodes.forEach((n) => visit(n.id, new Set()));
  const rows = new Map();
  const pos = new Map();
  for (const n of nodes) {
    const d = depth.get(n.id);
    const r = rows.get(d) || 0;
    rows.set(d, r + 1);
    pos.set(n.id, { x: PAD + d * (BOX_W + GAP_X), y: PAD + r * (BOX_H + GAP_Y) });
  }
  const w = PAD * 2 + (Math.max(0, ...depth.values()) + 1) * (BOX_W + GAP_X) - GAP_X;
  const hgt = PAD * 2 + Math.max(1, ...rows.values()) * (BOX_H + GAP_Y) - GAP_Y;
  return { pos, w, h: hgt };
}

function drawGraph() {
  const box = document.getElementById("graph");
  box.replaceChildren();
  if (!state.nodes.length) { box.append(h("p", { class: "empty", style: "padding:12px" }, "No steps yet.")); return; }
  const stale = new Set(state.stale);
  const { pos, w, h: hgt } = layout(state.nodes, state.edges);
  const svg = s("svg", { width: w, height: hgt, viewBox: "0 0 " + w + " " + hgt, role: "img", "aria-label": "Analysis graph" });
  const defs = s("defs", {});
  const pat = s("pattern", { id: "hatch", width: 8, height: 8, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, s("path", { d: "M0 0 L0 8" }));
  defs.append(pat);
  svg.append(defs);
  for (const [p, c] of state.edges) {
    const a = pos.get(p), b = pos.get(c);
    if (!a || !b) continue;
    const x1 = a.x + BOX_W, y1 = a.y + BOX_H / 2, x2 = b.x, y2 = b.y + BOX_H / 2, mx = (x1 + x2) / 2;
    svg.append(s("path", { class: "edge", d: "M" + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + x2 + " " + y2 }));
  }
  for (const n of state.nodes) {
    const p = pos.get(n.id);
    const g = s("g", { class: "node" + (stale.has(n.id) ? " stale" : "") + (selected === n.id ? " sel" : ""), transform: "translate(" + p.x + " " + p.y + ")", tabindex: 0, role: "button" });
    g.append(s("rect", { width: BOX_W, height: BOX_H, rx: 6 }));
    g.append(s("text", { class: "id", x: 8, y: 16 }, n.id + (stale.has(n.id) ? "  out of date" : "")));
    g.append(s("text", { x: 8, y: 36 }, clip(n.summary || n.tool, 30)));
    g.append(s("text", { class: "id", x: 8, y: 51 }, clip(n.tool, 30)));
    const pick = () => { selected = n.id; render(); };
    g.addEventListener("click", pick);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") pick(); });
    svg.append(g);
  }
  box.append(svg);
}

function drawDetail() {
  const box = document.getElementById("detail");
  box.replaceChildren();
  const n = state.nodes.find((x) => x.id === selected);
  if (!n) { box.append(h("p", { class: "empty" }, "Click a step to see its details.")); return; }
  const stale = state.stale.includes(n.id);
  const rows = [
    ["Step", n.id + " " + n.tool],
    ["Result", n.summary],
    ["Manual route", n.manualRoute || "none"],
    ["Fidelity", n.fidelity],
    ["Program", n.adapter + " " + n.adapterVersion + " on " + n.programVersion],
    ["Settings", Object.entries(n.args || {}).map(([k, v]) => k + " = " + show(v)).join(", ") || "none"],
    ["Decisions", Object.entries(n.decisions || {}).map(([k, v]) => k + " = " + show(v)).join(", ") || "none"],
  ];
  const dl = h("dl", {});
  for (const [k, v] of rows) dl.append(h("dt", {}, k), h("dd", {}, v));
  box.append(h("h2", {}, "Step details ", stale ? h("span", { class: "tag stale" }, "out of date") : ""), dl);
  for (const sha of n.images || []) box.append(h("img", { src: api("/api/blob/" + sha), alt: "Output of " + n.id }));
}

function drawTrail() {
  const box = document.getElementById("trail");
  box.replaceChildren();
  const icons = { setup: "⚙", step: "●", decision: "✎", question: "?", deviation: "⚠", finding: "⚠", note: "▸" };
  if (!state.trail.length) box.append(h("p", { class: "empty" }, "The trail is empty."));
  for (const l of state.trail) {
    const d = h("details", { class: "t" + (l.stale ? " stale" : "") });
    if (openLines.has(l.entry)) d.open = true;
    d.addEventListener("toggle", () => { d.open ? openLines.add(l.entry) : openLines.delete(l.entry); });
    d.append(h("summary", {}, l.n + ". " + (icons[l.icon] || "▸") + " " + l.line + (l.stale ? "  (out of date)" : "")));
    if (l.details && Object.keys(l.details).length) {
      const dl = h("dl", {});
      for (const [k, v] of Object.entries(l.details)) dl.append(h("dt", {}, k), h("dd", {}, show(v)));
      d.append(dl);
    }
    box.append(d);
  }
}

async function answer(qid, value) {
  const r = await fetch(api("/api/answer"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ qid, value }) });
  if (!r.ok) alert("The answer was not saved: " + (await r.json()).error);
  await load();
}

function drawQuestions() {
  const box = document.getElementById("questions");
  box.replaceChildren();
  const typed = {};
  box.querySelectorAll("input").forEach((i) => (typed[i.dataset.qid] = i.value));
  for (const q of state.questions) {
    const card = h("div", { class: "card" }, h("h3", {}, "Your decision: " + q.title), h("div", {}, q.text));
    if (q.evidence) card.append(h("pre", {}, q.evidence));
    if (q.recommendation) card.append(h("div", { class: "rec" }, "Recommended: " + q.recommendation.reason));
    q.options.forEach((o, i) => {
      const rec = q.recommendation && JSON.stringify(q.recommendation.value) === JSON.stringify(o.value);
      card.append(h("button", { class: rec ? "primary" : "", onclick: () => answer(q.qid, o.value) }, (i + 1) + ". " + o.label + (rec ? " (recommended)" : "")));
    });
    const input = h("input", { type: "text", placeholder: "Other answer", "data-qid": q.qid, name: "other-" + q.qid, "aria-label": "Other answer" });
    const send = () => input.value.trim() && answer(q.qid, input.value.trim());
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    card.append(input, h("button", { onclick: send }, "Send"));
    box.append(card);
  }
}

function render() {
  document.getElementById("sid").textContent = "session " + state.session;
  drawGraph(); drawDetail(); drawTrail();
  if (!document.activeElement || document.activeElement.tagName !== "INPUT") drawQuestions();
}

async function load() {
  const r = await fetch(api("/api/state"));
  state = await r.json();
  render();
}

let timer = null;
function connect() {
  const es = new EventSource(api("/events"));
  const live = document.getElementById("live");
  es.onopen = () => { live.textContent = "live"; };
  es.onerror = () => { live.textContent = "reconnecting"; };
  es.onmessage = (m) => {
    const e = JSON.parse(m.data);
    if (e.type === "delta" || e.type === "status") return;
    clearTimeout(timer);
    timer = setTimeout(load, 150);
  };
}
load().then(connect);
</script>
</body>
</html>
`;
