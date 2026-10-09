export function panelHtml(token: string): string {
  return PAGE.replace("__TOKEN__", JSON.stringify(token).replace(/</g, "\\u003c"));
}

const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Guided analysis</title>
<style>
:root { --bg:#f7f7f5; --panel:#fff; --ink:#1c1c1e; --dim:#6b6b70; --line:#d8d8d4; --accent:#2f6fdb; --ok:#1f8a4c; --bad:#c0392b; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#141416; --panel:#1d1d20; --ink:#ececee; --dim:#9a9aa2; --line:#36363b; --accent:#6ea2ff; --ok:#5fd28a; --bad:#ff7a6b; }
}
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, sans-serif; }
body { display: flex; flex-direction: column; }
#status { padding: 6px 12px; border-bottom: 1px solid var(--line); color: var(--dim); font-size: 13px; display: flex; gap: 8px; align-items: center; }
#status select { font: inherit; background: var(--panel); color: var(--ink); border: 1px solid var(--line); border-radius: 4px; }
#log { flex: 1; overflow-y: auto; padding: 8px 12px; }
.m { margin: 0 0 8px; overflow-wrap: anywhere; white-space: pre-wrap; }
.m.user { color: var(--accent); }
.m.step { color: var(--dim); margin-bottom: 2px; }
.m.step.bad { color: var(--bad); }
.m.route { color: var(--dim); font-size: 12px; margin: 0 0 8px 12px; }
.m.notice { color: var(--dim); font-style: italic; }
.m.error { color: var(--bad); }
#cards { max-height: 45%; overflow-y: auto; padding: 0 12px; }
.card { border: 1px solid var(--accent); border-radius: 8px; padding: 8px 10px; margin: 8px 0; background: var(--panel); }
.card h3 { margin: 0 0 4px; font-size: 14px; }
.card pre { white-space: pre-wrap; margin: 6px 0; font: 12px/1.4 ui-monospace, monospace; overflow-x: auto; }
.rec { color: var(--ok); font-size: 12px; }
button { font: inherit; padding: 6px 12px; margin: 4px 6px 0 0; border-radius: 6px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); cursor: pointer; min-height: 36px; }
button.primary { border-color: var(--accent); }
input[type=text] { font: inherit; padding: 8px; border-radius: 6px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); flex: 1; min-width: 0; }
form { display: flex; gap: 6px; padding: 8px 12px; border-top: 1px solid var(--line); }
form button { margin: 0; }
.card input[type=text] { width: 100%; margin-top: 6px; }
</style>
</head>
<body>
<div id="status"><span id="state">Connecting</span><select id="mode"><option>watch</option><option>follow</option><option>teach</option><option>plan</option></select></div>
<div id="log"></div>
<div id="cards"></div>
<form id="f"><input type="text" id="in" placeholder="Ask the agent" autocomplete="off"><button class="primary">Send</button><button type="button" id="stop">Stop</button></form>
<script>
const T = __TOKEN__;
let since = 0, sig = "";
const $ = (id) => document.getElementById(id);
const api = (path, body) => fetch(path + (path.includes("?") ? "&" : "?") + "t=" + encodeURIComponent(T),
  body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function line(cls, text) { $("log").append(el("div", "m " + cls, text)); }
function addEntry(e) {
  if (e.kind === "user") line("user", "You: " + e.text);
  else if (e.kind === "assistant") line("", e.text);
  else if (e.kind === "tool_result") { line("step" + (e.ok ? "" : " bad"), (e.ok ? "Step: " : "Failed: ") + e.text); if (e.route) line("route", "By hand: " + e.route); }
  else if (e.kind === "notice") line("notice", e.text);
  else if (e.kind === "error") line("error", e.text);
  else if (e.kind === "question") line("notice", "Question: " + e.title);
  else if (e.kind === "answer") line("notice", "Answer: " + e.text);
  else if (e.kind === "follow_step" && e.status !== "waiting") line("notice", "Step " + e.step + ": " + e.status);
  else if (e.kind === "permission") line("notice", "Permission: " + e.text);
}
function btn(label, fn, primary) { const b = el("button", primary ? "primary" : "", label); b.onclick = fn; return b; }
function drawCards(f) {
  const s = JSON.stringify([f.openQuestions, f.pendingPermissions, f.pendingFollow]);
  if (s === sig) return;
  sig = s;
  const box = $("cards"); box.replaceChildren();
  for (const q of f.openQuestions) {
    const c = el("div", "card"); c.append(el("h3", "", q.title), el("div", "", q.text));
    if (q.evidence) c.append(el("pre", "", q.evidence));
    for (const o of q.options) {
      const rec = q.recommendation && JSON.stringify(q.recommendation.value) === JSON.stringify(o.value);
      c.append(btn(o.label + (rec ? " (recommended)" : ""), () => api("api/answer", { qid: q.qid, value: o.value }), rec));
    }
    if (q.recommendation) c.append(el("div", "rec", "Recommended: " + q.recommendation.reason));
    box.append(c);
  }
  for (const p of f.pendingPermissions) {
    const c = el("div", "card"); c.append(el("h3", "", "Allow " + p.tool + "?"), el("div", "", p.touches || ""));
    if (p.code) c.append(el("pre", "", p.code));
    c.append(btn("Allow", () => api("api/permission", { rid: p.rid, ok: true }), true), btn("Deny", () => api("api/permission", { rid: p.rid, ok: false })));
    box.append(c);
  }
  for (const s2 of f.pendingFollow) {
    const c = el("div", "card"); c.append(el("h3", "", "Step " + s2.step + ": do this by hand"), el("div", "", s2.text));
    const note = el("input"); note.type = "text"; note.placeholder = "Numbers you got (optional)";
    c.append(note, btn("Done", () => api("api/follow", { step: s2.step, note: note.value }), true), btn("Let the agent do it", () => api("api/follow", { step: s2.step, agentDoes: true })));
    box.append(c);
  }
}
async function poll() {
  try {
    const r = await api("api/feed?since=" + since);
    const f = await r.json();
    const log = $("log"), stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 30;
    for (const e of f.entries) addEntry(e);
    since = f.next;
    $("state").textContent = f.busy ? "Working" : "Ready";
    if (document.activeElement !== $("mode")) $("mode").value = f.mode;
    drawCards(f);
    if (stick) log.scrollTop = log.scrollHeight;
  } catch { $("state").textContent = "Disconnected"; }
  setTimeout(poll, 1000);
}
$("f").onsubmit = async (ev) => {
  ev.preventDefault();
  const text = $("in").value.trim(); if (!text) return;
  const r = await api("api/send", { text });
  if (r.status === 409) line("error", "The agent is busy. Wait or press Stop."); else $("in").value = "";
};
$("stop").onclick = () => api("api/stop", {});
$("mode").onchange = () => api("api/mode", { mode: $("mode").value });
poll();
</script>
</body>
</html>
`;
