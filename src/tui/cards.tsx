import React, { useContext, useState } from "react";
import { CardRows, Fit } from "./fit.tsx";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Question } from "../core/types.ts";
import {
  choiceLabel, choiceValue, definitionLabel, fieldKind, findingReasonLabel, findingTitle, fixedProblem, numberProblem, permissionView, pilotGate, pilotQuestion, planHint, planInit,
  planQuestions, planReduce, planResolve, planTitle, programSwitches, recommendedIndex, referenceLine, referenceQuestion, refModeQuestion, REFERENCE_PATH_LABEL, setupValues, show,
  type Card, type PlanAction, type PlanState,
} from "../ui/cards.ts";
import type { DecisionFieldLike, SessionLike } from "../ui/types.ts";
import type { PlanResponse } from "../core/types.ts";

export type { Card } from "../ui/cards.ts";

function Frame({ title, color, children, arrows }: { title: string; color: string; children: React.ReactNode; arrows?: boolean }) {
  const max = useContext(CardRows);
  const parts = React.Children.toArray(children);
  const tail = parts.length > 1 ? parts.pop() : undefined;
  const head = (
    <>
      <Text bold color={color}>
        {title}
      </Text>
      {parts}
    </>
  );
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
      <CardRows.Provider value={Infinity}>
        <Fit max={max - 2} head={head} tail={tail} arrows={arrows} />
      </CardRows.Provider>
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
  const [showCode, setShowCode] = useState(false);
  const v = permissionView(card);
  const { always, purpose, does, code } = v;
  useInput(
    (input, key) => {
      if (input === "y") props.onAllow();
      else if (input === "a" && always) props.onAlways();
      else if (input === "n") setAsking(true);
      else if (input === "c" && code) setShowCode((x) => !x);
      else if (key.escape) props.onInterrupt();
    },
    { isActive: !asking },
  );
  const args = v.args;
  const lines = showCode && code ? code.split("\n") : [];
  return (
    <Frame title={v.title} color="yellow">
      {purpose ? <Text bold>{purpose}</Text> : null}
      {does ? <Text>{does}</Text> : null}
      {args.map((a, i) => (
        <Text key={i}>{a}</Text>
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
        <Text>{v.touches}</Text>
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
          {always ? ` · a always allow ${card.tool} in this session` : ""}
          {code ? ` · c ${showCode ? "hides" : "shows"} the code` : ""}
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
  const recIndex = recommendedIndex(q);
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
      <Box flexDirection="column">
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
      </Box>
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
    <Frame title={findingTitle(i, list.length)} color="yellow">
      <Text>
        <Text bold>{f.severity}</Text> · {f.check} · {f.fid}
        {done[f.fid] ? <Text color="green"> · {done[f.fid]}</Text> : null}
      </Text>
      <Text>{f.message}</Text>
      {f.nodes?.length ? <Text dimColor>Steps: {f.nodes.join(", ")}</Text> : null}
      {reason ? (
        <Prompt
          label={findingReasonLabel(reason)}
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

export function SetupCard(props: {
  card: Extract<Card, { t: "setup" }>;
  fields: DecisionFieldLike[];
  onSubmit: (values: Record<string, unknown>, profile?: string) => void;
  onCancel: () => void;
}) {
  const { fields } = props;
  const [values, setValues] = useState<Record<string, unknown>>(() => setupValues(fields, props.card));
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
      const problem = numberProblem(editField, raw);
      if (problem) return setError(problem);
      setValue(editField.key, Number(raw));
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
          const fixed = fixedProblem(f);
          if (fixed) return setError(fixed);
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
    <Frame title="Setup: your choices for this analysis" color="green" arrows={false}>
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


export function PlanCard(props: { card: Extract<Card, { t: "plan" }>; session: SessionLike; onRespond: (r: PlanResponse) => void }) {
  const { card } = props;
  const [raw, setSt] = useState<PlanState>(() => planInit(card));
  const [, setTick] = useState(0);
  const all = props.session.questions.open();
  const st = planResolve(card, raw, all);
  const step = st.step;
  const open = planQuestions(card, st, all);
  const q = step === "decisions" ? open[0] : undefined;
  const act = (a: PlanAction) => {
    const r = planReduce(card, st, a);
    if (r.respond) props.onRespond(r.respond);
    else setSt(r.state);
  };
  const switches = programSwitches(card);
  const defs = card.definitions ?? [];
  const pilot = pilotGate(card);
  const mode = st.mode;
  useInput(
    (input, key) => {
      if (step === "restate") {
        if (input === "y" || key.return) act({ a: "restate", ok: true });
        else if (input === "n") act({ a: "restate", ok: false });
        return;
      }
      if (step === "program") {
        const n = Number(input);
        if (Number.isInteger(n) && n >= 1 && n <= switches.length) act({ a: "program", index: n - 1 });
        else if (key.escape) act({ a: "back" });
        return;
      }
      const n = Number(input);
      if (Number.isInteger(n) && n >= 1 && n <= defs.length) act({ a: "definition", index: n - 1 });
      else if (input === (pilot ? "r" : "a") || key.return) act({ a: "run" });
      else if (input === "c") act({ a: "change" });
      else if (input === "x" || key.escape) act({ a: "cancel" });
      else if (input === "m") act({ a: "mode" });
      else if (input === "p" && switches.length) act({ a: "programs" });
    },
    { isActive: card.stage === "plan" && (step === "restate" || step === "actions" || step === "program") },
  );
  const ask = (key: string, question: Question, onAnswer: (v: unknown) => void) => (
    <QuestionCard key={key} card={{ t: "question", q: question }} onAnswer={onAnswer} onDismiss={() => act({ a: "back" })} />
  );
  return (
    <Frame title={planTitle(card)} color="cyan">
      {step === "restate" ? (
        <Box flexDirection="column">
          <Text bold>You want: {card.restatement!.replace(/^you want:?\s*/i, "")}</Text>
          <Text>
            Is that right? <Text color="green">y</Text> yes · <Text color="cyan">n</Text> correct it
          </Text>
        </Box>
      ) : (
        <Text>{card.text}</Text>
      )}
      {card.stage === "pilot" ? (
        step === "change" ? (
          <Prompt label="What must change?" onSubmit={(v) => act({ a: "changeText", text: v })} onCancel={() => act({ a: "back" })} />
        ) : (
          <QuestionCard key="pilot" card={{ t: "question", q: pilotQuestion() }} onAnswer={(v) => act({ a: "pilot", value: String(v) })} onDismiss={() => {}} />
        )
      ) : step === "correct" ? (
        <Prompt label="What do you want?" onSubmit={(v) => act({ a: "correct", text: v })} onCancel={() => act({ a: "back" })} />
      ) : q ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>
            Open decision {card.qids.length - open.length + 1} of {card.qids.length - st.later.length}. Answer it here, or press Esc to answer later.
          </Text>
          <QuestionCard
            key={q.qid}
            card={{ t: "question", q }}
            onAnswer={(value, note) => void props.session.answer(q.qid, value, note).then(() => setTick((x) => x + 1))}
            onDismiss={() => act({ a: "later", qid: q.qid })}
          />
        </Box>
      ) : step === "reference" ? (
        ask("ref", referenceQuestion(card), (v) => act({ a: "reference", value: String(v) }))
      ) : step === "refpath" ? (
        <Prompt label={REFERENCE_PATH_LABEL} onSubmit={(v) => act({ a: "refpath", text: v })} onCancel={() => act({ a: "back" })} />
      ) : step === "refmode" ? (
        ask("refmode", refModeQuestion(st), (v) => act({ a: "refmode", value: String(v) }))
      ) : step === "change" ? (
        <Prompt label="What must change?" onSubmit={(v) => act({ a: "changeText", text: v })} onCancel={() => act({ a: "back" })} />
      ) : step === "definition" && definitionLabel(card, st) ? (
        <Prompt label={definitionLabel(card, st)!} onSubmit={(v) => act({ a: "define", text: v })} onCancel={() => act({ a: "back" })} />
      ) : step === "program" ? (
        <Box flexDirection="column" marginTop={1}>
          {switches.map((t, i) => (
            <Text key={i}>
              <Text color="cyan">{i + 1}</Text> {t}
            </Text>
          ))}
          <Text dimColor>Press a number to ask the agent for this change. Esc goes back.</Text>
        </Box>
      ) : step === "actions" ? (
        <Box flexDirection="column" marginTop={1}>
          {referenceLine(st.ref) ? <Text dimColor>{referenceLine(st.ref)}</Text> : null}
          {defs.length ? <Text dimColor>Each definition is accepted unless you change it: press its number (1 to {defs.length}).</Text> : null}
          <Text>
            {pilot ? (
              <Text>
                <Text color="green">r</Text> run the pilot on {card.pilot} in {mode} mode
              </Text>
            ) : (
              <Text>
                <Text color="green">a</Text> approve and start in {mode} mode
              </Text>
            )}{" "}
            · <Text color="cyan">c</Text> change · <Text color="red">x</Text> cancel · <Text color="cyan">m</Text> mode
            {switches.length ? (
              <Text>
                {" "}· <Text color="cyan">p</Text> change a program
              </Text>
            ) : null}
          </Text>
          <Text dimColor>{planHint(card)}</Text>
        </Box>
      ) : null}
    </Frame>
  );
}
