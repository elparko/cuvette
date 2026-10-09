import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { Mode, Question } from "../core/types.ts";
import type { Check } from "../core/doctor.ts";
import { credentialsPath } from "../core/credentials.ts";
import type { SettingCtx } from "../core/settings.ts";
import { ageText, type SessionInfo } from "../core/sessions.ts";
import {
  choiceLabel, choiceValue, CLARIFY_TITLE, DATA_CHECK_TITLE, DESIGN_TITLE, clarifyOpen, clarifyProgress, definitionLabel, itemCount, PICK_LABEL, settingLabel, settingQuestion, fieldKind, permissionView, pilotGate, pilotQuestion, planHint, planQuestions, planResolve, planTitle, programSwitches,
  recommendedIndex, REWIND_HELP, REWIND_TITLE, referenceLine, referenceQuestion, refModeQuestion, REFERENCE_PATH_LABEL, RUN_MODES, setupValues, show,
  type Card, type CardType, type PlanAction, type PlanState,
} from "../ui/cards.ts";
import { settingsHtml } from "./app-settings.ts";
import { fidelityLabel, type Item } from "../ui/items.ts";
import { stepNumbers } from "../core/housekeeping.ts";
import { pointTime } from "../core/rewind.ts";
import { lastUseText, originText, sizeText, STATE_LABEL, type ProgramRow } from "../core/programs.ts";
import { fieldTitle, groupRows, rowActions, summaryLine } from "../ui/programs.ts";
import { changeCell, num, reruns, stepStatus, type RerunData, type StepState } from "../core/status.ts";
import { formatRef, sessionCitations, type CitationStyle, type Ref } from "../core/citations.ts";
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

