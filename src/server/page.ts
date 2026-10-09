import { LAYOUT_JS } from "./layout.ts";

export function pageHtml(token: string): string {
  return PAGE.replace("__LAYOUT__", () => LAYOUT_JS).replace("__TOKEN__", () => JSON.stringify(token).replace(/</g, "\\u003c"));
}

const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Analysis window</title>
<style>
:root {
  --bg: #f4f4f1; --panel: #ffffff; --panel2: #f0f0ec; --ink: #1c1c1e; --dim: #5e5e66; --line: #cfcfc9;
  --accent: #2858c4; --accent-bg: #e6edfb; --ok: #1a7a43; --ok-bg: #e5f4ea; --bad: #b3261e; --bad-bg: #fbe9e7;
  --warn: #8f5800; --warn-bg: #fff1d6; --stale: #7d7d84; --focus: #7a3ff0; --code-bg: #f1f1ee; --shadow: 0 1px 2px rgba(0,0,0,.08);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #121214; --panel: #1b1b1f; --panel2: #232328; --ink: #ececee; --dim: #a2a2ab; --line: #3a3a41;
    --accent: #79a6ff; --accent-bg: #1f2b45; --ok: #5fd28a; --ok-bg: #16301f; --bad: #ff8a7d; --bad-bg: #3b1f1c;
    --warn: #f0b24e; --warn-bg: #3a2c10; --stale: #9a9aa3; --focus: #b794ff; --code-bg: #141417; --shadow: none;
  }
}
:root[data-theme="dark"] {
  --bg: #121214; --panel: #1b1b1f; --panel2: #232328; --ink: #ececee; --dim: #a2a2ab; --line: #3a3a41;
  --accent: #79a6ff; --accent-bg: #1f2b45; --ok: #5fd28a; --ok-bg: #16301f; --bad: #ff8a7d; --bad-bg: #3b1f1c;
  --warn: #f0b24e; --warn-bg: #3a2c10; --stale: #9a9aa3; --focus: #b794ff; --code-bg: #141417; --shadow: none;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
button { font: inherit; color: inherit; }
body { display: flex; flex-direction: column; min-height: 100vh; }
header { padding: 8px 16px; border-bottom: 1px solid var(--line); background: var(--panel); display: flex; gap: 8px 16px; align-items: center; flex-wrap: wrap; }
header h1 { font-size: 15px; margin: 0; }
header .ask { flex: 1; min-width: 200px; color: var(--dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
header .dim { color: var(--dim); font-size: 12px; }
.live { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dim); }
.live i { width: 8px; height: 8px; border-radius: 50%; background: var(--stale); display: inline-block; }
.live.on i { background: var(--ok); }
.live.busy i { background: var(--accent); }
.btn { padding: 4px 10px; min-height: 30px; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); cursor: pointer; }
.btn:hover { background: var(--panel2); }
.btn.primary { border-color: var(--accent); color: var(--accent); font-weight: 600; }
main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 440px; gap: 12px; padding: 12px 16px; height: calc(100vh - 49px); }
section, aside { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; min-width: 0; min-height: 0; display: flex; flex-direction: column; box-shadow: var(--shadow); }
.bar { padding: 8px 12px; border-bottom: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; }
.bar label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; min-height: 28px; }
.bar .count { color: var(--dim); margin-left: auto; font-size: 12px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 6px 12px; border-bottom: 1px solid var(--line); font-size: 12px; color: var(--dim); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.sw { width: 26px; height: 16px; display: inline-block; border: 1.5px solid var(--line); background: var(--panel); }
.sw.ok { border-color: var(--ok); border-radius: 6px; }
.sw.failed { border: 3px solid var(--bad); border-radius: 0; }
.sw.stale { border: 1.5px dotted var(--stale); border-radius: 3px; background: repeating-linear-gradient(135deg, transparent 0 3px, var(--stale) 3px 4px); }
.sw.compare { border: 1.5px dashed var(--accent); border-radius: 6px; }
.sw.waiting { border: 3px double var(--warn); border-radius: 10px; }
#graphwrap { overflow: auto; flex: 1 1 0; min-height: 200px; background: var(--bg); position: relative; }
#canvas { position: relative; }
#canvas > svg { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }
.edge { fill: none; stroke: var(--stale); stroke-width: 1.4; opacity: .75; }
.edge.on { stroke: var(--accent); stroke-width: 2.4; opacity: 1; }
#canvas.has-sel .edge:not(.on) { opacity: .3; }
.group { position: absolute; border: 1.5px dashed var(--accent); border-radius: 12px; background: var(--accent-bg); opacity: .55; pointer-events: none; }
.grouplabel { position: absolute; font-size: 11.5px; font-weight: 600; color: var(--accent); pointer-events: none; white-space: nowrap; }
.looselabel { position: absolute; font-size: 11.5px; font-weight: 600; color: var(--dim); }
.card { position: absolute; width: 224px; height: 84px; padding: 6px 8px 6px 10px; text-align: left; cursor: pointer; background: var(--panel); border: 1.5px solid var(--ok); border-left-width: 6px; border-radius: 10px; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto 1fr; gap: 2px 6px; overflow: hidden; }
.card:hover { background: var(--panel2); }
.card.sel { box-shadow: 0 0 0 3px var(--accent); }
.card .top { grid-column: 1 / -1; display: flex; gap: 6px; align-items: center; min-width: 0; }
.card .st svg { stroke-width: 2.4; }
.card .tool { font: 600 12px/1.2 ui-monospace, Menlo, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card .nid { color: var(--dim); font-size: 11px; }
.card .st { display: inline-flex; align-items: center; font-size: 10.5px; font-weight: 600; white-space: nowrap; }
.card .st svg { width: 14px; height: 14px; }
.card .mid { display: flex; gap: 6px; align-items: center; min-width: 0; }
.card .num { font-size: 26px; font-weight: 700; line-height: 1; letter-spacing: -.02em; flex: none; max-width: 90px; overflow: hidden; text-overflow: ellipsis; }
.card .num.long { font-size: 17px; }
.card .txt { font-size: 11.5px; line-height: 1.25; color: var(--dim); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.card.nonum .txt { color: var(--ink); font-size: 12.5px; }
.card img.thumb { width: 52px; height: 52px; object-fit: cover; border-radius: 4px; border: 1px solid var(--line); align-self: center; grid-row: 2; grid-column: 2; background: var(--code-bg); }
.card.failed { border: 3px solid var(--bad); border-radius: 0; background: var(--bad-bg); }
.card.failed .st { color: var(--bad); }
.card.waiting { border: 4px double var(--warn); border-radius: 22px; background: var(--warn-bg); padding-left: 12px; }
.card.waiting .st { color: var(--warn); }
.card.stale { border: 1.5px dotted var(--stale); border-left: 6px solid var(--warn); border-radius: 4px; background: repeating-linear-gradient(135deg, var(--panel) 0 7px, var(--panel2) 7px 9px); }
.card.stale .num, .card.stale .tool { color: var(--stale); }
.card.stale .st { color: var(--warn); }
.card.compare:not(.stale):not(.failed):not(.waiting) { border-style: dashed; border-color: var(--accent); }
.card.compare.stale { border-style: dashed; }
.card.compare .st.cmp { color: var(--accent); }
.card.ok .st.okst { color: var(--ok); }
#detail { flex: 0 0 auto; max-height: 14vh; overflow: auto; border-top: 1px solid var(--line); padding: 12px 14px; }
section.has-node #detail { flex: 0 0 42%; max-height: none; }
#detail h2 { font-size: 15px; margin: 0 0 6px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
#detail h3 { font-size: 12px; margin: 12px 0 2px; color: var(--dim); text-transform: uppercase; letter-spacing: .04em; }
.result { font-size: 15px; margin: 0 0 4px; }
.badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 0 7px; min-height: 20px; border-radius: 4px; border: 1px solid var(--line); color: var(--dim); white-space: nowrap; background: var(--panel); }
.badge.stale { border: 1px dotted var(--warn); color: var(--warn); }
.badge.compare { border: 1px dashed var(--accent); color: var(--accent); }
.badge.failed { border: 2px solid var(--bad); color: var(--bad); border-radius: 0; }
.badge.waiting { border: 2px double var(--warn); color: var(--warn); border-radius: 10px; }
.badge.ok { border-color: var(--ok); color: var(--ok); border-radius: 8px; }
.badge.error { border: 2px solid var(--bad); color: var(--bad); border-radius: 0; }
.badge.warning { border: 1.5px solid var(--warn); color: var(--warn); }
.badge.info { border: 1px solid var(--accent); color: var(--accent); border-radius: 10px; }
.badge.changed { background: var(--warn-bg); border-color: var(--warn); color: var(--warn); }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--line); vertical-align: top; overflow-wrap: anywhere; }
th { color: var(--dim); font-weight: 600; font-size: 12px; }
tr.changed td:first-child { border-left: 4px solid var(--warn); }
tr.unset td { color: var(--dim); }
ol.route { margin: 4px 0; padding-left: 22px; }
ol.route li { margin: 2px 0; padding-left: 2px; }
.menu { font-weight: 600; margin: 2px 0; }
.warnline { color: var(--warn); margin: 2px 0; }
.code { position: relative; }
pre { margin: 4px 0; padding: 8px 10px; background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px; overflow: auto; max-height: 260px; font: 12px/1.45 ui-monospace, Menlo, monospace; white-space: pre; }
pre.wrap { white-space: pre-wrap; overflow-wrap: anywhere; }
pre.err { border-color: var(--bad); }
.code .btn { position: absolute; right: 6px; top: 8px; min-height: 26px; padding: 1px 8px; font-size: 12px; }
.images { display: flex; flex-wrap: wrap; gap: 8px; }
.images a { display: block; }
.images img { max-width: 100%; width: auto; max-height: 220px; border: 1px solid var(--line); border-radius: 6px; background: var(--code-bg); display: block; }
ul.plain { list-style: none; margin: 0; padding: 0; }
ul.plain li { padding: 2px 0; overflow-wrap: anywhere; }
a { color: var(--accent); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { font: 12px ui-monospace, Menlo, monospace; padding: 0 6px; min-height: 22px; border: 1px solid var(--line); background: var(--panel); border-radius: 4px; cursor: pointer; }
.dim { color: var(--dim); }
.empty { color: var(--dim); margin: 4px 0; }
aside .tabs { display: flex; border-bottom: 1px solid var(--line); }
aside .tabs button { flex: 1; padding: 9px 4px; background: none; border: 0; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--dim); }
aside .tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--accent); }
aside .tabs button:hover { background: var(--panel2); }
aside .tabs .n { display: inline-block; min-width: 18px; padding: 0 5px; margin-left: 4px; border-radius: 9px; background: var(--panel2); font-size: 11px; border: 1px solid var(--line); }
aside .tabs .n.alert { background: var(--warn-bg); border-color: var(--warn); color: var(--warn); }
#sidebody { flex: 1; overflow: auto; padding: 10px 12px; min-height: 0; }
.group-t { margin: 0 0 14px; }
.group-t > h3 { font-size: 13px; margin: 0 0 6px; padding: 6px 8px; background: var(--accent-bg); border-left: 4px solid var(--accent); border-radius: 0 6px 6px 0; overflow-wrap: anywhere; }
.group-t > h3.pre { background: var(--panel2); border-left-color: var(--stale); }
.tl { border-bottom: 1px solid var(--line); }
.tl-main { display: flex; gap: 6px; width: 100%; background: none; border: 0; padding: 5px 4px; text-align: left; cursor: default; align-items: flex-start; }
.tl-main.link { cursor: pointer; }
.tl-main.link:hover { background: var(--panel2); }
.tl .ic { width: 16px; height: 16px; flex: none; margin-top: 2px; fill: var(--accent); }
.tl.failed .ic { fill: var(--bad); }
.tl.deviation .ic, .tl.finding .ic { fill: var(--warn); }
.tl .n { color: var(--dim); min-width: 22px; text-align: right; flex: none; }
.tl .t { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.tl.failed .t { color: var(--bad); }
.tl.stale .t { color: var(--dim); }
.tl .tname { font: 11.5px ui-monospace, Menlo, monospace; color: var(--dim); background: var(--panel2); border-radius: 3px; padding: 0 4px; margin-right: 6px; }
.tl .badges { display: inline-flex; gap: 4px; flex-wrap: wrap; margin-left: 4px; vertical-align: middle; }
.tl details { margin: 0 0 6px 48px; }
.tl summary { cursor: pointer; color: var(--dim); font-size: 12px; }
.answer { border: 2px solid var(--accent); border-radius: 8px; padding: 6px 12px; margin: 8px 0; background: var(--panel); }
.answer p { margin: 4px 0; }
.answer ul, .answer ol { margin: 4px 0; padding-left: 20px; }
.answer h4 { margin: 8px 0 2px; font-size: 13px; }
.answer code, .result code { font: 12px ui-monospace, Menlo, monospace; background: var(--code-bg); padding: 0 3px; border-radius: 3px; }
.qcard { border: 2px solid var(--warn); border-radius: 18px 18px 18px 4px; padding: 10px 12px; margin-bottom: 12px; background: var(--panel); }
.qcard h3 { margin: 0 0 4px; font-size: 14px; }
.qcard .rec { color: var(--ok); font-size: 13px; margin: 4px 0; }
.qcard .opts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.qcard input[type=text] { font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); width: 100%; margin-top: 8px; }
.sev { margin: 0 0 14px; }
.sev > h3 { font-size: 13px; margin: 0 0 6px; display: flex; gap: 8px; align-items: center; }
.finding { border: 1px solid var(--line); border-left: 5px solid var(--accent); border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; }
.finding.error { border-left: 5px solid var(--bad); border-left-style: solid; }
.finding.warning { border-left-color: var(--warn); border-left-style: dashed; }
.finding.info { border-left-color: var(--accent); border-left-style: dotted; }
.finding.closed { opacity: .65; }
.finding p { margin: 0 0 4px; }
@media (max-width: 900px) {
  html, body { height: auto; }
  main { grid-template-columns: minmax(0, 1fr); height: auto; padding: 10px 12px; }
  #graphwrap { max-height: 60vh; flex: none; }
  #detail { max-height: none; flex: none; }
  #sidebody { max-height: 70vh; flex: none; }
}
@media (prefers-reduced-motion: no-preference) { .card, .edge { transition: opacity .15s, box-shadow .15s; } }
</style>
</head>
<body>
<header>
  <h1>Analysis window</h1>
  <span class="ask" id="ask"></span>
  <span class="dim" id="sid"></span>
  <span class="live" id="live"><i></i><span>connecting</span></span>
  <button class="btn" id="theme" type="button">Theme: auto</button>
