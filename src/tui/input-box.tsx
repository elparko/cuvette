import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { EventEmitter } from "node:events";
import { Box, Text, useInput, usePaste, useStdin, useWindowSize } from "ink";
import { decodeKey, emptyEd, splitKeys, layout, press, rowOf, step, type Ed, type InputKeys, type VimMode } from "./editor.ts";

export const INPUT_MAX_ROWS = 12;

export const KeyStyle = createContext<InputKeys>("mac");

export interface InputBoxProps {
  style?: InputKeys;
  value: string;
  width?: number;
  placeholder?: string;
  arrowsOut?: boolean;
  single?: boolean;
  mask?: string;
  active?: boolean;
  onChange(text: string): void;
  onSubmit(text: string): void;
  onEscape?(): void;
  onEdge?(dir: "up" | "down"): void;
  onVimMode?(mode: VimMode): void;
}

export function InputBox(props: InputBoxProps) {
  const stdin = useStdin() as unknown as { internal_eventEmitter: EventEmitter };
  const shared = useContext(KeyStyle);
  const { columns } = useWindowSize();
  const style = props.style ?? shared;
  const width = props.width ?? Math.max(10, columns - 12);
  const ed = useRef<Ed>(emptyEd(props.value));
  const [, render] = useState(0);
  const latest = useRef({ ...props, style, width });
  latest.current = { ...props, style, width };

  if (props.value !== ed.current.text) ed.current = { ...ed.current, text: props.value, cur: props.value.length, goal: undefined, pending: undefined };

  const commit = (next: Ed) => {
    const p = latest.current;
    const before = ed.current;
    ed.current = next;
    if (next.vim !== before.vim) p.onVimMode?.(next.vim);
    if (next.text !== before.text) p.onChange(next.text);
    render((n) => n + 1);
  };

  useEffect(() => {
    if (style !== "vim" && ed.current.vim !== "insert") commit({ ...ed.current, vim: "insert" });
    latest.current.onVimMode?.(ed.current.vim);
  }, [style]);

  const queue = useRef<string[]>([]);
  useEffect(() => {
    const grab = (data: string) => void (latest.current.active !== false && queue.current.push(data));
    stdin.internal_eventEmitter.on("input", grab);
    return () => void stdin.internal_eventEmitter.removeListener("input", grab);
  }, []);

  const onKey = (seq: string) => {
    const p = latest.current;
    const k = decodeKey(seq);
    if (p.arrowsOut && (k.key === "up" || k.key === "down") && !k.alt && !k.cmd && !k.ctrl) return p.onEdge?.(k.key);
    const r = press(ed.current, k, p.style, p.width, p.single);
    if (r.st !== ed.current) commit(r.st);
    if (r.out === "submit") p.onSubmit(r.st.text);
    else if (r.out === "escape") p.onEscape?.();
    else if (r.out) p.onEdge?.(r.out);
  };

  useInput(() => {
    for (const data of queue.current.splice(0)) for (const seq of splitKeys(data)) onKey(seq);
  });

  usePaste((text) => commit(step(ed.current, { insert: latest.current.single ? text.replace(/\r\n?|\n/g, " ") : text }, latest.current.width).st), { isActive: props.active !== false });

  const { text, cur } = ed.current;
  const shown = props.mask ? props.mask.repeat(text.length) : text;
  if (!text) {
    const ph = props.placeholder ?? "";
    return (
      <Text>
        <Text inverse>{ph[0] ?? " "}</Text>
        <Text dimColor>{ph.slice(1)}</Text>
      </Text>
    );
  }
  const rows = layout(shown, width);
  const r = rowOf(rows, cur);
  const top = rows.length <= INPUT_MAX_ROWS ? 0 : Math.min(Math.max(0, r - INPUT_MAX_ROWS + 1), rows.length - INPUT_MAX_ROWS);
  const visible = rows.slice(top, top + INPUT_MAX_ROWS);
  const hidden = rows.length - visible.length;
  return (
    <Box flexDirection="column">
      {visible.map((row, i) => {
        const line = shown.slice(row.start, row.end);
        if (top + i !== r) return <Text key={top + i}>{line || " "}</Text>;
        const at = cur - row.start;
        return (
          <Text key={top + i}>
            {line.slice(0, at)}
            <Text inverse>{line[at] ?? " "}</Text>
            {line.slice(at + 1)}
          </Text>
        );
      })}
      {hidden ? <Text dimColor>{`${hidden} more ${hidden === 1 ? "line" : "lines"}`}</Text> : null}
    </Box>
  );
}

export function Field(props: { value: string; onChange: (v: string) => void; onSubmit: (v: string) => void; onCancel?: () => void; mask?: string; indent?: number }) {
  const { columns } = useWindowSize();
  return (
    <InputBox single value={props.value} width={Math.max(10, columns - 8 - (props.indent ?? 0))} mask={props.mask} onChange={props.onChange} onSubmit={props.onSubmit} onEscape={props.onCancel} />
  );
}
