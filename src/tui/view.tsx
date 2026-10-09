import React, { useEffect, useState } from "react";
import { Box, Text, useStdout } from "ink";
import type { Mode } from "../core/types.ts";
import { fidelityLabel, type Item } from "./items.ts";
import { Markdown } from "./markdown.tsx";
import type { SessionLike } from "./types.ts";

export type StaticItem = Item | { key: string; t: "header" };

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function Spinner() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % FRAMES.length), 120);
    return () => clearInterval(t);
  }, []);
  return <Text color="cyan">{FRAMES[i]}</Text>;
}

export function Header({ session }: { session: SessionLike }) {
  const adapters = session.adapterInfo.map((a) => `${a.name} ${a.version} (${a.title} ${a.programVersion})`).join(", ");
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>guided-analysis</Text>
      <Text>Adapters: {adapters || "none"}</Text>
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

export function activityText(state: string, purpose?: string, tool?: string): string {
  if (state === "running") return purpose || (tool ? `Running ${tool.replace(/_/g, " ")}` : "Working");
  if (state === "waiting") return "Waiting for your answer";
  return "Thinking about the next step";
}

export function elapsedText(s: number): string {
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

export function runningText(tool: string, purpose: string | undefined, seconds: number): string {
  const what = purpose ?? `Running ${tool}`;
  return seconds >= 5 ? `${what} · ${elapsedText(seconds)} · Esc stops it` : what;
}

export function RunningLine(props: { tool: string; purpose?: string; since?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = props.since ? Math.max(0, Math.floor((now - props.since) / 1000)) : 0;
  return <Text dimColor>● {runningText(props.tool, props.purpose, seconds)}</Text>;
}

const MODE_TEXT: Record<Mode, string> = {
  watch: "watch: the agent runs the steps",
  follow: "follow: you run the steps",
  teach: "teach: you work, the agent checks",
  plan: "plan: the agent plans only",
};

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
  tokens: { input: number; output: number };
  hint?: string;
  details?: boolean;
  bypass?: boolean;
}) {
  const parts: React.ReactNode[] = [
    <Text key="m" color="cyan">
      {MODE_TEXT[props.mode]}
    </Text>,
    <Text key="mo">{props.model}</Text>,
  ];
  if (props.busy) {
    parts.push(
      <Text key="b">
        <Spinner /> {props.state === "waiting" ? "waiting for you" : props.state === "running" ? "working" : "thinking"}
      </Text>,
    );
  }
  if (props.openQuestions > 0) {
    parts.push(
      <Text key="q" color="magenta">
        {props.openQuestions} open {props.openQuestions === 1 ? "question" : "questions"}
      </Text>,
    );
  }
  if (props.tokens.input || props.tokens.output) {
    parts.push(
      <Text key="t">
        {tokensText(props.tokens.input)} in / {tokensText(props.tokens.output)} out
      </Text>,
    );
  }
  const line = (
    <Text dimColor>
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
        <Text>
          <Text color="yellow" bold>
            bypass permissions
          </Text>
          <Text dimColor> · </Text>
          {line}
        </Text>
      ) : (
        line
      )}
      <Text dimColor>{props.hint || (props.details ? "Ctrl+O: short view" : "Ctrl+O: all steps")}</Text>
    </Box>
  );
}