</header>
<main>
  <section aria-label="Analysis graph">
    <div class="bar" role="group" aria-label="Graph filters">
      <label><input type="checkbox" id="f-compare"> Hide comparison runs</label>
      <label><input type="checkbox" id="f-harness"> Hide harness steps</label>
      <label><input type="checkbox" id="f-stale"> Show only out of date</label>
      <label><input type="checkbox" id="f-housekeeping"> Show housekeeping</label>
      <span class="count" id="count"></span>
    </div>
    <div class="legend" aria-label="Legend">
      <span><i class="sw ok"></i> ok</span>
      <span><i class="sw failed"></i> failed</span>
      <span><i class="sw stale"></i> out of date</span>
      <span><i class="sw compare"></i> comparison run</span>
      <span><i class="sw waiting"></i> waiting for a decision</span>
    </div>
    <div id="graphwrap" tabindex="0" aria-label="Graph of steps"><div id="canvas"></div></div>
    <div id="detail" aria-live="polite"></div>
  </section>
  <aside aria-label="Side panel">
    <div class="tabs" role="tablist" id="tabs"></div>
    <div id="sidebody" role="tabpanel" tabindex="0"></div>
  </aside>
</main>
<script>
const TOKEN = __TOKEN__;
__LAYOUT__
const BOX_W = 224, BOX_H = 84;
const HARNESS = new Set(["plan", "note", "calculate", "task", "load_skill", "find_tools", "ask_scientist", "propose_lab_rule", "propose_change", "compare_options"]);
const TABS = [["trail", "Trail"], ["decisions", "Decisions"], ["questions", "Questions"], ["findings", "Findings"]];
const IMG_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;
const OWNER = { human: "you", agent: "agent", fixed: "fixed" };
const ICON_PATHS = {
  setup: "M12 8a4 4 0 100 8 4 4 0 000-8zm0-6l1.5 3 3.2-.9.9 3.2 3 1.5-1.5 3 1.5 3-3 1.5-.9 3.2-3.2-.9L12 22l-1.5-3-3.2.9-.9-3.2-3-1.5 1.5-3-1.5-3 3-1.5.9-3.2 3.2.9z",
  step: "M7 4l13 8-13 8z",
  decision: "M12 2l10 10-10 10L2 12z",
  question: "M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14h2v2h-2zm1-10a3 3 0 013 3c0 2-3 2-3 4h-2c0-3 3-3 3-4a1 1 0 00-2 0H9a3 3 0 013-3z",
  deviation: "M12 2L1 21h22zm1 15h-2v-2h2zm0-4h-2V9h2z",
  finding: "M5 2v20h2v-8h11l-2-5 2-5H7V2z",
  note: "M4 4h16v12H8l-4 4z",
  failed: "M5 3l7 7 7-7 2 2-7 7 7 7-2 2-7-7-7 7-2-2 7-7-7-7z",
};
const ICON_LABEL = { setup: "Setup", step: "Step", decision: "Decision", question: "Question", deviation: "Deviation", finding: "Finding", note: "Note", failed: "Failed step" };
const STATUS_PATHS = {
  ok: "M4 12.5l5 5 11-11",
  failed: "M5 5l14 14M19 5L5 19",
  stale: "M3 21L21 3M3 13L13 3M11 21L21 11",
  compare: "M4 8h16M4 16h16",
  waiting: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2",
};

