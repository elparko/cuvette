import React, { useEffect, useState } from "react";
import { Box, Text, useStdout } from "ink";
import type { Mode } from "../core/types.ts";
import { fidelityLabel, type Item } from "../ui/items.ts";
import { Markdown } from "./markdown.tsx";
import type { SessionLike } from "./types.ts";

export type StaticItem = Item | { key: string; t: "header" };

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export const SPINNER_MS = 80;

export function animationsOn(stdout: { isTTY?: boolean } | undefined, env: Record<string, string | undefined>, setting?: unknown): boolean {
  return Boolean(stdout?.isTTY) && env.TERM !== "dumb" && setting !== "off" && setting !== false;
}

export function liveLayout(o: { rows: number; columns: number; card: boolean; running: boolean; input: number; inputRows?: number; keys?: boolean; status?: number; queue: number; suggestions: number; text: boolean; pending: boolean }) {
  const budget = o.rows - 2;
  const footer = 1 + (o.status ?? 2) + (o.keys ? 1 : 0) + o.queue + o.suggestions;
  const box = 2 + (o.inputRows ?? Math.max(1, Math.ceil((o.input + 4) / Math.max(1, o.columns - 4))));
  // A card gets the rows first. The empty message box, the streamed text and the open steps take only the rows that are left.
  const inputBox = !o.card || budget - footer - box >= 22;
  const avail = Math.max(0, budget - footer - (inputBox ? box : 0));
  if (o.card) {
    const live = o.text ? Math.min(3, Math.max(0, avail - 18)) : 0;
    const pending = o.pending ? Math.min(2, Math.max(0, avail - live - 18)) : 0;
    return { inputBox, live, pending, card: Math.max(4, avail - live - pending) };
  }
  const pending = o.pending ? Math.floor(avail / (o.text ? 3 : 1)) : 0;
  return { inputBox, live: avail - pending, pending, card: avail };
}

export function Header({ session }: { session: SessionLike }) {
  const adapters = session.adapterInfo.map((a) => `${a.name} ${a.version} (${a.title} ${a.programVersion})`).join(", ");
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>Cuvette</Text>
      <Text>Adapters: {adapters || "none"}</Text>
      {session.folderLine ? <Text>{session.folderLine}</Text> : null}
      <Text>
        Model: {session.model.model} · Mode: {session.mode} · Session: {session.id}
      </Text>
      <Text dimColor>Type /help for commands.</Text>
    </Box>
  );
}

export function ItemView({ item }: { item: StaticItem }) {
  switch (item.t) {
    case "header":
      return null;
    case "user":
      return (
        <Box marginTop={1}>
          <HangText head={<Text color="cyan">{">"}</Text>} lead={2} text={item.text} bold />
        </Box>
      );
    case "assistant":
      return <AssistantView text={item.text} />;
    case "line":
      return (
        <Box>
          <HangText head={item.sym} lead={item.sym.length + 1} text={item.text} color={item.color} dim={item.dim} />
        </Box>
      );
    case "block":
      return <BlockView title={item.title} text={item.text} />;
    case "step":
      return <StepView item={item} />;
  }
}

// Wraps each line of the text in the room. The caller puts the indent before each next line.
export function hangLines(text: string, room: number): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    let rest = line.trimEnd();
    while (rest.length > room) {
      const cut = rest.lastIndexOf(" ", room);
      const at = cut > room / 3 ? cut : room;
      out.push(rest.slice(0, at).trimEnd());
      rest = rest.slice(at).trimStart();
    }
    out.push(rest);
  }
  return out;
}

function useWidth(): number {
  const { stdout } = useStdout();
  return ((stdout as unknown as { columns?: number })?.columns ?? 80) - 1;
}

// A symbol, then the text. A long text continues under the text, not under the symbol.
// This code wraps the text, because in the transcript Ink wraps a text box beside another box at the wrong width.
function HangText({ head, lead, text, color, dim, bold }: { head: React.ReactNode; lead: number; text: string; color?: string; dim?: boolean; bold?: boolean }) {
  const width = useWidth();
  const body = hangLines(text, Math.max(10, width - lead)).join("\n" + " ".repeat(lead));
  return (
    <Text color={color} dimColor={dim}>
      {head}
      {" "}
      <Text bold={bold}>{body}</Text>
    </Text>
  );
}

