import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Finding, Question } from "../core/types.ts";
import type { DecisionFieldLike, SessionLike } from "./types.ts";

export type Card =
  | { t: "setup"; profiles: { name: string; version: number }[]; proposed?: Record<string, unknown>; proposedFrom?: string }
  | { t: "eln" }
  | { t: "permission"; rid: string; tool: string; args: Record<string, unknown>; code?: string; touches: string }
  | { t: "question"; q: Question }
  | { t: "instruction"; step: number; tool: string; text: string }
  | { t: "findings"; list: Finding[] }
  | { t: "key"; reason?: string };

export function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "not set";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function Frame({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
      <Text bold color={color}>
        {title}
      </Text>
      {children}
    </Box>
  );
}

function Prompt(props: { label: string; initial?: string; onSubmit: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(props.initial ?? "");
  useInput((_, key) => {
    if (key.escape) props.onCancel();
  });
  return (
    <Box>
      <Text>{props.label} </Text>
      <TextInput value={v} onChange={setV} onSubmit={props.onSubmit} />
    </Box>
  );
}

export function PermissionCard(props: {
  card: Extract<Card, { t: "permission" }>;
  onAllow: () => void;
  onAlways: () => void;
  onDeny: (note?: string) => void;
  onInterrupt: () => void;
}) {
  const { card } = props;
  const [asking, setAsking] = useState(false);
  useInput(
    (input, key) => {
      if (input === "y") props.onAllow();
      else if (input === "a" && card.tool !== "eln_push") props.onAlways();
      else if (input === "n") setAsking(true);
      else if (key.escape) props.onInterrupt();
    },
    { isActive: !asking },
  );
  const args = Object.entries(card.args)
    .filter(([, v]) => !(card.code && typeof v === "string" && v.trim() === card.code.trim()))
    .map(([k, v]) => `${k} = ${typeof v === "string" ? v : JSON.stringify(v)}`);
  const lines = card.code?.split("\n") ?? [];
  return (
    <Frame title={`Permission needed: ${card.tool}`} color="yellow">
      {args.map((a, i) => (
        <Text key={i}>{a.length > 160 ? a.slice(0, 157) + "..." : a}</Text>
      ))}
      {lines.length ? (
        <Box flexDirection="column" marginTop={1}>
          {lines.map((l, i) => (
            <Text key={i}>
              <Text dimColor>{String(i + 1).padStart(3)} </Text>
              {l}
            </Text>
          ))}
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text>This will touch: {card.touches}</Text>
      </Box>
      {asking ? (
        <Prompt
          label="Reason for the agent (Enter to skip):"
          onSubmit={(v) => props.onDeny(v.trim() || undefined)}
          onCancel={() => setAsking(false)}
        />
      ) : (
        <Text>
          <Text color="green">y</Text> allow · <Text color="red">n</Text> deny
          {card.tool === "eln_push" ? "" : ` · a always allow ${card.tool} in this session`}
        </Text>
      )}
    </Frame>
  );
}

export function QuestionCard(props: {
  card: Extract<Card, { t: "question" }>;
  onAnswer: (value: unknown, note?: string) => void;
  onDismiss: () => void;
}) {
  const q = props.card.q;
  const [other, setOther] = useState(false);
  const recIndex = q.recommendation ? q.options.findIndex((o) => Object.is(o.value, q.recommendation!.value) || JSON.stringify(o.value) === JSON.stringify(q.recommendation!.value)) : -1;
  useInput(
    (input, key) => {
      const n = Number(input);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, q.options.length)) props.onAnswer(q.options[n - 1]!.value);
      else if (input === "o") setOther(true);
      else if (key.return && q.recommendation) props.onAnswer(q.recommendation.value);
      else if (key.escape) props.onDismiss();
    },
    { isActive: !other },
  );
  return (
    <Frame title={`Your decision: ${q.title}`} color="magenta">
      <Text>{q.text}</Text>
      {q.evidence ? (
        <Box marginTop={1}>
          <Text>{q.evidence}</Text>
        </Box>
      ) : null}
      <Box flexDirection="column" marginTop={1}>
        {q.options.map((o, i) => (
          <Text key={i}>
            <Text color="magenta">{i + 1}</Text> {o.label}
            {i === recIndex ? <Text color="green"> (recommended)</Text> : null}
          </Text>
        ))}
        <Text>
          <Text color="magenta">o</Text> other: type your own answer
        </Text>
      </Box>
      {q.recommendation ? (
        <Box marginTop={1}>
          <Text dimColor>Recommended: {q.recommendation.reason} Press Enter to take it.</Text>
        </Box>
      ) : null}
      {other ? (
        <Prompt label="Your answer:" onSubmit={(v) => v.trim() && props.onAnswer(v.trim())} onCancel={() => setOther(false)} />
      ) : (
        <Text dimColor>Press a number to answer. Esc to answer later with /questions.</Text>
      )}
    </Frame>
  );
}

export function InstructionCard(props: {
  card: Extract<Card, { t: "instruction" }>;
  program: string;
  onDone: () => void;
  onAgent: () => void;
  onInterrupt: () => void;
}) {
  useInput((input, key) => {
    if (key.return) props.onDone();
    else if (input === "s") props.onAgent();
    else if (key.escape) props.onInterrupt();
  });
  const { card } = props;
  return (
    <Frame title={`Your turn: step ${card.step}`} color="cyan">
      <Text>{card.text}</Text>
      <Box marginTop={1}>
        <Text>
          Do this step in {props.program}, then press <Text bold>Enter</Text>. Press <Text bold>s</Text> to let the agent do it. Esc stops the agent.
        </Text>
      </Box>
    </Frame>
  );
}

export function FindingsCard(props: { card: Extract<Card, { t: "findings" }>; session: SessionLike; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState<Record<string, string>>({});
  const list = props.card.list;
  const f = list[i];
  const [reason, setReason] = useState<"reject" | "fix" | undefined>();
  const resolve = (action: "accept" | "reject" | "fix", why?: string) => {
    if (!f) return;
    props.session.findings.resolve(f.fid, action, why);
    setDone((d) => ({ ...d, [f.fid]: action }));
    setReason(undefined);
    if (i + 1 < list.length) setI(i + 1);
  };
  useInput(
    (input, key) => {
      if (!f || key.escape || input === "q") props.onClose();
      else if (input === "a") resolve("accept");
      else if (input === "r") setReason("reject");
      else if (input === "f") setReason("fix");
      else if (key.rightArrow || input === "n") setI(Math.min(list.length - 1, i + 1));
      else if (key.leftArrow) setI(Math.max(0, i - 1));
    },
    { isActive: !reason },
  );
  if (!f) {
    return (
      <Frame title="Review findings" color="yellow">
        <Text>No open findings. Press any key.</Text>
      </Frame>
    );
  }
  return (
    <Frame title={`Review finding ${i + 1} of ${list.length}`} color="yellow">
      <Text>
        <Text bold>{f.severity}</Text> · {f.check} · {f.fid}
        {done[f.fid] ? <Text color="green"> · {done[f.fid]}</Text> : null}
      </Text>
      <Text>{f.message}</Text>
      {f.nodes?.length ? <Text dimColor>Steps: {f.nodes.join(", ")}</Text> : null}
      {reason ? (
        <Prompt
          label={reason === "reject" ? "Why do you reject it? (Enter to skip)" : "What did you fix? (Enter to skip)"}
          onSubmit={(v) => resolve(reason, v.trim() || undefined)}
          onCancel={() => setReason(undefined)}
        />
      ) : (
        <Text>
          <Text color="green">a</Text> accept · <Text color="red">r</Text> reject · <Text color="cyan">f</Text> mark fixed · arrows move · q close
        </Text>
      )}
    </Frame>
  );
}

function fieldKind(f: DecisionFieldLike): "choice" | "bool" | "number" | "text" {
  if (f.choices?.length) return "choice";
  if (/bool/.test(f.kind)) return "bool";
  if (/int|float|num|real/.test(f.kind)) return "number";
  return "text";
}

function choiceValue(c: any): unknown {
  return c !== null && typeof c === "object" && "value" in c ? c.value : c;
}

function choiceLabel(c: any): string {
  return c !== null && typeof c === "object" && "label" in c ? String(c.label) : show(c);
}

export function SetupCard(props: {
  card: Extract<Card, { t: "setup" }>;
  fields: DecisionFieldLike[];
  onSubmit: (values: Record<string, unknown>, profile?: string) => void;
  onCancel: () => void;
}) {
  const { fields } = props;
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.key in (props.card.proposed ?? {}) ? props.card.proposed![f.key] : f.set ? f.value : (f.value ?? f.default)])),
  );
  const [more, setMore] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [profile, setProfile] = useState(-1);
  const [editing, setEditing] = useState<string | undefined>();
  const [pick, setPick] = useState(0);
  const [error, setError] = useState("");

  const shown = [...fields.filter((f) => f.essential), ...(more ? fields.filter((f) => !f.essential) : [])];
  const hidden = fields.length - fields.filter((f) => f.essential).length;
  const rows = [
    ...shown.map((f) => ({ type: "field" as const, f })),
    ...(hidden > 0 ? [{ type: "more" as const }] : []),
    ...(props.card.profiles.length ? [{ type: "profile" as const }] : []),
    { type: "done" as const },
  ];
  const row = rows[Math.min(cursor, rows.length - 1)]!;
  const editField = editing ? fields.find((f) => f.key === editing) : undefined;
  const kind = editField ? fieldKind(editField) : undefined;

  const setValue = (key: string, v: unknown) => setValues((x) => ({ ...x, [key]: v }));

  const finishEdit = (raw: string) => {
    if (!editField) return;
    if (kind === "number") {
      const n = Number(raw);
      if (raw.trim() === "" || Number.isNaN(n)) return setError("Type a number.");
      if (editField.lo !== undefined && n < editField.lo) return setError(`The minimum is ${editField.lo}.`);
      if (editField.hi !== undefined && n > editField.hi) return setError(`The maximum is ${editField.hi}.`);
      setValue(editField.key, n);
    } else setValue(editField.key, raw);
    setError("");
    setEditing(undefined);
  };

  useInput(
    (input, key) => {
      if (key.escape) return props.onCancel();
      if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
      else if (key.downArrow) setCursor((c) => Math.min(rows.length - 1, c + 1));
      else if (row.type === "profile" && (key.leftArrow || key.rightArrow || key.return)) {
        const n = props.card.profiles.length + 1;
        setProfile((p) => ((p + 1 + (key.leftArrow ? n - 1 : 1)) % n) - 1);
      } else if (key.return) {
        if (row.type === "more") setMore((m) => !m);
        else if (row.type === "done") props.onSubmit(values, profile >= 0 ? props.card.profiles[profile]!.name : undefined);
        else if (row.type === "field") {
          const f = row.f;
          if (f.owner === "fixed") return setError(`${f.label} is fixed by the lab profile.`);
          setError("");
          const k = fieldKind(f);
          if (k === "bool") setValue(f.key, !values[f.key]);
          else {
            if (k === "choice") setPick(Math.max(0, f.choices!.findIndex((c) => Object.is(choiceValue(c), values[f.key]))));
            setEditing(f.key);
          }
        }
      }
    },
    { isActive: !editing },
  );

  useInput(
    (_, key) => {
      if (key.escape) setEditing(undefined);
      else if (kind === "choice" && editField) {
        const n = editField.choices!.length;
        if (key.upArrow) setPick((p) => (p + n - 1) % n);
        else if (key.downArrow) setPick((p) => (p + 1) % n);
        else if (key.return) {
          setValue(editField.key, choiceValue(editField.choices![pick]));
          setEditing(undefined);
        }
      }
    },
    { isActive: Boolean(editing) },
  );

  return (
    <Frame title="Setup: your choices for this analysis" color="green">
      {rows.map((r, i) => {
        const on = i === cursor;
        const mark = on ? "▸" : " ";
        if (r.type === "field") {
          const f = r.f;
          return (
            <Box key={f.key} flexDirection="column">
              <Text color={on ? "green" : undefined}>
                {mark} {f.label}: <Text bold>{show(values[f.key])}</Text>
                {f.key in (props.card.proposed ?? {}) ? <Text color="cyan"> (from {props.card.proposedFrom ?? "eLabFTW"}, not saved yet)</Text> : null}
                {f.owner === "fixed" ? <Text dimColor> (fixed)</Text> : null}
                {f.owner === "agent" ? <Text dimColor> (agent decides)</Text> : null}
              </Text>
              {on && f.help && !editing ? <Text dimColor>    {f.help}</Text> : null}
              {editing === f.key && kind === "choice"
                ? f.choices!.map((c, j) => (
                    <Text key={j} color={j === pick ? "green" : undefined}>
                      {"    "}
                      {j === pick ? "●" : "○"} {choiceLabel(c)}
                    </Text>
                  ))
                : null}
              {editing === f.key && kind !== "choice" ? (
                <Box>
                  <Text>{"    "}</Text>
                  <TextInput value={String(values[f.key] ?? "")} onChange={(v) => setValue(f.key, v)} onSubmit={finishEdit} />
                </Box>
              ) : null}
            </Box>
          );
        }
        if (r.type === "more")
          return (
            <Text key="more" color={on ? "green" : undefined}>
              {mark} {more ? "Hide" : "Show"} more settings ({hidden})
            </Text>
          );
        if (r.type === "profile")
          return (
            <Text key="profile" color={on ? "green" : undefined}>
              {mark} Lab profile: <Text bold>{profile < 0 ? "none" : props.card.profiles[profile]!.name}</Text>
              {on ? <Text dimColor> (Enter to change)</Text> : null}
            </Text>
          );
        return (
          <Text key="done" color={on ? "green" : undefined} bold={on}>
            {mark} Save setup and start
          </Text>
        );
      })}
      {error ? <Text color="red">{error}</Text> : null}
      <Text dimColor>Arrows move. Enter edits a field. Esc closes the card.</Text>
    </Frame>
  );
}

