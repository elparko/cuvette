import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { changeSetting, describe, scopeLabel, settingsPath, type Scope, type SettingCtx, type SettingDef } from "../core/settings.ts";

type Step =
  | { t: "list" }
  | { t: "value"; def: SettingDef; options: string[]; sel: number }
  | { t: "text"; def: SettingDef }
  | { t: "scope"; def: SettingDef; value: string; sel: number };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function ConfigPanel(props: { ctx: SettingCtx; busy: boolean; onEdit: (card: "key" | "eln") => void; onClose: () => void }) {
  const { ctx } = props;
  const rows = describe(ctx).map((r) => ({ ...r, locked: !!(r.def.lockedInTurn && props.busy) }));
  const [sel, setSel] = useState(0);
  const [step, setStep] = useState<Step>({ t: "list" });
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ text: string; color?: string }>();
  const row = rows[Math.min(sel, rows.length - 1)]!;

  const save = async (def: SettingDef, value: string, scope: Scope) => {
    setStep({ t: "list" });
    try {
      const r = await changeSetting(ctx, def.name, value, scope);
      setMsg({ text: `${def.label} is now ${value} (${scopeLabel(scope)}).${r.note ? " " + r.note : ""}`, color: "green" });
    } catch (e) {
      setMsg({ text: (e as Error).message, color: "red" });
    }
  };

  const pickScope = (def: SettingDef, value: string) => {
    if (def.scopes.length === 1) return void save(def, value, def.scopes[0]!);
    setStep({ t: "scope", def, value, sel: 0 });
  };

  const open = () => {
    const d = row.def;
    setMsg(undefined);
    if (row.locked) return setMsg({ text: `${d.label} is locked until the turn ends.`, color: "yellow" });
    if (d.edit) return props.onEdit(d.edit);
    if (!d.scopes.length) return setMsg({ text: "You cannot change this setting here." });
    if (d.number || d.list) {
      setText("");
      return setStep({ t: "text", def: d });
    }
    const options = d.choices?.() ?? [];
    const cur = options.indexOf(row.value);
    setStep({ t: "value", def: d, options: cur < 0 && row.value !== "not set" ? [row.value, ...options] : options, sel: Math.max(0, cur) });
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
  const lines: React.ReactNode[] = [];
  rows.forEach((r, i) => {
    if (r.def.group !== group) {
      group = r.def.group;
      lines.push(
        <Box key={`g${i}`} marginTop={i ? 1 : 0}>
          <Text bold>{group}</Text>
        </Box>,
      );
    }
    const on = i === sel;
    const tag = [r.source ? scopeLabel(r.source) : "", r.locked ? "locked" : ""].filter(Boolean).join(" · ");
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
            {s === "session" ? "This session only" : s === "user" ? `User settings  ${settingsPath("user", ctx.cwd)}` : `Project settings  ${settingsPath("project", ctx.cwd)}`}
          </Text>,
        ),
      );
    }
  });

  const keys =
    step.t === "list" ? "↑↓ move · Enter or Space change · Esc close" : step.t === "text" ? "Enter saves · Esc goes back" : "↑↓ move · Enter choose · Esc goes back";

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">
        Settings
      </Text>
      {lines}
      <Box marginTop={1} flexDirection="column">
        <Text>{row.locked ? "Locked until the turn ends. " + row.def.help : row.def.help}</Text>
        {(row.def.details?.(ctx) ?? []).map((d, i) => (
          <Text key={i} dimColor>
            {"  " + d}
          </Text>
        ))}
        {msg ? <Text color={msg.color}>{msg.text}</Text> : null}
        <Text dimColor>{keys}</Text>
      </Box>
    </Box>
  );
}