let state = null;
let selected = null;
let tab = "trail";
const openLines = new Set();
const params = new URLSearchParams(location.search);
let prefs = { compare: false, harness: false, stale: false, housekeeping: false, theme: "auto" };
try { Object.assign(prefs, JSON.parse(localStorage.getItem("ga.window") || "{}")); } catch (e) {}
if (params.get("theme")) prefs.theme = params.get("theme");
if (params.get("tab")) tab = params.get("tab");
if (params.get("node")) selected = params.get("node");
if (params.get("hide") === "compare") prefs.compare = true;
const savePrefs = () => { try { localStorage.setItem("ga.window", JSON.stringify(prefs)); } catch (e) {} };

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const NS = "http://www.w3.org/2000/svg";
function s(tag, attrs, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  for (const kid of kids) el.append(kid);
  return el;
}
function icon(path, cls, label, stroke) {
  const svg = s("svg", Object.assign({ viewBox: "0 0 24 24", class: cls || "", role: "img", "aria-label": label || "" }, stroke ? { fill: "none", stroke: "currentColor", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" } : {}), s("title", {}, document.createTextNode(label || "")), s("path", { d: path }));
  if (!label) { svg.setAttribute("aria-hidden", "true"); svg.removeAttribute("role"); }
  return svg;
}
const show = (v) => (typeof v === "string" ? v : JSON.stringify(v));
const api = (path) => path + (path.includes("?") ? "&" : "?") + "t=" + encodeURIComponent(TOKEN);
const labelOf = (key) => { const d = state.decisions.find((x) => x.key === key); return d ? d.label : key; };
const nodeById = (id) => state.nodes.find((n) => n.id === id);

function inlineMd(text) {
  const out = [];
  for (const part of text.split(/(\x60[^\x60]+\x60|\*\*[^*]+\*\*)/)) {
    if (!part) continue;
    if (part.startsWith("\x60")) out.push(h("code", {}, part.slice(1, -1)));
    else if (part.startsWith("**")) out.push(h("strong", {}, part.slice(2, -2)));
    else out.push(part);
  }
  return out;
}
function markdown(src) {
  const box = h("div", { class: "md" });
  const lines = String(src).split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.trim().startsWith("\x60\x60\x60")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("\x60\x60\x60")) code.push(lines[i++]);
      i++;
      box.append(h("pre", {}, code.join("\n")));
      continue;
    }
    const head = /^#{1,6}\s+(.*)$/.exec(line);
    if (head) { box.append(h("h4", {}, inlineMd(head[1]))); i++; continue; }
    const li = /^\s*([-*]|\d+\.)\s+/;
    if (li.test(line)) {
      const ordered = /\d/.test(li.exec(line)[1]);
      const list = h(ordered ? "ol" : "ul", {});
      while (i < lines.length && li.test(lines[i])) list.append(h("li", {}, inlineMd(lines[i++].replace(li, ""))));
      box.append(list);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !li.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !lines[i].trim().startsWith("\x60\x60\x60")) para.push(lines[i++]);
    box.append(h("p", {}, inlineMd(para.join(" "))));
  }
  return box;
}

