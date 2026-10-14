import { useLayoutEffect, useRef } from "react";
import { md } from "../../core/markdown.ts";
import { liveCut, liveHtml } from "../lib/markdown.ts";

// The finished blocks go in the page one time. Each frame replaces only the last block, so a long reply does not cost more with each piece.
export function LiveReply({ text }: { text: string }) {
  const box = useRef<HTMLDivElement>(null);
  const done = useRef({ head: "", tail: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const s = done.current;
    if (!text.startsWith(s.head)) {
      el.replaceChildren();
      s.head = "";
      s.tail = 0;
    }
    for (; s.tail > 0; s.tail--) el.lastChild?.remove();
    const cut = liveCut(text, s.head.length);
    if (cut > s.head.length) {
      el.insertAdjacentHTML("beforeend", md(text.slice(s.head.length, cut)));
      s.head = text.slice(0, cut);
    }
    const before = el.childNodes.length;
    el.insertAdjacentHTML("beforeend", liveHtml(text.slice(s.head.length)));
    s.tail = el.childNodes.length - before;
  }, [text]);
  return <div ref={box} className="msg agent" aria-live="off" />;
}
