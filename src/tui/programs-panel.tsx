import React, { useContext, useEffect, useRef, useState } from "react";
import { Box, useInput } from "ink";
import { Text } from "./text.tsx";
import { CardRows, Fit } from "./fit.tsx";
import { Field } from "./input-box.tsx";
import { lastUseText, listPrograms, sizeText, stateText, originText, type Action, type Plan, type ProgramRow } from "../core/programs.ts";
import { addFor, copyText, dropInstall, fieldTitle, mergeRows, planFor, reviewFor, rowActions, runFor, summaryLine, type ProgramHooks } from "../ui/programs.ts";
import { TRUST_NAME } from "../adapters/source.ts";

type Step =
  | { t: "list" }
  | { t: "actions"; sel: number }
  | { t: "path"; text: string }
  | { t: "add"; text: string }
  | { t: "plan"; plan: Plan; sel: number; path?: string }
  | { t: "busy"; text: string; lines: string[] };

const COLOR: Record<string, string | undefined> = { installed: "green", custom: "green", found: "green", missing: "red", old: "yellow", none: undefined };
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function ProgramsPanel(props: { cwd: string; start?: string; hooks?: ProgramHooks; record?: ProgramHooks["record"]; onClose: () => void; onDone?: (text: string, ok: boolean) => void }) {
  const hooks = { cwd: props.cwd, ...props.hooks };
  const [rows, setRows] = useState<ProgramRow[]>();
  const [checking, setChecking] = useState(true);
  const [sel, setSel] = useState(0);
  const [step, setStep] = useState<Step>({ t: "list" });
  const [msg, setMsg] = useState<{ text: string; color?: string }>();
  const max = useContext(CardRows);
  const alive = useRef(true);

  const load = async (only?: string[]) => {
    setChecking(true);
    const fresh = await listPrograms({ ...hooks, only }).catch(() => []);
    if (!alive.current) return;
    setRows((old) => (only && old ? mergeRows(old, fresh) : fresh));
    setChecking(false);
  };

  useEffect(() => {
    alive.current = true;
    void (async () => {
      const quick = await listPrograms({ ...hooks, quick: true }).catch(() => []);
      if (!alive.current) return;
      setRows((old) => old ?? quick);
      const i = props.start ? quick.findIndex((r) => r.name === props.start) : -1;
      if (i >= 0) setSel(i);
      await load();
    })();
    return () => {
      alive.current = false;
    };
  }, []);

  const list = rows ?? [];
  const row = list[Math.min(sel, Math.max(0, list.length - 1))];
  const actions = row ? rowActions(row) : [];

  const plan = async (action: Action, path?: string) => {
    if (!row) return;
    setStep({ t: "busy", text: action === "path" ? "Checking the path..." : "Preparing...", lines: [] });
    const r = await planFor(row.name, action, { ...hooks, path });
    if (!alive.current) return;
    if (!r.plan) {
      setStep({ t: "list" });
      return setMsg({ text: r.error ?? "No plan.", color: "red" });
    }
    if (action === "check") return run(r.plan, false);
    setStep({ t: "plan", plan: r.plan, sel: 0, path });
  };

  const run = async (p: Plan, confirmed: boolean) => {
    const lines: string[] = [];
    setStep({ t: "busy", text: `${p.title}...`, lines });
    const r = await runFor(p, "terminal", { ...hooks, record: props.record, confirmed, onLine: (l) => {
      lines.push(l);
      if (alive.current) setStep({ t: "busy", text: `${p.title}...`, lines: [...lines] });
    } });
    if (!alive.current) return;
    setStep({ t: "list" });
    setMsg({ text: r.text, color: r.ok ? "green" : "red" });
    props.onDone?.(r.text, r.ok);
    if (r.rows) setRows((old) => mergeRows(old ?? [], r.rows!));
    else await load([p.name]);
  };

  const planButtons = (s: Extract<Step, { t: "plan" }>) => {
    const out: { label: string; go: () => void }[] = [];
    const back = () => {
      if (s.plan.installId) dropInstall(s.plan.installId);
      setStep({ t: "list" });
    };
    if (!s.plan.refused && s.plan.runs) out.push({ label: s.plan.confirm ?? "Run", go: () => void run(s.plan, true) });
    if (s.plan.review && s.plan.installId)
      out.push({
        label: s.plan.review,
        go: () =>
          void (async () => {
            setStep({ t: "busy", text: "Claude is reading the files...", lines: [] });
            const r = await reviewFor(s.plan.installId!);
            if (!alive.current) return;
            if (r.plan) setStep({ t: "plan", plan: r.plan, sel: 0 });
            else {
              setStep({ t: "list" });
              setMsg({ text: r.error ?? "The review failed.", color: "red" });
            }
          })(),
      });
    if (s.plan.command || s.plan.link) out.push({ label: "Copy", go: () => setMsg({ text: copyText(s.plan.command ?? s.plan.link!) ? "Copied." : `Copy this: ${s.plan.command ?? s.plan.link}`, color: "cyan" }) });
    out.push({ label: s.plan.runs && !s.plan.refused ? "Cancel" : "Back", go: back });
    return out;
  };

  useInput((ch, key) => {
    if (step.t === "path" || step.t === "busy" || step.t === "add") return;
    const up = key.upArrow || key.leftArrow, down = key.downArrow || key.rightArrow;
    if (step.t === "list") {
      if (key.escape) return props.onClose();
      if (!list.length) return;
      if (key.upArrow) setSel((s) => (s + list.length - 1) % list.length);
      else if (key.downArrow) setSel((s) => (s + 1) % list.length);
      else if (key.return || ch === " ") {
        setMsg(undefined);
        setStep({ t: "actions", sel: 0 });
      } else if (ch === "r") void load();
      else if (ch === "a") {
        setMsg(undefined);
        setStep({ t: "add", text: "" });
      }
      return;
    }
    if (key.escape) return setStep({ t: "list" });
    if (step.t === "actions") {
      const n = actions.length;
      if (up) setStep({ ...step, sel: (step.sel + n - 1) % n });
      else if (down) setStep({ ...step, sel: (step.sel + 1) % n });
      else if (key.return || ch === " ") {
        const a = actions[step.sel]!.action;
        if (a === "path") setStep({ t: "path", text: row?.access.path ?? "" });
        else void plan(a);
      }
      return;
    }
    const buttons = planButtons(step);
    const n = buttons.length;
    if (up) setStep({ ...step, sel: (step.sel + n - 1) % n });
    else if (down) setStep({ ...step, sel: (step.sel + 1) % n });
    else if (key.return) buttons[step.sel]?.go();
    else if (/^[1-9]$/.test(ch)) buttons[Number(ch) - 1]?.go();
  });

  const nameW = Math.max(8, ...list.map((r) => r.name.length)) + 2;
  const progW = Math.min(22, Math.max(8, ...list.map((r) => r.program.length))) + 2;
  const lines: React.ReactNode[] = [];
  let field = "";
  let at = 1;
  let follow = 0;
  list.forEach((r, i) => {
    if (r.field !== field) {
      field = r.field;
      at += i ? 2 : 1;
      lines.push(
        <Box key={`g${i}`} marginTop={i ? 1 : 0}>
          <Text bold>{fieldTitle(field)}</Text>
        </Box>,
      );
    }
    const on = i === sel;
    if (on) follow = at;
    at++;
    lines.push(
      <Box key={r.name}>
        <Text color={on ? "cyan" : undefined}>{(on ? "▸ " : "  ") + r.name.padEnd(nameW)}</Text>
        <Text>{clip(r.program, progW - 2).padEnd(progW)}</Text>
        <Text color={r.access.off ? "gray" : COLOR[r.state]}>{stateText(r).padEnd(18)}</Text>
        <Text color={r.trust === "unlisted" ? "yellow" : undefined}>{TRUST_NAME[r.trust].padEnd(10)}</Text>
        <Text dimColor>{[clip(r.version, 18), sizeText(r.size), r.lastUsed ? `used ${lastUseText(r.lastUsed)}` : ""].filter(Boolean).join(" · ")}</Text>
      </Box>,
    );
    if (on && step.t === "actions")
      actions.forEach((a, j) => {
        lines.push(
          <Text key={`a${j}`} color={j === step.sel ? "cyan" : undefined}>
            {"    " + (j === step.sel ? "▸ " : "  ") + a.label}
          </Text>,
        );
      });
    if (on && step.t === "path")
      lines.push(
        <Box key="path" flexDirection="column">
          <Text>{`    Path of ${r.program}, or of the folder that holds it:`}</Text>
          <Box>
            <Text>{"    "}</Text>
            <Field value={step.text} onChange={(v) => setStep({ t: "path", text: v })} onSubmit={(v) => void plan("path", v)} onCancel={() => setStep({ t: "list" })} indent={4} />
          </Box>
        </Box>,
      );
  });

  const extra = step.t === "actions" ? step.sel + 1 : step.t === "path" ? 2 : 0;
  const head = (
    <>
      <Text bold color="cyan">
        Programs
      </Text>
      <Text dimColor>{rows ? summaryLine(list) + (checking ? " Checking versions..." : "") : "Looking for the programs..."}</Text>
      {lines}
    </>
  );

  let confirm: React.ReactNode = null;
  if (step.t === "plan") {
    const p = step.plan;
    const buttons = planButtons(step);
    confirm = (
      <Box flexDirection="column" borderStyle="round" borderColor={p.refused ? "gray" : p.danger ? "red" : "yellow"} paddingX={1} marginTop={1}>
        <Text bold color={p.refused ? undefined : p.danger ? "red" : "yellow"}>
          {p.title}
        </Text>
        {p.refused ? <Text color="red">{p.refused}</Text> : null}
        {p.lines.map((l, i) => (
          <Text key={i}>{l}</Text>
        ))}
        {p.command ? <Text color="cyan">{`Command: ${p.command}`}</Text> : null}
        {p.link ? <Text color="cyan">{`Link: ${p.link}`}</Text> : null}
        <Box marginTop={1}>
          {buttons.map((b, i) => (
            <Text key={b.label} color={i === step.sel ? "cyan" : undefined} inverse={i === step.sel}>
              {` ${i + 1} ${b.label} `}
            </Text>
          ))}
        </Box>
        <Text dimColor>←→ choose · Enter or a number · Esc back. Nothing changes before you confirm.</Text>
      </Box>
    );
  }
  const adding =
    step.t === "add" ? (
      <Box flexDirection="column" marginTop={1}>
        <Text>Address of a repository, a folder, a zip file, or the name of an adapter in the registry:</Text>
        <Box>
          <Field
            value={step.text}
            onChange={(v) => setStep({ t: "add", text: v })}
            onSubmit={(v) =>
              void (async () => {
                setStep({ t: "busy", text: "Fetching and checking the adapter...", lines: [] });
                const r = await addFor(v);
                if (!alive.current) return;
                if (r.plan) setStep({ t: "plan", plan: r.plan, sel: 0 });
                else {
                  setStep({ t: "list" });
                  setMsg({ text: r.error ?? "No plan.", color: "red" });
                }
              })()
            }
            onCancel={() => setStep({ t: "list" })}
            indent={0}
          />
        </Box>
      </Box>
    ) : null;
  const busy =
    step.t === "busy" ? (
      <Box flexDirection="column" marginTop={1}>
        <Text color="yellow">{step.text}</Text>
        {step.lines.slice(-8).map((l, i) => (
          <Text key={i} dimColor wrap="truncate-end">
            {"  " + l}
          </Text>
        ))}
      </Box>
    ) : null;

  const keys = step.t === "list" ? "↑↓ move · Enter actions · a add an adapter · r check all again · Esc close" : step.t === "actions" ? "↑↓ move · Enter choose · Esc back" : step.t === "path" ? "Enter checks the path · Esc back" : "";
  const tail = (
    <Box flexDirection="column" marginTop={1}>
      {row && step.t === "list" ? (
        <>
          <Text>{row.detail}</Text>
          {row.cite ? <Text dimColor wrap="truncate-end">How to cite: {row.cite}</Text> : null}
          <Text dimColor>{[originText(row), `adapter status: ${row.adapterStatus}`, row.access.off ? "turned off" : ""].filter(Boolean).join(" · ")}</Text>
          <Text color={row.trust === "unlisted" ? "yellow" : undefined} dimColor={row.trust !== "unlisted"}>{row.trustDetail}{row.codePending ? " Its code needs your permission before it first runs." : ""}</Text>
        </>
      ) : null}
      {confirm}
      {adding}
      {busy}
      {msg ? <Text color={msg.color}>{msg.text}</Text> : null}
      {keys ? <Text dimColor>{keys}</Text> : null}
    </Box>
  );
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Fit max={max - 2} head={head} tail={tail} arrows={false} follow={follow + extra + 1} />
    </Box>
  );
}
