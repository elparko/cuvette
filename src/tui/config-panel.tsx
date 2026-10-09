import React, { useContext, useState } from "react";
import { CardRows, Fit } from "./fit.tsx";
import { Box, Text, useInput } from "ink";
import { Field, InputBox } from "./input-box.tsx";
import { canReset, type Scope, type SettingCtx, type SettingDef, type SettingRow } from "../core/settings.ts";
import { choiceNote, matches, resetRow, rowHelp, rowTag, saveSetting, scopeText, secretState, settingEditor, settingRows, spendBar, spendState, RESET } from "../ui/config.ts";

type Step =
  | { t: "list" }
  | { t: "value"; def: SettingDef; options: string[]; sel: number }
  | { t: "text"; def: SettingDef }
  | { t: "scope"; def: SettingDef; value: string; sel: number };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const lastScope = new Map<string, Scope>();

function shown(r: SettingRow, ctx: SettingCtx): string {
  if (r.def.secret) return secretState(r);
  if (r.def.name === "spend_month") {
    const s = spendState(ctx.env);
    return s.pct === undefined ? s.text : `${spendBar(s, 10)} ${s.text}`;
  }
  return r.value;
}

function textHint(r: SettingRow): string {
  const d = r.def;
  const parts = [d.number ? `A number in ${d.unit ?? "units"}, ${d.min ?? 0} or more. Type off for no limit.` : d.list ? "Separate the names with commas." : ""];
  if (canReset(r)) parts.push("Press Enter with no text to reset to default.");
  return parts.filter(Boolean).join(" ");
}

export function ConfigPanel(props: { ctx: SettingCtx; busy: boolean; onEdit: (card: "key" | "eln" | "programs") => void; onClose: () => void; onSaved?: () => void }) {
  const { ctx } = props;
  const [query, setQuery] = useState("");
  const all = settingRows(ctx, props.busy);
  const rows = query ? all.filter((r) => matches(r, query)) : all;
  const [sel, setSel] = useState(0);
  const [step, setStep] = useState<Step>({ t: "list" });
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ text: string; color?: string }>();
  const row = rows[Math.min(sel, rows.length - 1)];
  const max = useContext(CardRows);

  const save = async (def: SettingDef, value: string, scope: Scope) => {
    setStep({ t: "list" });
    lastScope.set(def.name, scope);
    const m = await saveSetting(ctx, def, value, scope);
    props.onSaved?.();
    setMsg(m);
  };

  const reset = async (def: SettingDef) => {
    setStep({ t: "list" });
    const m = await resetRow(ctx, def);
    props.onSaved?.();
    setMsg(m);
  };

  const pickScope = (def: SettingDef, value: string) => {
    if (value === RESET || (!value && canReset(row!))) return void reset(def);
    if (def.scopes.length === 1) return void save(def, value, def.scopes[0]!);
    const at = def.scopes.indexOf(lastScope.get(def.name) ?? def.scopes[0]!);
    setStep({ t: "scope", def, value, sel: Math.max(0, at) });
  };

  const open = () => {
    setMsg(undefined);
    if (!row) return;
    const e = settingEditor(row);
    if (e.t === "message") return setMsg({ text: e.text, color: e.color });
    if (e.t === "edit") return props.onEdit(e.card);
    if (e.t === "text") setText("");
    setStep(e);
  };

  const search = (q: string) => {
    setQuery(q);
    setSel(0);
    setMsg(undefined);
  };

  const move = (dir: "up" | "down") => {
    const n = Math.max(1, rows.length);
    setSel((s) => (s + (dir === "up" ? n - 1 : 1)) % n);
  };

  useInput((ch, key) => {
    if (step.t === "text" || step.t === "list") return;
    if (key.escape) return setStep({ t: "list" });
    const up = key.upArrow, down = key.downArrow;
    const choose = key.return || ch === " ";
    if (step.t === "value") {
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
  }, { isActive: step.t !== "text" && step.t !== "list" });

  const labelW = Math.max(...all.map((r) => r.def.label.length)) + 2;
  let group = "";
  let at = 2;
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
    const on = r === row;
    if (on) follow = at;
    at++;
    lines.push(
      <Box key={r.def.name}>
        <Text color={on ? "cyan" : undefined}>{on ? "▸ " : "  "}</Text>
        <Text color={on ? "cyan" : undefined}>{r.def.label.padEnd(labelW)}</Text>
        <Text dimColor={r.locked}>{clip(shown(r, ctx), 44).padEnd(46)}</Text>
        <Text dimColor color={r.locked ? "yellow" : undefined}>
          {rowTag(r, ctx.cwd)}
        </Text>
      </Box>,
    );
    if (on && step.t === "value")
      step.options.forEach((o, j) => {
        const note = choiceNote(step.def, o);
        lines.push(
          <Text key={`o${j}`} color={j === step.sel ? "cyan" : undefined}>
            {"    "}
            {j === step.sel ? "▸ " : "  "}
            {o}
            {note ? <Text dimColor>{"  " + note}</Text> : null}
          </Text>,
        );
      });
    if (on && step.t === "text") {
      const lead = `    New value${r.def.unit ? ` (${r.def.unit})` : ""}: `;
      lines.push(
        <Box key="text">
          <Text>{lead}</Text>
          <Field value={text} onChange={setText} onSubmit={(v) => pickScope(r.def, v.trim())} onCancel={() => setStep({ t: "list" })} indent={lead.length} />
        </Box>,
      );
      const hint = textHint(r);
      if (hint) lines.push(<Text key="hint" dimColor>{"    " + hint}</Text>);
    }
    if (on && step.t === "scope") {
      lines.push(<Text key="where">{`    Save ${step.value} for:`}</Text>);
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
  if (!rows.length) lines.push(<Text key="none" dimColor>{"  No setting matches. Backspace or Esc clears the search."}</Text>);

  const keys =
    step.t === "list"
      ? `↑↓ move · Enter or Space change · type to search · Esc ${query ? "clears the search" : "close"}`
      : step.t === "text"
        ? "Enter saves · Esc goes back"
        : "↑↓ move · Enter choose · Esc goes back";

  const extra = step.t === "value" ? step.sel + 1 : step.t === "scope" ? step.sel + 2 : step.t === "text" ? 1 : 0;
  const head = (
    <>
      <Text bold color="cyan">
        Settings
      </Text>
      <Box>
        {query ? <Text>Search: </Text> : null}
        <InputBox
          single
          arrowsOut
          active={step.t === "list"}
          value={query}
          placeholder="Type to search the labels and help."
          onChange={(v) => (!query && v === " " ? open() : search(v))}
          onSubmit={open}
          onEscape={() => (query ? search("") : props.onClose())}
          onEdge={move}
        />
        {query ? <Text dimColor>{`  ${rows.length} of ${all.length}`}</Text> : null}
      </Box>
      {lines}
    </>
  );
  const tail = (
    <Box marginTop={1} flexDirection="column">
      {row ? <Text>{rowHelp(row)}</Text> : null}
      {(row?.def.details?.(ctx) ?? []).map((d, i) => (
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
