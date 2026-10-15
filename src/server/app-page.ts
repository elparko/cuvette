import { BIDI_CHARS } from "../core/markdown.ts";
import { SETTINGS_CSS, SETTINGS_JS } from "./app-settings.ts";

export function appPageHtml(token: string): string {
  return PAGE.replace("__TOKEN__", () => JSON.stringify(token).replace(/</g, "\\u003c"));
}

const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Cuvette</title>
<style>
:root {
  --bg: #f4f4f1; --panel: #ffffff; --panel2: #efefea; --ink: #1c1c1e; --dim: #5e5e66; --line: #d4d4cd;
  --accent: #2858c4; --accent-bg: #e6edfb; --ok: #1a7a43; --ok-bg: #e5f4ea; --bad: #b3261e; --bad-bg: #fbe9e7;
  --warn: #8f5800; --warn-bg: #fff1d6; --mag: #8a2a8f; --mag-bg: #f8e9f8; --focus: #7a3ff0; --code-bg: #f1f1ee;
  --user: #e6edfb; --shadow: 0 1px 2px rgba(0,0,0,.07);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #121214; --panel: #1b1b1f; --panel2: #24242a; --ink: #ececee; --dim: #a2a2ab; --line: #3a3a41;
    --accent: #79a6ff; --accent-bg: #1f2b45; --ok: #5fd28a; --ok-bg: #16301f; --bad: #ff8a7d; --bad-bg: #3b1f1c;
    --warn: #f0b24e; --warn-bg: #3a2c10; --mag: #e59be9; --mag-bg: #3a1f3b; --focus: #b794ff; --code-bg: #141417; --user: #1f2b45; --shadow: none;
  }
}
:root[data-theme="dark"] {
  --bg: #121214; --panel: #1b1b1f; --panel2: #24242a; --ink: #ececee; --dim: #a2a2ab; --line: #3a3a41;
  --accent: #79a6ff; --accent-bg: #1f2b45; --ok: #5fd28a; --ok-bg: #16301f; --bad: #ff8a7d; --bad-bg: #3b1f1c;
  --warn: #f0b24e; --warn-bg: #3a2c10; --mag: #e59be9; --mag-bg: #3a1f3b; --focus: #b794ff; --code-bg: #141417; --user: #1f2b45; --shadow: none;
}
* { box-sizing: border-box; }
html, body { overflow-x: hidden; }
html, body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
body { min-height: 100vh; display: flex; flex-direction: column; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
button, input, select, textarea { font: inherit; color: inherit; }
a { color: var(--accent); }
h3, h4 { margin: 10px 0 6px; }
h4 { font-size: 14px; }
p { margin: 6px 0; }
.dim { color: var(--dim); }
span.path { text-decoration: underline dotted; text-underline-offset: 2px; cursor: help; }
.small { font-size: 13px; }
.warn { color: var(--warn); }
.empty { color: var(--dim); }
.hidden { display: none !important; }
header.top { display: flex; align-items: center; gap: 8px 14px; flex-wrap: wrap; padding: 8px 16px; background: var(--panel); border-bottom: 1px solid var(--line); }
header.top h1 { font-size: 17px; margin: 0; letter-spacing: .01em; }
header.top .where { flex: 1; min-width: 160px; color: var(--dim); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
nav.pages { display: flex; gap: 4px; flex-wrap: wrap; }
nav.pages button { background: none; border: 1px solid transparent; border-radius: 6px; padding: 4px 10px; cursor: pointer; min-height: 32px; }
nav.pages button[aria-current="page"] { border-color: var(--line); background: var(--panel2); font-weight: 600; }
.btn { padding: 5px 12px; min-height: 34px; border-radius: 7px; border: 1px solid var(--line); background: var(--panel); cursor: pointer; }
.btn:hover { background: var(--panel2); }
.btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; font-weight: 600; }
:root[data-theme="dark"] .btn.primary { color: #0d1526; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .btn.primary { color: #0d1526; } }
.btn.danger { border-color: var(--bad); color: var(--bad); }
.btn.quiet { border-color: transparent; color: var(--dim); }
.btn[disabled] { opacity: .5; cursor: default; }
button.link { background: none; border: 0; color: var(--accent); cursor: pointer; padding: 0 2px; font-size: 13px; text-decoration: underline; }
.row { display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: center; margin: 8px 0; }
.row.end { justify-content: flex-end; }
input[type=text], input[type=password], input[type=url], input[type=number], select, textarea { padding: 6px 8px; border-radius: 7px; border: 1px solid var(--line); background: var(--bg); min-height: 34px; max-width: 100%; }
.row input[type=text] { flex: 1; min-width: 160px; }
label.field { display: flex; flex-direction: column; gap: 3px; margin: 8px 0; }
label.field > span { font-weight: 600; font-size: 14px; }
label.field small { color: var(--dim); }
label.field.bool { flex-direction: row; align-items: center; flex-wrap: wrap; gap: 8px; }
label.inline { display: inline-flex; gap: 6px; align-items: center; }
.tag { font-weight: 400; font-size: 12px; color: var(--dim); border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; margin-left: 4px; }
main.split { flex: 1 1 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 40%); grid-template-rows: minmax(0, 1fr); gap: 12px; padding: 12px 16px; min-height: 0; }
body.fixed { height: 100vh; overflow: hidden; }
.convo, .side { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; min-width: 0; min-height: 0; display: flex; flex-direction: column; box-shadow: var(--shadow); }
#scroll { flex: 1; overflow: auto; padding: 12px 16px; min-height: 0; }
.msg { margin: 12px 0; }
.msg.user { display: flex; justify-content: flex-end; }
.msg.user .bubble { background: var(--user); border-radius: 14px 14px 4px 14px; padding: 8px 12px; max-width: 85%; white-space: pre-wrap; overflow-wrap: anywhere; }
.msg.agent { overflow-wrap: anywhere; }
.msg.agent code, .block code { font: 13px ui-monospace, Menlo, monospace; background: var(--code-bg); padding: 0 3px; border-radius: 3px; }
.line { margin: 3px 0; font-size: 14px; overflow-wrap: anywhere; }
.line.dim { color: var(--dim); }
.line.red { color: var(--bad); }
.line.green { color: var(--ok); }
.line.yellow { color: var(--warn); }
.line.cyan { color: var(--accent); }
.line.magenta { color: var(--mag); }
.line .sym { display: inline-block; width: 1.2em; text-align: center; }
details.house summary { cursor: pointer; list-style: none; }
details.house summary::-webkit-details-marker { display: none; }
details.house summary::after { content: " (show)"; font-size: 12px; text-decoration: underline; }
details.house[open] summary::after { content: " (hide)"; }
details.house .sub { margin: 4px 0 8px 1.2em; padding-left: 10px; border-left: 2px solid var(--line); }
.step { overflow-wrap: anywhere; margin: 10px 0; padding: 8px 12px; border: 1px solid var(--line); border-left: 4px solid var(--ok); border-radius: 8px; background: var(--panel); }
.step.bad { border-left-color: var(--bad); background: var(--bad-bg); }
.step.minor { border-left-width: 1px; padding: 4px 10px; font-size: 14px; }
.step .badge { font-weight: 700; color: var(--ok); margin-right: 4px; }
.step.bad .badge { color: var(--bad); }
.block { margin: 10px 0; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel2); }
.block h4 { margin-top: 2px; }
pre { margin: 6px 0; padding: 8px 10px; background: var(--code-bg); border: 1px solid var(--line); border-radius: 6px; white-space: pre-wrap; overflow-wrap: anywhere; overflow-x: hidden; overflow-y: auto; max-height: 360px; font: 12.5px/1.45 ui-monospace, Menlo, monospace; }
table { border-collapse: collapse; font-size: 13.5px; margin: 6px 0; width: 100%; }
th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--line); vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
th { color: var(--dim); font-weight: 600; }
.convo, .side, main.page, dialog { container-type: inline-size; }
@container (max-width: 620px) {
  table.stack thead { display: none; }
  table.stack, table.stack tbody, table.stack tr, table.stack td { display: block; width: 100%; }
  table.stack tr { border: 1px solid var(--line); border-radius: 8px; margin: 0 0 8px; padding: 4px 8px; background: var(--panel); }
  table.stack td { border: 0; padding: 2px 0; display: grid; grid-template-columns: minmax(80px, 38%) 1fr; gap: 8px; }
  table.stack td::before { content: attr(data-label); color: var(--dim); font-weight: 600; overflow-wrap: anywhere; }
}
.decision { border-bottom: 1px solid var(--line); padding: 8px 0; }
.decision .row { margin: 4px 0; }
ol.steps { padding-left: 0; list-style: none; margin: 0; }
ol.steps li { border-left: 4px solid var(--ok); padding: 4px 10px; margin: 0 0 8px; background: var(--panel2); border-radius: 0 8px 8px 0; overflow-wrap: anywhere; }
ol.steps li.stale { border-left-color: var(--warn); }
ol.steps li.rewound { border-left-color: var(--stale); opacity: .7; }
ol.rewind { list-style: none; padding: 0; margin: 0 0 8px; }
ol.rewind .btn { width: 100%; text-align: left; margin: 2px 0; white-space: normal; }
* { scrollbar-width: thin; scrollbar-color: transparent transparent; }
*:hover, *:focus-within { scrollbar-color: var(--line) transparent; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: transparent; border-radius: 8px; }
*:hover::-webkit-scrollbar-thumb { background: var(--line); }
.images { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.thumb { padding: 0; border: 1px solid var(--line); border-radius: 6px; background: var(--code-bg); cursor: zoom-in; }
.thumb img { display: block; max-width: min(260px, 100%); max-height: 200px; border-radius: 6px; }
ul.files { margin: 4px 0; padding-left: 18px; font-size: 14px; }
.card { margin: 12px 0; padding: 10px 14px; border: 2px solid var(--accent); border-radius: 12px; background: var(--panel); }
.card h3 { margin: 0 0 6px; font-size: 15.5px; }
.card.yellow { border-color: var(--warn); }
.card.yellow h3 { color: var(--warn); }
.card.magenta { border-color: var(--mag); }
.card.magenta h3 { color: var(--mag); }
.card.green { border-color: var(--ok); }
.card.green h3 { color: var(--ok); }
.card.cyan h3 { color: var(--accent); }
.card.red { border-color: var(--bad); }
.card.red h3 { color: var(--bad); }
.card .opts { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.card .opts.col { flex-direction: column; align-items: flex-start; }
.card .evidence { background: var(--panel2); border-radius: 6px; padding: 6px 8px; white-space: pre-wrap; }
.card .touches { font-weight: 600; }
.card .sheetwrap { overflow: auto; max-height: 50vh; max-width: 100%; border: 1px solid var(--line); border-radius: 6px; margin: 6px 0; }
.card table.sheet { border-collapse: collapse; font-size: 13px; }
.card table.sheet th { position: sticky; top: 0; background: var(--panel2); text-align: left; padding: 4px 6px; }
.card table.sheet td { padding: 2px 4px; border-top: 1px solid var(--line); }
.card table.sheet input { width: 100%; min-width: 7em; font: inherit; }
.card details.datacheck { margin: 6px 0; }
.card ul.warn { padding-left: 20px; }
.card .args { font: 13px ui-monospace, Menlo, monospace; padding-left: 18px; overflow-wrap: anywhere; }
.card.active { box-shadow: 0 0 0 3px var(--accent-bg); }
.card:focus { outline: none; }
.card .btn.sel { outline: 3px solid var(--focus); outline-offset: 1px; }
.card .cardmsg { color: var(--bad); font-weight: 600; }
.card .sub-q { border-top: 1px solid var(--line); margin-top: 10px; padding-top: 6px; }
.card .def { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line); padding: 4px 0; }
.card .def .row { margin: 0; }
.card .def button[aria-pressed="true"] { color: var(--ok); }
.plantext ul { margin: 4px 0; padding-left: 20px; }
.plantext.details { border-top: 1px solid var(--line); margin-top: 6px; }
button.num { min-width: 24px; height: 22px; padding: 0 6px; border-radius: 11px; border: 1px solid var(--accent); background: var(--accent-bg); color: var(--accent); font-weight: 700; font-size: 12.5px; cursor: pointer; vertical-align: 1px; }
ul.items { list-style: none; padding: 0; margin: 4px 0; }
ul.items li { margin: 4px 0; overflow-wrap: anywhere; }
.finding { border-left: 4px solid var(--accent); padding: 4px 10px; margin: 8px 0; }
.finding.error { border-left-color: var(--bad); }
.finding.warning { border-left-color: var(--warn); }
#statusline { display: flex; align-items: center; gap: 10px; padding: 6px 16px; border-top: 1px solid var(--line); font-size: 14px; color: var(--dim); min-height: 40px; flex-wrap: wrap; }
#statusline .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--line); flex: none; }
#statusline.busy .dot { background: var(--accent); animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { opacity: .3; } }
@media (prefers-reduced-motion: reduce) { #statusline.busy .dot { animation: none; } }
#statustext { flex: 1; min-width: 0; color: var(--ink); }
form.composer { padding: 8px 12px 12px; border-top: 1px solid var(--line); }
form.composer textarea { width: 100%; resize: vertical; min-height: 46px; max-height: 40vh; }
#suggest { list-style: none; margin: 4px 0; padding: 0; max-height: 200px; overflow: auto; }
#suggest li button { width: 100%; text-align: left; background: none; border: 0; padding: 4px 6px; cursor: pointer; border-radius: 5px; }
#suggest li button:hover, #suggest li button.on { background: var(--panel2); }
#queue { font-size: 13px; color: var(--dim); }
.side .tabs { display: flex; border-bottom: 1px solid var(--line); overflow-x: auto; }
.side .tabs button { flex: 1; padding: 10px 6px; background: none; border: 0; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--dim); white-space: nowrap; }
.side .tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--accent); }
#tabbody { flex: 1; overflow: auto; padding: 10px 14px; min-height: 0; }
iframe.graph { width: 100%; height: 520px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); }
table.decisions select, table.decisions input { max-width: 150px; }
.notice.warn { background: var(--warn-bg); border: 1px solid var(--warn); border-radius: 8px; padding: 6px 10px; }
.rerun { margin: 6px 0; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); }
.rerun table.changes td:not(:first-child), .rerun table.changes th:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
.status-line ul { margin: 4px 0 6px; padding-left: 18px; }
main.page { flex: 1; padding: 16px; max-width: 900px; width: 100%; margin: 0 auto; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 12px 16px; margin: 0 0 14px; box-shadow: var(--shadow); }
${SETTINGS_CSS}
ul.scards, ul.dirs { list-style: none; margin: 0; padding: 0; }
.sfilter { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 12px; }
.sfilter input { flex: 1; min-width: 180px; padding: 6px 8px; border-radius: 7px; border: 1px solid var(--line); background: var(--bg); min-height: 36px; }
ul.scards li { margin: 0 0 8px; }
.scard { display: flex; gap: 12px; width: 100%; text-align: left; align-items: flex-start; padding: 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); cursor: pointer; }
.scard:hover { border-color: var(--accent); }
.scard[disabled] { opacity: .6; cursor: default; }
.scard img, .scard .nothumb { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid var(--line); flex: none; background: var(--panel2); }
.sbody { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.stitle { font-weight: 650; overflow-wrap: anywhere; }
.sdesc { color: var(--ink); font-size: 14px; overflow-wrap: anywhere; }
.smeta { color: var(--dim); font-size: 13px; overflow-wrap: anywhere; }
.sstatus { font-weight: 600; }
.sstatus.waiting-for-you { color: var(--mag); }
.sstatus.running { color: var(--accent); }
.sstatus.answered { color: var(--ok); }
@media (max-width: 480px) { .scard img, .scard .nothumb { width: 52px; height: 52px; } }
ul.dirs li button { background: none; border: 0; padding: 5px 6px; cursor: pointer; width: 100%; text-align: left; border-radius: 5px; overflow-wrap: anywhere; }
ul.dirs li button:hover { background: var(--panel2); }
button.modelchoice { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; padding: 10px 12px; margin: 0 0 8px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); cursor: pointer; }
button.modelchoice:hover, button.modelchoice[aria-pressed="true"] { border-color: var(--accent); }
button.modelchoice[aria-pressed="true"] { background: var(--accent-bg); }
ul.checks { list-style: none; padding: 0; margin: 4px 0; }
ul.checks li { padding: 4px 0; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; }
ul.checks code { font: 12.5px ui-monospace, Menlo, monospace; background: var(--code-bg); padding: 0 4px; border-radius: 3px; overflow-wrap: anywhere; }
.cstat { display: inline-block; min-width: 4.5em; font-weight: 700; font-size: 12px; text-transform: uppercase; }
li.ok .cstat, .okline { color: var(--ok); }
li.missing .cstat { color: var(--bad); }
li.old .cstat { color: var(--warn); }
.modemenu { position: relative; }
.modebtn { display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); cursor: pointer; }
.modebtn:hover, .modebtn[aria-expanded="true"] { background: var(--panel2); }
.modebtn svg { color: var(--dim); }
.modelist { position: absolute; right: 0; top: calc(100% + 6px); z-index: 20; list-style: none; margin: 0; padding: 6px; min-width: 240px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.18); }
.modelist li { display: flex; flex-direction: column; gap: 1px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
.modelist li:hover { background: var(--panel2); }
.modelist li span { color: var(--dim); font-size: 12.5px; }
.modelist li[aria-selected="true"] { background: var(--accent-bg); }
.modelist li[aria-selected="true"] b { color: var(--accent); }
select:not(.hidden) { appearance: none; -webkit-appearance: none; padding-right: 28px; background: var(--bg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center; }
.btn.big { font-size: 16px; padding: 12px 22px; min-height: 48px; }
.pathrow { display: flex; gap: 6px; flex-wrap: wrap; }
.pgroup h3 { margin: 14px 0 6px; font-size: 15px; }
ul.plist { list-style: none; margin: 0; padding: 0; }
li.prow { border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; margin: 0 0 8px; background: var(--panel); min-width: 0; }
li.prow.off { opacity: .75; }
.phead { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.pname { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.pstat { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .02em; }
.pstat.ok { color: var(--ok); }
.pstat.bad { color: var(--bad); }
.pstat.warn { color: var(--warn); }
.pstat.none { color: var(--dim); }
.tag.warn { color: var(--warn); border-color: var(--warn); }
.pwarn { color: var(--warn); }
.pmeta, .pdetail { overflow-wrap: anywhere; margin: 2px 0; }
.pacts { margin: 6px 0 0; }
.pacts .btn { min-height: 30px; padding: 3px 10px; }
details.pmore { display: inline-block; }
details.pmore summary { cursor: pointer; color: var(--accent); font-size: 14px; padding: 4px 6px; list-style: none; }
details.pmore summary::-webkit-details-marker { display: none; }
details.pmore summary::after { content: " \25BE"; }
details.pmore[open] { display: block; flex-basis: 100%; }
dialog#progdlg { width: min(640px, 96vw); }
#progdlg pre { max-height: 220px; }
#progdlg .pcmd { display: flex; gap: 6px; align-items: flex-start; }
#progdlg .pcmd pre { flex: 1; min-width: 0; margin: 0; }
#progdlg ul { padding-left: 18px; margin: 6px 0; }
#progdlg li { overflow-wrap: anywhere; }
#progdlg.danger h3 { color: var(--bad); }
.pathrow input { flex: 1; min-width: 180px; }
#toast { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--bg); padding: 8px 14px; border-radius: 8px; max-width: 90vw; z-index: 20; }
dialog { border: 1px solid var(--line); border-radius: 10px; background: var(--panel); color: var(--ink); max-width: 96vw; max-height: 94vh; padding: 10px; }
dialog::backdrop { background: rgba(0,0,0,.6); }
dialog img { max-width: 92vw; max-height: 82vh; display: block; }
dialog#wide { width: 96vw; }
dialog#folderdlg { width: min(720px, 96vw); }
ul.dirs li button .dim { margin-left: 6px; }
#widebody { overflow-y: auto; overflow-x: hidden; max-height: 80vh; }
.mobile-switch { display: none; }
@media (max-width: 900px) {
  body.fixed { height: auto; overflow: visible; }
  main.split { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto; padding: 8px; }
  .convo { min-height: 70vh; }
  #scroll { max-height: none; }
  form.composer { position: sticky; bottom: 0; background: var(--panel); border-radius: 0 0 10px 10px; }
  #tabbody { max-height: none; }
  iframe.graph { height: 420px; }
  header.top .where { order: 3; flex-basis: 100%; }
  .card { padding: 8px 10px; }
  .msg.user .bubble { max-width: 95%; }
}
</style>
</head>
<body>
<header class="top">
  <h1>Cuvette</h1>
  <span class="where" id="where"></span>
  <nav class="pages" aria-label="Pages">
    <button type="button" data-page="session" id="nav-session">Analysis</button>
    <button type="button" data-page="sessions">Sessions</button>
    <button type="button" data-page="programs">Programs</button>
    <button type="button" data-page="settings">Settings</button>
  </nav>
  <div class="modemenu hidden" id="modewrap">
    <button type="button" class="modebtn" id="modebtn" aria-haspopup="listbox" aria-expanded="false" aria-label="Mode"><span class="dim small">Mode</span> <b id="modelabel">Watch</b><svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    <ul class="modelist hidden" id="modelist" role="listbox" aria-label="Mode"></ul>
    <select id="mode" class="hidden" aria-hidden="true" tabindex="-1"><option value="watch"></option><option value="follow"></option><option value="teach"></option><option value="plan"></option></select>
  </div>
  <span class="tag hidden" id="bypass">bypass permissions</span>
  <span class="tag hidden" id="usage"></span>
</header>

<main class="split hidden" id="p-session">
  <section class="convo" aria-label="Conversation">
    <div id="scroll" aria-live="polite">
      <div id="items"></div>
      <div id="pending"></div>
      <div id="live" class="msg agent"></div>
      <div id="cards"></div>
    </div>
    <div id="statusline" role="status"><span class="dot" aria-hidden="true"></span><span id="statustext">Ready.</span><button type="button" class="link hidden" id="showq">Show the open decisions</button><button type="button" class="btn danger hidden" id="stop">Stop</button></div>
    <form class="composer" id="composer">
      <label for="msg" class="dim small" id="msglabel">Your message</label>
      <textarea id="msg" rows="2" placeholder="Ask for an analysis, or type / for commands"></textarea>
      <ul id="suggest" class="hidden" role="listbox" aria-label="Commands"></ul>
      <div id="queue"></div>
      <div class="row end">
        <button type="button" class="btn hidden" id="sendnow" title="Stops the current step and sends your message now. The same as starting a message with ! in the terminal.">Stop and send now</button>
        <button type="submit" class="btn primary" id="send">Send</button>
      </div>
    </form>
  </section>
  <aside class="side" aria-label="Analysis details">
    <div class="tabs" role="tablist" id="tabs">
      <button type="button" role="tab" data-tab="analysis" aria-selected="true">Analysis</button>
      <button type="button" role="tab" data-tab="results" aria-selected="false">Results</button>
      <button type="button" role="tab" data-tab="decisions" aria-selected="false">Decisions</button>
      <button type="button" role="tab" data-tab="record" aria-selected="false">Record</button>
    </div>
    <div id="tabbody" role="tabpanel"></div>
  </aside>
</main>

<main class="page hidden" id="p-start">
  <div class="panel">
    <h2>Analyze your data</h2>
    <p>Choose the folder that holds your data. Cuvette does not change your files. It writes the results to a new folder inside it.</p>
    <div id="chooser"></div>
    <p class="cardmsg" id="starterr" role="alert"></p>
  </div>
  <div class="panel">
    <h3>No data ready? Try the sample</h3>
    <p>The sample is a sleep study: 10 patients, two drugs, hours of extra sleep. It takes about 2 minutes.</p>
    <button type="button" class="btn" data-sample="1">Run the sample analysis</button>
  </div>
  <div class="panel"><h3>Recent sessions</h3><div id="startsessions"></div></div>
</main>

<main class="page hidden" id="p-setup">
  <div class="panel">
    <h2>Welcome to Cuvette</h2>
    <p>Cuvette analyzes your data in the programs you already use. You make each method decision. Cuvette records each step and each number.</p>
    <h3>1. Choose the model that does the analysis</h3>
    <div id="choices"></div>
    <div id="claudebox" class="hidden">
      <p class="dim small">Paste your key. The app checks it with Anthropic, then saves it in a file that only your user can read.</p>
      <details id="keyguide"><summary>How do I get a key?</summary><div id="keyguidebody" class="small"></div></details>
      <div class="row"><input type="password" id="setupkey" autocomplete="off" aria-label="Claude API key" placeholder="sk-ant-..."><button type="button" class="btn primary" id="savekey">Save the key</button></div>
    </div>
    <div id="localbox" class="hidden"><div id="models"></div></div>
    <p class="cardmsg" id="setuperr" role="alert"></p>
    <div class="row"><button type="button" class="btn quiet" data-page-go="start">Leave setup</button></div>
    <p class="dim small">Model now: <span id="setupmodel"></span></p>
  </div>
  <div class="panel hidden" id="checkpanel">
    <h3>2. Check this computer</h3>
    <div id="doctorbody"><p class="dim">Checking the programs that Cuvette uses. This takes about 15 seconds.</p></div>
    <div class="row"><button type="button" class="btn quiet" data-doctor-all="1">Show the full list</button></div>
  </div>
  <div class="panel hidden" id="samplepanel">
    <h3>3. Run the sample analysis</h3>
    <p>The sample is a public data set: extra sleep of 10 patients with two drugs (Student, 1908). It takes about 2 minutes. The app copies it to <span id="samplefolder"></span>.</p>
    <div class="row"><button type="button" class="btn primary" data-sample="1">Run the sample analysis</button><button type="button" class="btn" data-page-go="start">Open my own folder</button></div>
  </div>
</main>

<main class="page wide hidden" id="p-settings">
  <div class="panel"><h2>Settings</h2><p class="dim small">The same settings as /config in the terminal. Each change goes in the record.</p><div id="settingsbody"></div></div>
  <div class="panel"><h3>Programs on this computer</h3><p class="dim small">The same check as cuvette doctor in the terminal.</p><div id="doctorbody2"></div><div class="row"><button type="button" class="btn" data-doctor="doctorbody2">Check this computer</button><button type="button" class="btn quiet" data-doctor="doctorbody2" data-doctor-all="1">Show the full list</button></div></div>
</main>

<main class="page hidden" id="p-programs">
  <div class="panel">
    <div class="row" style="justify-content: space-between"><h2 style="margin:0">Programs</h2><span><button type="button" class="btn" id="progaddbtn">Add an adapter</button> <button type="button" class="btn" id="progcheck">Check all again</button></span></div>
    <p class="dim small">The programs that the adapters use, grouped by field. The same list as /programs in the terminal and cuvette programs. Each change asks first and shows what it does. It goes in the programs log and in the session record.</p>
    <div id="programsbody"><p class="dim">Looking for the programs...</p></div>
  </div>
</main>

<dialog id="progdlg" aria-labelledby="progtitle">
  <h3 id="progtitle" style="margin-top:0"></h3>
  <p class="cardmsg" id="progrefused" role="alert"></p>
  <div id="progpath" class="hidden"><label class="field"><span>Path of the program, or of the folder that holds it</span><input type="text" id="progpathin" placeholder="~/Applications/Fiji.app"></label><div class="row"><button type="button" class="btn" id="progpathcheck">Check this path</button></div></div>
  <div id="progadd" class="hidden"><label class="field"><span>Address of a repository, a folder, a zip file, or the name of an adapter in the registry</span><input type="text" id="progaddin" placeholder="https://github.com/name/adapter.git"></label><div class="row"><button type="button" class="btn" id="progaddcheck">Check the adapter</button></div></div>
  <ul id="proglines"></ul>
  <div id="progcmdwrap" class="hidden"><div class="small dim">Command</div><div class="pcmd"><pre id="progcmd"></pre><button type="button" class="btn" id="progcopy">Copy</button></div></div>
  <p id="proglinkwrap" class="hidden small">Link: <a id="proglink" target="_blank" rel="noopener"></a> <button type="button" class="link" id="proglinkcopy">Copy</button></p>
  <pre id="proglog" class="hidden" aria-live="polite"></pre>
  <p id="progresult" role="status"></p>
  <div class="row end"><button type="button" class="btn quiet" id="progcancel">Cancel</button><button type="button" class="btn hidden" id="progreview">Review</button><button type="button" class="btn primary hidden" id="progok">Confirm</button></div>
</dialog>

<main class="page hidden" id="p-sessions">
  <div class="panel">
    <div class="row" style="justify-content: space-between"><h2 style="margin:0">Sessions</h2><button type="button" class="btn primary" id="openfolder">Open a folder</button></div>
    <p class="dim small">Newest first. Choose one to continue it. A session that you start here also opens in the terminal with cuvette --resume, and the other way.</p>
    <div id="sessionsbody"></div>
  </div>
</main>
<dialog id="folderdlg" aria-label="Open a folder"><div class="row" style="justify-content: space-between"><h3 style="margin:0">Open a folder</h3><form method="dialog"><button class="btn quiet" type="submit">Close</button></form></div><p class="dim small">Choose the folder with your data. The results go in a new folder inside it.</p><div id="chooser2"></div></dialog>

<dialog id="lightbox" aria-label="Image"><form method="dialog" class="row end"><button class="btn" type="submit">Close</button></form><img id="lightimg" alt=""></dialog>
<dialog id="wide" aria-label="Table"><form method="dialog" class="row end"><button class="btn" type="submit">Close</button></form><div id="widebody"></div></dialog>
<div id="toast" class="hidden" role="status"></div>

<script>
const TOKEN = __TOKEN__;
const $ = (id) => document.getElementById(id);
const withT = (p) => p + (p.indexOf("?") >= 0 ? "&" : "?") + "t=" + encodeURIComponent(TOKEN);
async function call(path, body) {
  const r = await fetch(withT(path), body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json", "x-token": TOKEN }, body: JSON.stringify(body) });
  const type = r.headers.get("content-type") || "";
  const data = type.indexOf("json") >= 0 ? await r.json() : await r.text();
  if (!r.ok) throw new Error((data && data.error) || data.text || ("HTTP " + r.status));
  return data;
}
function midText(t, n) { if (t.length <= n) return t; const k = Math.floor((n - 1) / 2); return t.slice(0, k) + "…" + t.slice(t.length - k); }
function setWhere(t) { const w = $("where"); w.title = t; w.textContent = midText(t, window.innerWidth < 600 ? 48 : 90); }
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add("hidden"), 4000);
}

const desktop = window.cuvetteDesktop;
const bridge = {
  chooseFolder: desktop && desktop.chooseFolder ? (start) => desktop.chooseFolder(start) : null,
  reveal: (path) => (desktop && desktop.reveal ? desktop.reveal(path) : call("api/reveal", { path: path })),
  notify: (title, body) => {
    if (desktop && desktop.notify) return desktop.notify(title, body);
    if ("Notification" in window && Notification.permission === "granted") { try { new Notification(title, { body: body }); } catch (e) {} }
  },
  saveFile: desktop && desktop.saveFile ? (url, name) => desktop.saveFile(new URL(url, location.href).href, name) : null,
};
function askNotify() {
  if (!desktop && "Notification" in window && Notification.permission === "default") { try { Notification.requestPermission(); } catch (e) {} }
}

let state = null;
let page = new URLSearchParams(location.search).get("page") || "session";
const OWN_PAGES = ["settings", "sessions", "programs"];
let tab = "analysis";
let status = { state: "idle" };
let es = null;
let commands = [];
let sugg = [];
let suggSel = 0;

function show(p) {
  const changed = p !== page;
  page = p;
  if (changed) window.scrollTo(0, 0);
  document.body.classList.toggle("fixed", p === "session");
  for (const id of ["session", "start", "setup", "settings", "sessions", "programs"]) $("p-" + id).classList.toggle("hidden", id !== p);
  for (const b of document.querySelectorAll("nav.pages button")) b.setAttribute("aria-current", b.dataset.page === p || (!OWN_PAGES.includes(p) && b.dataset.page === "session") ? "page" : "false");
  if (p === "settings") loadSettings();
  if (p === "programs") loadPrograms();
  if (p === "sessions") loadSessions($("sessionsbody"));
  if (p === "start") { loadSessions($("startsessions")); chooser($("chooser")); }
  if (p === "session") loadTab();
}

async function boot() {
  state = await call("api/state");
  $("modewrap").classList.toggle("hidden", !state.session);
  setWhere(state.session ? (state.session.folderLine || state.session.folderShown) + " · " + state.session.model : "No session open");
  if (state.session) show(OWN_PAGES.includes(page) ? page : "session");
  else if (state.setup || page === "setup") { show("setup"); if (!fstate) setupPage(); }
  else {
    if (state.opening) { $("starterr").textContent = "Opening the session..."; setTimeout(boot, 800); }
    else $("starterr").textContent = state.error || "";
    show(OWN_PAGES.includes(page) ? page : "start");
  }
  connect();
}

function connect() {
  if (es) es.close();
  es = new EventSource(withT("events"));
  es.onmessage = (ev) => handle(JSON.parse(ev.data));
}

let follow = true;
let autoScroll = 0;
$("scroll").addEventListener("scroll", () => {
  if (Date.now() - autoScroll < 150) return;
  const sc = $("scroll");
  follow = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80;
});
window.addEventListener("resize", () => { if (follow) stick(() => {}); });
function stick(fn) {
  fn();
  if (!follow) return;
  autoScroll = Date.now();
  const sc = $("scroll");
  sc.scrollTop = sc.scrollHeight;
}

function handle(m) {
  if (m.t === "switch") { es.close(); es = null; setTimeout(boot, 150); return; }
  if (m.t === "none") return;
  if (m.t === "reset") {
    if (!state || !state.session) { boot(); return; }
    stick(() => {
      $("items").innerHTML = m.items;
      $("pending").innerHTML = m.pending;
      $("live").textContent = m.live || "";
      $("cards").innerHTML = m.cards;
    });
    focusCard();
    cfgApply();
    setStatus(m.status);
    follow = true;
    stick(() => {});
    return;
  }
  if (m.t === "append") stick(() => $("items").insertAdjacentHTML("beforeend", m.html));
  else if (m.t === "pending") stick(() => { $("pending").innerHTML = m.html; });
  else if (m.t === "cards") { stick(() => { $("cards").innerHTML = m.html; }); drawStatus(); focusCard(); cfgApply(); }
  else if (m.t === "live") stick(() => { if (m.reset) $("live").textContent = ""; else $("live").textContent += m.text; });
  else if (m.t === "status") setStatus(m);
  else if (m.t === "changed") loadTab(true);
  else if (m.t === "notify") { if (!m.quiet || document.hidden) bridge.notify(m.title, m.body); }
}

function activeCard() {
  const cs = [...document.querySelectorAll("#cards [data-card]")];
  return cs.find((c) => c.querySelector(".opts .btn")) || cs[0] || null;
}
function optionButtons(card) {
  const sub = card.querySelector(".sub-q") || card;
  const opts = [...sub.querySelectorAll(".opts .btn")];
  return opts.length ? opts : [...card.querySelectorAll(".row .btn")].filter((b) => !b.classList.contains("quiet"));
}
function markSel(card, i) {
  const bs = optionButtons(card);
  bs.forEach((b, j) => b.classList.toggle("sel", j === i));
  card.dataset.sel = String(i);
}
let cardEl = null, cardAt = 0, manyDigits = "";
function focusCard() {
  const card = activeCard();
  for (const c of document.querySelectorAll("#cards [data-card]")) c.classList.toggle("active", c === card);
  if (!card) return;
  if (card.dataset.card !== cardEl) { cardEl = card.dataset.card; cardAt = Date.now(); }
  const bs = optionButtons(card);
  markSel(card, Math.max(0, bs.findIndex((b) => b.classList.contains("primary"))));
  const a = document.activeElement;
  const typing = a && (a.tagName === "INPUT" || a.tagName === "SELECT" || a.tagName === "TEXTAREA");
  if (!typing && page === "session") { card.tabIndex = -1; card.focus({ preventScroll: true }); }
}
document.addEventListener("keydown", (e) => {
  if (page !== "session" || e.metaKey || e.ctrlKey || e.altKey) return;
  const a = document.activeElement;
  if (a && (a.tagName === "INPUT" || a.tagName === "SELECT" || a.tagName === "TEXTAREA")) return;
  if (document.querySelector("dialog[open]")) return;
  const card = activeCard();
  if (!card) return;
  if (card.dataset.card === cardEl && Date.now() - cardAt < 400) return;
  const bs = optionButtons(card);
  let i = Number(card.dataset.sel || 0);
  if (/^[1-9]$/.test(e.key) && !card.querySelector(".opts .btn")) { const chip = [...card.querySelectorAll("button.num")].find((b) => b.textContent === e.key); if (chip) { e.preventDefault(); chip.click(); } return; }
  if (bs.length >= 10 && /^[0-9]$/.test(e.key)) {
    const n = Number(manyDigits + e.key);
    manyDigits = n >= 1 && n <= bs.length ? manyDigits + e.key : e.key;
    if (bs[Number(manyDigits) - 1]) { e.preventDefault(); markSel(card, Number(manyDigits) - 1); }
    return;
  }
  manyDigits = "";
  if (/^[1-9]$/.test(e.key)) { const b = bs[Number(e.key) - 1]; if (b) { e.preventDefault(); markSel(card, Number(e.key) - 1); b.click(); } return; }
  const nav = (act) => card.querySelector('[data-act="' + act + '"]');
  if (e.key === "ArrowLeft" && nav("back")) { e.preventDefault(); nav("back").click(); return; }
  if (e.key === "ArrowRight" && nav("next")) { e.preventDefault(); nav("next").click(); return; }
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); markSel(card, (i + 1) % bs.length); return; }
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); markSel(card, (i + bs.length - 1) % bs.length); return; }
  if (e.key === "Enter" && bs[i]) { e.preventDefault(); bs[i].click(); return; }
  if (e.key === "Escape") {
    const back = card.querySelector('[data-act="later"], [data-act="skip"], [data-plan*="back"], [data-plan*="later"]');
    if (back) { e.preventDefault(); back.click(); }
  }
});

