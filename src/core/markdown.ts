const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ENT[c]!);

// A narrow screen shows each row as a block (CSS display: block). The roles keep the table for a screen reader.
export function tableHtml(columns: string[], rows: string[][], cls = ""): string {
  return `<table class="stack ${cls}" role="table"><thead role="rowgroup"><tr role="row">${columns.map((h) => `<th role="columnheader">${h}</th>`).join("")}</tr></thead><tbody role="rowgroup">${rows
    .map((r) => `<tr role="row">${columns.map((h, i) => `<td role="cell" data-label="${esc(h.replace(/<[^>]+>/g, ""))}">${r[i] ?? ""}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

const PATH = /(^|[\s(\[])((?:~|\/)(?:&amp;|[^\s<>"'`,;()\[\]&])*\/(?:&amp;|[^\s<>"'`,;()\[\]&])+?)(?=[.:]?(?:\s|$|[)\],;]))/g;

export function shortPaths(html: string, n = 44): string {
  return html.replace(PATH, (_m, pre: string, p: string) => {
    const raw = p.replace(/&amp;/g, "&");
    if (raw.length <= n) return pre + p;
    const keep = Math.floor((n - 1) / 2);
    return `${pre}<span class="path" title="${p}">${esc(raw.slice(0, keep))}…${esc(raw.slice(raw.length - keep))}</span>`;
  });
}

const LINK = /\[([^[\]\n]+)\]\((https?:\/\/[^\s\x00-\x1f)<"[]+)\)/g;
const SLOT = /\uE000(\d+)\uE001/g;
const TAG = /<(\/?)([a-z0-9]+)[^>]*>/g;

function balanced(html: string): boolean {
  const open: string[] = [];
  for (const m of html.matchAll(TAG)) {
    if (m[2] === "br") continue;
    if (!m[1]) open.push(m[2]!);
    else if (open.pop() !== m[2]) return false;
  }
  return !open.length;
}

// The content of a mark stops at the next mark of the same kind. This keeps the run time linear in the line length.
function emphasis(html: string): string {
  const wrap = (open: string, close: string) => (m: string, x: string) => (balanced(x) ? `${open}${x}${close}` : m);
  return html
    .replace(/\*\*\*(?=\S)((?:(?!\*\*\*).)+?)(?<=\S)\*\*\*/g, wrap("<strong><em>", "</em></strong>"))
    .replace(/\*\*(?=\S)((?:(?!\*\*).)+?)(?<=\S)\*\*/g, wrap("<strong>", "</strong>"))
    .replace(/(?<![*\w])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![*\w])/g, wrap("<em>", "</em>"))
    .replace(/~~(?=\S)((?:(?!~~).)+?)(?<=\S)~~/g, wrap("<del>", "</del>"));
}

// A link becomes a placeholder first, so that no mark can start inside the address or cross the link.
function marks(html: string): string {
  const links: string[] = [];
  const text = html.replace(/[\uE000\uE001]/g, "").replace(LINK, (_m, t: string, u: string) => `\uE000${links.push(`<a href="${u}" target="_blank" rel="noopener noreferrer">${shortPaths(emphasis(t))}</a>`) - 1}\uE001`);
  return shortPaths(emphasis(text)).replace(SLOT, (_m, i: string) => links[Number(i)]!);
}

export function inline(text: string): string {
  return esc(text)
    .split(/(`[^`]+`)/)
    .map((part, i) => (i % 2 ? `<code>${part.slice(1, -1)}</code>` : marks(part)))
    .join("");
}

const LI = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const ROW = /^\s*\|/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const HEAD = /^\s{0,3}#{1,6}\s+(.*)$/;
const QUOTE = /^\s{0,3}>/;

interface Entry {
  indent: number;
  ordered: boolean;
  num: number;
  html: string;
}

function listHtml(es: Entry[], at: { i: number }, indent: number): string {
  const first = es[at.i]!;
  const items: string[] = [];
  while (at.i < es.length) {
    const e = es[at.i]!;
    if (e.indent < indent) break;
    if (e.indent > indent && items.length) {
      items[items.length - 1] += listHtml(es, at, e.indent);
      continue;
    }
    if (items.length && e.ordered !== first.ordered) break;
    items.push(e.html);
    at.i++;
  }
  const tag = first.ordered ? "ol" : "ul";
  const start = first.ordered && first.num !== 1 ? ` start="${first.num}"` : "";
  return `<${tag}${start}>${items.map((x) => `<li>${x}</li>`).join("")}</${tag}>`;
}

const blockStart = (l: string) => !l.trim() || LI.test(l) || HEAD.test(l) || l.trim().startsWith("```") || ROW.test(l) || RULE.test(l) || QUOTE.test(l);

const MAX_QUOTE_DEPTH = 16;

export function md(src: string, opts: { code?: boolean } = {}, depth = 0): string {
  const lines = String(src).split("\n");
  const out: string[] = [];
  let i = 0;
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
    if (ROW.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && ROW.test(lines[i]!)) rows.push(lines[i++]!.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
      const body = rows.filter((r) => !r.every((c) => c.length > 1 && /^:?-+:?$/.test(c)));
      const [head, ...rest] = body;
      if (head) out.push(tableHtml(head.map(inline), rest.map((r) => r.map(inline))));
      continue;
    }
    if (RULE.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }
    const head = HEAD.exec(line);
    if (head) {
      out.push(`<h4>${inline(head[1]!.replace(/\s+#+\s*$/, ""))}</h4>`);
      i++;
      continue;
    }
    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      const marker = depth < MAX_QUOTE_DEPTH ? /^\s{0,3}>\s?/ : /^(?:\s{0,3}>\s?)+/;
      while (i < lines.length && QUOTE.test(lines[i]!)) quoted.push(lines[i++]!.replace(marker, ""));
      out.push(`<blockquote>${md(quoted.join("\n"), opts, depth + 1)}</blockquote>`);
      continue;
    }
    if (LI.test(line)) {
      const es: Entry[] = [];
      while (i < lines.length) {
        const l = lines[i]!;
        const m = LI.exec(l);
        if (m && !RULE.test(l)) {
          es.push({ indent: m[1]!.replace(/\t/g, "    ").length, ordered: /\d/.test(m[2]!), num: parseInt(m[2]!, 10), html: inline(m[3]!) });
          i++;
        } else if (/^\s{2,}\S/.test(l) && !blockStart(l.trim()) && es.length) {
          es[es.length - 1]!.html += `<br>${inline(l.trim())}`;
          i++;
        } else if (!l.trim() && LI.test(lines[i + 1] ?? "")) i++;
        else break;
      }
      const at = { i: 0 };
      while (at.i < es.length) out.push(listHtml(es, at, es[at.i]!.indent));
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && (!para.length || !blockStart(lines[i]!))) para.push(lines[i++]!);
    out.push(`<p>${para.map(inline).join("<br>")}</p>`);
  }
  return out.join("");
}