// A table row that is wider than the terminal wraps its last column under the start of that column.
export function hangWrap(text: string, width: number): string {
  return text
    .split("\n")
    .flatMap((line) => {
      if (line.length <= width) return [line];
      const gap = /^(.*\S) {2,}(?=\S)/.exec(line.slice(0, width));
      if (gap && gap[0].length > width * 0.6) return [gap[1]!, ...hangLines(line.slice(gap[0].length), Math.max(1, width - 4)).map((l) => "    " + l)];
      const indent = gap ? gap[0].length : 0;
      const out: string[] = [];
      let rest = indent ? line.slice(indent).trim() : line.trimEnd();
      let first = line.slice(0, indent);
      const room = width - indent;
      while (rest.length > room) {
        const cut = rest.lastIndexOf(" ", room);
        const at = cut > room / 3 ? cut : room;
        out.push(first + rest.slice(0, at).trimEnd());
        rest = rest.slice(at).trimStart();
        first = " ".repeat(indent);
      }
      out.push(first + rest);
      return out;
    })
    .join("\n");
}

function BlockView({ title, text }: { title?: string; text: string }) {
  const { stdout } = useStdout();
  const width = ((stdout as unknown as { columns?: number })?.columns ?? 80) - 1;
  return (
    <Box flexDirection="column" marginY={1}>
      {title ? <Text bold>{title}</Text> : null}
      <Text>{hangWrap(text, width)}</Text>
    </Box>
  );
}

function AssistantView({ text }: { text: string }) {
  const { stdout } = useStdout();
  return (
    <Box marginTop={1}>
      <Markdown text={text} width={((stdout as unknown as { columns?: number })?.columns ?? 80) - 1} />
    </Box>
  );
}

function StepHead({ ok, label, text }: { ok: boolean; label: string; text: string }) {
  const width = useWidth();
  const head = hangLines(`${label}  ${text}`, Math.max(10, width - 2)).join("\n  ");
  const mark = <Text color={ok ? "green" : "red"}>{ok ? "●" : "✗"}</Text>;
  if (head !== label && !head.startsWith(label + " ")) return <Text>{mark} {head}</Text>;
  return (
    <Text>
      {mark} <Text bold>{label}</Text>
      <Text color={ok ? undefined : "red"}>{head.slice(label.length)}</Text>
    </Text>
  );
}

function StepView({ item }: { item: Extract<Item, { t: "step" }> }) {
  const label = item.n ? `Step ${item.n}` : (item.purpose ?? item.tool);
  const detail = [item.route, item.settings].filter(Boolean).join(" · ");
  const fid = fidelityLabel(item.fidelity);
  return (
    <Box flexDirection="column">
      <StepHead ok={item.ok} label={label} text={item.ok ? (item.summary ?? "") : (item.error ?? item.summary ?? "")} />
      <Box flexDirection="column" paddingLeft={2}>
        {item.why ? <Text dimColor>Purpose: {item.why}</Text> : null}
        {detail ? <Text dimColor>▸ {detail}</Text> : null}
        {fid ? <Text color="yellow">◇ {fid}</Text> : null}
        {item.outputs.map((o) => (
          <Text key={o.n} dimColor>
            {o.kind}: {o.path} (open with /open {o.n})
          </Text>
        ))}
      </Box>
    </Box>
  );
}

export { activityText } from "../ui/messages.ts";