function elapsed(s) { return s < 60 ? s + " s" : Math.floor(s / 60) + " min " + (s % 60) + " s"; }
function drawStatus() {
  const busy = status.state && status.state !== "idle";
  $("statusline").classList.toggle("busy", !!busy);
  $("stop").classList.toggle("hidden", !busy);
  $("sendnow").classList.toggle("hidden", !busy || status.queueMode);
  let text = busy ? status.text : (status.openQuestions ? status.openQuestions + (status.openQuestions === 1 ? " decision waits for you." : " decisions wait for you.") : "Ready.");
  if (busy && status.since) text += " · " + elapsed(Math.max(0, Math.floor((Date.now() - status.since) / 1000)));
  if (busy && status.openQuestions) text += " · " + status.openQuestions + (status.openQuestions === 1 ? " decision waits for you" : " decisions wait for you");
  $("statustext").textContent = text;
  $("showq").classList.toggle("hidden", !status.openQuestions || !!document.querySelector('#cards [data-type="question"], #cards [data-type="plan"], #cards [data-type="clarify"]'));
}
function setStatus(m) {
  status = m;
  if (m.where) setWhere(m.where);
  setMode(m.mode);
  $("bypass").classList.toggle("hidden", !m.bypass);
  $("usage").classList.toggle("hidden", !m.usage);
  $("usage").textContent = m.usage || "";
  $("usage").title = m.usageLong || "";
  $("msg").placeholder = m.placeholder;
  $("send").textContent = m.state && m.state !== "idle" ? "Send after this step" : "Send";
  $("queue").textContent = (m.queue || []).map((q) => "Queued: " + q).join("\n");
  drawStatus();
}
setInterval(drawStatus, 1000);