export function ElnCard(props: { path: string; onSubmit: (url: string, key: string) => void; onCancel: () => void }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [step, setStep] = useState<"url" | "key">("url");
  useInput((_, k) => {
    if (k.escape) props.onCancel();
  });
  return (
    <Frame title="eLabFTW notebook" color="cyan">
      <Text>Type the address of your eLabFTW server and an API key with write access.</Text>
      <Text dimColor>The harness saves both to {props.path}. Only your user can read that file. The screen shows the key masked.</Text>
      <Box marginTop={1}>
        <Text>URL: </Text>
        {step === "url" ? <TextInput value={url} onChange={setUrl} onSubmit={() => url.trim() && setStep("key")} /> : <Text>{url}</Text>}
      </Box>
      {step === "key" ? (
        <Box>
          <Text>Key: </Text>
          <TextInput value={key} onChange={setKey} onSubmit={(k) => props.onSubmit(url.trim(), k.trim())} mask="*" />
        </Box>
      ) : null}
      <Text dimColor>Enter continues · Esc cancels</Text>
    </Frame>
  );
}

export function KeyCard(props: { card: Extract<Card, { t: "key" }>; path: string; onSubmit: (key: string) => void; onCancel: () => void }) {
  const [v, setV] = useState("");
  useInput((_, key) => {
    if (key.escape) props.onCancel();
  });
  return (
    <Frame title="Claude API key" color="cyan">
      {props.card.reason ? <Text>{props.card.reason}</Text> : null}
      <Text>Paste your key from console.anthropic.com. The screen shows it masked.</Text>
      <Text dimColor>The harness checks it with the API, then saves it to {props.path}. Only your user can read that file.</Text>
      <Box marginTop={1}>
        <Text>Key: </Text>
        <TextInput value={v} onChange={setV} onSubmit={(k) => props.onSubmit(k.trim())} mask="*" />
      </Box>
      <Text dimColor>Enter saves · Esc cancels</Text>
    </Frame>
  );
}