export function elapsedText(s: number): string {
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

export function runningText(tool: string, purpose: string | undefined, seconds: number): string {
  const what = purpose ?? `Running ${tool}`;
  return seconds >= 5 ? `${what} · ${elapsedText(seconds)} · Esc stops it` : what;
}

export function RunningLine(props: { tool: string; purpose?: string; since?: number; waiting?: boolean; animate?: boolean; color?: boolean }) {
  const [now, setNow] = useState(Date.now());
  const [frame, setFrame] = useState(0);
  const { waiting, animate } = props;
  useEffect(() => {
    if (waiting) return;
    const t = setInterval(
      () => {
        setNow(Date.now());
        if (animate) setFrame((f) => (f + 1) % FRAMES.length);
      },
      animate ? SPINNER_MS : 1000,
    );
    return () => clearInterval(t);
  }, [waiting, animate]);
  if (waiting) return <Text dimColor wrap="truncate-end">● Waiting for your answer</Text>;
  const seconds = props.since ? Math.max(0, Math.floor((now - props.since) / 1000)) : 0;
  return (
    <Text wrap="truncate-end">
      <Text color={animate && props.color ? "cyan" : undefined} dimColor={!animate}>
        {animate ? FRAMES[frame] : "●"}
      </Text>
      <Text dimColor> {runningText(props.tool, props.purpose, seconds)}</Text>
    </Text>
  );
}

const MODE_TEXT: Record<Mode, string> = {
  watch: "watch: the agent runs the steps",
  follow: "follow: you run the steps",
  teach: "teach: you work, the agent checks",
  plan: "plan: the agent plans only",
};

export type FooterHints = "full" | "short" | "off";
export const FOOTER_HINTS: FooterHints[] = ["full", "short", "off"];

export function footerHints(v: unknown): FooterHints {
  return FOOTER_HINTS.includes(v as FooterHints) ? (v as FooterHints) : "full";
}

export function statusRows(o: { hints: FooterHints; bypass?: boolean; state: string; hint?: string }): number {
  if (o.hints === "full") return 2;
  if (o.hints === "short") return 1 + (o.hint ? 1 : 0);
  return (o.bypass ? 1 : 0) + (o.hint || o.state === "running" ? 1 : 0);
}

export function busyHint(state: string, queue?: boolean, esc = "Esc stops this step. "): string {
  const after = queue ? "Your message waits until the turn ends." : state === "running" ? "Your message goes in after the step." : "Your message goes in after the next step.";
  return `${state === "running" ? esc : ""}${after} Start it with ! to send it now.`;
}

export function tokensText(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function StatusLine(props: {
  mode: Mode;
  model: string;
  busy: boolean;
  tool?: string;
  purpose?: string;
  state: string;
  openQuestions: number;
  usage?: string;
  hint?: string;
  details?: boolean;
  queue?: boolean;
  bypass?: boolean;
  keys?: string;
  esc?: string;
  hints?: FooterHints;
}) {
  const hints = props.hints ?? "full";
  const marker = (
    <Text color="yellow" bold>
      bypass permissions
    </Text>
  );
  if (hints !== "full") {
    const head =
      hints === "short" ? (
        <Text wrap="truncate-end">
          {props.bypass ? (
            <>
              {marker}
              <Text dimColor> · </Text>
            </>
          ) : null}
          <Text dimColor>
            <Text color="cyan">{props.mode}</Text> · {props.model}
            {props.usage ? ` · ${props.usage}` : ""}
          </Text>
        </Text>
      ) : props.bypass ? (
        marker
      ) : null;
    const tail = props.hint || (hints === "off" && props.busy && props.state === "running" ? (props.esc ?? "Esc stops this step. ").trim() : "");
    return (
      <Box flexDirection="column">
        {head}
        {tail ? (
          <Text dimColor wrap="truncate-end">
            {tail}
          </Text>
        ) : null}
      </Box>
    );
  }
  const parts: React.ReactNode[] = [
    <Text key="m" color="cyan">
      {MODE_TEXT[props.mode]}
    </Text>,
    <Text key="mo">{props.model}</Text>,
  ];
  if (props.busy) {
    parts.push(
      <Text key="b">{props.state === "waiting" ? "waiting for you" : props.state === "running" ? "working" : "thinking"}</Text>,
    );
  }
  if (props.openQuestions > 0) {
    parts.push(
      <Text key="q" color="magenta">
        {props.openQuestions} open {props.openQuestions === 1 ? "question" : "questions"}
      </Text>,
    );
  }
  if (props.usage) parts.push(<Text key="t">{props.usage}</Text>);
  const line = (
    <Text dimColor wrap="truncate-end">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 ? " · " : ""}
          {p}
        </React.Fragment>
      ))}
    </Text>
  );
  return (
    <Box flexDirection="column">
      {props.bypass ? (
        <Text wrap="truncate-end">
          <Text color="yellow" bold>
            bypass permissions
          </Text>
          <Text dimColor> · </Text>
          {line}
        </Text>
      ) : (
        line
      )}
      <Text dimColor wrap="truncate-end">{props.hint || (props.busy ? busyHint(props.state, props.queue, props.esc) : props.details ? "Ctrl+O: short view · /change: change an answer" : "Ctrl+O: all steps")}</Text>
      {props.keys ? <Text dimColor wrap="truncate-end">{props.keys}</Text> : null}
    </Box>
  );
}