function keyNumber(summary) {
  const m = /(-?\d[\d,]*(?:\.\d+)?)(%?)/.exec(summary || "");
  if (!m) return null;
  const raw = m[1].replace(/,/g, "");
  const v = Number(raw);
  const shown = Number.isFinite(v) && raw.includes(".") ? String(Math.round(v * 1000) / 1000) : m[1];
  return { text: shown + m[2], rest: (summary || "").replace(m[0], "").replace(/\s+/g, " ").trim() };
}

function statusOf(item) {
  if (item.failed) return ["failed"];
  if (item.question) return ["waiting"];
  const out = [];
  if (item.node.waiting) out.push("waiting");
  if (state.stale.includes(item.node.id)) out.push("stale");
  if (item.node.compare) out.push("compare");
  if (!out.length) out.push("ok");
  return out;
}
const STATUS_LABEL = { ok: "ok", failed: "failed", stale: "out of date", compare: "comparison", waiting: "waiting" };

function items() {
  const stale = new Set(state.stale);
  const all = state.nodes.map((n) => ({ id: n.id, compare: n.compare, node: n }));
  const hidden = new Set();
  for (const it of all) {
    const n = it.node;
    if (prefs.compare && n.compare) hidden.add(n.id);
    if (prefs.harness && HARNESS.has(n.tool) && !n.adapter) hidden.add(n.id);
    if (prefs.stale && !stale.has(n.id)) hidden.add(n.id);
  }
  const extra = prefs.stale ? [] : [
    ...state.failed.filter((f) => prefs.housekeeping || !f.housekeeping).map((f) => ({ id: f.id, failed: f })),
    ...state.questions.map((q) => ({ id: "q:" + q.qid, question: q })),
  ];
  const shown = [...all.filter((it) => !hidden.has(it.id)), ...extra];
  return { all, hidden, shown, edges: bridgeEdges(all, state.edges, hidden) };
}