async function post(path, body) {
  try { return await call(path, body); } catch (e) { toast(e.message); }
}

async function stopAgent() {
  const r = await post("api/stop", {});
  const back = ((r && r.dropped) || []).join("\n");
  if (back) $("msg").value = $("msg").value.trim() ? $("msg").value + "\n" + back : back;
}

async function send(text, now) {
  if (!text.trim()) return;
  askNotify();
  if (!state.session) { toast("Open a folder first."); return; }
  await post("api/send", { text: text, now: !!now });
}

$("composer").addEventListener("submit", (e) => {
  e.preventDefault();
  if (sugg.length && $("msg").value.indexOf(" ") < 0 && $("msg").value.startsWith("/") && !commands.some((c) => c.name === $("msg").value.slice(1))) { pickSuggest(suggSel); return; }
  const v = $("msg").value;
  $("msg").value = "";
  hideSuggest();
  send(v, false);
});
$("sendnow").addEventListener("click", () => { const v = $("msg").value; $("msg").value = ""; send(v, true); });
$("stop").addEventListener("click", () => stopAgent());
$("showq").addEventListener("click", () => send("/questions", false));
$("openfolder").addEventListener("click", () => { chooser($("chooser2")); $("folderdlg").showModal(); });
const MODES = [["watch", "Watch", "The agent runs the steps."], ["follow", "Follow", "You run the steps."], ["teach", "Teach", "You work. The agent checks."], ["plan", "Plan", "The agent plans only."]];
function setMode(v) {
  $("mode").value = v;
  $("modelabel").textContent = (MODES.find((m) => m[0] === v) || MODES[0])[1];
  for (const li of $("modelist").children) li.setAttribute("aria-selected", li.dataset.mode === v ? "true" : "false");
}
function toggleModes(open) {
  $("modelist").classList.toggle("hidden", !open);
  $("modebtn").setAttribute("aria-expanded", open ? "true" : "false");
}
for (const [v, name, help] of MODES) {
  const li = document.createElement("li");
  li.dataset.mode = v; li.setAttribute("role", "option");
  li.innerHTML = "<b></b><span></span>";
  li.firstChild.textContent = name; li.lastChild.textContent = help;
  li.addEventListener("click", () => { setMode(v); toggleModes(false); post("api/mode", { mode: v }); });
  $("modelist").append(li);
}
setMode("watch");
$("modebtn").addEventListener("click", (e) => { e.stopPropagation(); toggleModes($("modelist").classList.contains("hidden")); });
document.addEventListener("click", () => toggleModes(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleModes(false); });
$("msg").addEventListener("keydown", (e) => {
  if (sugg.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); suggSel = (suggSel + (e.key === "ArrowDown" ? 1 : sugg.length - 1)) % sugg.length; drawSuggest(); return; }
  if (sugg.length && e.key === "Tab") { e.preventDefault(); pickSuggest(suggSel); return; }
  if (e.key === "Escape") { if (sugg.length) hideSuggest(); else if (status.state !== "idle") stopAgent(); return; }
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("composer").requestSubmit(); }
});
$("msg").addEventListener("input", async () => {
  const v = $("msg").value;
  if (!v.startsWith("/") || v.indexOf(" ") >= 0) return hideSuggest();
  if (!commands.length) { try { commands = await call("api/commands"); } catch (e) {} }
  sugg = commands.filter((c) => c.name.startsWith(v.slice(1).toLowerCase())).slice(0, 8);
  suggSel = 0;
  drawSuggest();
});
function drawSuggest() {
  const ul = $("suggest");
  ul.replaceChildren();
  sugg.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = i === suggSel ? "on" : "";
    b.textContent = "/" + c.name + (c.args ? " " + c.args : "") + "  " + c.help;
    b.addEventListener("click", () => pickSuggest(i));
    const li = document.createElement("li");
    li.append(b);
    ul.append(li);
  });
  ul.classList.toggle("hidden", !sugg.length);
}
function hideSuggest() { sugg = []; drawSuggest(); }
function pickSuggest(i) {
  const c = sugg[i];
  if (!c) return;
  hideSuggest();
  if (c.args) { $("msg").value = "/" + c.name + " "; $("msg").focus(); }
  else { $("msg").value = ""; send("/" + c.name, false); }
}

