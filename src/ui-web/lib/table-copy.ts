import { esc } from "../../core/markdown.ts";

const cellText = (c: Element) => (c.textContent ?? "").replace(/\s+/g, " ").trim();

export function tableCopy(range: Range): { text: string; html: string } | null {
  const node = range.commonAncestorContainer;
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement;
  if (!el) return null;
  let table = el.closest("table.stack");
  if (table) {
    if (el.closest("td, th")) return null;
  } else {
    const found = Array.from(el.querySelectorAll("table.stack")).filter((t) => range.intersectsNode(t));
    if (found.length !== 1) return null;
    table = found[0]!;
    const rest = range.cloneContents();
    rest.querySelectorAll("table").forEach((t) => t.remove());
    if (rest.textContent?.trim()) return null;
  }
  const head = Array.from(table.querySelectorAll("thead th")).map(cellText);
  const body = Array.from(table.querySelectorAll("tbody tr"))
    .filter((r) => range.intersectsNode(r))
    .map((r) => Array.from(r.children).map(cellText));
  if (!head.length || !body.length) return null;
  const text = [head, ...body].map((r) => r.join("\t")).join("\n");
  const row = (r: string[], tag: string) => `<tr>${r.map((c) => `<${tag}>${esc(c)}</${tag}>`).join("")}</tr>`;
  return { text, html: `<table><thead>${row(head, "th")}</thead><tbody>${body.map((r) => row(r, "td")).join("")}</tbody></table>` };
}

export function onTableCopy(e: { clipboardData: DataTransfer | null; preventDefault(): void }): void {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount || !e.clipboardData) return;
  const copy = tableCopy(sel.getRangeAt(0));
  if (!copy) return;
  e.preventDefault();
  e.clipboardData.setData("text/plain", copy.text);
  e.clipboardData.setData("text/html", copy.html);
}
