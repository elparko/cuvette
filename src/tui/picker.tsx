import React, { useState } from "react";
import { Box, render, useApp, useInput, useStdout } from "ink";
import { Text } from "./text.tsx";
import { terminalStdin } from "./key-stream.ts";
import { ageText, clip, clipStart, folderText, type SessionInfo } from "../core/sessions.ts";

export function SessionPicker(props: { list: SessionInfo[]; initial: number; note?: string; onDone: (s?: SessionInfo) => void; now?: number }) {
  const [sel, setSel] = useState(props.initial);
  const { exit } = useApp();
  const width = Math.max(30, ((useStdout().stdout as { columns?: number }).columns || 80) - 4);
  const now = props.now ?? Date.now();
  const done = (s?: SessionInfo) => {
    props.onDone(s);
    exit();
  };
  useInput((ch, key) => {
    if (key.upArrow) setSel((x) => (x + props.list.length - 1) % props.list.length);
    else if (key.downArrow) setSel((x) => (x + 1) % props.list.length);
    else if (key.return) {
      if (!props.list[sel]?.moved) done(props.list[sel]);
    }
    else if (key.escape || (key.ctrl && ch === "c")) done();
  });
  return (
    <Box flexDirection="column">
      <Text bold>Resume a session</Text>
      {props.note ? <Text color="yellow">{props.note}</Text> : null}
      {props.list.map((s, i) => {
        const age = ageText(now - s.used);
        const tag = s.moved ? "moved: run cuvette open <new folder>" : s.status;
        return (
          <Box key={s.id} flexDirection="column">
            <Text color={i === sel ? "cyan" : undefined} bold={i === sel}>
              {i === sel ? "▸ " : "  "}
              {age} · {clipStart(folderText(s.cwd), Math.max(10, width - age.length - 3 - (tag ? tag.length + 3 : 0)))}
              {tag ? <Text dimColor> · {tag}</Text> : null}
            </Text>
            {s.name ? <Text>    {clip(s.name, width - 2)}</Text> : null}
            <Text dimColor>    {s.description ? clip(s.description, width - 2) : s.ask ? clip(s.ask, width - 2) : "(no request)"}</Text>
          </Box>
        );
      })}
      <Text dimColor>↑ ↓ select · Enter opens · Esc stops</Text>
    </Box>
  );
}

export async function pickSession(list: SessionInfo[], initial: number, note?: string, io: { stdin?: NodeJS.ReadStream; stdout?: NodeJS.WriteStream } = {}): Promise<SessionInfo | undefined> {
  let chosen: SessionInfo | undefined;
  const app = render(<SessionPicker list={list} initial={initial} note={note} onDone={(s) => (chosen = s)} />, { stdin: io.stdin ?? terminalStdin(), stdout: io.stdout, exitOnCtrlC: false, patchConsole: false });
  await app.waitUntilExit();
  return chosen;
}