function fields(root) {
  const out = {};
  for (const el of root.querySelectorAll("input[name], select[name], textarea[name]")) out[el.name] = el.type === "checkbox" ? el.checked : el.value;
  return out;
}

document.addEventListener("click", async (e) => {
  const t = e.target instanceof Element ? e.target : null;
  if (!t) return;
  const navb = t.closest("nav.pages button");
  if (navb) { show(navb.dataset.page === "session" && !state.session ? (state.setup ? "setup" : "start") : navb.dataset.page); return; }
  const wide = t.closest("[data-wide]");
  if (wide) { const tb = wide.closest("details").querySelector("table"); $("widebody").replaceChildren(tb.cloneNode(true)); $("wide").showModal(); return; }
  const thumb = t.closest(".thumb");
  if (thumb) { $("lightimg").src = thumb.dataset.full; $("lightimg").alt = thumb.title; $("lightbox").showModal(); return; }
  const rev = t.closest("[data-reveal]");
  if (rev) { try { await bridge.reveal(decodeURIComponent(rev.dataset.reveal)); } catch (err) { toast(err.message); } return; }
  const dl = t.closest("a[download]");
  if (dl && bridge.saveFile) { e.preventDefault(); bridge.saveFile(dl.getAttribute("href"), dl.getAttribute("download")); return; }
  const tb = t.closest("[data-tab]");
  if (tb) { tab = tb.dataset.tab; for (const b of document.querySelectorAll("[data-tab]")) b.setAttribute("aria-selected", b === tb ? "true" : "false"); loadTab(); return; }
  const accept = t.closest("[data-act=accept-def]");
  if (accept) { accept.setAttribute("aria-pressed", "true"); return; }
  const a = t.closest("[data-act]");
  const card = a && a.closest("[data-card]");
  if (a && card) {
    const body = { id: Number(card.dataset.card), act: a.dataset.act, value: a.dataset.value, qid: a.dataset.qid, fid: a.dataset.fid, fields: fields(card) };
    if (a.dataset.plan) body.plan = JSON.parse(a.dataset.plan);
    for (const b of card.querySelectorAll("button")) b.disabled = true;
    await post("api/act", body);
    for (const b of card.querySelectorAll("button")) b.disabled = false;
    return;
  }
  const pa = t.closest("[data-prog-act]");
  if (pa) { progAction(pa.closest("[data-prog]"), pa.dataset.progAct); return; }
  const ch = t.closest("[data-choice]");
  if (ch) { pickChoice(ch.dataset.choice); return; }
  const dd = t.closest("[data-doctor-all], [data-doctor]");
  if (dd) { doctor($(dd.dataset.doctor || "doctorbody"), !!dd.dataset.doctorAll); return; }
  const pg = t.closest("[data-page-go]");
  if (pg && pg.dataset.progStart) progStart = pg.dataset.progStart;
  if (pg) {
    if (pg.closest("#p-setup")) await post("api/leave-setup", {});
    if (state.folder && pg.closest("#samplepanel")) { await post("api/open", { folder: state.folder }); page = "session"; setTimeout(boot, 300); }
    else show(pg.dataset.pageGo);
    return;
  }
  const sample = t.closest("[data-sample]");
  if (sample) { askNotify(); await post("api/open", { sample: true }); page = "session"; setTimeout(boot, 300); return; }
  const os = t.closest("[data-open-session]");
  if (os) { await post("api/open", { id: os.dataset.openSession }); page = "session"; setTimeout(boot, 300); return; }
  const se = t.closest("[data-setting-edit]");
  if (se && se.dataset.settingEdit === "programs") { show("programs"); return; }
  if (se) {
    if (!state.session) { if (se.dataset.settingEdit === "key") { show("setup"); setupPage(); } else toast("Open a session first."); return; }
    send(se.dataset.settingEdit === "key" ? "/key" : "/eln setup", false);
    show("session");
    return;
  }
  const chg = t.closest("[data-change]");
  if (chg) { send("/change " + chg.dataset.change, false); return; }
  const ds = t.closest("[data-decision-save]");
  if (ds) {
    const row = ds.closest("[data-decision]");
    const el = row.querySelector("[name=value]");
    const v = el.type === "checkbox" ? String(el.checked) : el.tagName === "SELECT" ? String(Number(el.value) + 1) : el.value;
    send("/change " + ds.dataset.decisionSave + " " + v, false);
    return;
  }
  if (t.closest("[data-rerun]")) { send("/rerun", false); return; }
  const dc = t.closest("[data-command]");
  if (dc) { send(dc.dataset.command, false); return; }
  const dg = t.closest("[data-deck-go]");
  if (dg) { const row = dg.closest("[data-deck-row]"); send("/export images " + [...row.querySelectorAll("[data-deck]")].map((x) => x.value).filter(Boolean).join(" "), false); return; }
  if (t.closest("[data-export-go]")) { send("/export " + document.querySelector("[data-export]").value, false); return; }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.matches && (t.matches("[data-session-search]") || t.matches("[data-session-folder]"))) filterSessions(t.closest(".panel"));
});
function filterSessions(box) {
  const q = box.querySelector("[data-session-search]").value.trim().toLowerCase();
  const f = box.querySelector("[data-session-folder]").value;
  let n = 0;
  for (const li of box.querySelectorAll("ul.scards li")) {
    const ok = (!q || li.dataset.text.indexOf(q) >= 0) && (!f || li.dataset.folder === f);
    li.classList.toggle("hidden", !ok);
    if (ok) n++;
  }
  box.querySelector("[data-session-none]").classList.toggle("hidden", n > 0);
}

