import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { Mode, Question } from "../core/types.ts";
import type { Check } from "../core/doctor.ts";
import { credentialsPath } from "../core/credentials.ts";
import type { SettingCtx } from "../core/settings.ts";
import { scopeLabel } from "../core/settings.ts";
import { ageText, type SessionInfo } from "../core/sessions.ts";
import {
  choiceLabel, choiceValue, CLARIFY_TITLE, clarifyOpen, clarifyProgress, definitionLabel, itemCount, PICK_LABEL, settingLabel, settingQuestion, fieldKind, permissionView, pilotGate, pilotQuestion, planHint, planQuestions, planResolve, planTitle, programSwitches,
  recommendedIndex, referenceLine, referenceQuestion, refModeQuestion, REFERENCE_PATH_LABEL, RUN_MODES, setupValues, show,
  type Card, type CardType, type PlanAction, type PlanState,
} from "../ui/cards.ts";
import { rowHelp, rowTag, settingEditor, settingRows, scopeText } from "../ui/config.ts";
import { fidelityLabel, type Item } from "../ui/items.ts";
import { stepNumbers } from "../core/housekeeping.ts";
import type { SessionLike } from "../ui/types.ts";

export interface Slot {
  id: number;
  card: Card;
  plan?: PlanState;
  msg?: string;
  findingIndex?: number;
}

export interface Ctx {
  token: string;
  session: SessionLike;
  settings?: SettingCtx;
  busy?: boolean;
}

const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ENT[c]!);
const IMG = /\.(png|jpe?g|gif|webp|svg)$/i;

export function fileUrl(c: Ctx, path: string, download = false): string {
  return `api/file?p=${encodeURIComponent(path)}&t=${encodeURIComponent(c.token)}${download ? "&download=1" : ""}`;
}

export function midPath(p: string, n = 52): string {
  if (p.length <= n) return esc(p);
  const keep = Math.floor((n - 1) / 2);
  return `<span title="${esc(p)}">${esc(p.slice(0, keep))}…${esc(p.slice(p.length - keep))}</span>`;
}

export function tableHtml(columns: string[], rows: string[][], cls = ""): string {
  return `<table class="stack ${cls}"><thead><tr>${columns.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${columns.map((h, i) => `<td data-label="${esc(h.replace(/<[^>]+>/g, ""))}">${r[i] ?? ""}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function inline(text: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export function md(src: string, opts: { code?: boolean } = {}): string {
  const lines = String(src).split("\n");
  const out: string[] = [];
  let i = 0;
  const li = /^\s*([-*]|\d+[.)])\s+/;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) code.push(lines[i++]!);
      i++;
      out.push(opts.code ? `<pre>${esc(code.join("\n"))}</pre>` : `<p class="dim">The code is in the Record tab.</p>`);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) rows.push(lines[i++]!.trim().slice(1, -1).split("|").map((c) => c.trim()));
      const body = rows.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
      const [head, ...rest] = body;
      out.push(tableHtml((head ?? []).map(inline), rest.map((r) => r.map(inline))));
      continue;
    }
    const head = /^#{1,6}\s+(.*)$/.exec(line);
    if (head) {
      out.push(`<h4>${inline(head[1]!)}</h4>`);
      i++;
      continue;
    }
    if (li.test(line)) {
      const ordered = /\d/.test(li.exec(line)![1]!);
      const items: string[] = [];
      while (i < lines.length && (li.test(lines[i]!) || (/^\s{2,}\S/.test(lines[i]!) && items.length))) {
        const l = lines[i++]!;
        if (li.test(l)) items.push(inline(l.replace(li, "")));
        else items[items.length - 1] += `<br>${inline(l.trim())}`;
      }
      out.push(`<${ordered ? "ol" : "ul"}>${items.map((x) => `<li>${x}</li>`).join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !li.test(lines[i]!) && !/^#{1,6}\s/.test(lines[i]!) && !lines[i]!.trim().startsWith("```") && !/^\s*\|.*\|\s*$/.test(lines[i]!)) para.push(lines[i++]!);
    out.push(`<p>${para.map(inline).join("<br>")}</p>`);
  }
  return out.join("");
}

const SECTIONS = new Set(["Metrics", "Demonstration on a sample", "Settings", "Data", "What I will count", "What I will leave out, and what it does", "Programs", "Steps", "Pilot", "Reference", "Outputs", "Checks", "Out of scope", "Numbers", "Check", "Comparison with the reference", "Images", "Definitions"]);