const PATH = /(^|[\s(\[])((?:~|\/)[^\s<>"'`,;()\[\]]*\/[^\s<>"'`,;()\[\]]+?)(?=[.:]?(?:\s|$|[)\],;]))/g;

export function shortPaths(html: string, n = 44): string {
  return html.replace(PATH, (_m, pre: string, p: string) => {
    if (p.length <= n) return pre + p;
    const keep = Math.floor((n - 1) / 2);
    return `${pre}<span class="path" title="${p}">${p.slice(0, keep)}…${p.slice(p.length - keep)}</span>`;
  });
}

function inline(text: string): string {
  return shortPaths(esc(text))
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
      const body = `<span class="sym" aria-hidden="true">${esc(it.sym)}</span> ${shortPaths(esc(it.text))}`;
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
<div class="stephead"><span class="badge">${esc(label)}</span> <span class="summary">${shortPaths(esc(it.ok ? it.summary : (it.error ?? it.summary)))}</span></div>
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
  return frame(slot, `Your decision: ${card.q.title}`, "magenta", card.q.table ? sheetHtml(card.q) : questionBody(card.q, (i) => act("answer", i), act("other"), act("later"), act("recommend")));
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

function rewindCard(_c: Ctx, slot: Slot, card: Extract<Card, { t: "rewind" }>): string {
  const rows = card.points.map((p) => `<li>${btn(`${p.n}. ${pointTime(p)}  ${p.label}`, act("rewind", p.n), "quiet")}</li>`).join("");
  return frame(slot, REWIND_TITLE, "cyan", `<p class="dim small">${esc(REWIND_HELP)}</p><ol class="rewind">${rows}</ol><div class="row end">${btn("Close", act("cancel"), "quiet")}</div>`);
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
  const body = q?.table ? sheetHtml(q) : q ? questionBody(q, (i) => `data-act="answer" data-qid="${esc(q.qid)}" data-value="${i}"`, `data-act="other" data-qid="${esc(q.qid)}"`, undefined, `data-act="recommend" data-qid="${esc(q.qid)}"`) : "";
  const ask = q
    ? `<div class="sub-q"><p class="dim small">${esc(clarifyProgress(card, open))}.</p><h4>${esc(q.title)}</h4>${body}<div class="row end">${btn("Skip: the agent chooses", `data-act="skip" data-qid="${esc(q.qid)}"`, "quiet")}</div></div>`
    : `<p class="dim">The agent now proposes the metrics.</p>`;
  const check = card.check ? `<details class="datacheck"${!q || q.title.startsWith(DATA_CHECK_TITLE) ? " open" : ""}><summary>${esc(DATA_CHECK_TITLE)}</summary><div class="blocktext">${planTextHtml(card.check)}</div></details>` : "";
  const notes = card.notes?.length ? `<h4>${esc(DESIGN_TITLE)}</h4><ul class="warn">${card.notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  return frame(slot, CLARIFY_TITLE, "magenta", `${card.found ? `<p>${esc(card.found)}</p>` : ""}${check}${notes}${skipped}${ask}`);
}

export function sheetHtml(q: Question): string {
  const t = q.table!;
  const head = `<tr><th>#</th>${t.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
  const rows = t.rows.map((r, i) => `<tr><td>${i + 1}</td>${t.columns.map((c, j) => `<td><input type="text" name="cell:${i}:${j}" value="${esc(r[j] ?? "")}" aria-label="${esc(`${c}, row ${i + 1}`)}"></td>`).join("")}</tr>`).join("");
  return `<p>${esc(q.text)}</p><div class="sheetwrap"><table class="sheet"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
<div class="row">${btn("Save the sheet and continue", `data-act="sheet" data-qid="${esc(q.qid)}"`, "primary")}${btn("Read samples.csv again", `data-act="answer" data-qid="${esc(q.qid)}" data-value="1"`)}</div>
<p class="dim small">Change a cell in the table, then save. unit is the unit of replication (one n). batch is the slide, plate, day or run.</p>`;
}

const MODE_LABEL: Record<Mode, string> = { watch: "Watch: the agent runs the steps", follow: "Follow: you run the steps", teach: "Teach: you work, the agent checks", plan: "Plan: the agent plans only" };

function configCard(c: Ctx, slot: Slot): string {
  return frame(slot, "Settings", "cyan", `<div class="settings">${settingsHtml(c)}</div><div class="row end">${btn("Close", act("close"), "quiet")}</div>`);
}

function programsCard(_c: Ctx, slot: Slot, card: Extract<Card, { t: "programs" }>): string {
  return frame(slot, "Programs", "cyan", `<p>The Programs page lists each adapter and its program: the status, the version, the size and the last use. Install, update, remove, set a path, turn an adapter on or off, or check again there.</p>
<div class="row">${btn("Open the Programs page", `data-page-go="programs"${card.name ? ` data-prog-start="${esc(card.name)}"` : ""}`, "primary")}${btn("Close", act("close"), "quiet")}</div>`);
}

const STATE_CLASS: Record<string, string> = { installed: "ok", custom: "ok", found: "ok", missing: "bad", old: "warn", none: "none" };

export function programsHtml(rows: ProgramRow[], opts: { checking?: boolean; now?: number } = {}): string {
  const now = opts.now ?? Date.now();
  const groups = groupRows(rows)
    .map((g) => {
      const items = g.rows
        .map((r) => {
          const acts = rowActions(r);
          const main = acts.filter((a) => a.action === "install" || a.action === "update" || a.action === "check");
          const more = acts.filter((a) => !main.includes(a));
          const b = (a: { action: string; label: string }, cls = "") => btn(a.label, `data-prog-act="${esc(a.action)}"`, cls);
          const meta = [r.version ? `<span title="${esc(r.version)}">${esc(r.version.length > 40 ? r.version.slice(0, 39) + "…" : r.version)}</span>` : "", r.size !== undefined ? esc(sizeText(r.size)) : "", `last use: ${esc(lastUseText(r.lastUsed, now))}`, esc(originText(r))].filter(Boolean).join(" · ");
          const tags = [r.adapterStatus === "approved" ? "" : `<span class="tag">${esc(r.adapterStatus)}</span>`, r.access.off ? `<span class="tag warn">off</span>` : "", r.network !== undefined ? `<span class="tag">${r.network ? "network allowed" : "no network"}</span>` : "", r.code === false ? `<span class="tag">own code blocked</span>` : ""].join("");
          return `<li class="prow${r.access.off ? " off" : ""}" data-prog="${esc(r.name)}" data-prog-path="${esc(r.access.path ?? "")}" data-prog-program="${esc(r.program)}">
<div class="phead"><span class="pname"><strong>${esc(r.program)}</strong> <span class="dim small">${esc(r.name)}</span></span><span class="pstat ${STATE_CLASS[r.state]}">${esc(STATE_LABEL[r.state])}</span>${tags}</div>
<div class="pmeta small dim">${meta}</div>
<div class="pdetail small">${shortPaths(esc(r.detail))}</div>
${r.cite ? `<div class="pcite small dim">How to cite: ${esc(r.cite)}</div>` : ""}
<div class="row pacts">${main.map((a) => b(a, a.action === "install" ? "primary" : a.action === "check" ? "quiet" : "")).join("")}${more.length ? `<details class="pmore"><summary>More</summary><div class="row">${more.map((a) => b(a, a.action === "remove" ? "danger" : "")).join("")}</div></details>` : ""}</div>
<pre class="plog hidden" aria-live="polite"></pre></li>`;
        })
        .join("");
      return `<section class="pgroup"><h3>${esc(fieldTitle(g.field))}</h3><ul class="plist">${items}</ul></section>`;
    })
    .join("");
  return `<p class="dim small" id="progsummary">${esc(summaryLine(rows))}${opts.checking ? " Checking versions and sizes..." : ""}</p>${groups || `<p class="empty">No adapters.</p>`}`;
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
  programs: programsCard,
  rewind: rewindCard,
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

export function changeHtml(d: RerunData, limit = 12): string {
  const rows = d.rows.filter((r) => r.change !== 0);
  const shown = rows.slice(0, limit);
  const table = shown.length ? tableHtml(["Number", "Before", "After", "Change"], shown.map((r) => [esc(r.name), esc(num(r.before)), esc(num(r.after)), esc(changeCell(r))]), "changes") : `<p class="dim small">No number changed.</p>`;
  const more = rows.length > shown.length ? `<p class="dim small">${rows.length - shown.length} more changed. The Changes sheet of results.xlsx has all of them.</p>` : "";
  const same = d.unchanged ? `<p class="dim small">${d.unchanged} ${d.unchanged === 1 ? "number did" : "numbers did"} not change.</p>` : "";
  return `<div class="rerun"><p class="small"><strong>Before and after: step ${d.step} repeats step ${d.oldStep}.</strong>${d.reasons.length ? ` ${esc(d.reasons.join(" "))}` : ""}</p>${table}${more}${same}</div>`;
}

export function statusHtml(states: StepState[]): string {
  if (!states.length) return "";
  const out = states.filter((s) => !s.current);
  if (!out.length) return `<p class="dim small status-line"><strong>Status:</strong> ${states.length === 1 ? "The step is up to date." : `All ${states.length} steps are up to date.`}</p>`;
  return `<div class="notice warn status-line"><p><strong>Status:</strong> ${out.length} of ${states.length} ${states.length === 1 ? "step" : "steps"} ${out.length === 1 ? "is" : "are"} out of date.</p><ul class="small">${out.map((s) => `<li>Step ${s.step}: ${esc(s.reasons.map((r) => r.text).join(" "))}</li>`).join("")}</ul>${btn("Run the out-of-date steps again", `data-rerun="1"`, "primary")}</div>`;
}

export function decisionsHtml(c: Ctx, rows: string[][], states: StepState[] = stepStatus(c.session.record, { labels: c.session.labels?.() })): string {
  const fields = c.session.decisions.fields();
  const changes = reruns(c.session.record);
  const out = states.filter((s) => !s.current);
  return `${out.length ? statusHtml(states) : ""}${changes.length ? `<h4>Changes after a step ran again</h4>${changes.map((d) => changeHtml(d)).join("")}` : ""}
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
  const state = new Map(stepStatus(r, { labels: c.session.labels?.() }).map((x) => [x.node, x]));
  const changes = new Map(reruns(r).map((d) => [d.node, d]));
  const rewound = r.rewound();
  const main = nodes.filter((n) => steps.has(n.id));
  if (!main.length) return `<p class="empty">No steps yet.</p>`;
  return `<ol class="steps">${main
    .map((n) => {
      const img = n.outputs.find((o) => o.kind === "image" || IMG.test(o.path));
      const purpose = typeof n.args.purpose === "string" && n.args.purpose.trim() ? n.args.purpose.trim() : "";
      const st = state.get(n.id);
      const newer = r.replacedBy(n.id) ? steps.get(r.latest(n.id)) : undefined;
      const tag = rewound.has(n.id) ? ` <span class="tag">rewound</span>` : newer ? ` <span class="tag">replaced by step ${newer}</span>` : st && !st.current ? ` <span class="tag warn">out of date</span>` : "";
      const why = st && !st.current ? `<div class="small warn">${esc(st.reasons.map((x) => x.text).join(" "))}</div>` : "";
      const change = changes.get(n.id);
      return `<li class="${rewound.has(n.id) ? "rewound" : newer || (st && !st.current) ? "stale" : ""}"><div><strong>Step ${steps.get(n.id)}</strong> ${esc(n.summary || n.tool.replace(/_/g, " "))}${tag}</div>${why}${purpose ? `<div class="dim small">${esc(purpose)}</div>` : ""}${change ? changeHtml(change) : ""}${img && existsSync(img.path) ? `<div class="images">${imageHtml(c, img.path)}</div>` : ""}</li>`;
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

export function citeHtml(c: Ctx): string {
  const s = c.session;
  if (!s?.record) return "";
  const style: CitationStyle = s.citationStyle?.() ?? "apa";
  const cites = sessionCitations(s.record, s.adapters ?? [], stepNumbers(s.record.nodes()));
  if (!cites.used.some((r) => r.adapter)) return `<h4 id="cite">Cite</h4><p class="empty">No program step ran yet. The list of programs and methods to cite appears after the first step.</p>`;
  const tag = style === "vancouver" ? "ol" : "ul";
  const item = (r: Ref) => `<li>${esc(formatRef(r, style))}<div class="dim small">${esc(r.kind === "program" ? (r.adapter ? r.program : "Cuvette") : `${r.kind}: ${r.tools.join(", ")}`)}${r.steps.length ? ` · ${esc(r.steps.join(", "))}` : ""}</div></li>`;
  const used = style === "apa" ? [...cites.used].sort((a, b) => formatRef(a).localeCompare(formatRef(b))) : cites.used;
  const parts = [`<h4 id="cite">Cite</h4><p class="dim small">The programs and methods that ran in this session. Style: ${style === "apa" ? "APA" : "Vancouver"}. The same list as /cite.</p>`, `<${tag} class="refs">${used.map(item).join("")}</${tag}>`];
  if (cites.comparison.length) parts.push(`<p class="small"><strong>Used in a comparison.</strong> Cite these only if you report the comparison.</p><${tag} class="refs"${tag === "ol" ? ` start="${used.length + 1}"` : ""}>${cites.comparison.map(item).join("")}</${tag}>`);
  if (cites.outOfDate.length) parts.push(`<p class="small"><strong>Used only in steps that are out of date.</strong></p><${tag} class="refs">${cites.outOfDate.map(item).join("")}</${tag}>`);
  parts.push(`<div class="row">${btn("Save BibTeX", `data-command="/cite bibtex"`)}${btn("Save RIS", `data-command="/cite ris"`)}${btn("Save the list", `data-command="/cite text"`)}${btn(style === "apa" ? "Show in Vancouver" : "Show in APA", `data-command="/cite ${style === "apa" ? "vancouver" : "apa"}"`, "quiet")}</div>`);
  return parts.join("");
}

export function resultsHtml(c: Ctx, outDir: string, sheets: { name: string; columns: string[]; rows: unknown[][] }[] | undefined): string {
  const xlsx = join(outDir, "results.xlsx");
  const figures = listFiles(join(outDir, "figures"));
  const files = listFiles(outDir, (n) => n !== "results.xlsx" && !/^index\.html$/.test(n));
  const parts: string[] = [];
  parts.push(`<div class="row">${btn("Write the data book", `data-command="/databook pdf html"`, "primary")}<select data-export aria-label="Export format">${["html", "pdf", "md", "protocol", "notebook", "script", "flow", "eln", "jsonl"].map((f) => `<option>${f}</option>`).join("")}</select>${btn("Export", `data-export-go="1"`)}</div>`);
  const sel = (name: string, label: string, opts: [string, string][]) => `<select data-deck="${name}" aria-label="${esc(label)}">${opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select>`;
  parts.push(
    `<div class="row" data-deck-row>${btn("Make an image deck", `data-deck-go="1"`)}` +
      sel("format", "File type", [["pptx", "PowerPoint (.pptx)"], ["pdf", "PDF"], ["both", "PowerPoint and PDF"]]) +
      sel("images", "Images", [["all", "All images"], ["figures", "Result figures"], ["qc", "QC images"], ["pilot", "Demonstration images"]]) +
      sel("order", "Order", [["step", "By step"], ["group", "By group or sample"], ["name", "By file name"]]) +
      sel("per", "Images on each page", [["1", "1 on each page"], ["2", "2 on each page"], ["4", "4 on each page"], ["6", "6 on each page"], ["9", "9 on each page"]]) +
      sel("size", "Page size", [["", "Size: default"], ["16:9", "16:9 slides"], ["a4", "A4"], ["letter", "Letter"]]) +
      `</div>`,
  );
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
  parts.push(citeHtml(c));
  parts.push(`<p class="dim small">Folder: ${midPath(outDir, 40)} <button type="button" class="link" data-reveal="${esc(outDir)}">Show in folder</button></p>`);
  return parts.join("");
}

export function doctorHtml(shown: Check[], ready: boolean, all: Check[]): string {
  const n = (st: string) => all.filter((x) => x.status === st).length;
  const groups = [...new Set(shown.map((x) => x.group))];
  const rows = groups
    .map((g) => `<h4>${esc(g)}</h4><ul class="checks">${shown.filter((x) => x.group === g).map((x) => `<li class="${esc(x.status)}"><span class="cstat">${esc(x.status)}</span> <strong>${esc(x.name)}</strong>: ${esc(x.detail)}${x.status !== "ok" && x.fix?.command ? `<div class="small">Install: <code>${esc(x.fix.command)}</code></div>` : ""}${x.status !== "ok" && x.fix?.link ? `<div class="small">${x.fix.command ? "Or download" : "Download"}: <a href="${esc(x.fix.link)}" target="_blank" rel="noopener">${esc(x.fix.link)}</a></div>` : ""}${x.cite ? `<div class="small dim">How to cite: ${esc(x.cite)}</div>` : ""}</li>`).join("")}</ul>`)
    .join("");
  return `<p class="${ready ? "okline" : "warn"}"><strong>${ready ? "Cuvette can start: Node is new enough and a model is ready." : "Cuvette cannot start yet. It needs Node 22 or later, and a Claude API key or an Ollama model."}</strong></p>
<p class="dim small">${n("ok")} ok, ${n("missing")} missing, ${n("old")} old. A missing program matters only if your analysis uses it.</p>${rows || `<p class="dim">Nothing is missing.</p>`}`;
}