document.addEventListener("change", (e) => {
  if (e.target.matches && e.target.matches("[data-session-folder]")) return;
  const t = e.target;
  if (t.matches && t.matches("[data-plan-mode]")) {
    const card = t.closest("[data-card]");
    post("api/act", { id: Number(card.dataset.card), act: "plan", plan: { a: "mode", mode: t.value } });
  } else if (t.matches && t.matches("[data-owner]")) send("/owner " + t.dataset.owner + " " + t.value, false);
});

async function loadTab(quiet) {
  if (!state || !state.session || page !== "session") return;
  const body = $("tabbody");
  if (quiet && body.contains(document.activeElement) && document.activeElement !== body) return;
  let html;
  try { html = await call("api/tab?name=" + tab); } catch (e) { return; }
  const old = body.querySelector("iframe.graph");
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const fresh = tpl.content.querySelector("iframe.graph");
  if (old && fresh) fresh.replaceWith(old);
  body.replaceChildren(tpl.content);
}

${SETTINGS_JS}
async function loadSessions(box) {
  try { box.innerHTML = await call("api/sessions"); } catch (e) { box.textContent = e.message; }
}

async function chooser(box) {
  const start = state ? state.folder || state.start : "";
  box.innerHTML = "";
  if (bridge.chooseFolder) {
    const pick = document.createElement("button");
    pick.type = "button"; pick.className = "btn primary big"; pick.textContent = "Choose a folder...";
    const note = document.createElement("p");
    note.className = "cardmsg";
    pick.addEventListener("click", async () => {
      const f = await bridge.chooseFolder(start);
      if (!f) return;
      askNotify();
      pick.disabled = true;
      try { await call("api/open", { folder: f }); const d = box.closest("dialog"); if (d) d.close(); page = "session"; note.textContent = "Opening..."; setTimeout(boot, 300); }
      catch (err) { pick.disabled = false; note.textContent = err.message; }
    });
    box.append(pick, note);
    return;
  }
  const row = document.createElement("div");
  row.className = "pathrow";
  const input = document.createElement("input");
  input.type = "text";
  input.value = start;
  input.setAttribute("aria-label", "Folder");
  input.placeholder = "Folder, for example ~/Data/experiment-12";
  const go = document.createElement("button");
  go.type = "button"; go.className = "btn primary"; go.textContent = "Analyze this folder";
  row.append(input);
  if (bridge.chooseFolder) {
    const pick = document.createElement("button");
    pick.type = "button"; pick.className = "btn"; pick.textContent = "Choose...";
    pick.addEventListener("click", async () => { const f = await bridge.chooseFolder(input.value); if (f) { input.value = f; list(f); } });
    row.append(pick);
  }
  row.append(go);
  const msg = document.createElement("p");
  msg.className = "cardmsg";
  const ul = document.createElement("ul");
  ul.className = "dirs";
  box.append(row, msg, ul);
  const openIt = async () => {
    askNotify();
    try { await call("api/open", { folder: input.value }); page = "session"; msg.textContent = "Opening..."; setTimeout(boot, 300); }
    catch (err) { msg.textContent = err.message; }
  };
  go.addEventListener("click", () => { const d = box.closest("dialog"); if (d) d.close(); openIt(); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); list(input.value); } });
  async function list(p) {
    let d;
    try { d = await call("api/dirs?p=" + encodeURIComponent(p || "")); } catch (err) { msg.textContent = err.message; return; }
    msg.textContent = "";
    input.value = d.path;
    ul.replaceChildren();
    const short = (p) => p.length > 48 ? p.slice(0, 20) + "…" + p.slice(p.length - 27) : p;
    const add = (label, path, cls, sub) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; if (cls) b.className = cls; b.title = path.replace(/[${BIDI_CHARS}]/g, ""); b.dataset.path = path;
      if (sub) { const s2 = document.createElement("span"); s2.className = "dim small"; s2.textContent = short(sub); b.append(s2); }
      b.addEventListener("click", () => list(path));
      const li = document.createElement("li"); li.append(b); ul.append(li);
    };
    if (d.parent) add("↑ Up", d.parent, "", d.parentShown);
    d.dirs.slice(0, 200).forEach((n, i) => add("▸ " + d.shown[i], d.path.replace(/\/$/, "") + "/" + n));
    if (d.recent.length) { const h = document.createElement("li"); h.className = "dim small"; h.textContent = "Recent project folders"; ul.append(h); d.recent.forEach((r, i) => { const t = d.recentShown[i]; add(t.split("/").filter(Boolean).pop() || t, r, "", t); }); }
  }
  list(start);
}

