import { md } from "../../core/markdown.ts";

const CARET = `<span class="caret" aria-hidden="true"></span>`;

// The caret goes after the last text: in the last paragraph, list item, heading or table cell.
// This is also true in a nested list and before an empty table body.
export function liveHtml(text: string): string {
  const html = md(text);
  const tail = /(<\/(?:p|li|h4|td|th)>)((?:<\/(?:ul|ol|li|blockquote|tr|tbody|thead|table)>|<tbody[^>]*><\/tbody>)*)$/.exec(html);
  return tail ? html.slice(0, tail.index) + CARET + tail[0] : html + CARET;
}
