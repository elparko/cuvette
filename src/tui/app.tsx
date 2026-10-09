import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Static, Text, render, useApp, useInput, useStdout, useWindowSize } from "ink";
import TextInput from "ink-text-input";
import type { BusEvent, Mode } from "../core/types.ts";
import { ElnCard, FindingsCard, InstructionCard, KeyCard, PermissionCard, ClarifyCard, PlanCard, QuestionCard, SetupCard, type Card } from "./cards.tsx";
import { credentialsPath } from "../core/credentials.ts";
import { checkClaudeKey } from "../providers/claude.ts";
import { commands, openSetup, openWithOs, suggestions, table, type CommandCtx } from "../ui/commands.ts";
import { imageProtocol, inlineImage } from "./image.ts";
import { Collapser, Mapper, mainView, type Item, type Logged } from "../ui/items.ts";
import type { SessionLike, TuiOptions } from "./types.ts";
import { Header, ItemView, RunningLine, StatusLine, activityText, animationsOn, liveLayout, type StaticItem } from "./view.tsx";
import { Markdown } from "./markdown.tsx";
import { ConfigPanel } from "./config-panel.tsx";
import { CardRows, Last } from "./fit.tsx";
import type { SettingSession } from "../core/settings.ts";
import { applySetup, cardFromEvent, closesCard, keyProblem, needsSetup, planIntro, pushCard, refreshesStatus, respondPermission, saveEln, saveKey, startCards, type CardType, type Say } from "../ui/cards.ts";
import { inputPlaceholder, nextQueued, routeMessage, stopTurn } from "../ui/messages.ts";
import { footerKeys, inputKeys, keyRows, layout, type VimMode } from "./editor.ts";
import { INPUT_MAX_ROWS, InputBox } from "./input-box.tsx";

const MODE_ORDER: Mode[] = ["watch", "follow", "teach", "plan"];
const MAX_SUGGESTIONS = 8;

export const RESIZE_MS = 150;
const CLEAR_ALL = "\x1b[2J\x1b[3J\x1b[H";

