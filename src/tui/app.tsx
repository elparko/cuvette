import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Static, Text, render, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";
import type { BusEvent, Mode } from "../core/types.ts";
import { ElnCard, FindingsCard, InstructionCard, KeyCard, PermissionCard, QuestionCard, SetupCard, type Card } from "./cards.tsx";
import { claudeKey, credentialsPath, elabftwProblem, keyProblem, maskKey, saveClaudeKey, saveElabftw } from "../core/credentials.ts";
import { checkClaudeKey } from "../providers/claude.ts";
import { commands, openSetup, openWithOs, suggestions, type CommandCtx } from "./commands.ts";
import { imageProtocol, inlineImage } from "./image.ts";
import { Mapper, type Item } from "./items.ts";
import type { SessionLike, TuiOptions } from "./types.ts";
import { Header, ItemView, StatusLine, type StaticItem } from "./view.tsx";
import { Markdown } from "./markdown.tsx";

const MODE_ORDER: Mode[] = ["watch", "follow", "teach", "plan"];
const MAX_SUGGESTIONS = 8;

export function App({ session, opts }: { session: SessionLike; opts: TuiOptions }) {
  const { exit } = useApp();
  const { write, stdout } = useStdout();
  const env = opts.env ?? process.env;
  const mapper = useRef(new Mapper(session));
  const counter = useRef(0);
  const windowHandle = useRef<{ url: string; close(): void } | undefined>(undefined);
  const lastCtrlC = useRef(0);

  const [items, setItems] = useState<StaticItem[]>([{ key: "header", t: "header" }]);
  const [epoch, setEpoch] = useState(0);
  const [live, setLive] = useState("");
  const [status, setStatus] = useState<{ state: string; tool?: string }>({ state: "idle" });
  const [cards, setCards] = useState<Card[]>([]);
  const [input, setInput] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [draft, setDraft] = useState("");
  const [sel, setSel] = useState(0);
  const [mode, setMode] = useState<Mode>(session.mode);
  const [openQ, setOpenQ] = useState(() => session.questions.open().length);
  const [tokens, setTokens] = useState({ input: 0, output: 0 });
  const [hint, setHint] = useState("");
  const [queue, setQueue] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  const updateQueue = useCallback((next: string[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const push = useCallback((...more: Item[]) => setItems((x) => [...x, ...more]), []);
  const line = useCallback(
    (sym: string, text: string, color?: string, dim?: boolean) =>
      push({ key: `l${++counter.current}`, t: "line", sym, color, text, dim }),
    [push],
  );
  const addCard = useCallback(
    (c: Card) =>
      setCards((x) => {
        if (c.t === "question" && x.some((y) => y.t === "question" && y.q.qid === c.q.qid)) return x;
        if (c.t === "setup" && x.some((y) => y.t === "setup")) return x;
        if (c.t === "key") return x.some((y) => y.t === "key") ? x : [c, ...x];
        return [...x, c];
      }),
    [],
  );
  const dropCard = useCallback((pred: (c: Card) => boolean) => setCards((x) => x.filter((c) => !pred(c))), []);
  const popCard = useCallback(() => setCards((x) => x.slice(1)), []);
  const refresh = useCallback(() => {
    setMode(session.mode);
    setOpenQ(session.questions.open().length);
  }, [session]);

  const quit = useCallback(async () => {
    windowHandle.current?.close();
    try {
      await session.close();
    } finally {
      opts.onQuit?.();
      exit();
    }
  }, [session, exit, opts]);

  useEffect(() => {
    for (const q of session.questions.open()) addCard({ t: "question", q });
    if (opts.firstMessage) session.send(opts.firstMessage).catch((e: Error) => line("✗", `The agent stopped: ${e.message}`, "red"));
    if (opts.autoSetup !== false && session.decisions.fields().some((f) => f.essential && !f.set)) {
      void openSetup({ openCard: addCard } as CommandCtx);
    }
    if (session.model.provider === "claude" && claudeKey(env).from === "none") {
      addCard({ t: "key", reason: "No Claude API key is set. Add one now, or press Esc if you use `ant auth login`." });
    }
  }, []);

  const submitKey = useCallback(
    async (key: string) => {
      const problem = keyProblem(key);
      if (problem) return line("✗", problem, "red");
      popCard();
      line("·", `Checking the key ${maskKey(key)} with the Claude API…`, undefined, true);
      const r = await checkClaudeKey(key, session.model.provider === "claude" ? session.model.model : undefined);
      if (!r.ok) {
        line("✗", r.text, "red");
        addCard({ t: "key", reason: r.text });
        return;
      }
      const path = saveClaudeKey(key);
      line("✓", `${r.text} Saved to ${path}.`, "green");
      if (env.ANTHROPIC_API_KEY) line("!", "ANTHROPIC_API_KEY is also set in this shell. The harness uses that one first.", "yellow");
    },
    [session, env],
  );

  useEffect(() => {
    return session.bus.on((e: BusEvent) => {
      switch (e.type) {
        case "entry": {
          const en = e.entry;
          const out = mapper.current.map(en);
          for (const it of out) {
            if (it.t !== "step") continue;
            for (const o of it.outputs) {
              const seq = o.kind === "image" ? inlineImage(o.path, imageProtocol(env)) : undefined;
              if (seq) write(seq + "\n");
            }
          }
          if (out.length) push(...out);
          if (en.kind === "assistant") setLive("");
          if (en.kind === "usage") setTokens({ ...mapper.current.tokens });
          if (en.kind === "answer") dropCard((c) => c.t === "question" && c.q.qid === en.data.qid);
          if (en.kind === "permission") dropCard((c) => c.t === "permission" && c.rid === en.data.rid);
          if (en.kind === "follow_step") dropCard((c) => c.t === "instruction" && c.step === en.data.step);
          if (en.kind === "mode" || en.kind === "question" || en.kind === "answer") refresh();
          break;
        }
        case "delta":
          if (e.kind === "text") setLive((t) => t + e.text);
          break;
        case "status":
          setStatus({ state: e.state, tool: e.tool });
          if (e.state === "idle") {
            setLive("");
            const [next, ...rest] = queueRef.current;
            if (next !== undefined) {
              updateQueue(rest);
              session.send(next).catch((err: Error) => line("✗", `The agent stopped: ${err.message}`, "red"));
            }
          }
          break;
        case "permission":
          addCard({ t: "permission", rid: e.rid, tool: e.tool, args: e.args, code: e.code, touches: e.touches });
          break;
        case "question":
          addCard({ t: "question", q: e.question });
          refresh();
          break;
        case "instruction":
          addCard({ t: "instruction", step: e.step, tool: e.tool, text: e.text });
          break;
      }
    });
  }, [session]);

  const ctx: CommandCtx = useMemo(
    () => ({
      session,
      print: (text, title) => push({ key: `b${++counter.current}`, t: "block", title, text }),
      notice: (text) => line("▸", text),
      error: (text) => line("✗", text, "red"),
      openCard: addCard,
      hasQuestionCard: (qid) => cards.some((c) => c.t === "question" && c.q.qid === qid),
      refresh,
      clear: () => {
        (opts.stdout ?? process.stdout).write("\x1b[2J\x1b[3J\x1b[H");
        setItems([]);
        setEpoch((x) => x + 1);
      },
      quit: () => void quit(),
      outputs: () => mapper.current.outputs,
      startWindow: async () => {
        if (!windowHandle.current) {
          const { startWindow } = await import("../server/window.ts");
          windowHandle.current = await startWindow(session, { port: 0 });
          openWithOs(windowHandle.current.url);
        }
        return windowHandle.current.url;
      },
      startPanel: async () => {
        if (!windowHandle.current) {
          const { startWindow } = await import("../server/window.ts");
          windowHandle.current = await startWindow(session, { port: 0 });
        }
        const u = new URL(windowHandle.current.url);
        u.pathname = "/panel";
        const url = u.toString();
        const opened: string[] = [];
        const failed: string[] = [];
        for (const a of (session as unknown as { adapters?: { name: string; module(): Promise<{ openPanel?: (url: string, o: { sessionDir: string }) => Promise<unknown> }> }[] }).adapters ?? []) {
          try {
            const mod = await a.module();
            if (!mod.openPanel) continue;
            await mod.openPanel(url, { sessionDir: session.dir });
            opened.push(a.name);
          } catch (e) {
            failed.push(`${a.name}: ${(e as Error).message}`);
          }
        }
        return { url, opened, failed };
      },
    }),
    [session, cards, addCard, refresh, quit, opts],
  );

  const runCommand = async (text: string) => {
    const [head, ...args] = text.slice(1).trim().split(/\s+/);
    push({ key: `u${++counter.current}`, t: "user", text });
    const cmd = commands.find((c) => c.name === head);
    if (!cmd) return line("✗", `Unknown command /${head}. Type /help.`, "red");
    try {
      await cmd.run(args, ctx);
    } catch (e) {
      line("✗", `/${cmd.name} failed: ${(e as Error).message}`, "red");
    }
  };

  const sugg = cards.length ? [] : suggestions(input).slice(0, MAX_SUGGESTIONS);
  const selected = sugg[Math.min(sel, sugg.length - 1)];

  const setText = (v: string) => {
    setInput(v);
    setInputKey((k) => k + 1);
  };

  const submit = (raw: string) => {
    let text = raw.trim();
    if (!text) return;
    if (selected && text.startsWith("/") && !commands.some((c) => c.name === text.slice(1))) {
      if (selected.args) return setText(`/${selected.name} `);
      text = `/${selected.name}`;
    }
    setHistory((h) => [...h, text]);
    setHistIdx(-1);
    setInput("");
    setSel(0);
    if (text.startsWith("/")) return void runCommand(text);
    if (status.state !== "idle") return updateQueue([...queueRef.current, text]);
    setHint("");
    session.send(text).catch((e: Error) => line("✗", `The agent stopped: ${e.message}`, "red"));
  };

  useInput((ch, key) => {
    if (key.ctrl && ch === "c") {
      const now = Date.now();
      if (now - lastCtrlC.current < 2000) return void quit();
      lastCtrlC.current = now;
      setHint("Press Ctrl+C again to quit.");
      setTimeout(() => setHint((h) => (h.startsWith("Press Ctrl+C") ? "" : h)), 2000);
      return;
    }
    if (cards.length) return;
    if (key.escape) {
      if (status.state !== "idle") {
        updateQueue([]);
        session.interrupt();
      }
      else if (input) setText("");
    } else if (key.tab && key.shift) {
      const next = MODE_ORDER[(MODE_ORDER.indexOf(session.mode) + 1) % MODE_ORDER.length]!;
      session.setMode(next);
      setMode(next);
    } else if (key.tab) {
      if (selected) setText(`/${selected.name} `);
    } else if (key.upArrow) {
      if (sugg.length) setSel((s) => (s + sugg.length - 1) % sugg.length);
      else if (history.length) {
        const idx = Math.min(histIdx + 1, history.length - 1);
        if (histIdx === -1) setDraft(input);
        setHistIdx(idx);
        setText(history[history.length - 1 - idx]!);
      }
    } else if (key.downArrow) {
      if (sugg.length) setSel((s) => (s + 1) % sugg.length);
      else if (histIdx >= 0) {
        const idx = histIdx - 1;
        setHistIdx(idx);
        setText(idx < 0 ? draft : history[history.length - 1 - idx]!);
      }
    }
  });

  const card = cards[0];
  const program = session.adapterInfo[0]?.title ?? "the program";

  return (
    <Box flexDirection="column">
      <Static items={items} key={epoch}>
        {(item) => (
          <Box key={item.key} flexDirection="column">
            {item.t === "header" ? <Header session={session} /> : <ItemView item={item} />}
          </Box>
        )}
      </Static>
      {live ? (
        <Box marginTop={1}>
          <Markdown text={live} width={((stdout as unknown as { columns?: number })?.columns ?? 80) - 1} />
        </Box>
      ) : null}
      {status.tool ? <Text dimColor>● Running {status.tool}...</Text> : null}
      {card?.t === "setup" ? (
        <SetupCard
          key="setup"
          card={card}
          fields={session.decisions.fields()}
          onCancel={popCard}
          onSubmit={(values, profile) => {
            try {
              session.decisions.applySetup(values, { profile, how: "card" });
            } catch (e) {
              line("✗", `Setup failed: ${(e as Error).message}`, "red");
            }
            popCard();
          }}
        />
      ) : null}
      {card?.t === "permission" ? (
        <PermissionCard
          key={card.rid}
          card={card}
          onAllow={() => (session.respondPermission(card.rid, true), popCard())}
          onAlways={() => (session.respondPermission(card.rid, true, "", true), popCard())}
          onInterrupt={() => (session.interrupt(), popCard())}
          onDeny={(note) => (session.respondPermission(card.rid, false, note), popCard())}
        />
      ) : null}
      {card?.t === "question" ? (
        <QuestionCard
          key={card.q.qid}
          card={card}
          onAnswer={(value, note) => {
            popCard();
            session.answer(card.q.qid, value, note).catch((e: Error) => line("✗", e.message, "red"));
          }}
          onDismiss={popCard}
        />
      ) : null}
      {card?.t === "instruction" ? (
        <InstructionCard
          key={card.step}
          card={card}
          program={program}
          onDone={() => (popCard(), void session.followDone(card.step))}
          onInterrupt={() => (session.interrupt(), popCard())}
          onAgent={() => (popCard(), void session.followDone(card.step, "", true))}
        />
      ) : null}
      {card?.t === "findings" ? <FindingsCard key="findings" card={card} session={session} onClose={popCard} /> : null}
      {card?.t === "eln" ? (
        <ElnCard
          key="eln"
          path={credentialsPath()}
          onCancel={popCard}
          onSubmit={(url, key) => {
            const problem = elabftwProblem(url, key);
            if (problem) return line("✗", problem, "red");
            popCard();
            line("✓", `Saved the eLabFTW address and key ${maskKey(key)} to ${saveElabftw(url, key)}.`, "green");
          }}
        />
      ) : null}
      {card?.t === "key" ? <KeyCard key="key" card={card} path={credentialsPath()} onSubmit={(k) => void submitKey(k)} onCancel={popCard} /> : null}
      <Box borderStyle="round" borderColor={card ? "gray" : "cyan"} paddingX={1}>
        <Text color="cyan">{"> "}</Text>
        {card ? (
          <Text dimColor>Answer the card above.</Text>
        ) : (
          <TextInput
            key={inputKey}
            value={input}
            onChange={(v) => {
              setInput(v);
              setSel(0);
            }}
            onSubmit={submit}
            placeholder={status.state === "idle" ? "Ask for an analysis step, or type / for commands" : "The agent is working. Your message waits. Esc stops it."}
          />
        )}
      </Box>
      {queue.map((q, i) => (
        <Text key={i} dimColor>
          Queued: {q}
        </Text>
      ))}
      {sugg.map((c, i) => (
        <Text key={c.name} color={c === selected ? "cyan" : undefined} dimColor={c !== selected}>
          {c === selected ? "▸" : " "} /{c.name}
          {c.args ? ` ${c.args}` : ""}  {c.help}
        </Text>
      ))}
      <StatusLine
        mode={mode}
        model={session.model.model}
        busy={status.state !== "idle"}
        state={status.state}
        tool={status.tool}
        openQuestions={openQ}
        tokens={tokens}
        hint={hint}
      />
    </Box>
  );
}

export async function runTui(session: SessionLike, opts: TuiOptions = {}): Promise<void> {
  const instance = render(<App session={session} opts={opts} />, {
    stdin: opts.stdin,
    stdout: opts.stdout,
    exitOnCtrlC: false,
    patchConsole: false,
  });
  await instance.waitUntilExit();
}
