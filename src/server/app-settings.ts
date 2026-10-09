import { canReset, type SettingCtx, type SettingRow } from "../core/settings.ts";
import { briefHelp, choiceLabel, choiceList, choiceNote, controlOf, lockText, SCOPE_BUTTON, secretState, sections, settingRows, sourceBadge, spendState } from "../ui/config.ts";

const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const h = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ENT[c]!);

function control(r: SettingRow, ctx: SettingCtx, id: string): string {
  const d = r.def;
  const dis = r.locked ? " disabled" : "";
  const lab = `aria-labelledby="${id}"`;
  switch (controlOf(r)) {
    case "toggle": {
      const on = r.value === "on";
      return `<button type="button" class="switch" role="switch" aria-checked="${on}" ${lab} data-sv-toggle${dis}><span class="knob"></span></button><span class="swtext">${on ? "On" : "Off"}</span>`;
    }
    case "segmented":
      return `<div class="seg" role="radiogroup" ${lab}>${choiceList(r).map((o) => `<button type="button" role="radio" aria-checked="${o === r.value}" data-sv="${h(o)}"${dis}>${h(o)}</button>`).join("")}</div>`;
    case "options": {
      const list = choiceList(r).map((o) => `<button type="button" role="radio" aria-checked="${o === r.value}" data-sv="${h(o)}"${dis}><span class="oname">${h(choiceLabel(d, o))}</span><span class="onote">${h(choiceNote(d, o))}</span></button>`).join("");
      const other = d.free ? `<input type="text" class="sother" data-sv-input placeholder="Other model, for example ollama:qwen3:8b" aria-label="Other value for ${h(d.label)}"${dis}>` : "";
      return `<div class="olist" role="radiogroup" ${lab}>${list}</div>${other}`;
    }
    case "select": {
      const opts = choiceList(r).map((o) => `<option value="${h(o)}"${o === r.value ? " selected" : ""}>${h(o)}</option>`).join("");
      const other = d.free ? `<option value="__other">Other…</option>` : "";
      return `<select data-sv-select ${lab}${dis}>${opts}${other}</select>${d.free ? `<input type="text" class="sother hidden" data-sv-input placeholder="Type a value" aria-label="Other value for ${h(d.label)}"${dis}>` : ""}`;
    }
    case "number": {
      const env = r.source === "env";
      const m = /^\$?([\d.]+)$/.exec(r.value);
      const num = m ? String(Number(m[1])) : "";
      const off = num && !env ? `<button type="button" class="btn quiet" data-sv-set="off"${dis}>No limit</button>` : "";
      return `<span class="snum"><input type="number" inputmode="decimal" step="any" min="${d.min ?? 0}" value="${h(num)}" placeholder="No limit" data-sv-input ${lab}${env ? " disabled" : dis}><span class="unit">${h(d.unit ?? "")}</span></span>${off}${env ? `<span class="small dim">CUVETTE_BUDGET_USD in the shell sets this limit.</span>` : ""}`;
    }
    case "path":
      return `<span class="spath"><input type="text" value="${h(r.value === "not set" ? "" : r.value)}" data-sv-input ${lab} spellcheck="false"${dis}><button type="button" class="btn" data-sv-choose${dis}>Choose…</button></span>`;
    case "text":
      return `<input type="text" class="stext" value="${h(r.value === "not set" ? "" : r.value)}" data-sv-input ${lab} spellcheck="false"${dis}>`;
    case "secret": {
      const st = secretState(r);
      return `<span class="sstate ${st === "not set" ? "dim" : ""}">${h(st)}</span><button type="button" class="btn" data-setting-edit="${d.edit}">Change</button>${st === "saved" ? `<button type="button" class="btn quiet" data-sx-remove>Remove</button>` : ""}`;
    }
    case "card":
      return `<span class="sval">${h(r.value)}</span><button type="button" class="btn" data-setting-edit="${d.edit}">Change</button>`;
    default: {
      if (d.name === "spend_month") {
        const s = spendState(ctx.env);
        if (s.pct === undefined) return `<span class="mtext">${h(s.text)}</span>`;
        return `<div class="meter${s.pct >= 100 ? " over" : ""}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.pct}" ${lab}><span style="width:${s.pct}%"></span></div><span class="mtext">${h(s.text)}</span>`;
      }
      return `<span class="sval">${h(r.value)}</span>`;
    }
  }
}