function card(it, pos) {
  const st = statusOf(it);
  const main = st[0];
  const text = it.failed ? it.failed.reason : it.question ? it.question.title : it.node.summary || it.node.tool;
  const tool = it.failed ? it.failed.tool : it.question ? "Decision" : it.node.tool;
  const num = it.failed || it.question ? null : keyNumber(text);
  const cls = ["card", ...st.map((x) => (x === "ok" ? "ok" : x)), num ? "" : "nonum", selected === it.id ? "sel" : ""].filter(Boolean).join(" ");
  const label = it.failed ? "failed step " + tool : it.question ? "open question" : (it.node.step ? "step " + it.node.step : "comparison run " + it.id) + " " + tool;
  const el = h("button", { class: cls, type: "button", style: "left:" + pos.x + "px;top:" + pos.y + "px", "aria-label": label + ", " + st.map((x) => STATUS_LABEL[x]).join(", ") + ". " + text, "aria-pressed": selected === it.id ? "true" : "false" });
  const top = h("span", { class: "top" }, h("span", { class: "tool" }, tool), it.node ? h("span", { class: "nid" }, it.node.step ? "Step " + it.node.step : it.id) : null);
  const tags = main === "ok" ? [["ok", ""]] : st.filter((x) => x !== "ok").map((x) => [x, STATUS_LABEL[x]]);
  tags.slice(0, 3).forEach(([k, t], i) => {
    top.append(h("span", { class: "st" + (k === "compare" ? " cmp" : "") + (k === "ok" ? " okst" : ""), style: i === 0 ? "margin-left:auto" : "", title: t || "ok" }, icon(STATUS_PATHS[k], "", "", true)));
  });
  el.append(top);
  el.append(h("span", { class: "mid" }, num ? h("span", { class: "num" + (num.text.length > 5 ? " long" : "") }, num.text) : null, h("span", { class: "txt" }, num ? num.rest : text)));
  const img = it.node && it.node.images && it.node.images.length ? it.node.images[it.node.images.length - 1] : null;
  if (img) el.append(h("img", { class: "thumb", src: api("/api/blob/" + img), alt: "", loading: "lazy" }));
  el.addEventListener("click", () => {
    if (it.question) { tab = "questions"; selected = null; }
    else selected = it.id;
    render();
  });
  return el;
}

function drawGraph() {
  const wrap = document.getElementById("graphwrap");
  const canvas = document.getElementById("canvas");
  canvas.replaceChildren();
  const view = items();
  document.querySelector("section[aria-label='Analysis graph']").classList.toggle("has-node", !!selected && (!!nodeById(selected) || state.failed.some((x) => x.id === selected)));
  document.getElementById("count").textContent = "Showing " + view.shown.filter((x) => x.node).length + " of " + state.nodes.length + " steps";
  if (!view.shown.length) {
    canvas.style.width = "auto"; canvas.style.height = "auto";
    canvas.append(h("p", { class: "empty", style: "padding:12px" }, state.nodes.length ? "No step matches the filters." : "No steps yet."));
    return;
  }
  const lay = layoutGraph(view.shown, view.edges);
  canvas.style.width = lay.w + "px";
  canvas.style.height = lay.h + "px";
  canvas.classList.toggle("has-sel", !!selected);
  for (const g of lay.groups) {
    canvas.append(h("div", { class: "group", style: "left:" + g.x + "px;top:" + g.y + "px;width:" + g.w + "px;height:" + g.h + "px" }));
    canvas.append(h("div", { class: "grouplabel", style: "left:" + (g.x + 8) + "px;top:" + (g.y + 3) + "px" }, "Comparison of " + labelOf(g.key)));
  }
  if (lay.looseY !== null) canvas.append(h("div", { class: "looselabel", style: "left:" + 16 + "px;top:" + (lay.looseY) + "px" }, "Steps with no link to other steps"));
  const svg = s("svg", { width: lay.w, height: lay.h, "aria-hidden": "true" });
  svg.append(s("defs", {}, s("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0 0L10 5L0 10z", fill: "context-stroke" }))));
  for (const [p, c] of view.edges) {
    const a = lay.pos[p], b = lay.pos[c];
    if (!a || !b) continue;
    const x1 = a.x + BOX_W, y1 = a.y + BOX_H / 2, x2 = b.x, y2 = b.y + BOX_H / 2, mx = (x1 + x2) / 2;
    const on = selected === p || selected === c;
    svg.append(s("path", { class: "edge" + (on ? " on" : ""), d: "M" + x1 + " " + y1 + " C" + mx + " " + y1 + " " + mx + " " + y2 + " " + (x2 - 2) + " " + y2, "marker-end": "url(#arrow)" }));
  }
  canvas.append(svg);
  for (const it of view.shown) if (lay.pos[it.id]) canvas.append(card(it, lay.pos[it.id]));
}

function copyButton(text) {
  const b = h("button", { class: "btn", type: "button" }, "Copy");
  b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(text); b.textContent = "Copied"; }
    catch (e) {
      const ta = h("textarea", { style: "position:fixed;opacity:0" }, text);
      document.body.append(ta); ta.select();
      try { document.execCommand("copy"); b.textContent = "Copied"; } catch (e2) { b.textContent = "Not copied"; }
      ta.remove();
    }
    setTimeout(() => { b.textContent = "Copy"; }, 1500);
  });
  return b;
}
function badge(kind, text) { return h("span", { class: "badge " + kind }, text); }
function chip(id) { return h("button", { class: "chip", type: "button", onclick: () => { selected = id; render(); } }, id); }
function fmtDev(d) {
  if (d.overwritten) return d.arg + ": asked for " + show(d.requested) + ", ran with the recorded " + show(d.setup) + ".";
  return d.arg + ": used " + show(d.used) + ", the setup says " + show(d.setup) + ".";
}
function baseName(p) { return String(p).split("/").pop(); }
function dirName(p) { const parts = String(p).split("/"); return parts.length > 1 ? parts[parts.length - 2] : ""; }