export function planTextHtml(text: string): string {
  const out: string[] = [];
  let list: string[] = [];
  const close = () => {
    if (list.length) out.push(`<ul>${list.map((x) => `<li>${x}</li>`).join("")}</ul>`);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      close();
      continue;
    }
    if (SECTIONS.has(line.trim())) {
      close();
      out.push(`<h4>${esc(line.trim())}</h4>`);
    } else if (/^\s*(- |\d+[.)] )/.test(line) && !/^\s{2,}/.test(line)) list.push(inline(line.replace(/^\s*- /, "")));
    else if (/^\s{2,}/.test(line) && list.length) list[list.length - 1] += `<br><span class="dim">${inline(line.trim().replace(/^- /, ""))}</span>`;
    else {
      close();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  close();
  return out.join("");
}

function preText(text: string): string {
  const table = /^\s*-{3,}(\s+-{3,})*\s*$/m.test(text) || text.split("\n").filter((l) => /\S {2,}\S/.test(l)).length >= 2;
  return table ? `<pre class="wrap">${esc(text)}</pre>` : `<div class="blocktext">${planTextHtml(text)}</div>`;
}

// ---------------------------------------------------------------- conversation

function outputsHtml(c: Ctx, outs: { path: string; kind: string }[]): string {
  if (!outs.length) return "";
  const imgs = outs.filter((o) => o.kind === "image" || IMG.test(o.path));
  const files = outs.filter((o) => !imgs.includes(o));
  return (
    (imgs.length ? `<div class="images">${imgs.map((o) => imageHtml(c, o.path)).join("")}</div>` : "") +
    (files.length ? `<ul class="files">${files.map((o) => `<li>${fileLink(c, o.path)}</li>`).join("")}</ul>` : "")
  );
}

export function imageHtml(c: Ctx, path: string): string {
  const u = fileUrl(c, path);
  return `<button type="button" class="thumb" data-full="${esc(u)}" title="${esc(basename(path))}"><img src="${esc(u)}" alt="${esc(basename(path))}" loading="lazy"></button>`;
}

export function fileLink(c: Ctx, path: string): string {
  const name = basename(path);
  const ext = extname(name).slice(1).toUpperCase();
  const label = /^[0-9a-f]{40,}\./.test(name) ? `${ext || "Output"} file` : name;
  return `<a href="${esc(fileUrl(c, path, true))}" download="${esc(name)}" title="${esc(path)}">${esc(label)}</a> <button type="button" class="link" data-reveal="${esc(path)}">Show in folder</button>`;
}

export function itemHtml(c: Ctx, it: Item, opts: { code?: boolean; sub?: (ids: number[]) => Item[] } = {}): string {
  switch (it.t) {
    case "user":
      return `<div class="msg user"><div class="bubble">${esc(it.text)}</div></div>`;
    case "assistant":
      return `<div class="msg agent">${md(it.text, opts)}</div>`;
    case "line": {
      const cls = `line ${it.color ?? ""} ${it.dim ? "dim" : ""}`;
      const body = `<span class="sym" aria-hidden="true">${esc(it.sym)}</span> ${esc(it.text)}`;
      const sub = it.group && opts.sub ? opts.sub(it.group) : [];
      if (sub.length) return `<details class="${cls} house"><summary>${body}</summary><div class="sub">${sub.map((x) => itemHtml(c, x, opts)).join("")}</div></details>`;
      return `<div class="${cls}">${body}</div>`;
    }
    case "block":
      return `<div class="block">${it.title ? `<h4>${esc(it.title)}</h4>` : ""}${preText(it.text)}</div>`;
    case "step": {
      const label = it.n ? `Step ${it.n}` : (it.purpose ?? it.tool.replace(/_/g, " "));
      const detail = [it.route, it.settings].filter(Boolean).join(" · ");
      const fid = fidelityLabel(it.fidelity);
      return `<div class="step ${it.ok ? "ok" : "bad"}${it.n ? "" : " minor"}">
<div class="stephead"><span class="badge">${esc(label)}</span> <span class="summary">${esc(it.ok ? it.summary : (it.error ?? it.summary))}</span></div>
${it.why ? `<div class="dim">Purpose: ${esc(it.why)}</div>` : ""}${detail ? `<div class="dim small">${esc(detail)}</div>` : ""}${fid ? `<div class="warn small">${esc(fid)}</div>` : ""}
${outputsHtml(c, it.outputs)}${opts.code && it.code ? `<details><summary>Code</summary><pre>${esc(it.code)}</pre></details>` : ""}</div>`;
    }
  }
}

// ---------------------------------------------------------------- cards

const btn = (label: string, attrs: string, cls = "") => `<button type="button" class="btn ${cls}" ${attrs}>${esc(label)}</button>`;
const act = (name: string, value?: unknown) => `data-act="${esc(name)}"${value === undefined ? "" : ` data-value="${esc(String(value))}"`}`;
const planAct = (a: PlanAction) => `data-act="plan" data-plan="${esc(JSON.stringify(a))}"`;

function frame(slot: Slot, title: string, color: string, body: string): string {
  return `<section class="card ${color}" data-card="${slot.id}" data-type="${slot.card.t}" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${body}${slot.msg ? `<p class="cardmsg" role="alert">${esc(slot.msg)}</p>` : ""}</section>`;
}