function rowHtml(r: SettingRow, ctx: SettingCtx): string {
  const d = r.def;
  const id = `sl-${d.name}`;
  const b = sourceBadge(r, ctx.cwd);
  const badge = b.text ? `<span class="sbadge ${r.source}"${b.file ? ` title="${h(b.file)}"` : ""}>${h(b.text)}${b.file && r.source === "project" ? ` · ${h(b.file)}` : ""}</span>` : "";
  const brief = briefHelp(d);
  const rest = d.help.startsWith(brief) ? d.help.slice(brief.length).trim() : d.help;
  const details = d.details?.(ctx) ?? [];
  const more = rest || details.length ? `<details class="smore"><summary>More</summary>${rest ? `<p>${h(rest)}</p>` : ""}${details.length ? `<ul>${details.map((x) => `<li>${h(x)}</li>`).join("")}</ul>` : ""}</details>` : "";
  const ask = d.scopes.length ? `<div class="sask hidden" role="group" aria-label="Save for"><span class="small">Save for:</span>${d.scopes.filter((s) => s !== "session" || ctx.session).map((s) => `<button type="button" class="btn" data-sx-scope="${s}">${SCOPE_BUTTON[s]}</button>`).join("")}<button type="button" class="btn quiet" data-sx-cancel>Cancel</button></div>` : "";
  const reset = canReset(r) ? `<button type="button" class="link" data-sx-reset>Reset to default</button>` : "";
  return `<div class="srow${r.locked ? " locked" : ""}" data-setting="${h(d.name)}" data-sec="${h(d.group)}" data-control="${controlOf(r)}" data-text="${h(`${d.label} ${d.help}`.toLowerCase())}">
<div class="shead"><span class="slabel" id="${id}">${h(d.label)}</span>${badge}</div>
<div class="sctl">${control(r, ctx, id)}</div>
<p class="shelp">${h(brief)}</p>${more}${r.locked ? `<p class="slock">${h(lockText(r))}</p>` : ""}${reset ? `<div class="sfoot">${reset}</div>` : ""}${ask}<p class="sdone" role="status"></p></div>`;
}

export function settingsHtml(c: { settings?: SettingCtx; busy?: boolean }): string {
  if (!c.settings) return "";
  const rows = settingRows(c.settings, !!c.busy);
  const secs = sections(rows);
  const nav = secs.map((s) => `<button type="button" data-cfg-sec="${h(s)}"><span>${h(s)}</span><span class="cnt"></span></button>`).join("");
  const body = secs.map((s) => `<section class="cfg-sec" data-sec="${h(s)}"><h3>${h(s)}</h3>${rows.filter((r) => r.def.group === s).map((r) => rowHtml(r, c.settings!)).join("")}</section>`).join("");
  return `<div class="cfg">
<div class="cfg-top"><input type="search" data-cfg-search placeholder="Search the settings" aria-label="Search the settings" autocomplete="off"><select class="cfg-pick" data-cfg-pick aria-label="Section">${secs.map((s) => `<option>${h(s)}</option>`).join("")}</select></div>
<div class="cfg-body"><nav class="cfg-nav" aria-label="Setting sections">${nav}</nav><div class="cfg-main">${body}<p class="cfg-none hidden">No setting matches the search.</p></div></div>
</div>`;
}

