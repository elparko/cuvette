import { md } from "../../core/markdown.ts";

const CARET = `<span class="caret" aria-hidden="true"></span>`;

// The caret goes after the last text: in the last paragraph, list item, heading or table cell.
// This is also true in a nested list and before an empty table body.
export function liveHtml(text: string): string {
  const html = md(text);
  const tail = /(<\/(?:p|li|h4|td|th)>)((?:<\/(?:ul|ol|li|blockquote|tr|tbody|thead|table)>|<tbody[^>]*><\/tbody>)*)$/.exec(html);
  return tail ? html.slice(0, tail.index) + CARET + tail[0] : html + CARET;
}

const LIST_LINE = /^(\s*)([-*+]|\d+[.)])\s+/;

// Returns the start of the last block boundary after "from" that a later line cannot change.
// A boundary is a blank line outside a code fence, then a complete line that does not start a list item.
// The text after the boundary must give HTML, so that the caret stays in the last block.
// At such a boundary, md(head) + md(tail) is the same as md(text).
export function liveCut(text: string, from = 0): number {
  const cuts: number[] = [];
  let fence = false;
  let blank = false;
  for (let at = from; at < text.length; ) {
    const end = text.indexOf("\n", at);
    if (end < 0) break;
    const line = text.slice(at, end);
    const t = line.trim();
    if (fence) {
      if (t.startsWith("```")) fence = false;
    } else if (!t) blank = true;
    else {
      if (blank && at > from && !LIST_LINE.test(line)) cuts.push(at);
      blank = false;
      if (t.startsWith("```")) fence = true;
    }
    at = end + 1;
  }
  return cuts.reverse().find((c) => md(text.slice(c)) !== "") ?? from;
}