export function App({ session, opts, reprint }: { session: SessionLike; opts: TuiOptions; reprint?: { current?: () => void } }) {
  const { exit } = useApp();
  const { write, stdout } = useStdout();
  const env = opts.env ?? process.env;
  const mapper = useRef(new Mapper(session));
  const counter = useRef(0);
  const windowHandle = useRef<{ url: string; close(): void } | undefined>(undefined);
  const lastCtrlC = useRef(0);
  const log = useRef<Logged[]>([]);
  const collapser = useRef(new Collapser());
  const details = useRef(false);
  const idle = useRef(true);

  const [items, setItems] = useState<StaticItem[]>([{ key: "header", t: "header" }]);
  const [epoch, setEpoch] = useState(0);
  if (reprint) reprint.current = () => setEpoch((x) => x + 1);
  const [live, setLive] = useState("");
  const [status, setStatus] = useState<{ state: string; tool?: string; purpose?: string; since?: number }>({ state: "idle" });
  const [cards, setCards] = useState<Card[]>([]);
  const [input, setInput] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [draft, setDraft] = useState("");
  const [sel, setSel] = useState(0);
  const [mode, setMode] = useState<Mode>(session.mode);
  const [bypass, setBypass] = useState(session.permissionMode === "bypass");
  const [openQ, setOpenQ] = useState(() => session.questions.open().length);
  const [tokens, setTokens] = useState({ input: 0, output: 0 });
  const [hint, setHint] = useState("");
  const [pending, setPending] = useState<Item[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [vimMode, setVimMode] = useState<VimMode>("insert");
  const keyStyle = inputKeys(session.settings?.input_keys);
  const queueRef = useRef<string[]>([]);
  const updateQueue = useCallback((next: string[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const show = useCallback((more: Item[]) => {
    if (more.length) setItems((x) => [...x, ...more]);
  }, []);
  const record = useCallback(
    (l: Logged) => {
      log.current.push(l);
      if (details.current) return show(l.items);
      show(collapser.current.add(l));
      setPending(collapser.current.preview());
    },
    [show],
  );
  const push = useCallback((...more: Item[]) => record({ items: more }), [record]);
  const toggleDetails = useCallback(() => {
    details.current = !details.current;
    setShowAll(details.current);
    (opts.stdout ?? process.stdout).write(CLEAR_ALL);
    let rows: Item[];
    if (details.current) {
      rows = log.current.flatMap((l) => l.items);
      setPending([]);
    } else {
      const v = mainView(log.current, idle.current);
      collapser.current = v.collapser;
      rows = v.settled;
      setPending(v.pending);
    }
    setItems([{ key: "header", t: "header" }, ...rows]);
    setEpoch((x) => x + 1);
  }, [opts]);
  const line = useCallback(
    (sym: string, text: string, color?: string, dim?: boolean) =>
      push({ key: `l${++counter.current}`, t: "line", sym, color, text, dim }),
    [push],
  );
  const addCard = useCallback((c: Card) => setCards((x) => pushCard(x, c)), []);
  const dropCard = useCallback((pred: (c: Card) => boolean) => setCards((x) => x.filter((c) => !pred(c))), []);
  const popCard = useCallback(() => setCards((x) => x.slice(1)), []);
  const refresh = useCallback(() => {
    setMode(session.mode);
    setBypass(session.permissionMode === "bypass");
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

  const say: Say = useMemo(
    () => ({ ok: (t) => line("✓", t, "green"), bad: (t) => line("✗", t, "red"), dim: (t) => line("·", t, undefined, true), warn: (t) => line("!", t, "yellow") }),
    [line],
  );

  useEffect(() => {
    const first = startCards(session, env);
    line("▸", planIntro(session), undefined, true);
    if (opts.firstMessage) session.send(opts.firstMessage).catch((e: Error) => line("✗", `The agent stopped: ${e.message}`, "red"));
    if (opts.autoSetup !== false && needsSetup(session)) void openSetup({ openCard: addCard } as CommandCtx);
    for (const c of first) addCard(c);
  }, []);

  const submitKey = useCallback(
    async (key: string) => {
      const problem = keyProblem(key);
      if (problem) return say.bad(problem);
      popCard();
      const r = await saveKey(session, key, env, say, checkClaudeKey);
      if (!r.ok) addCard({ t: "key", reason: r.text });
    },
    [session, env, say],
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
          record({ e: en, items: out });
          if (en.kind === "assistant") setLive("");
          if (en.kind === "usage") setTokens({ ...mapper.current.tokens });
          dropCard((c) => closesCard(en, c));
          if (refreshesStatus(en)) refresh();
          break;
        }
        case "delta":
          if (e.kind === "text") setLive((t) => t + e.text);
          break;
        case "status":
          setStatus({ state: e.state, tool: e.tool, purpose: e.purpose, since: e.state === "running" ? e.since : undefined });
          idle.current = e.state === "idle";
          if (e.state === "idle") {
            show(collapser.current.flush());
            setPending([]);
            setLive("");
            const { next, rest } = nextQueued(session, queueRef.current);
            if (next !== undefined) {
              updateQueue(rest);
              session.send(next).catch((err: Error) => line("✗", `The agent stopped: ${err.message}`, "red"));
            }
          }
          break;
        default: {
          const c = cardFromEvent(e);
          if (c) addCard(c);
          if (e.type === "question") refresh();
        }
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
        (opts.stdout ?? process.stdout).write(CLEAR_ALL);
        log.current = [];
        setItems([]);
        setEpoch((x) => x + 1);
      },
      quit: () => void quit(),
      keys: () => table(["Key", "What it does"], keyRows(keyStyle).map((r) => [r.keys, r.does])),
      outputs: () => mapper.current.outputs,
      toggleDetails: () => {
        toggleDetails();
        return details.current;
      },
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
    [session, cards, addCard, refresh, quit, opts, toggleDetails, keyStyle],
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
    const r = routeMessage(session, text, status.state !== "idle");
    if (r.t === "none") return;
    if (r.t === "queue") return updateQueue([...queueRef.current, r.text]);
    if (r.t === "steer") {
      push({ key: `u${++counter.current}`, t: "user", text: r.text });
      return line("▸", r.note, undefined, true);
    }
    setHint("");
    session.send(r.text).catch((e: Error) => line("✗", `The agent stopped: ${e.message}`, "red"));
  };

  const escape = () => {
    if (status.state !== "idle") {
      updateQueue([]);
      stopTurn(session);
    } else if (input && keyStyle !== "vim") setText("");
  };

  const arrow = (dir: "up" | "down") => {
    if (dir === "up") {
      if (sugg.length) setSel((s) => (s + sugg.length - 1) % sugg.length);
      else if (history.length) {
        const idx = Math.min(histIdx + 1, history.length - 1);
        if (histIdx === -1) setDraft(input);
        setHistIdx(idx);
        setText(history[history.length - 1 - idx]!);
      }
    } else {
      if (sugg.length) setSel((s) => (s + 1) % sugg.length);
      else if (histIdx >= 0) {
        const idx = histIdx - 1;
        setHistIdx(idx);
        setText(idx < 0 ? draft : history[history.length - 1 - idx]!);
      }
    }
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
    if (key.ctrl && ch === "o") return toggleDetails();
    if (cards.length) return;
    if (keyStyle !== "classic" && (key.escape || key.upArrow || key.downArrow)) return;
    if (key.escape) escape();
    else if (key.tab && key.shift) {
      const next = MODE_ORDER[(MODE_ORDER.indexOf(session.mode) + 1) % MODE_ORDER.length]!;
      session.setMode(next);
      setMode(next);
    } else if (key.tab) {
      if (selected) setText(`/${selected.name} `);
    } else if (key.upArrow) arrow("up");
    else if (key.downArrow) arrow("down");
  });

  const card = cards[0];
  const program = session.adapterInfo[0]?.title ?? "the program";
  const { columns, rows } = useWindowSize();
  const running = status.state !== "idle";
  const footKeys = card ? "" : footerKeys(keyStyle, vimMode, running);
  const inputRows = keyStyle === "classic" ? undefined : Math.min(INPUT_MAX_ROWS + 1, layout(input, Math.max(10, columns - 6)).length);
  const fit = liveLayout({ rows, columns, card: !!card, running, input: input.length, inputRows, keys: !!footKeys, queue: queue.length, suggestions: sugg.length, text: !!live, pending: pending.length > 0 });
  const animate = animationsOn(opts.stdout ?? process.stdout, env, session.settings?.animations);

  return (
    <Box flexDirection="column">
      <Static items={items} key={epoch}>
        {(item) => (
          <Box key={item.key} flexDirection="column">
            {item.t === "header" ? <Header session={session} /> : <ItemView item={item} />}
          </Box>
        )}
      </Static>
      {pending.length && fit.pending > 0 ? (
        <Last max={fit.pending}>
          {pending.map((it) => (
            <ItemView key={it.key} item={it} />
          ))}
        </Last>
      ) : null}
      {live && fit.live > 0 ? (
        <Last max={fit.live}>
          <Box marginTop={1}>
            <Markdown text={live} width={columns - 1} />
          </Box>
        </Last>
      ) : null}
      {running ? (
        <RunningLine
          key={`${status.state}${status.tool ?? ""}${status.since ?? ""}`}
          tool={status.tool ?? ""}
          purpose={activityText(card ? "waiting" : status.state, status.purpose, status.tool)}
          since={status.since}
          waiting={!!card || status.state === "waiting"}
          animate={animate}
          color={!env.NO_COLOR}
        />
      ) : null}
      {card ? (
        <CardRows.Provider value={fit.card}>
          {(cardViews({ session, env, popCard, setCards, line, say, submitKey, refresh, details, toggleDetails, busy: running, program })[card.t] as (c: Card) => React.ReactNode)(card)}
        </CardRows.Provider>
      ) : null}
      {fit.inputBox ? <Box borderStyle="round" borderColor={card ? "gray" : "cyan"} paddingX={1}>
        <Text color="cyan">{"> "}</Text>
        {card ? (
          <Text dimColor>Answer the card above.</Text>
        ) : keyStyle !== "classic" ? (
          <InputBox
            style={keyStyle}
            value={input}
            width={Math.max(10, columns - 6)}
            placeholder={inputPlaceholder(session, status.state !== "idle")}
            arrowsOut={sugg.length > 0}
            onChange={(v) => {
              setInput(v);
              setSel(0);
            }}
            onSubmit={submit}
            onEscape={escape}
            onEdge={arrow}
            onVimMode={setVimMode}
          />
        ) : (
          <TextInput
            key={inputKey}
            value={input}
            onChange={(v) => {
              setInput(v);
              setSel(0);
            }}
            onSubmit={submit}
            placeholder={inputPlaceholder(session, status.state !== "idle")}
          />
        )}
      </Box> : null}
      {queue.map((q, i) => (
        <Text key={i} dimColor wrap="truncate-end">
          Queued: {q}
        </Text>
      ))}
      {sugg.map((c, i) => (
        <Text key={c.name} color={c === selected ? "cyan" : undefined} dimColor={c !== selected} wrap="truncate-end">
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
        purpose={status.purpose}
        openQuestions={openQ}
        tokens={tokens}
        hint={hint}
        details={showAll}
        queue={session.settings?.messages === "queue" || !session.steer}
        bypass={bypass}
        keys={footKeys}
        esc={keyStyle === "vim" && vimMode === "insert" ? "Esc twice stops this step. " : undefined}
      />
    </Box>
  );
}

interface CardDeps {
  session: SessionLike;
  env: Record<string, string | undefined>;
  popCard(): void;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  line(sym: string, text: string, color?: string, dim?: boolean): void;
  say: Say;
  submitKey(key: string): Promise<void>;
  refresh(): void;
  details: { current: boolean };
  toggleDetails(): void;
  busy: boolean;
  program: string;
}

type CardViews = { [K in CardType]: (c: Extract<Card, { t: K }>) => React.ReactNode };

function cardViews(d: CardDeps): CardViews {
  const { session, popCard } = d;
  return {
    setup: (card) => (
      <SetupCard
        key="setup"
        card={card}
        fields={session.decisions.fields()}
        onCancel={popCard}
        onSubmit={(values, profile) => {
          const problem = applySetup(session, values, profile);
          if (problem) d.line("✗", problem, "red");
          popCard();
        }}
      />
    ),
    permission: (card) => (
      <PermissionCard
        key={card.rid}
        card={card}
        onAllow={() => (respondPermission(session, card, { ok: true }), popCard())}
        onAlways={() => (respondPermission(session, card, { ok: true, always: true }), popCard())}
        onInterrupt={() => (respondPermission(session, card, { stop: true }), popCard())}
        onDeny={(note) => (respondPermission(session, card, { ok: false, note }), popCard())}
      />
    ),
    question: (card) => (
      <QuestionCard
        key={card.q.qid}
        card={card}
        onAnswer={(value, note) => {
          popCard();
          session.answer(card.q.qid, value, note).catch((e: Error) => d.line("✗", e.message, "red"));
        }}
        onDismiss={popCard}
      />
    ),
    instruction: (card) => (
      <InstructionCard
        key={card.step}
        card={card}
        program={d.program}
        onDone={() => (popCard(), void session.followDone(card.step))}
        onInterrupt={() => (session.interrupt(), popCard())}
        onAgent={() => (popCard(), void session.followDone(card.step, "", true))}
      />
    ),
    clarify: (card) => <ClarifyCard key={`clarify${card.qids.join(",")}`} card={card} session={session} />,
    plan: (card) => <PlanCard key={`plan${card.stage}${card.version}${card.text.length}`} card={card} session={session} onRespond={(r) => (popCard(), session.respondPlan?.(r))} />,
    findings: (card) => <FindingsCard key="findings" card={card} session={session} onClose={popCard} />,
    eln: () => <ElnCard key="eln" path={credentialsPath()} onCancel={popCard} onSubmit={(url, key) => void (saveEln(session, url, key, { ...d.say, ok: (t) => (popCard(), d.say.ok(t)) }))} />,
    config: () => (
      <ConfigPanel
        key="config"
        ctx={{ cwd: session.cwd ?? process.cwd(), env: d.env, session: session as unknown as SettingSession, ui: { details: () => d.details.current, toggleDetails: d.toggleDetails } }}
        busy={d.busy}
        onClose={() => (popCard(), d.refresh())}
        onEdit={(t) => d.setCards((x) => [t === "key" ? { t: "key" } : { t: "eln" }, ...x.slice(1)])}
      />
    ),
    key: (card) => <KeyCard key="key" card={card} path={credentialsPath()} onSubmit={(k) => void d.submitKey(k)} onCancel={popCard} />,
  };
}

export const TUI_CARD_TYPES = Object.keys(cardViews({} as CardDeps)) as CardType[];

export async function runTui(session: SessionLike, opts: TuiOptions = {}): Promise<void> {
  const reprint: { current?: () => void } = {};
  const stdout = opts.stdout ?? process.stdout;
  const instance = render(<App session={session} opts={opts} reprint={reprint} />, {
    stdin: opts.stdin,
    stdout: opts.stdout,
    exitOnCtrlC: false,
    patchConsole: false,
    kittyKeyboard: { mode: "auto", flags: ["disambiguateEscapeCodes"] },
    incrementalRendering: true,
  });
  let timer: NodeJS.Timeout | undefined;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      instance.clear();
      stdout.write(CLEAR_ALL);
      reprint.current?.();
    }, RESIZE_MS);
  };
  if (stdout.isTTY) stdout.on("resize", onResize);
  try {
    await instance.waitUntilExit();
  } finally {
    clearTimeout(timer);
    stdout.off("resize", onResize);
  }
}
