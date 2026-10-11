import { useEffect, useReducer, useRef, useState } from "react";
import { bridge, withT, type Status } from "./api.ts";

export interface StreamState {
  items: string[];
  pending: string;
  live: string;
  cards: string;
  status: Status;
  changed: number;
  resets: number;
}

type Msg = { t: string; [k: string]: unknown };

const START: StreamState = { items: [], pending: "", live: "", cards: "", status: { state: "idle" }, changed: 0, resets: 0 };

function reduce(s: StreamState, m: Msg): StreamState {
  switch (m.t) {
    case "clear":
      return START;
    case "reset":
      return { ...s, items: [String(m.items ?? "")], pending: String(m.pending ?? ""), live: String(m.live ?? ""), cards: String(m.cards ?? ""), status: (m.status as Status) ?? s.status, resets: s.resets + 1 };
    case "append":
      return { ...s, items: [...s.items, String(m.html ?? "")] };
    case "pending":
      return { ...s, pending: String(m.html ?? "") };
    case "cards":
      return { ...s, cards: String(m.html ?? "") };
    case "live":
      return { ...s, live: m.reset ? "" : s.live + String(m.text ?? "") };
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
    const es = new EventSource(withT("events"));
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
      dispatch(m);
    };
    return () => es.close();
  }, [gen]);

  return state;
}