function drawDetail() {
  const box = document.getElementById("detail");
  box.replaceChildren();
  const f = state.failed.find((x) => x.id === selected);
  if (f) {
    box.append(h("h2", {}, f.tool, badge("failed", "failed")), h("p", { class: "result" }, f.reason), h("h3", {}, "Full error"), h("pre", { class: "wrap err" }, f.error));
    return;
  }
  const n = nodeById(selected);
  if (!n) {
    const stale = state.stale.length, cmp = state.nodes.filter((x) => x.compare).length;
    box.append(h("h2", {}, "Step details"), h("p", { class: "empty" }, "Select a step in the graph to see its result, settings, manual route and code."),
      h("p", {}, state.nodes.filter((n) => n.step).length + " steps. ", stale + " out of date. ", cmp + " comparison runs. ", state.failed.length + " failed. ", state.questions.length + " waiting for a decision."));
    return;
  }
  const st = statusOf({ node: n });
  const badges = st.filter((x) => x !== "ok").map((x) => badge(x, STATUS_LABEL[x]));
  box.append(h("h2", {}, n.id + "  " + n.tool, st[0] === "ok" ? badge("ok", "ok") : null, badges));
  box.append(h("p", { class: "result" }, n.summary || n.tool));
  const links = [];
  if (n.parents.length) links.push(h("span", {}, "From ", h("span", { class: "chips", style: "display:inline-flex" }, n.parents.map(chip))));
  const kids = state.edges.filter((e) => e[0] === n.id).map((e) => e[1]);
  if (kids.length) links.push(h("span", {}, "  Used by ", h("span", { class: "chips", style: "display:inline-flex" }, kids.map(chip))));
  if (links.length) box.append(h("p", { class: "dim" }, links));
  if (n.compare) box.append(h("p", { class: "dim" }, "This run compares options for " + labelOf(n.compare) + ". It is not part of the main path."));

  const imgs = [];
  const seen = new Set();
  const addImg = (sha, name) => { if (sha && !seen.has(sha) && imgs.length < 8) { seen.add(sha); imgs.push([sha, name]); } };
  (n.images || []).forEach((sha) => addImg(sha, "Output of " + n.id));
  (n.outputs || []).filter((o) => o.kind === "image" && IMG_EXT.test(o.path)).forEach((o) => addImg(o.sha, o.name || baseName(o.path)));
  if (imgs.length) {
    box.append(h("h3", {}, "Images"));
    box.append(h("div", { class: "images" }, imgs.map(([sha, name]) => h("a", { href: api("/api/blob/" + sha), target: "_blank", rel: "noopener" }, h("img", { src: api("/api/blob/" + sha), alt: name, loading: "lazy" })))));
  }

  const dec = Object.entries(n.decisions || {});
  box.append(h("h3", {}, "Settings used"));
  if (dec.length) {
    const rows = dec.map(([k, v]) => {
      const cur = state.decisions.find((d) => d.key === k);
      const differs = cur && cur.set && show(cur.value) !== show(v);
      return h("tr", { class: differs ? "changed" : "" }, h("td", {}, labelOf(k)), h("td", {}, show(v), differs ? h("div", {}, badge("changed", "now " + show(cur.value))) : null),
        h("td", {}, cur ? (OWNER[cur.owner] || cur.owner) : ""), h("td", {}, cur ? (cur.changed ? cur.changed.by : cur.setBy) : ""));
    });
    box.append(h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Decision"), h("th", {}, "Value"), h("th", {}, "Owner"), h("th", {}, "Set by"))), h("tbody", {}, rows)));
  } else box.append(h("p", { class: "empty" }, "This step used no decisions."));
  const args = Object.entries(n.args || {}).filter(([k]) => k !== "code");
  if (args.length) box.append(h("details", {}, h("summary", { class: "dim" }, "Arguments (" + args.length + ")"), h("table", {}, h("tbody", {}, args.map(([k, v]) => h("tr", {}, h("td", {}, k), h("td", {}, show(v))))))));

  const devs = n.deviations || [];
  if (devs.length) {
    box.append(h("h3", {}, "Deviations"));
    box.append(h("ul", { class: "plain" }, devs.map((d) => h("li", {}, badge("warning", "deviation"), " ", fmtDev(d)))));
  }

  const r = n.route || { menu: "", steps: [], macro: [], warnings: [] };
  box.append(h("h3", {}, "Manual route"));
  if (n.fidelity === "code_only" || n.fidelity === "none" || (!r.menu && !r.steps.length)) box.append(h("p", { class: "empty" }, "This step has no manual route in the program."));
  else {
    box.append(h("div", { class: "menu" }, r.menu));
    if (r.steps.length) box.append(h("ol", { class: "route" }, r.steps.map((x) => h("li", {}, x))));
    r.warnings.forEach((w) => box.append(h("div", { class: "warnline" }, w)));
    if (n.fidelity && n.fidelity !== "exact") box.append(h("p", { class: "dim" }, "Match with the program: " + n.fidelity + "."));
  }
  const code = n.code || (r.macro.length ? r.macro.join("\n") : "");
  if (code) {
    box.append(h("h3", {}, "Macro or code"));
    box.append(h("div", { class: "code" }, copyButton(code), h("pre", { tabindex: "0" }, code)));
  }

  const files = [];
  const fseen = new Set();
  for (const o of n.outputs || []) {
    const key = (o.sha || o.path);
    if (fseen.has(key)) continue;
    fseen.add(key);
    files.push(o);
  }
  if (files.length) {
    box.append(h("h3", {}, "Output files (" + files.length + ")"));
    box.append(h("ul", { class: "plain" }, files.slice(0, 40).map((o) => h("li", {}, o.sha ? h("a", { href: api("/api/blob/" + o.sha), target: "_blank", rel: "noopener" }, baseName(o.path)) : baseName(o.path), h("span", { class: "dim" }, "  " + o.kind + (dirName(o.path) ? " in " + dirName(o.path) : ""))))));
  }
  const metrics = n.result && n.result.metrics ? Object.entries(n.result.metrics) : [];
  if (metrics.length) {
    box.append(h("h3", {}, "Numbers"));
    box.append(h("table", {}, h("tbody", {}, metrics.map(([k, v]) => h("tr", {}, h("td", {}, k), h("td", {}, show(v)))))));
  }
  box.append(h("p", { class: "dim", style: "margin-top:14px" }, [n.adapter, n.adapterVersion && "adapter " + n.adapterVersion, n.programVersion && "program " + n.programVersion, n.model].filter(Boolean).join("  |  ")));
}

function lineBadges(l) {
  const out = [];
  if (l.failed) out.push(badge("failed", "failed"));
  for (const b of l.badges || []) out.push(badge(b === "out of date" ? "stale" : b === "comparison run" ? "compare" : "", b));
  return out;
}

function drawTrail(box) {
  const nodeByEntry = new Map(state.nodes.map((n) => [n.entry, n.id]));
  if (!state.trail.length) { box.append(h("p", { class: "empty" }, "The trail is empty.")); return; }
  const groups = new Map();
  for (const l of state.trail) {
    const g = groups.get(l.group) || { id: l.group, lines: [] };
    groups.set(l.group, g);
    if (l.request) g.request = l; else g.lines.push(l);
  }
  const hasAsks = [...groups.values()].some((g) => g.request);
  for (const g of [...groups.values()].sort((a, b) => a.id - b.id)) {
    if (!g.request && !g.lines.length) continue;
    const sec = h("div", { class: "group-t" });
    sec.append(h("h3", { class: g.request ? "" : "pre" }, g.request ? "You asked: " + show((g.request.details && g.request.details.text) || g.request.line) : hasAsks ? "Before the first request" : "Steps"));
    for (const l of g.lines) {
      if (l.answer) {
        sec.append(h("div", { class: "answer" }, h("div", { class: "dim" }, "Answer"), markdown(show((l.details && l.details.text) || l.line))));
        continue;
      }
      const nid = nodeByEntry.get(l.entry);
      const kind = l.failed ? "failed" : l.icon;
      const main = h(nid ? "button" : "div", { class: "tl-main" + (nid ? " link" : ""), type: nid ? "button" : false, onclick: nid ? () => { selected = nid; render(); } : false },
        icon(ICON_PATHS[kind] || ICON_PATHS.step, "ic", ICON_LABEL[kind] || "Step"), h("span", { class: "n" }, l.step ? "Step " + l.step : ""),
        h("span", { class: "t" }, l.tool ? h("code", { class: "tname" }, l.tool) : null, l.line, h("span", { class: "badges" }, lineBadges(l))));
      const row = h("div", { class: "tl " + kind + (l.stale ? " stale" : "") }, main);
      const err = l.details && l.details.error;
      if (err && String(err).length > l.line.length) {
        const d = h("details", {}, h("summary", {}, "Full error"), h("pre", { class: "wrap err" }, show(err)));
        if (openLines.has(l.entry)) d.open = true;
        d.addEventListener("toggle", () => { d.open ? openLines.add(l.entry) : openLines.delete(l.entry); });
        row.append(d);
      }
      sec.append(row);
    }
    box.append(sec);
  }
}

function drawDecisions(box) {
  if (!state.decisions.length) { box.append(h("p", { class: "empty" }, "No decisions yet.")); return; }
  const rows = state.decisions.map((d) => h("tr", { class: (d.changed ? "changed " : "") + (d.set ? "" : "unset") },
    h("td", {}, d.label, d.changed ? h("div", {}, badge("changed", "changed")) : null),
    h("td", {}, d.set ? show(d.value) : "not set", d.changed ? h("div", { class: "dim" }, "was " + show(d.changed.was) + (d.changed.reason ? ". " + d.changed.reason : "")) : null),
    h("td", {}, OWNER[d.owner] || d.owner),
    h("td", {}, d.setBy)));
  box.append(h("div", { style: "overflow:auto" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Decision"), h("th", {}, "Value"), h("th", {}, "Owner"), h("th", {}, "Set by"))), h("tbody", {}, rows))));
}

async function answer(qid, value) {
  const r = await fetch(api("/api/answer"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ qid, value }) });
  if (!r.ok) alert("The answer was not saved: " + (await r.json()).error);
  await load();
}

function drawQuestions(box) {
  if (!state.questions.length) { box.append(h("p", { class: "empty" }, "No question is waiting for you.")); return; }
  for (const q of state.questions) {
    const card = h("div", { class: "qcard" }, h("h3", {}, badge("waiting", "waiting"), " ", q.title), h("div", {}, q.text));
    if (q.evidence) card.append(h("pre", { class: "wrap" }, q.evidence));
    if (q.recommendation) card.append(h("div", { class: "rec" }, "Recommended: " + q.recommendation.reason));
    const opts = h("div", { class: "opts" });
    q.options.forEach((o, i) => {
      const rec = q.recommendation && JSON.stringify(q.recommendation.value) === JSON.stringify(o.value);
      opts.append(h("button", { class: "btn" + (rec ? " primary" : ""), type: "button", onclick: () => answer(q.qid, o.value) }, (i + 1) + ". " + o.label + (rec ? " (recommended)" : "")));
    });
    card.append(opts);
    const input = h("input", { type: "text", placeholder: "Other answer", "data-qid": q.qid, name: "other-" + q.qid, "aria-label": "Other answer for " + q.title });
    const send = () => input.value.trim() && answer(q.qid, input.value.trim());
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    card.append(input, h("div", { class: "opts" }, h("button", { class: "btn", type: "button", onclick: send }, "Send")));
    box.append(card);
  }
}

function drawFindings(box) {
  if (!state.findings.length) { box.append(h("p", { class: "empty" }, "No findings.")); return; }
  for (const sev of ["error", "warning", "info"]) {
    const list = state.findings.filter((f) => f.severity === sev);
    if (!list.length) continue;
    const sec = h("div", { class: "sev" }, h("h3", {}, badge(sev, sev), list.length + (list.length === 1 ? " finding" : " findings")));
    for (const f of list) {
      const closed = f.status !== "open";
      sec.append(h("div", { class: "finding " + sev + (closed ? " closed" : "") },
        h("p", {}, f.message),
        h("div", { class: "dim" }, [f.check, closed ? "status: " + f.status : "open"].filter(Boolean).join("  |  ")),
        f.nodes.length ? h("div", { class: "chips", style: "margin-top:4px" }, f.nodes.map(chip)) : null));
    }
    box.append(sec);
  }
}

function drawSide() {
  const tabs = document.getElementById("tabs");
  tabs.replaceChildren();
  const open = state.findings.filter((f) => f.status === "open").length;
  const counts = { trail: state.trail.filter((l) => !l.request).length, decisions: state.decisions.filter((d) => d.changed).length, questions: state.questions.length, findings: open };
  const alerts = { questions: counts.questions > 0, findings: state.findings.some((f) => f.status === "open" && f.severity === "error") };
  for (const [id, name] of TABS) {
    const b = h("button", { type: "button", role: "tab", id: "tab-" + id, "aria-selected": tab === id ? "true" : "false", "aria-controls": "sidebody", tabindex: tab === id ? "0" : "-1" },
      name, h("span", { class: "n" + (alerts[id] ? " alert" : "") }, counts[id]));
    b.addEventListener("click", () => { tab = id; render(); });
    b.addEventListener("keydown", (e) => {
      const i = TABS.findIndex((t) => t[0] === tab);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        tab = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
        render();
        document.getElementById("tab-" + tab).focus();
      }
    });
    tabs.append(b);
  }
  const body = document.getElementById("sidebody");
  body.setAttribute("aria-labelledby", "tab-" + tab);
  if (document.activeElement && document.activeElement.tagName === "INPUT" && body.contains(document.activeElement)) return;
  const top = body.scrollTop;
  body.replaceChildren();
  ({ trail: drawTrail, decisions: drawDecisions, questions: drawQuestions, findings: drawFindings })[tab](body);
  body.scrollTop = top;
}

function applyTheme() {
  if (prefs.theme === "light" || prefs.theme === "dark") document.documentElement.setAttribute("data-theme", prefs.theme);
  else document.documentElement.removeAttribute("data-theme");
  document.getElementById("theme").textContent = "Theme: " + prefs.theme;
}

function render() {
  const keep = ["graphwrap", "detail"].map((id) => [id, document.getElementById(id).scrollTop, document.getElementById(id).scrollLeft]);
  document.getElementById("sid").textContent = "session " + state.session;
  document.getElementById("ask").textContent = state.question ? "Question: " + state.question : "";
  document.getElementById("ask").title = state.question;
  document.getElementById("f-compare").checked = prefs.compare;
  document.getElementById("f-harness").checked = prefs.harness;
  document.getElementById("f-stale").checked = prefs.stale;
  document.getElementById("f-housekeeping").checked = prefs.housekeeping;
  applyTheme();
  drawGraph();
  drawDetail();
  drawSide();
  for (const [id, top, left] of keep) { const el = document.getElementById(id); el.scrollTop = top; el.scrollLeft = left; }
  if (!document.body.dataset.first && selected && params.get("node")) {
    document.body.dataset.first = "1";
    const c = document.querySelector(".card.sel");
    if (c) c.scrollIntoView({ block: "center", inline: "center" });
  }
}

async function load() {
  const r = await fetch(api("/api/state"));
  state = await r.json();
  const live = document.getElementById("live");
  if (live.classList.contains("on") || live.classList.contains("busy")) live.classList.toggle("busy", !!state.busy);
  render();
}

for (const [id, key] of [["f-compare", "compare"], ["f-harness", "harness"], ["f-stale", "stale"], ["f-housekeeping", "housekeeping"]]) {
  document.getElementById(id).addEventListener("change", (e) => { prefs[key] = e.target.checked; savePrefs(); render(); });
}
document.getElementById("theme").addEventListener("click", () => {
  prefs.theme = prefs.theme === "auto" ? "light" : prefs.theme === "light" ? "dark" : "auto";
  savePrefs();
  render();
});

let timer = null;
function connect() {
  const es = new EventSource(api("/events"));
  const live = document.getElementById("live");
  const label = live.querySelector("span");
  es.onopen = () => { live.className = "live on"; label.textContent = "live"; };
  es.onerror = () => { live.className = "live"; label.textContent = "reconnecting"; };
  es.onmessage = (m) => {
    const e = JSON.parse(m.data);
    if (e.type === "status") { live.classList.toggle("busy", e.state === "running"); label.textContent = e.state === "running" ? "working" : "live"; return; }
    if (e.type === "delta") return;
    clearTimeout(timer);
    timer = setTimeout(load, 150);
  };
}
load().then(() => { if (params.get("live") !== "0") connect(); });
</script>
</body>
</html>
`;