function questionBody(q: Question, answer: (i: number, value: unknown) => string, other: string | undefined, later: string | undefined, recommend?: string): string {
  const rec = recommendedIndex(q);
  const take = rec < 0 && q.recommendation && recommend ? btn(`${show(q.recommendation.value)} (recommended)`, recommend, "primary") : "";
  return `<p>${esc(q.text)}</p>${q.evidence ? `<p class="evidence">${esc(q.evidence)}</p>` : ""}
<div class="opts">${q.options.map((o, i) => btn(`${o.label}${i === rec ? " (recommended)" : ""}`, answer(i, o.value), i === rec ? "primary" : "")).join("")}${take}</div>
${q.recommendation?.reason ? `<p class="dim small">Recommended: ${esc(q.recommendation.reason)}</p>` : ""}
${other ? `<div class="row"><input type="text" name="other" placeholder="Other: type your own answer" aria-label="Your own answer">${btn("Answer", other)}</div>` : ""}
${later ? `<div class="row end">${btn("Answer later", later, "quiet")}</div>` : ""}`;
}

function prompt(label: string, name: string, submit: string, back: string, value = ""): string {
  return `<label class="field"><span>${esc(label)}</span><textarea name="${esc(name)}" rows="2">${esc(value)}</textarea></label><div class="row">${btn("Send", submit, "primary")}${btn("Back", back, "quiet")}</div>`;
}

function setupCard(c: Ctx, slot: Slot, card: Extract<Card, { t: "setup" }>): string {
  const fields = c.session.decisions.fields();
  const values = setupValues(fields, card);
  const field = (f: (typeof fields)[number]) => {
    const v = values[f.key];
    const k = fieldKind(f);
    const dis = f.owner === "fixed" ? " disabled" : "";
    const tag = f.key in (card.proposed ?? {}) ? ` <span class="tag">from ${esc(card.proposedFrom ?? "eLabFTW")}, not saved yet</span>` : f.owner === "fixed" ? ` <span class="tag">fixed</span>` : f.owner === "agent" ? ` <span class="tag">agent decides</span>` : "";
    let input: string;
    if (k === "choice") input = `<select name="f:${esc(f.key)}"${dis}>${f.choices!.map((ch, j) => `<option value="${j}"${Object.is(choiceValue(ch), v) ? " selected" : ""}>${esc(choiceLabel(ch))}</option>`).join("")}</select>`;
    else if (k === "bool") input = `<input type="checkbox" name="f:${esc(f.key)}"${v ? " checked" : ""}${dis}>`;
    else if (k === "number") input = `<input type="number" step="any" name="f:${esc(f.key)}" value="${esc(v ?? "")}"${f.lo !== undefined ? ` min="${f.lo}"` : ""}${f.hi !== undefined ? ` max="${f.hi}"` : ""}${dis}>`;
    else input = `<input type="text" name="f:${esc(f.key)}" value="${esc(typeof v === "string" ? v : v === undefined || v === null ? "" : JSON.stringify(v))}"${dis}>`;
    return `<label class="field ${k}"><span>${esc(f.label)}${tag}</span>${input}${f.help ? `<small>${esc(f.help)}</small>` : ""}</label>`;
  };
  const essential = fields.filter((f) => f.essential);
  const more = fields.filter((f) => !f.essential);
  const profiles = card.profiles.length ? `<label class="field"><span>Lab profile</span><select name="profile"><option value="">none</option>${card.profiles.map((p) => `<option>${esc(p.name)}</option>`).join("")}</select></label>` : "";
  return frame(slot, "Setup: your choices for this analysis", "green", `${essential.map(field).join("")}${more.length ? `<details><summary>Show more settings (${more.length})</summary>${more.map(field).join("")}</details>` : ""}${profiles}
<div class="row">${btn("Save setup and start", act("submit"), "primary")}${btn("Close", act("cancel"), "quiet")}</div>`);
}

