import React, { useContext, useState } from "react";
import { CardRows, Fit } from "./fit.tsx";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Scope, SettingCtx, SettingDef } from "../core/settings.ts";
import { rowHelp, rowTag, saveSetting, scopeText, settingEditor, settingRows } from "../ui/config.ts";

type Step =
  | { t: "list" }
  | { t: "value"; def: SettingDef; options: string[]; sel: number }
  | { t: "text"; def: SettingDef }
  | { t: "scope"; def: SettingDef; value: string; sel: number };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function ConfigPanel(props: { ctx: SettingCtx; busy: boolean; onEdit: (card: "key" | "eln") => void; onClose: () => void }) {
  const { ctx } = props;
  const rows = settingRows(ctx, props.busy);
  const [sel, setSel] = useState(0);
  const [step, setStep] = useState<Step>({ t: "list" });
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ text: string; color?: string }>();
  const row = rows[Math.min(sel, rows.length - 1)]!;
  const max = useContext(CardRows);

  const save = async (def: SettingDef, value: string, scope: Scope) => {
    setStep({ t: "list" });
    setMsg(await saveSetting(ctx, def, value, scope));
  };

  const pickScope = (def: SettingDef, value: string) => {
    if (def.scopes.length === 1) return void save(def, value, def.scopes[0]!);
    setStep({ t: "scope", def, value, sel: 0 });
  };

  const open = () => {
    setMsg(undefined);
    const e = settingEditor(row);
    if (e.t === "message") return setMsg({ text: e.text, color: e.color });
    if (e.t === "edit") return props.onEdit(e.card);
    if (e.t === "text") setText("");
    setStep(e);
  };

  useInput((ch, key) => {
    if (step.t === "text") {
      if (key.escape) setStep({ t: "list" });
      return;
    }
    if (key.escape) return step.t === "list" ? props.onClose() : setStep({ t: "list" });
    const up = key.upArrow, down = key.downArrow;
    const choose = key.return || ch === " ";
    if (step.t === "list") {
      if (up) setSel((s) => (s + rows.length - 1) % rows.length);
      else if (down) setSel((s) => (s + 1) % rows.length);
      else if (choose) open();
    } else if (step.t === "value") {
      const n = step.options.length;
      if (up) setStep({ ...step, sel: (step.sel + n - 1) % n });
      else if (down) setStep({ ...step, sel: (step.sel + 1) % n });
      else if (choose) pickScope(step.def, step.options[step.sel]!);
    } else {
      const n = step.def.scopes.length;
      if (up) setStep({ ...step, sel: (step.sel + n - 1) % n });
      else if (down) setStep({ ...step, sel: (step.sel + 1) % n });
      else if (choose) void save(step.def, step.value, step.def.scopes[step.sel]!);
    }
  });

  const labelW = Math.max(...rows.map((r) => r.def.label.length)) + 2;
  let group = "";
  let at = 1;
  let follow = 0;
  const lines: React.ReactNode[] = [];
  rows.forEach((r, i) => {
    if (r.def.group !== group) {
      group = r.def.group;
      at += i ? 2 : 1;
      lines.push(
        <Box key={`g${i}`} marginTop={i ? 1 : 0}>
          <Text bold>{group}</Text>
        </Box>,
      );
    }
    const on = i === sel;
    if (on) follow = at;
    at++;
    const tag = rowTag(r);
    lines.push(
      <Box key={r.def.name}>
        <Text color={on ? "cyan" : undefined}>{on ? "▸ " : "  "}</Text>
        <Text color={on ? "cyan" : undefined}>{r.def.label.padEnd(labelW)}</Text>
        <Text dimColor={r.locked}>{clip(r.value, 44).padEnd(46)}</Text>
        <Text dimColor color={r.locked ? "yellow" : undefined}>
          {tag}
        </Text>
      </Box>,
    );
    if (on && step.t === "value")
      step.options.forEach((o, j) =>
        lines.push(
          <Text key={`o${j}`} color={j === step.sel ? "cyan" : undefined}>
            {"    "}
            {j === step.sel ? "▸ " : "  "}
            {o}
          </Text>,
        ),
      );
    if (on && step.t === "text")
      lines.push(
        <Box key="text">
          <Text>{"    New value: "}</Text>
          <TextInput value={text} onChange={setText} onSubmit={(v) => pickScope(r.def, v.trim())} />
        </Box>,
      );
    if (on && step.t === "scope") {
      lines.push(<Text key="where">{`    Save ${step.value} where?`}</Text>);
      step.def.scopes.forEach((s, j) =>
        lines.push(
          <Text key={`s${j}`} color={j === step.sel ? "cyan" : undefined}>
            {"    "}
            {j === step.sel ? "▸ " : "  "}
            {scopeText(s, ctx.cwd)}
          </Text>,
        ),
      );
    }
  });

  const keys =
    step.t === "list" ? "↑↓ move · Enter or Space change · Esc close" : step.t === "text" ? "Enter saves · Esc goes back" : "↑↓ move · Enter choose · Esc goes back";

  const extra = step.t === "value" ? step.sel + 1 : step.t === "scope" ? step.sel + 2 : step.t === "text" ? 1 : 0;
  const head = (
    <>
      <Text bold color="cyan">
        Settings
      </Text>
      {lines}
    </>
  );
  const tail = (
    <Box marginTop={1} flexDirection="column">
      <Text>{rowHelp(row)}</Text>
      {(row.def.details?.(ctx) ?? []).map((d, i) => (
        <Text key={i} dimColor>
          {"  " + d}
        </Text>
      ))}
      {msg ? <Text color={msg.color}>{msg.text}</Text> : null}
      <Text dimColor>{keys}</Text>
    </Box>
  );
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Fit max={max - 2} head={head} tail={tail} arrows={false} follow={follow + extra} />
    </Box>
  );
}
