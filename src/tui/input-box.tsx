import React, { useEffect, useRef, useState } from "react";
import type { EventEmitter } from "node:events";
import { Box, Text, usePaste, useStdin } from "ink";
import { decodeKey, emptyEd, layout, press, rowOf, step, type Ed, type InputKeys, type VimMode } from "./editor.ts";

export const INPUT_MAX_ROWS = 12;

export interface InputBoxProps {
  style: Exclude<InputKeys, "classic">;
  value: string;
  width: number;
  placeholder: string;
  arrowsOut?: boolean;
  onChange(text: string): void;
  onSubmit(text: string): void;
  onEscape(): void;
  onEdge(dir: "up" | "down"): void;
  onVimMode?(mode: VimMode): void;
}

export function InputBox(props: InputBoxProps) {
  const stdin = useStdin() as unknown as { internal_eventEmitter: EventEmitter; setRawMode(on: boolean): void };
  const ed = useRef<Ed>(emptyEd(props.value));
  const [, render] = useState(0);
  const latest = useRef(props);
  latest.current = props;

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
    if (props.style !== "vim" && ed.current.vim !== "insert") commit({ ...ed.current, vim: "insert" });
    latest.current.onVimMode?.(ed.current.vim);
  }, [props.style]);

  useEffect(() => {
    stdin.setRawMode(true);
    const onInput = (data: string) => {
      const p = latest.current;
      const k = decodeKey(data);
      if (p.arrowsOut && (k.key === "up" || k.key === "down") && !k.alt && !k.cmd && !k.ctrl) return p.onEdge(k.key);
      const r = press(ed.current, k, p.style, p.width);
      if (r.st !== ed.current) commit(r.st);
      if (r.out === "submit") p.onSubmit(r.st.text);
      else if (r.out === "escape") p.onEscape();
      else if (r.out) p.onEdge(r.out);
    };
    stdin.internal_eventEmitter.on("input", onInput);
    return () => {
      stdin.internal_eventEmitter.removeListener("input", onInput);
      stdin.setRawMode(false);
    };
  }, []);

  usePaste((text) => commit(step(ed.current, { insert: text }, latest.current.width).st));

  const { text, cur } = ed.current;
  if (!text) {
    const ph = props.placeholder;
    return (
      <Text>
        <Text inverse>{ph[0] ?? " "}</Text>
        <Text dimColor>{ph.slice(1)}</Text>
      </Text>
    );
  }
  const rows = layout(text, props.width);
  const r = rowOf(rows, cur);
  const top = rows.length <= INPUT_MAX_ROWS ? 0 : Math.min(Math.max(0, r - INPUT_MAX_ROWS + 1), rows.length - INPUT_MAX_ROWS);
  const shown = rows.slice(top, top + INPUT_MAX_ROWS);
  const hidden = rows.length - shown.length;
  return (
    <Box flexDirection="column">
      {shown.map((row, i) => {
        const line = text.slice(row.start, row.end);
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
