import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { bridge, withT, type Status } from "./api.ts";

export interface StreamState {
  items: string[];
  pending: string;
  live: string;
  think: string;
  cards: string;
  status: Status;
  changed: number;
  resets: number;
}

type Msg = { t: string; [k: string]: unknown };

export const START: StreamState = { items: [], pending: "", live: "", think: "", cards: "", status: { state: "idle" }, changed: 0, resets: 0 };

export function reduce(s: StreamState, m: Msg): StreamState {
  switch (m.t) {
    case "clear":
      return START;
    // A reset after the first one is a new connection, after a sleep of the computer or a restart. The side panel loads again.
    case "reset":
      return { ...s, items: [String(m.items ?? "")], pending: String(m.pending ?? ""), live: String(m.live ?? ""), think: String(m.think ?? ""), cards: String(m.cards ?? ""), status: (m.status as Status) ?? s.status, resets: s.resets + 1, changed: s.resets ? s.changed + 1 : s.changed };
    case "append":
      return { ...s, items: [...s.items, String(m.html ?? "")] };
    case "pending":
      return { ...s, pending: String(m.html ?? "") };
    case "cards":
      return { ...s, cards: String(m.html ?? "") };
    case "live":
      return { ...s, live: m.reset ? "" : s.live + String(m.text ?? "") };
    case "think":
      return { ...s, think: m.reset ? "" : (s.think + String(m.text ?? "")).slice(-4000) };
    case "status":
      return { ...s, status: m as unknown as Status };
    case "changed":
      return { ...s, changed: s.changed + 1 };
    default:
      return s;
  }
}

export function useStream(onSwitch: () => void, hasSession: boolean) {
  const [state, dispatch] = useReducer(reduce, START);
  const [gen, setGen] = useState(0);
  const switchRef = useRef(onSwitch);
  switchRef.current = onSwitch;
  const sessionRef = useRef(hasSession);
  sessionRef.current = hasSession;

  useEffect(() => {
    dispatch({ t: "clear" });
    // Many small text pieces can come in one frame. Apply them together, once per frame, so the page draws each frame.
    let queue: Msg[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      const list = queue;
      queue = [];
      for (const m of list) dispatch(m);
    };
    const later = (m: Msg) => {
      queue.push(m);
      frame ||= requestAnimationFrame(flush);
    };
    const es = new EventSource(withT("events"));
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) toast.error("The connection to Cuvette stopped. Reload the page.", { id: "events", duration: Infinity });
      else toast.loading("The connection to Cuvette stopped. The page tries again…", { id: "events", duration: Infinity });
    };
    es.onopen = () => toast.dismiss("events");
    es.onmessage = (ev) => {
      const m = JSON.parse(ev.data) as Msg;
      if (m.t === "switch") {
        es.close();
        setTimeout(() => {
          switchRef.current();
          setGen((g) => g + 1);
        }, 150);
        return;
      }
      if (m.t === "reset" && !sessionRef.current) switchRef.current();
      if (m.t === "notify") {
        if (!m.quiet || document.hidden) bridge.notify(String(m.title ?? ""), String(m.body ?? ""));
        return;
      }
      later(m);
    };
    return () => {
      cancelAnimationFrame(frame);
      es.close();
      toast.dismiss("events");
    };
  }, [gen]);

  return state;
}
