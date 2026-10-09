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
  const inputBox = !o.card || budget - footer - box >= 16;
  const avail = Math.max(0, budget - footer - (inputBox ? box : 0));
  if (o.card) {
    const live = o.text ? Math.min(3, Math.max(0, avail - 12)) : 0;
    const pending = o.pending ? Math.min(2, Math.max(0, avail - live - 12)) : 0;
    return { inputBox, live, pending, card: Math.max(4, avail - live - pending) };
  }
  const pending = o.pending ? Math.floor(avail / (o.text ? 3 : 1)) : 0;
  return { inputBox, live: avail - pending, pending, card: avail };
}

export function Header({ session }: { session: SessionLike }) {
  const adapters = session.adapterInfo.map((a) => `${a.name} ${a.version} (${a.title} ${a.programVersion})`).join(", ");
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>guided-analysis</Text>
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
          <Text color="cyan">{"> "}</Text>
          <Text bold>{item.text}</Text>
        </Box>
      );
    case "assistant":
      return <AssistantView text={item.text} />;
    case "line":
      return (
        <Box>
          <Text color={item.color} dimColor={item.dim}>
            {item.sym} {item.text}
          </Text>
        </Box>
      );
    case "block":
      return (
        <Box flexDirection="column" marginY={1}>
          {item.title ? <Text bold>{item.title}</Text> : null}
          <Text>{item.text}</Text>
        </Box>
      );
    case "step":
      return <StepView item={item} />;
  }
}

function AssistantView({ text }: { text: string }) {
  const { stdout } = useStdout();
  return (
    <Box marginTop={1}>
      <Markdown text={text} width={((stdout as unknown as { columns?: number })?.columns ?? 80) - 1} />
    </Box>
  );
}

function StepView({ item }: { item: Extract<Item, { t: "step" }> }) {
  const label = item.n ? `Step ${item.n}` : (item.purpose ?? item.tool);
  const detail = [item.route, item.settings].filter(Boolean).join(" · ");
  const fid = fidelityLabel(item.fidelity);
  return (
    <Box flexDirection="column">
      {item.ok ? (
        <Text>
          <Text color="green">●</Text> <Text bold>{label}</Text>  {item.summary}
        </Text>
      ) : (
        <Text>
          <Text color="red">✗</Text> <Text bold>{label}</Text>  <Text color="red">{item.error ?? item.summary}</Text>
        </Text>
      )}
      {item.why ? <Text dimColor>  Purpose: {item.why}</Text> : null}
      {detail ? <Text dimColor>  ▸ {detail}</Text> : null}
      {fid ? <Text color="yellow">  ◇ {fid}</Text> : null}
      {item.outputs.map((o) => (
        <Text key={o.n} dimColor>
          {"  "}
          {o.kind}: {o.path} (open with /open {o.n})
        </Text>
      ))}
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
      <Text dimColor wrap="truncate-end">{props.hint || (props.busy ? busyHint(props.state, props.queue, props.esc) : props.details ? "Ctrl+O: short view" : "Ctrl+O: all steps")}</Text>
      {props.keys ? <Text dimColor wrap="truncate-end">{props.keys}</Text> : null}
    </Box>
  );
}