export const SETTINGS_CSS = String.raw`
main.page.wide { max-width: 1080px; }
.cfg { container-type: inline-size; min-width: 0; }
.cfg-top { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 14px; }
.cfg-top input[type=search] { flex: 1 1 220px; min-width: 0; padding: 6px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--bg); min-height: 36px; }
.cfg-pick { display: none; }
.cfg-body { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 24px; align-items: start; }
.cfg-nav { display: flex; flex-direction: column; gap: 1px; position: sticky; top: 12px; }
.cfg-nav button { display: flex; justify-content: space-between; gap: 8px; text-align: left; background: none; border: 0; border-left: 2px solid transparent; padding: 6px 10px; cursor: pointer; color: var(--dim); font-size: 14px; }
.cfg-nav button:hover { color: var(--ink); }
.cfg-nav button[aria-current="true"] { color: var(--ink); border-left-color: var(--ink); font-weight: 600; }
.cfg-nav button[disabled] { opacity: .45; cursor: default; }
.cfg-nav .cnt { font-size: 12px; font-weight: 400; color: var(--dim); font-variant-numeric: tabular-nums; }
.cfg-main { min-width: 0; }
.cfg-sec h3 { margin: 0 0 2px; font-size: 12px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--dim); }
.cfg-sec + .cfg-sec { margin-top: 22px; }
.cfg-none { color: var(--dim); }
.srow { padding: 12px 0; border-top: 1px solid var(--line); min-width: 0; overflow-wrap: anywhere; }
.srow.locked .sctl { opacity: .55; }
.shead { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 12px; }
.slabel { font-weight: 600; }
.sbadge { font-size: 11.5px; line-height: 18px; padding: 0 6px; border: 1px solid var(--line); border-radius: 4px; color: var(--ink); max-width: 100%; overflow-wrap: anywhere; }
.sbadge.default, .sbadge.env { color: var(--dim); }
.sctl { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 7px 0 4px; min-width: 0; }
.sctl .sval { font: 13px ui-monospace, Menlo, monospace; overflow-wrap: anywhere; min-width: 0; }
.sctl .stext { flex: 1 1 220px; min-width: 0; max-width: 480px; }
.sctl .sother { flex: 1 1 100%; min-width: 0; max-width: 560px; }
.sctl .btn { min-height: 32px; padding: 3px 12px; }
.shelp { margin: 2px 0 0; font-size: 13px; color: var(--dim); }
.smore { font-size: 13px; color: var(--dim); }
.smore summary { cursor: pointer; width: max-content; text-decoration: underline; text-underline-offset: 2px; }
.smore p { margin: 4px 0; }
.smore ul { margin: 4px 0; padding-left: 18px; font: 12.5px ui-monospace, Menlo, monospace; }
.slock { margin: 4px 0 0; font-size: 13px; color: var(--warn); }
.sfoot { margin-top: 4px; }
.sfoot .link { color: var(--dim); padding: 0; }
.sdone { margin: 6px 0 0; font-size: 13px; }
.sdone:empty { display: none; }
.sdone.ok::before { content: "✓ "; }
.sdone.bad { color: var(--bad); }
.sask { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: var(--panel2); }
.sask .btn.primary { background: var(--ink); border-color: var(--ink); color: var(--panel); }
.switch { position: relative; flex: none; width: 40px; height: 22px; padding: 0; border-radius: 11px; border: 1px solid var(--line); background: var(--panel2); cursor: pointer; }
.switch .knob { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--dim); transition: left .12s; }
.switch[aria-checked="true"] { background: var(--ink); border-color: var(--ink); }
.switch[aria-checked="true"] .knob { left: 20px; background: var(--panel); }
.switch[disabled] { cursor: default; }
@media (prefers-reduced-motion: reduce) { .switch .knob { transition: none; } }
.swtext { font-size: 14px; }
.seg { display: inline-flex; flex-wrap: wrap; max-width: 100%; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; background: var(--line); gap: 1px; }
.seg button { border: 0; background: var(--panel); padding: 4px 12px; min-height: 32px; cursor: pointer; font-size: 14px; }
.seg button:hover { background: var(--panel2); }
.seg button[aria-checked="true"] { background: var(--ink); color: var(--panel); font-weight: 600; }
.olist { display: flex; flex-direction: column; width: 100%; max-width: 560px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--line); gap: 1px; }
.olist button { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; padding: 7px 12px; border: 0; background: var(--panel); text-align: left; cursor: pointer; }
.olist button:hover { background: var(--panel2); }
.olist button[aria-checked="true"] { background: var(--panel2); box-shadow: inset 3px 0 0 var(--ink); font-weight: 600; }
.onote { color: var(--dim); font-size: 13px; font-weight: 400; font-variant-numeric: tabular-nums; }
.snum { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.snum input { width: 9em; min-width: 0; }
.unit { color: var(--dim); font-size: 13px; }
.spath { display: flex; flex: 1 1 260px; gap: 6px; min-width: 0; max-width: 560px; }
.spath input { flex: 1; min-width: 0; font: 13px ui-monospace, Menlo, monospace; }
.sstate { font-weight: 600; }
.meter { flex: 1 1 100%; max-width: 420px; height: 8px; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; background: var(--panel2); }
.meter > span { display: block; height: 100%; background: var(--ink); }
.meter.over > span { background: var(--bad); }
.mtext { flex: 1 1 100%; font-size: 14px; font-variant-numeric: tabular-nums; }
dialog#cfgdirs { width: min(560px, 96vw); }
#cfgdirs ul { list-style: none; margin: 6px 0; padding: 0; max-height: 50vh; overflow-y: auto; }
#cfgdirs li button { width: 100%; text-align: left; background: none; border: 0; padding: 5px 6px; border-radius: 5px; cursor: pointer; overflow-wrap: anywhere; }
#cfgdirs li button:hover { background: var(--panel2); }
#cfgdirs .where { font: 13px ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
@container (max-width: 640px) {
  .cfg-body { grid-template-columns: minmax(0, 1fr); }
  .cfg-nav { display: none; }
  .cfg-pick { display: block; flex: 1 1 100%; }
}
`;