let fstate = null;
async function setupPage() {
  $("setupmodel").textContent = state.model;
  try { fstate = await call("api/firststart", {}); } catch (e) { $("setuperr").textContent = e.message; return; }
  $("samplefolder").textContent = fstate.sample;
  drawKeyGuide(fstate.keyGuide);
  const box = $("choices");
  box.replaceChildren();
  for (const c of fstate.choices) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "modelchoice"; b.dataset.choice = c.id;
    const t = document.createElement("strong"); t.textContent = c.label;
    const h = document.createElement("span"); h.className = "dim small"; h.textContent = c.help;
    b.append(t, h);
    box.append(b);
  }
}
function drawKeyGuide(g) {
  const box = $("keyguidebody");
  box.replaceChildren();
  const p = document.createElement("p");
  p.textContent = g.intro;
  const ol = document.createElement("ol");
  for (const s of g.steps) { const li = document.createElement("li"); li.textContent = s; ol.append(li); }
  const ul = document.createElement("ul");
  for (const s of g.notes) { const li = document.createElement("li"); li.textContent = s; ul.append(li); }
  const a = document.createElement("a");
  a.href = "https://platform.claude.com/settings/keys"; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Open the keys page";
  box.append(p, ol, ul, a);
}
function pickChoice(id) {
  for (const b of document.querySelectorAll("[data-choice]")) b.setAttribute("aria-pressed", b.dataset.choice === id ? "true" : "false");
  $("claudebox").classList.toggle("hidden", id !== "claude");
  $("localbox").classList.toggle("hidden", id !== "local");
  $("setuperr").textContent = "";
  if (id === "claude") $("setupkey").focus();
  if (id === "local") drawModels();
}
function drawModels() {
  const box = $("models");
  box.replaceChildren();
  const o = fstate.ollama;
  const p = document.createElement("p");
  p.className = "dim small";
  p.textContent = !o.reachable ? "Ollama does not run on this computer yet. Install it from ollama.com/download, start it, and get a model: ollama pull " + fstate.recommended + ". You can save the model name now." : o.models.length ? "Models in Ollama on this computer:" : "Ollama runs, but it has no model. Get one: ollama pull " + fstate.recommended + ".";
  box.append(p);
  const row = document.createElement("div");
  row.className = "row";
  for (const m of o.models) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn" + (m === o.recommended ? " primary" : ""); b.textContent = "Use " + m + (m === o.recommended ? " (recommended)" : "");
    b.addEventListener("click", () => useLocal(m));
    row.append(b);
  }
  if (!o.models.length) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn primary"; b.textContent = "Save " + fstate.recommended;
    b.addEventListener("click", () => useLocal(fstate.recommended));
    row.append(b);
  }
  box.append(row);
}
async function useLocal(m) {
  try {
    const r = await call("api/firststart/local", { model: m });
    $("setuperr").textContent = r.text;
    if (r.ok) await afterSetup();
  } catch (e) { $("setuperr").textContent = e.message; }
}
$("savekey").addEventListener("click", async () => {
  if (!$("setupkey").value.trim()) { $("setuperr").textContent = "You typed no key. Paste the key, or choose the local model."; return; }
  $("setuperr").textContent = "Checking the key...";
  try {
    const r = await call("api/firststart/claude", { key: $("setupkey").value });
    $("setupkey").value = "";
    $("setuperr").textContent = r.text;
    await afterSetup();
  } catch (e) { $("setuperr").textContent = e.message; }
});
$("setupkey").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("savekey").click(); } });
async function doctor(box, all) {
  box.innerHTML = '<p class="dim">Checking the programs that Cuvette uses. This takes about 15 seconds.</p>';
  try { box.innerHTML = await call("api/doctor", { all: !!all }); } catch (e) { box.textContent = e.message; }
}
async function afterSetup() {
  state = await call("api/state");
  $("setupmodel").textContent = state.model;
  $("checkpanel").classList.remove("hidden");
  $("samplepanel").classList.remove("hidden");
  doctor($("doctorbody"));
  if (state.folder) { $("samplepanel").querySelector("[data-page-go]").textContent = "Analyze " + state.folder.replace(/[${BIDI_CHARS}]/g, ""); }
}

