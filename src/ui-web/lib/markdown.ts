import { md } from "../../core/markdown.ts";

const CARET = `<span class="caret" aria-hidden="true"></span>`;

export function liveHtml(text: string): string {
  const html = md(text);
  const tail = /(<\/(?:p|li|h4|td|th)>)((?:<\/(?:ul|ol|blockquote|tr|tbody|thead|table)>)*)$/.exec(html);
  return tail ? html.slice(0, tail.index) + CARET + tail[0] : html + CARET;
}