function permissionCard(_c: Ctx, slot: Slot, card: Extract<Card, { t: "permission" }>): string {
  const v = permissionView(card);
  return frame(slot, v.title, "yellow", `${v.purpose ? `<p><strong>${esc(v.purpose)}</strong></p>` : ""}${v.does ? `<p>${esc(v.does)}</p>` : ""}
${v.args.length ? `<ul class="args">${v.args.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
${v.code ? `<details><summary>Show the code</summary><pre>${esc(v.code)}</pre></details>` : ""}
<p class="touches">${esc(v.touches)}</p>
<div class="row">${btn("Allow", act("allow"), "primary")}${v.always ? btn(`Always allow ${card.tool} in this session`, act("always")) : ""}${btn("Deny", act("deny"), "danger")}${btn("Stop the agent", act("stop"), "quiet")}</div>
<label class="field"><span>Reason for the agent if you deny (optional)</span><input type="text" name="note"></label>`);
}

function questionCard(_c: Ctx, slot: Slot, card: Extract<Card, { t: "question" }>): string {
  return frame(slot, `Your decision: ${card.q.title}`, "magenta", questionBody(card.q, (i) => act("answer", i), act("other"), act("later"), act("recommend")));
}

function instructionCard(c: Ctx, slot: Slot, card: Extract<Card, { t: "instruction" }>): string {
  const program = c.session.adapterInfo[0]?.title ?? "the program";
  return frame(slot, `Your turn: step ${card.step}`, "cyan", `${planTextHtml(card.text)}
<label class="field"><span>Your numbers or a note (optional)</span><input type="text" name="note"></label>
<p class="dim">Do this step in ${esc(program)}, then press I did it.</p>
<div class="row">${btn("I did it", act("done"), "primary")}${btn("Let the agent do it", act("agent"))}${btn("Stop the agent", act("stop"), "quiet")}</div>`);
}

function findingsCard(_c: Ctx, slot: Slot, card: Extract<Card, { t: "findings" }>): string {
  const list = card.list;
  if (!list.length) return frame(slot, "Review findings", "yellow", `<p>No open findings.</p>${btn("Close", act("close"))}`);
  return frame(slot, `Review findings (${list.length})`, "yellow", list.map((f) => `<div class="finding ${esc(f.severity)}"><p><strong>${esc(f.severity)}</strong> · ${esc(f.check)} · ${esc(f.fid)}</p><p>${esc(f.message)}</p>${f.nodes?.length ? `<p class="dim small">Steps: ${esc(f.nodes.join(", "))}</p>` : ""}
<div class="row"><input type="text" name="reason:${esc(f.fid)}" placeholder="Reason or what you fixed (optional)" aria-label="Reason">${btn("Accept", `data-act="resolve" data-value="accept" data-fid="${esc(f.fid)}"`)}${btn("Reject", `data-act="resolve" data-value="reject" data-fid="${esc(f.fid)}"`)}${btn("Mark fixed", `data-act="resolve" data-value="fix" data-fid="${esc(f.fid)}"`)}</div></div>`).join("") + `<div class="row end">${btn("Close", act("close"), "quiet")}</div>`);
}

function keyCard(_c: Ctx, slot: Slot, card: Extract<Card, { t: "key" }>, path: string): string {
  return frame(slot, "Claude API key", "cyan", `${card.reason ? `<p>${esc(card.reason)}</p>` : ""}<p>Paste your key from console.anthropic.com. The page does not show it.</p>
<p class="dim small">The app checks it with the API, then saves it to ${esc(path)}. Only your user can read that file.</p>
<label class="field"><span>Key</span><input type="password" name="key" autocomplete="off"></label>
<div class="row">${btn("Save", act("save"), "primary")}${btn("Close", act("cancel"), "quiet")}</div>`);
}

function elnCard(_c: Ctx, slot: Slot, path: string): string {
  return frame(slot, "eLabFTW notebook", "cyan", `<p>Type the address of your eLabFTW server and an API key with write access.</p>
<p class="dim small">The app saves both to ${esc(path)}. Only your user can read that file.</p>
<label class="field"><span>URL</span><input type="url" name="url"></label><label class="field"><span>Key</span><input type="password" name="key" autocomplete="off"></label>
<div class="row">${btn("Save", act("save"), "primary")}${btn("Close", act("cancel"), "quiet")}</div>`);
}

function itemChips(html: string): string {
  return html.replace(/\[(\d+)\] /g, (_m, n) => `<button type="button" class="num" ${planAct({ a: "item", n: Number(n) })} title="Change item ${n}">${n}</button> `);
}

function settingList(card: Extract<Card, { t: "plan" }>): string {
  const list = card.settings ?? [];
  if (!list.length) return "";
  const first = card.stage === "plan" ? (card.definitions ?? []).length : 0;
  return `<h4>Settings</h4><ul class="items">${list.map((x, i) => `<li><button type="button" class="num" ${planAct({ a: "item", n: first + i + 1 })} title="Change this setting">${first + i + 1}</button> ${esc(x.label)}: <strong>${esc(show(x.value))}</strong>${x.by ? ` <span class="dim">(${esc(x.by)})</span>` : ""} <span class="dim small">step ${x.step}</span></li>`).join("")}</ul>`;
}

function planCard(c: Ctx, slot: Slot, card: Extract<Card, { t: "plan" }>): string {
  const all = c.session.questions.open();
  const st = planResolve(card, slot.plan!, all);
  const open = planQuestions(card, st, all);
  const q = st.step === "decisions" ? open[0] : undefined;
  const switches = programSwitches(card);
  const pilot = pilotGate(card);
  const items = itemCount(card);
  const images = card.images?.length ? `<div class="images">${card.images.map((p) => imageHtml(c, p)).join("")}</div>` : "";
  const details = card.details ? `<div class="row">${btn(st.details ? "Hide the details" : "Show the details", planAct({ a: "details" }), "quiet")}</div>${st.details ? `<div class="plantext details">${itemChips(planTextHtml(card.details))}</div>` : ""}` : "";
  const text = card.stage === "pilot" ? `<div class="plantext">${planTextHtml(card.text)}</div>${images}${settingList(card)}` : `<div class="plantext">${itemChips(planTextHtml(card.text))}</div>${images}`;
  const head = st.step === "restate" && card.restatement ? `<p class="restate"><strong>You want: ${esc(card.restatement.replace(/^you want:?\s*/i, ""))}</strong></p><p>Is that right?</p><div class="row">${btn("Yes", planAct({ a: "restate", ok: true }), "primary")}${btn("Correct it", planAct({ a: "restate", ok: false }))}</div>` : text + details;
  const setQ = st.step === "setting" ? settingQuestion(card, st) : undefined;
  let body = "";
  if (st.step === "pick") body = prompt(PICK_LABEL, "text", planAct({ a: "item", n: 0 }), planAct({ a: "back" }));
  else if (st.step === "setting" && setQ) body = `<div class="sub-q"><h4>${esc(setQ.title)}</h4>${questionBody(setQ, (_i, v) => planAct({ a: "setValue", value: v }), planAct({ a: "setValue", value: "" }), planAct({ a: "back" }))}</div>`;
  else if (st.step === "setting") body = prompt(settingLabel(card, st) ?? "", "text", planAct({ a: "setValue", value: "" }), planAct({ a: "back" }));
  else if (st.step === "definition" && definitionLabel(card, st)) body = prompt(definitionLabel(card, st)!, "text", planAct({ a: "define", text: "" }), planAct({ a: "back" }), (card.definitions ?? [])[st.defIndex]?.definition ?? "");
  else if (st.step === "change") body = prompt("What must change? Say it in plain words.", "text", planAct({ a: "changeText", text: "" }), planAct({ a: "back" }));
  else if (card.stage === "pilot") body = `<div class="sub-q"><h4>${esc(pilotQuestion().title)}</h4>${questionBody(pilotQuestion(), (_i, v) => planAct({ a: "pilot", value: String(v) }), planAct({ a: "pilot", value: "" }), undefined)}${items ? `<p class="dim small">Choose a number to change that setting.</p>` : ""}</div>`;
  else if (st.step === "correct") body = prompt("What do you want?", "text", planAct({ a: "correct", text: "" }), planAct({ a: "back" }));
  else if (q) body = `<div class="sub-q"><p class="dim">Open setting ${card.qids.length - open.length + 1} of ${card.qids.length - st.later.length}. Answer it here, or answer it later.</p><h4>${esc(q.title)}</h4>${questionBody(q, (i) => `data-act="decide" data-qid="${esc(q.qid)}" data-value="${i}"`, `data-act="decide" data-qid="${esc(q.qid)}"`, planAct({ a: "later", qid: q.qid }), `data-act="decide" data-qid="${esc(q.qid)}" data-value="rec"`)}</div>`;
  else if (st.step === "reference") body = `<div class="sub-q"><h4>Reference</h4>${questionBody(referenceQuestion(card), (_i, v) => planAct({ a: "reference", value: String(v) }), planAct({ a: "reference", value: "" }), planAct({ a: "back" }))}</div>`;
  else if (st.step === "refpath") body = prompt(REFERENCE_PATH_LABEL, "text", planAct({ a: "refpath", text: "" }), planAct({ a: "back" }));
  else if (st.step === "refmode") body = `<div class="sub-q">${questionBody(refModeQuestion(st), (_i, v) => planAct({ a: "refmode", value: String(v) }), undefined, planAct({ a: "back" }))}</div>`;
  else if (st.step === "program") body = `<div class="opts col">${switches.map((t, i) => btn(t, planAct({ a: "program", index: i }))).join("")}</div><p class="dim small">Choose a change to ask the agent for it.</p>${btn("Back", planAct({ a: "back" }), "quiet")}`;
  else if (st.step === "actions") {
    const ref = referenceLine(st.ref);
    const modeSel = `<label class="inline">Mode <select data-plan-mode>${RUN_MODES.map((m) => `<option value="${m}"${m === st.mode ? " selected" : ""}>${esc(MODE_LABEL[m])}</option>`).join("")}</select></label>`;
    body = `${ref ? `<p class="dim">${esc(ref)}</p>` : ""}${items ? `<p class="dim small">Choose a number to change that metric or setting.</p>` : ""}
<div class="row">${pilot ? btn(`Run the demonstration on ${pilot}`, planAct({ a: "run" }), "primary") : btn("Approve and start", planAct({ a: "run" }), "primary")}${btn("Change", planAct({ a: "change" }))}${switches.length ? btn("Change a program", planAct({ a: "programs" })) : ""}${btn("Cancel", planAct({ a: "cancel" }), "danger")}</div>
<div class="row">${modeSel}</div>
<p class="dim small">${esc(planHint(card))}</p>`;
  }
  return frame(slot, planTitle(card), "cyan", head + body);
}

function clarifyCard(c: Ctx, slot: Slot, card: Extract<Card, { t: "clarify" }>): string {
  const open = c.session.questions.open();
  const q = clarifyOpen(card, open)[0];
  const skipped = card.skipped.length ? `<p class="dim small">Not asked, because your request answers it: ${esc(card.skipped.map((x) => x.split(" The request says:")[0]).join(" "))}</p>` : "";
  const ask = q
    ? `<div class="sub-q"><p class="dim small">${esc(clarifyProgress(card, open))}.</p><h4>${esc(q.title)}</h4>${questionBody(q, (i) => `data-act="answer" data-qid="${esc(q.qid)}" data-value="${i}"`, `data-act="other" data-qid="${esc(q.qid)}"`, undefined, `data-act="recommend" data-qid="${esc(q.qid)}"`)}<div class="row end">${btn("Skip: the agent chooses", `data-act="skip" data-qid="${esc(q.qid)}"`, "quiet")}</div></div>`
    : `<p class="dim">The agent now proposes the metrics.</p>`;
  return frame(slot, CLARIFY_TITLE, "magenta", `${card.found ? `<p>${esc(card.found)}</p>` : ""}${skipped}${ask}`);
}

const MODE_LABEL: Record<Mode, string> = { watch: "Watch: the agent runs the steps", follow: "Follow: you run the steps", teach: "Teach: you work, the agent checks", plan: "Plan: the agent plans only" };

export function settingsHtml(c: Ctx): string {
  if (!c.settings) return "";
  const rows = settingRows(c.settings, !!c.busy);
  let group = "";
  const out: string[] = [];
  for (const r of rows) {
    if (r.def.group !== group) {
      group = r.def.group;
      out.push(`<h4>${esc(group)}</h4>`);
    }
    const e = settingEditor(r);
    const scopes = r.def.scopes.map((s) => `<option value="${s}" title="${esc(scopeText(s, c.settings!.cwd))}">${esc(scopeLabel(s))}</option>`).join("");
    let control: string;
    if (e.t === "message") control = `<span class="dim small">${esc(e.text)}</span>`;
    else if (e.t === "edit") control = btn("Change", `data-setting-edit="${e.card}"`);
    else if (e.t === "text") control = `<input type="text" name="value" placeholder="New value" aria-label="New value for ${esc(r.def.label)}">`;
    else control = `<select name="value" aria-label="New value for ${esc(r.def.label)}">${e.options.map((o, i) => `<option${i === e.sel ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    const save = e.t === "text" || e.t === "value" ? `<select name="scope" aria-label="Where to save">${scopes}</select>${btn("Save", `data-setting-save="${esc(r.def.name)}"`)}` : "";
    const details = (r.def.details?.(c.settings) ?? []).map((d) => `<div class="dim small">${esc(d)}</div>`).join("");
    out.push(`<div class="setting${r.locked ? " locked" : ""}" data-setting="${esc(r.def.name)}"><div class="sname"><strong>${esc(r.def.label)}</strong><span class="sval">${esc(r.value)}</span><span class="dim small">${esc(rowTag(r))}</span></div><div class="dim small">${esc(rowHelp(r))}</div>${details}<div class="row">${control}${save}</div></div>`);
  }
  return out.join("");
}

function configCard(c: Ctx, slot: Slot): string {
  return frame(slot, "Settings", "cyan", `<div class="settings">${settingsHtml(c)}</div><div class="row end">${btn("Close", act("close"), "quiet")}</div>`);
}

type WebCards = { [K in CardType]: (c: Ctx, slot: Slot, card: Extract<Card, { t: K }>) => string };

export const WEB_CARDS: WebCards = {
  setup: setupCard,
  permission: permissionCard,
  question: questionCard,
  instruction: instructionCard,
  plan: planCard,
  findings: findingsCard,
  eln: (c, slot) => elnCard(c, slot, credentialsPath()),
  config: (c, slot) => configCard(c, slot),
  key: (c, slot, card) => keyCard(c, slot, card, credentialsPath()),
  clarify: clarifyCard,
};

export function cardHtml(c: Ctx, slot: Slot): string {
  return (WEB_CARDS[slot.card.t] as (c: Ctx, s: Slot, card: Card) => string)(c, slot, slot.card);
}

// ---------------------------------------------------------------- pages and tabs

export function sessionsHtml(list: SessionInfo[], token: string, now = Date.now()): string {
  if (!list.length) return `<p class="empty">No sessions yet.</p>`;
  const folders = [...new Set(list.map((s) => s.cwd).filter(Boolean))].sort();
  const name = (p: string) => basename(p) || p;
  const filters = `<div class="sfilter"><input type="search" data-session-search placeholder="Search titles, requests and folders" aria-label="Search sessions"><select data-session-folder aria-label="Folder"><option value="">All folders</option>${folders.map((f) => `<option value="${esc(f)}">${esc(name(f))}</option>`).join("")}</select></div>`;
  const cards = list
    .map((s) => {
      const title = s.name || (s.ask ? clipText(s.ask, 80) : "No request yet");
      const sentence = s.description || (s.name ? s.ask : "");
      const status = s.moved ? "moved" : (s.status ?? "");
      const text = [s.name, s.description, s.ask, s.cwd].filter(Boolean).join(" ").toLowerCase();
      const thumb = s.figure ? `<img src="api/thumb?id=${encodeURIComponent(s.id)}&t=${encodeURIComponent(token)}" alt="" loading="lazy">` : `<span class="nothumb" aria-hidden="true"></span>`;
      return `<li data-text="${esc(text)}" data-folder="${esc(s.cwd)}"><button type="button" class="scard"${s.moved ? " disabled" : ` data-open-session="${esc(s.id)}"`}>${thumb}<span class="sbody"><span class="stitle">${esc(title)}</span>${sentence ? `<span class="sdesc">${esc(clipText(sentence, 220))}</span>` : ""}<span class="smeta"><span title="${esc(s.cwd)}">${esc(name(s.cwd) || "unknown folder")}</span> · ${esc(ageText(now - s.used))}${status ? ` · <span class="sstatus ${esc(status.replace(/\s+/g, "-"))}">${esc(status)}</span>` : ""}</span></span></button></li>`;
    })
    .join("");
  return `${filters}<ul class="scards">${cards}</ul><p class="empty hidden" data-session-none>No session matches.</p>`;
}

const clipText = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function decisionsHtml(c: Ctx, rows: string[][], stale: number): string {
  const fields = c.session.decisions.fields();
  return `${stale ? `<div class="notice warn"><p>${stale} ${stale === 1 ? "step is" : "steps are"} out of date after a change.</p>${btn("Rerun the steps that changed", `data-rerun="1"`, "primary")}</div>` : ""}
<div class="decisions">${rows
    .map(([key, , owner, by]) => {
      const f = fields.find((x) => x.key === key)!;
      const k = fieldKind(f);
      const v = f.value;
      const input =
        owner === "fixed"
          ? `<span>${esc(show(v))}</span>`
          : k === "choice"
            ? `<select name="value" aria-label="Value of ${esc(f.label)}">${f.choices!.map((ch, j) => `<option value="${j}"${Object.is(choiceValue(ch), v) ? " selected" : ""}>${esc(choiceLabel(ch))}</option>`).join("")}</select>`
            : k === "bool"
              ? `<input type="checkbox" name="value" aria-label="${esc(f.label)}"${v ? " checked" : ""}>`
              : `<input type="${k === "number" ? "number" : "text"}" step="any" name="value" aria-label="Value of ${esc(f.label)}" value="${esc(v === undefined || v === null ? "" : typeof v === "string" ? v : JSON.stringify(v))}">`;
      return `<div class="decision" data-decision="${esc(key)}"><div class="dhead"><strong>${esc(f.label)}</strong> <span class="dim small">${esc(key)}</span></div>
<div class="row">${input}${owner === "fixed" ? "" : btn("Save", `data-decision-save="${esc(key)}"`)}<label class="inline small">Owner <select name="owner" data-owner="${esc(key)}">${["human", "agent", "fixed"].map((o) => `<option value="${o}"${o === owner ? " selected" : ""}>${o === "human" ? "you" : o}</option>`).join("")}</select></label></div>
<div class="dim small">Set by: ${esc(by)}</div></div>`;
    })
    .join("")}</div>`;
}

export function stepsHtml(c: Ctx): string {
  const r = c.session.record;
  const nodes = r.nodes().filter((n) => !n.sensitivityOf);
  const steps = stepNumbers(nodes);
  const stale = r.stale();
  const main = nodes.filter((n) => steps.has(n.id));
  if (!main.length) return `<p class="empty">No steps yet.</p>`;
  return `<ol class="steps">${main
    .map((n) => {
      const img = n.outputs.find((o) => o.kind === "image" || IMG.test(o.path));
      const purpose = typeof n.args.purpose === "string" && n.args.purpose.trim() ? n.args.purpose.trim() : "";
      return `<li class="${stale.has(n.id) ? "stale" : ""}"><div><strong>Step ${steps.get(n.id)}</strong> ${esc(n.summary || n.tool.replace(/_/g, " "))}${stale.has(n.id) ? ` <span class="tag warn">out of date</span>` : ""}</div>${purpose ? `<div class="dim small">${esc(purpose)}</div>` : ""}${img && existsSync(img.path) ? `<div class="images">${imageHtml(c, img.path)}</div>` : ""}</li>`;
    })
    .join("")}</ol>`;
}

export function listFiles(dir: string, filter: (name: string) => boolean = () => true): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => !n.startsWith(".") && filter(n))
    .map((n) => join(dir, n))
    .filter((p) => statSync(p).isFile())
    .sort();
}

export function resultsHtml(c: Ctx, outDir: string, sheets: { name: string; columns: string[]; rows: unknown[][] }[] | undefined): string {
  const xlsx = join(outDir, "results.xlsx");
  const figures = listFiles(join(outDir, "figures"));
  const files = listFiles(outDir, (n) => n !== "results.xlsx" && !/^index\.html$/.test(n));
  const parts: string[] = [];
  parts.push(`<div class="row">${btn("Write the data book", `data-command="/databook pdf html"`, "primary")}<select data-export aria-label="Export format">${["html", "pdf", "md", "protocol", "notebook", "script", "flow", "eln", "jsonl"].map((f) => `<option>${f}</option>`).join("")}</select>${btn("Export", `data-export-go="1"`)}</div>`);
  if (existsSync(xlsx)) parts.push(`<p>${fileLink(c, xlsx)}</p>`);
  if (sheets?.length) {
    for (const s of sheets) {
      const rows = s.rows.slice(0, 200);
      const table = tableHtml(s.columns.map(esc), rows.map((r) => s.columns.map((_, i) => esc(r[i] ?? ""))));
      const wide = s.columns.length > 3 ? `<div class="row end">${btn("Open full width", `data-wide="1"`, "quiet")}</div>` : "";
      parts.push(`<details${s.name.toLowerCase() === "summary" ? " open" : ""}><summary>${esc(s.name)} <span class="dim small">${s.rows.length} ${s.rows.length === 1 ? "row" : "rows"}</span></summary>${wide}<div class="sheet">${table}</div>${s.rows.length > rows.length ? `<p class="dim small">The first ${rows.length} rows. The file has all rows.</p>` : ""}</details>`);
    }
  } else parts.push(`<p class="empty">No results.xlsx yet. It appears after the first analysis step.</p>`);
  const raster = figures.filter((f) => IMG.test(f) && !(/\.svg$/i.test(f) && figures.some((g) => g !== f && g.replace(/\.[^.]+$/, "") === f.replace(/\.[^.]+$/, ""))));
  if (figures.length) parts.push(`<h4>Figures</h4><div class="images">${raster.map((f) => imageHtml(c, f)).join("")}</div><ul class="files">${figures.map((f) => `<li>${fileLink(c, f)}</li>`).join("")}</ul>`);
  if (files.length) parts.push(`<h4>Files</h4><ul class="files">${files.map((f) => `<li>${fileLink(c, f)} <span class="dim small">${esc(extname(f).slice(1))}</span></li>`).join("")}</ul>`);
  parts.push(`<p class="dim small">Folder: ${midPath(outDir, 40)} <button type="button" class="link" data-reveal="${esc(outDir)}">Show in folder</button></p>`);
  return parts.join("");
}

export function doctorHtml(shown: Check[], ready: boolean, all: Check[]): string {
  const n = (st: string) => all.filter((x) => x.status === st).length;
  const groups = [...new Set(shown.map((x) => x.group))];
  const rows = groups
    .map((g) => `<h4>${esc(g)}</h4><ul class="checks">${shown.filter((x) => x.group === g).map((x) => `<li class="${esc(x.status)}"><span class="cstat">${esc(x.status)}</span> <strong>${esc(x.name)}</strong>: ${esc(x.detail)}${x.status !== "ok" && x.fix?.command ? `<div class="small">Install: <code>${esc(x.fix.command)}</code></div>` : ""}${x.status !== "ok" && x.fix?.link ? `<div class="small">${x.fix.command ? "Or download" : "Download"}: <a href="${esc(x.fix.link)}" target="_blank" rel="noopener">${esc(x.fix.link)}</a></div>` : ""}</li>`).join("")}</ul>`)
    .join("");
  return `<p class="${ready ? "okline" : "warn"}"><strong>${ready ? "Cuvette can start: Node is new enough and a model is ready." : "Cuvette cannot start yet. It needs Node 22 or later, and a Claude API key or an Ollama model."}</strong></p>
<p class="dim small">${n("ok")} ok, ${n("missing")} missing, ${n("old")} old. A missing program matters only if your analysis uses it.</p>${rows || `<p class="dim">Nothing is missing.</p>`}`;
}
