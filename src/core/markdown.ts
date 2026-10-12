const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ENT[c]!);

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

const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)<"]+)\)/g;

function marks(html: string): string {
  return shortPaths(
    html
      .replace(LINK, (_m, t: string, u: string) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`)
      .replace(/\*\*\*(?=\S)(.+?)(?<=\S)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<![*\w])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![*\w])/g, "<em>$1</em>")
      .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, "<del>$1</del>"),
  );
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

export function md(src: string, opts: { code?: boolean } = {}): string {
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
      out.push(tableHtml((head ?? []).map(inline), rest.map((r) => r.map(inline))));
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
      while (i < lines.length && QUOTE.test(lines[i]!)) quoted.push(lines[i++]!.replace(/^\s{0,3}>\s?/, ""));
      out.push(`<blockquote>${md(quoted.join("\n"), opts)}</blockquote>`);
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