export const SETTINGS_JS = String.raw`
const cfg = { sec: "", q: "", saved: null, confirm: "" };
async function loadSettings() {
  const boxes = [$("settingsbody"), ...document.querySelectorAll("#cards .settings")];
  let html;
  try { html = await call("api/settings"); } catch (e) { $("settingsbody").textContent = e.message; return; }
  for (const b of boxes) b.innerHTML = html;
  cfgApply();
}
function cfgRemembered(name) { try { return localStorage.getItem("cuvette.scope." + name) || ""; } catch (e) { return ""; } }
function cfgRemember(name, scope) { try { localStorage.setItem("cuvette.scope." + name, scope); } catch (e) {} }
function cfgApply() {
  for (const root of document.querySelectorAll(".cfg")) {
    const secs = [...root.querySelectorAll(".cfg-sec")];
    if (!secs.length) continue;
    if (!secs.some((s) => s.dataset.sec === cfg.sec)) cfg.sec = secs[0].dataset.sec;
    const words = cfg.q.toLowerCase().split(/\s+/).filter(Boolean);
    const search = root.querySelector("[data-cfg-search]");
    if (search && search.value !== cfg.q && document.activeElement !== search) search.value = cfg.q;
    let total = 0;
    for (const s of secs) {
      let n = 0;
      for (const r of s.querySelectorAll(".srow")) {
        const ok = words.every((w) => r.dataset.text.indexOf(w) >= 0);
        r.classList.toggle("hidden", !ok);
        if (ok) n++;
      }
      total += n;
      s.classList.toggle("hidden", words.length ? n === 0 : s.dataset.sec !== cfg.sec);
      const b = root.querySelector('[data-cfg-sec="' + CSS.escape(s.dataset.sec) + '"]');
      if (b) {
        b.setAttribute("aria-current", !words.length && s.dataset.sec === cfg.sec ? "true" : "false");
        b.querySelector(".cnt").textContent = words.length ? String(n) : "";
        b.disabled = words.length > 0 && n === 0;
      }
    }
    const pick = root.querySelector("[data-cfg-pick]");
    if (pick) pick.value = cfg.sec;
    root.querySelector(".cfg-none").classList.toggle("hidden", total > 0);
    if (cfg.saved) {
      const row = root.querySelector('.srow[data-setting="' + CSS.escape(cfg.saved.name) + '"]');
      if (row) { const p = row.querySelector(".sdone"); p.textContent = cfg.saved.text; p.className = "sdone " + (cfg.saved.ok ? "ok" : "bad"); }
    }
  }
}
function cfgAsk(row, value) {
  row.dataset.pending = value;
  const ask = row.querySelector(".sask");
  if (!ask) return;
  const scopes = [...ask.querySelectorAll("[data-sx-scope]")];
  const mem = cfgRemembered(row.dataset.setting);
  const pick = scopes.find((b) => b.dataset.sxScope === mem) || scopes[0];
  for (const b of scopes) b.classList.toggle("primary", b === pick);
  ask.classList.remove("hidden");
  row.querySelector(".sdone").textContent = "";
  pick.focus();
}
async function cfgPost(path, body, key) {
  let r;
  try { r = await call(path, body); cfg.saved = { name: body.name, text: r.text, ok: !r.confirm }; cfg.confirm = r.confirm ? key : ""; }
  catch (err) { cfg.saved = { name: body.name, text: err.message, ok: false }; }
  clearTimeout(cfgPost.timer);
  cfgPost.timer = setTimeout(() => { cfg.saved = null; }, 8000);
  await loadSettings();
  if ($("p-settings").classList.contains("hidden")) toast(cfg.saved.text);
  if (!state.session) boot();
}
async function cfgDirs(start) {
  let dlg = $("cfgdirs");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "cfgdirs";
    dlg.setAttribute("aria-label", "Choose a folder");
    dlg.innerHTML = '<h3 style="margin:0 0 4px">Choose a folder</h3><div class="where"></div><ul></ul><p class="cardmsg"></p><div class="row end"><button type="button" class="btn quiet" data-d="cancel">Cancel</button><button type="button" class="btn primary" data-d="use">Use this folder</button></div>';
    document.body.append(dlg);
  }
  return new Promise((done) => {
    let at = "";
    const list = async (p) => {
      let d;
      try { d = await call("api/dirs?p=" + encodeURIComponent(p || "")); } catch (err) { dlg.querySelector(".cardmsg").textContent = err.message; return; }
      at = d.path;
      dlg.querySelector(".cardmsg").textContent = "";
      dlg.querySelector(".where").textContent = d.path;
      const ul = dlg.querySelector("ul");
      ul.replaceChildren();
      const add = (label, path) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.addEventListener("click", () => list(path)); const li = document.createElement("li"); li.append(b); ul.append(li); };
      if (d.parent) add("↑ Up one folder", d.parent);
      for (const n of d.dirs) add(n, d.path.replace(/\/$/, "") + "/" + n);
    };
    dlg.onclick = (e) => {
      const b = e.target.closest && e.target.closest("[data-d]");
      if (!b) return;
      dlg.close();
      done(b.dataset.d === "use" ? at : "");
    };
    dlg.oncancel = () => done("");
    list(start && start.indexOf("/") === 0 ? start : "");
    dlg.showModal();
  });
}
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.matches && t.matches("[data-cfg-search]")) { cfg.q = t.value; cfgApply(); }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (!t.matches) return;
  if (t.matches("[data-cfg-pick]")) { cfg.sec = t.value; cfg.q = ""; cfgApply(); return; }
  const row = t.closest(".srow");
  if (!row) return;
  if (t.matches("[data-sv-select]")) {
    const other = row.querySelector(".sother");
    if (t.value === "__other") { other.classList.remove("hidden"); other.focus(); return; }
    if (other) other.classList.add("hidden");
    cfgAsk(row, t.value);
  } else if (t.matches("[data-sv-input]")) {
    if (t.value.trim() || t.type === "number") cfgAsk(row, t.value.trim() || "off");
  }
});
document.addEventListener("keydown", (e) => {
  const t = e.target;
  if (e.key === "Escape" && t.closest && t.closest(".sask")) { e.preventDefault(); loadSettings(); }
  if (e.key === "Enter" && t.matches && t.matches("[data-sv-input]")) { e.preventDefault(); t.blur(); }
});
document.addEventListener("click", async (e) => {
  const t = e.target instanceof Element ? e.target : null;
  if (!t) return;
  const sec = t.closest("[data-cfg-sec]");
  if (sec) { cfg.sec = sec.dataset.cfgSec; cfg.q = ""; cfgApply(); return; }
  const row = t.closest(".srow");
  if (!row) return;
  const name = row.dataset.setting;
  const v = t.closest("[data-sv]");
  if (v) {
    for (const b of v.parentElement.querySelectorAll("[data-sv]")) b.setAttribute("aria-checked", b === v ? "true" : "false");
    cfgAsk(row, v.dataset.sv);
    return;
  }
  const tg = t.closest("[data-sv-toggle]");
  if (tg) {
    const on = tg.getAttribute("aria-checked") !== "true";
    tg.setAttribute("aria-checked", String(on));
    row.querySelector(".swtext").textContent = on ? "On" : "Off";
    cfgAsk(row, on ? "on" : "off");
    return;
  }
  const set = t.closest("[data-sv-set]");
  if (set) { cfgAsk(row, set.dataset.svSet); return; }
  if (t.closest("[data-sv-choose]")) {
    const input = row.querySelector("[data-sv-input]");
    const f = bridge.chooseFolder ? await bridge.chooseFolder(input.value) : await cfgDirs(input.value);
    if (f) { input.value = f; cfgAsk(row, f); }
    return;
  }
  const sc = t.closest("[data-sx-scope]");
  if (sc) {
    cfgRemember(name, sc.dataset.sxScope);
    const key = name + "=" + row.dataset.pending + "=" + sc.dataset.sxScope;
    await cfgPost("api/setting", { name: name, value: row.dataset.pending, scope: sc.dataset.sxScope, confirm: cfg.confirm === key }, key);
    return;
  }
  if (t.closest("[data-sx-cancel]")) { loadSettings(); return; }
  if (t.closest("[data-sx-reset]")) { await cfgPost("api/setting/reset", { name: name }); return; }
  const rm = t.closest("[data-sx-remove]");
  if (rm) {
    if (!rm.dataset.sure) { rm.dataset.sure = "1"; rm.textContent = "Click again to remove"; return; }
    await cfgPost("api/setting/remove", { name: name });
  }
});
`;