let progStart = "";
let progRun = null;
async function loadPrograms(quiet) {
  const box = $("programsbody");
  if (!quiet) { try { box.innerHTML = await call("api/programs?quick=1"); } catch (e) { box.textContent = e.message; return; } }
  try { box.innerHTML = await call("api/programs"); } catch (e) { toast(e.message); }
  if (progStart) { const li = box.querySelector('[data-prog="' + CSS.escape(progStart) + '"]'); progStart = ""; if (li) { li.scrollIntoView({ block: "center" }); const b = li.querySelector("button"); if (b) b.focus(); } }
}
$("progcheck").addEventListener("click", () => loadPrograms());
$("progaddbtn").addEventListener("click", () => {
  resetDialog();
  $("progtitle").textContent = "Add an adapter";
  $("progadd").classList.remove("hidden");
  $("progaddin").value = "";
  progRun = {};
  $("progdlg").showModal();
  $("progaddin").focus();
});
$("progaddcheck").addEventListener("click", async () => {
  if (!progRun) return;
  $("progresult").textContent = "Fetching and checking the adapter...";
  try { const r = await call("api/adapters/plan", { source: $("progaddin").value }); progRun = { action: r.plan.action, name: r.plan.name }; drawPlan(r.plan); $("progresult").textContent = ""; $("progadd").classList.add("hidden"); } catch (e) { $("progresult").textContent = e.message; }
});
$("progaddin").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("progaddcheck").click(); } });
$("progreview").addEventListener("click", async () => {
  if (!progRun || !progRun.install) return;
  $("progreview").disabled = true;
  $("progresult").textContent = "Claude is reading the files...";
  try { const r = await call("api/adapters/review", { install: progRun.install }); drawPlan(r.plan); $("progresult").textContent = ""; } catch (e) { $("progresult").textContent = e.message; }
  $("progreview").disabled = false;
});
function copy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(() => toast("Copied."), () => fallbackCopy(text)); return; }
  fallbackCopy(text);
}
function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text; document.body.append(ta); ta.select();
  try { document.execCommand("copy"); toast("Copied."); } catch (e) { toast("Select the text and copy it."); }
  ta.remove();
}
function drawPlan(plan) {
  $("progdlg").classList.toggle("danger", !!plan.danger);
  $("progtitle").textContent = plan.title;
  $("progrefused").textContent = plan.refused || "";
  const ul = $("proglines");
  ul.replaceChildren();
  for (const l of plan.lines) { const li = document.createElement("li"); li.textContent = l.trim(); ul.append(li); }
  $("progcmdwrap").classList.toggle("hidden", !plan.command);
  $("progcmd").textContent = plan.command || "";
  $("proglinkwrap").classList.toggle("hidden", !plan.link);
  $("proglink").textContent = plan.link || "";
  $("proglink").href = plan.link || "#";
  const ok = $("progok");
  const can = plan.runs && !plan.refused;
  ok.textContent = plan.confirm || "Run";
  ok.className = "btn " + (plan.danger ? "danger" : "primary") + (can ? "" : " hidden");
  ok.disabled = false;
  $("progreview").classList.toggle("hidden", !plan.review);
  $("progreview").textContent = plan.review || "";
  if (progRun && plan.installId) progRun.install = plan.installId;
  $("progcancel").textContent = can ? "Cancel" : "Close";
}
function resetDialog() {
  progRun = null;
  $("proglog").classList.add("hidden");
  $("proglog").textContent = "";
  $("progresult").textContent = "";
  $("progresult").className = "";
  $("progpath").classList.add("hidden");
  $("progadd").classList.add("hidden");
  drawPlan({ title: "", lines: [], runs: false });
}
async function progAction(li, action) {
  const name = li.dataset.prog;
  resetDialog();
  if (action === "check") {
    li.querySelector(".pdetail").textContent = "Checking...";
    try { const r = await call("api/programs/run", { name: name, action: "check" }); toast(r.text); } catch (e) { toast(e.message); }
    return loadPrograms(true);
  }
  if (action === "path") {
    $("progtitle").textContent = "Set path: " + li.dataset.progProgram + " (" + name + ")";
    $("progpath").classList.remove("hidden");
    $("progpathin").value = li.dataset.progPath || "";
    progRun = { name: name, action: action };
    $("progdlg").showModal();
    $("progpathin").focus();
    return;
  }
  let r;
  try { r = await call("api/programs/plan", { name: name, action: action }); } catch (e) { toast(e.message); return; }
  progRun = { name: name, action: action };
  drawPlan(r.plan);
  $("progdlg").showModal();
}
$("progpathcheck").addEventListener("click", async () => {
  if (!progRun) return;
  progRun.path = $("progpathin").value;
  $("progresult").textContent = "Checking the path...";
  try { const r = await call("api/programs/plan", progRun); drawPlan(r.plan); $("progresult").textContent = ""; } catch (e) { $("progresult").textContent = e.message; }
});
$("progpathin").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("progpathcheck").click(); } });
$("progcopy").addEventListener("click", () => copy($("progcmd").textContent));
$("proglinkcopy").addEventListener("click", () => copy($("proglink").textContent));
$("progcancel").addEventListener("click", () => $("progdlg").close());
$("progdlg").addEventListener("close", () => { if (progRun && progRun.install) call("api/adapters/drop", { install: progRun.install }).catch(() => {}); progRun = null; });
$("progok").addEventListener("click", async () => {
  if (!progRun) return;
  const ok = $("progok");
  ok.disabled = true;
  $("progresult").textContent = "Working...";
  let r;
  try { r = await call("api/programs/run", Object.assign({}, progRun, { confirmed: true })); } catch (e) { $("progresult").textContent = e.message; ok.disabled = false; return; }
  if (!r.job) { finishRun(r); return; }
  const log = $("proglog");
  log.classList.remove("hidden");
  const src = new EventSource(withT("api/programs/progress?job=" + r.job));
  src.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.line !== undefined) { log.textContent += m.line + "\n"; log.scrollTop = log.scrollHeight; }
    if (m.done) { src.close(); finishRun(m); }
  };
});
function finishRun(r) {
  $("progresult").textContent = r.text;
  $("progresult").className = r.ok ? "okline" : "cardmsg";
  $("progok").classList.add("hidden");
  $("progreview").classList.add("hidden");
  if (progRun) progRun.install = "";
  $("progcancel").textContent = "Close";
  loadPrograms(true);
}

const theme = new URLSearchParams(location.search).get("theme");
if (theme) document.documentElement.dataset.theme = theme;
boot();
</script>
</body>
</html>`;
