import React, { useContext, useState } from "react";
import { CardRows, Fit } from "./fit.tsx";
import { pointTime } from "../core/rewind.ts";
import { Box, Text, useInput } from "ink";
import { Field } from "./input-box.tsx";
import type { Question } from "../core/types.ts";
import {
  CLARIFY_SKIP_ANSWER, CLARIFY_TITLE, checkLines, DATA_CHECK_TITLE, DESIGN_TITLE, questionCursor, questionEnter, questionNeed, questionStartText, programQuestion, clarifyOpen, clarifyProgress, itemCount, PICK_LABEL, settingLabel, settingQuestion,
  choiceLabel, choiceValue, definitionLabel, fieldKind, findingReasonLabel, findingTitle, fixedProblem, numberProblem, permissionView, phiView, pilotGate, pilotQuestion, planHint, planInit,
  planQuestions, planReduce, planResolve, planTitle, programSwitches, recommendedIndex, referenceLine, referenceQuestion, refModeQuestion, REFERENCE_PATH_LABEL, setupValues, show,
  REWIND_HELP, REWIND_TITLE, type Card, type PlanAction, type PlanState,
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

function Prompt(props: { label: string; initial?: string; onSubmit: (v: string) => void; onCancel: () => void; onBack?: () => void }) {
  const [v, setV] = useState(props.initial ?? "");
  useInput((_, key) => {
    if (key.tab && key.shift && props.onBack) props.onBack();
  });
  return (
    <Box>
      <Text>{props.label} </Text>
      <Field value={v} onChange={setV} onSubmit={props.onSubmit} onCancel={props.onCancel} indent={props.label.length + 1} />
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

export function PhiCard(props: { card: Extract<Card, { t: "phi" }>; onAction: (a: "send" | "mask" | "local" | "stop") => void }) {
  const v = phiView(props.card);
  useInput((input, key) => {
    if (key.escape) return props.onAction("stop");
    const a = v.actions.find((x) => x.key === input);
    if (a) props.onAction(a.act);
  });
  return (
    <Frame title={v.title} color="red">
      <Text>{v.intro}</Text>
      {v.lines.map((l, i) => (
        <Text key={i}>  {l}</Text>
      ))}
      {v.more ? <Text dimColor>  {v.more}</Text> : null}
      <Box marginTop={1}>
        <Text dimColor>{v.note}</Text>
      </Box>
      {v.noLocal ? <Text dimColor>{v.noLocal}</Text> : null}
      <Box flexDirection="column" marginTop={1}>
        {v.actions.map((a) => (
          <Text key={a.act}>
            <Text color="cyan">{a.key}</Text> {a.label}
            <Text dimColor>. {a.help}{a.act === "stop" ? " (Esc)" : ""}</Text>
          </Text>
        ))}
      </Box>
    </Frame>
  );
}

export function QuestionCard(props: {
  card: Extract<Card, { t: "question" }>;
  onAnswer: (value: unknown, note?: string) => void;
  onDismiss: () => void;
  onBack?: () => void;
  current?: unknown;
  progress?: string;
  note?: string;
  title?: string;
}) {
  const q = props.card.q;
  const free = !q.options.length;
  const [other, setOther] = useState(free);
  const [cursor, setCursor] = useState(() => questionCursor(q, props.current));
  const [need, setNeed] = useState("");
  const recIndex = recommendedIndex(q);
  const missing = questionNeed(q);
  useInput(
    (input, key) => {
      const n = Number(input);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, q.options.length)) props.onAnswer(q.options[n - 1]!.value);
      else if (key.upArrow) setCursor((c) => (c + q.options.length - 1) % q.options.length);
      else if (key.downArrow) setCursor((c) => (c + 1) % q.options.length);
      else if (input === "o") setOther(true);
      else if (key.return) {
        const r = questionEnter(q, cursor);
        if ("value" in r) props.onAnswer(r.value);
        else (setNeed(r.type), setOther(true));
      } else if (props.onBack && ((key.tab && key.shift) || key.leftArrow)) props.onBack();
      else if (key.escape) props.onDismiss();
    },
    { isActive: !other },
  );
  return (
    <Frame title={props.title ?? `Your decision: ${q.title}`} color="magenta">
      {props.progress ? <Text dimColor>{props.progress}</Text> : null}
      <Text>{q.text}</Text>
      {q.evidence ? (
        <Box marginTop={1}>
          <Text>{q.evidence}</Text>
        </Box>
      ) : null}
      {props.note ? <Text color="yellow">{props.note}</Text> : null}
      <Box flexDirection="column">
        <Box flexDirection="column" marginTop={1}>
          {q.options.map((o, i) => (
            <Text key={i} color={i === cursor && !other ? "magenta" : undefined}>
              {i === cursor && !other ? "▸" : " "} <Text color="magenta">{i + 1}</Text> {o.label}
              {i === recIndex ? <Text color="green"> (recommended)</Text> : null}
            </Text>
          ))}
          {free ? null : (
            <Text>
              {"  "}
              <Text color="magenta">o</Text> other: type your own answer
            </Text>
          )}
        </Box>
        {q.recommendation?.reason ? (
          <Box marginTop={1}>
            <Text dimColor>Recommended: {q.recommendation.reason}</Text>
          </Box>
        ) : null}
        {need || missing ? <Text color="yellow">{need || missing}</Text> : null}
        {other ? (
          <Prompt
            label="Your answer:"
            initial={free ? questionStartText(q, props.current) : ""}
            onSubmit={(v) => {
              const t = v.trim();
              if (t) return props.onAnswer(t);
              const r = questionEnter(q, cursor);
              if ("value" in r && free) props.onAnswer(r.value);
              else setNeed(questionNeed(q) ?? "Type your answer.");
            }}
            onCancel={() => (free ? props.onDismiss() : setOther(false))}
            onBack={props.onBack}
          />
        ) : (
          <Text dimColor>
            ↑↓ choose · Enter accepts · a number answers at once{props.onBack ? " · ← back" : ""} · Esc {props.progress ? "leaves the questions (they stay open: /questions)" : "answers later with /questions"}
          </Text>
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

export function RewindCard(props: { card: Extract<Card, { t: "rewind" }>; onChoose: (n: number) => void; onClose: () => void }) {
  const list = props.card.points;
  const [sel, setSel] = useState(Math.max(0, list.length - 1));
  useInput((_, key) => {
    if (key.escape) props.onClose();
    else if (key.upArrow) setSel((x) => Math.max(0, x - 1));
    else if (key.downArrow) setSel((x) => Math.min(list.length - 1, x + 1));
    else if (key.return && list[sel]) props.onChoose(list[sel]!.n);
  });
  return (
    <Frame title={REWIND_TITLE} color="cyan" arrows>
      <Text dimColor>{REWIND_HELP}</Text>
      {list.map((p, i) => (
        <Text key={p.n} color={i === sel ? "cyan" : undefined} bold={i === sel} wrap="truncate-end">
          {i === sel ? "▸ " : "  "}
          {String(p.n).padStart(2)}. {pointTime(p)} {p.label}
        </Text>
      ))}
      <Text dimColor>↑ ↓ select · Enter returns to this point · Esc closes</Text>
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
      if (kind !== "choice" || !editField) return;
      if (key.escape) setEditing(undefined);
      else {
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
                  <Field value={String(values[f.key] ?? "")} onChange={(v) => setValue(f.key, v)} onSubmit={finishEdit} onCancel={() => setEditing(undefined)} indent={4} />
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
  return (
    <Frame title="eLabFTW notebook" color="cyan">
      <Text>Type the address of your eLabFTW server and an API key with write access.</Text>
      <Text dimColor>The harness saves both to {props.path}. Only your user can read that file. The screen shows the key masked.</Text>
      <Box marginTop={1}>
        <Text>URL: </Text>
        {step === "url" ? <Field value={url} onChange={setUrl} onSubmit={() => url.trim() && setStep("key")} onCancel={props.onCancel} indent={5} /> : <Text>{url}</Text>}
      </Box>
      {step === "key" ? (
        <Box>
          <Text>Key: </Text>
          <Field value={key} onChange={setKey} onSubmit={(k) => props.onSubmit(url.trim(), k.trim())} onCancel={props.onCancel} mask="*" indent={5} />
        </Box>
      ) : null}
      <Text dimColor>Enter continues · Esc cancels</Text>
    </Frame>
  );
}

export function KeyCard(props: { card: Extract<Card, { t: "key" }>; path: string; onSubmit: (key: string) => void; onCancel: () => void }) {
  const [v, setV] = useState("");
  return (
    <Frame title="Claude API key" color="cyan">
      {props.card.reason ? <Text>{props.card.reason}</Text> : null}
      <Text>Paste your key from console.anthropic.com. The screen shows it masked.</Text>
      <Text dimColor>The harness checks it with the API, then saves it to {props.path}. Only your user can read that file.</Text>
      <Box marginTop={1}>
        <Text>Key: </Text>
        <Field value={v} onChange={setV} onSubmit={(k) => props.onSubmit(k.trim())} onCancel={props.onCancel} mask="*" indent={5} />
      </Box>
      <Text dimColor>Enter saves · Esc cancels</Text>
    </Frame>
  );
}


export function ClarifyCard(props: { card: Extract<Card, { t: "clarify" }>; session: SessionLike }) {
  const { card } = props;
  const [, setTick] = useState(0);
  const open = clarifyOpen(card, props.session.questions.open());
  const q = open[0];
  const answer = (value: unknown, note?: string) => void props.session.answer(q!.qid, value, note).then(() => setTick((x) => x + 1));
  return (
    <Frame title={CLARIFY_TITLE} color="magenta">
      {card.found ? <Text>{card.found}</Text> : null}
      {card.check ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>{DATA_CHECK_TITLE}</Text>
          {checkLines(card, q && !q.title.startsWith(DATA_CHECK_TITLE) ? 1 : 14).map((l, i) => (
            <Text key={i} dimColor={!l.startsWith("- ")}>{l}</Text>
          ))}
        </Box>
      ) : null}
      {card.notes?.length ? (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>{DESIGN_TITLE}</Text>
          {card.notes.map((l, i) => (
            <Text key={i} color="yellow">! {l}</Text>
          ))}
        </Box>
      ) : null}
      {card.skipped.length ? <Text dimColor>Not asked, because your request answers it: {card.skipped.map((x) => x.split(" The request says:")[0]).join(" ")}</Text> : null}
      {q ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>{clarifyProgress(card, props.session.questions.open())}. Esc skips it.</Text>
          <QuestionCard key={q.qid} card={{ t: "question", q }} onAnswer={answer} onDismiss={() => answer(CLARIFY_SKIP_ANSWER)} />
        </Box>
      ) : (
        <Text dimColor>The agent now proposes the metrics.</Text>
      )}
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
  const items = itemCount(card);
  const pilot = pilotGate(card);
  const mode = st.mode;
  useInput(
    (input, key) => {
      if (step === "program") {
        const n = Number(input);
        if (Number.isInteger(n) && n >= 1 && n <= switches.length) act({ a: "program", index: n - 1 });
        else if (key.escape) act({ a: "back" });
        return;
      }
      if (card.stage === "pilot") {
        if (input === "e") act({ a: "pick" });
        else if (input === "d") act({ a: "details" });
        return;
      }
      const n = Number(input);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, items)) act({ a: "item", n });
      else if (input === "e") act({ a: "pick" });
      else if (input === "d") act({ a: "details" });
      else if (input === (pilot ? "r" : "a") || key.return) act({ a: "run" });
      else if (input === "c") act({ a: "change" });
      else if (input === "x" || key.escape) act({ a: "cancel" });
      else if (input === "m") act({ a: "mode" });
      else if (input === "p" && switches.length) act({ a: "programs" });
    },
    { isActive: (card.stage === "plan" && (step === "actions" || step === "program")) || (card.stage === "pilot" && step === "decisions") },
  );
  const ask = (key: string, question: Question, onAnswer: (v: unknown) => void) => (
    <QuestionCard key={key} card={{ t: "question", q: question }} onAnswer={onAnswer} onDismiss={() => act({ a: "back" })} />
  );
  const editor =
    step === "pick" ? (
      <Prompt label={PICK_LABEL} onSubmit={(v) => act({ a: "item", n: Number(v) })} onCancel={() => act({ a: "back" })} />
    ) : step === "setting" ? (
      settingQuestion(card, st) ? (
        ask("setting", settingQuestion(card, st)!, (v) => act({ a: "setValue", value: v }))
      ) : (
        <Prompt label={settingLabel(card, st) ?? ""} onSubmit={(v) => act({ a: "setValue", value: v })} onCancel={() => act({ a: "back" })} />
      )
    ) : step === "useprogram" && programQuestion(card, st) ? (
      ask("useprogram", programQuestion(card, st)!, (v) => act({ a: "useProgram", value: String(v) }))
    ) : step === "definition" && definitionLabel(card, st) ? (
      <Prompt label={definitionLabel(card, st)!} onSubmit={(v) => act({ a: "define", text: v })} onCancel={() => act({ a: "back" })} />
    ) : step === "change" ? (
      <Prompt label="What must change? Say it in plain words." onSubmit={(v) => act({ a: "changeText", text: v })} onCancel={() => act({ a: "back" })} />
    ) : undefined;
  return (
    <Frame title={planTitle(card)} color="cyan">
      <Text>{card.text}</Text>
      {st.details && card.details ? (
        <Box marginTop={1}>
          <Text dimColor>{card.details}</Text>
        </Box>
      ) : null}
      {editor ??
        (card.stage === "pilot" ? (
          <Box flexDirection="column">
            <QuestionCard key="pilot" card={{ t: "question", q: pilotQuestion() }} onAnswer={(v) => act({ a: "pilot", value: String(v) })} onDismiss={() => {}} />
            {items ? <Text dimColor>e change a setting by its number{card.details ? ` · d ${st.details ? "hide" : "show"} details` : ""}</Text> : null}
          </Box>
        ) : q ? (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>
              Open setting {card.qids.length - open.length + 1} of {card.qids.length - st.later.length}. Answer it here, or press Esc to answer later.
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
            <Text>
              {pilot ? (
                <Text>
                  <Text color="green">r</Text> run the demonstration on {card.pilot}
                </Text>
              ) : (
                <Text>
                  <Text color="green">a</Text> approve and start
                </Text>
              )}{" "}
              · <Text color="cyan">c</Text> change · <Text color="red">x</Text> cancel
              {items ? <Text> · <Text color="cyan">1-{Math.min(9, items)}</Text>{items > 9 ? <Text>/<Text color="cyan">e</Text></Text> : null} edit</Text> : null}
              {card.details ? <Text> · <Text color="cyan">d</Text> {st.details ? "hide" : "show"} details</Text> : null}
              {" "}· <Text color="cyan">m</Text> mode {mode}
              {switches.length ? <Text> · <Text color="cyan">p</Text> program</Text> : null}
            </Text>
            <Text dimColor>{planHint(card)}</Text>
          </Box>
        ) : null)}
    </Frame>
  );
}
