import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Static, Text, render, useApp, useInput, usePaste, useStdout, useWindowSize } from "ink";
import type { BusEvent, Mode } from "../core/types.ts";
import { ElnCard, FindingsCard, InstructionCard, RewindCard, KeyCard, PermissionCard, PhiCard, ClarifyCard, PlanCard, QuestionCard, SetupCard, type Card } from "./cards.tsx";
import { credentialsPath } from "../core/credentials.ts";
import { checkClaudeKey } from "../providers/claude.ts";
import { commands, openPanels, openSetup, openWithOs, failureText, parseCommand, suggestions, table, unknownCommand, type CommandCtx } from "../ui/commands.ts";
import { imageProtocol, inlineImage } from "./image.ts";
import { Collapser, Mapper, mainView, type Item, type Logged } from "../ui/items.ts";
import type { SessionLike, TuiOptions } from "./types.ts";
import type { ProgramHooks } from "../ui/programs.ts";
import { FOOTER_HINTS, Header, ItemView, RunningLine, StatusLine, activityText, animationsOn, footerHints, liveLayout, statusRows, type StaticItem } from "./view.tsx";
import { Markdown, liveTail } from "./markdown.tsx";
import { ConfigPanel } from "./config-panel.tsx";
import { ProgramsPanel } from "./programs-panel.tsx";
import { CardRows, Last } from "./fit.tsx";
import { changeSetting, type SettingSession } from "../core/settings.ts";
import { canGoBack, isPlainQuestion, questionHead, reopenQuestions, respondQuestion, SEQ_START, seqAnswered, seqBack, seqLeave, seqPending, seqProgress, seqView, type QuestionSeq } from "../ui/cards.ts";
import { applyRewind, applySetup, setupRequest, cardFromEvent, closesCard, keyProblem, needsSetup, planIntro, pushCard, refreshesStatus, respondPermission, respondPhi, saveEln, saveKey, startCards, type CardType, type Say } from "../ui/cards.ts";
import { inputPlaceholder, nextQueued, routeMessage, stopTurn, usageFields } from "../ui/messages.ts";
import { footerKeys, inputKeys, keyRows, layout, type VimMode } from "./editor.ts";
import { INPUT_MAX_ROWS, InputBox, KeyStyle } from "./input-box.tsx";
import { terminalStdin } from "./key-stream.ts";

const MODE_ORDER: Mode[] = ["watch", "follow", "teach", "plan"];
const MAX_SUGGESTIONS = 8;
// Streamed text arrives in many small pieces. One render each 50 ms keeps the terminal responsive.
const LIVE_MS = 50;

export const RESIZE_MS = 150;
const CLEAR_ALL = "\x1b[2J\x1b[3J\x1b[H";
const toBottom = (rows: number | undefined) => `\x1b[${rows ?? 24};1H`;

interface Screen {
  reprint?: () => void;
  wipe?: () => void;
}

export function App({ session, opts, screen }: { session: SessionLike; opts: TuiOptions; screen?: Screen }) {
  const { exit } = useApp();
  const { write, stdout } = useStdout();
  const env = opts.env ?? process.env;
  const mapper = useRef(new Mapper(session));
  const counter = useRef(0);
  const windowHandle = useRef<{ url: string; close(): void } | undefined>(undefined);
  const appHandle = useRef<{ url: string; close(): Promise<void> | void } | undefined>(undefined);
  const lastCtrlC = useRef(0);
  const log = useRef<Logged[]>([]);
  const collapser = useRef(new Collapser());
  const details = useRef(false);
  const idle = useRef(true);

  // A resumed session shows its earlier conversation, the same as the browser app.
  const [items, setItems] = useState<StaticItem[]>(() => {
    log.current = session.record.entries().map((e) => ({ e, items: mapper.current.map(e) }));
    const v = mainView(log.current, true);
    collapser.current = v.collapser;
    return [{ key: "header", t: "header" }, ...v.settled];
  });
  const [epoch, setEpoch] = useState(0);
  if (screen) screen.reprint = () => setEpoch((x) => x + 1);
  const wipe = () => (screen?.wipe ? screen.wipe() : (opts.stdout ?? process.stdout).write(CLEAR_ALL));
  const [live, setLive] = useState("");
  const liveBuf = useRef<{ text: string; timer?: NodeJS.Timeout }>({ text: "" });
  const clearLive = useCallback(() => {
    clearTimeout(liveBuf.current.timer);
    liveBuf.current = { text: "" };
    setLive("");
  }, []);
  const [status, setStatus] = useState<{ state: string; tool?: string; purpose?: string; since?: number }>({ state: "idle" });
  const [cards, setCards] = useState<Card[]>([]);
  const [seq, setSeq] = useState<QuestionSeq>(SEQ_START);
  useEffect(() => {
    if (seq.done.length && !seqPending(cards).length) setSeq(SEQ_START);
  }, [cards, seq]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [draft, setDraft] = useState("");
  const [sel, setSel] = useState(0);
  const [mode, setMode] = useState<Mode>(session.mode);
  const [bypass, setBypass] = useState(session.permissionMode === "bypass");
  const [openQ, setOpenQ] = useState(() => session.questions.open().length);
  const [usage, setUsage] = useState(() => usageFields(session).usage);
  const [hint, setHint] = useState("");
  const [pending, setPending] = useState<Item[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [vimMode, setVimMode] = useState<VimMode>("insert");
  const keyStyle = inputKeys(session.settings?.input_keys);
  const hints = footerHints(session.settings?.footer_hints);
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
    wipe();
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
  const [, setTick] = useState(0);
  const refresh = useCallback(() => {
    setTick((n) => n + 1);
    setMode(session.mode);
    setBypass(session.permissionMode === "bypass");
    setOpenQ(session.questions.open().length);
  }, [session]);

  const serveApp = useCallback(async () => {
    if (!appHandle.current) {
      const { startApp } = await import("../server/app.ts");
      appHandle.current = await startApp({ session: session as never, env });
    }
    return appHandle.current.url;
  }, [session, env]);

  useEffect(() => {
    if (process.platform === "win32") return;
    const onSignal = () => {
      serveApp()
        .then(() => line("▸", "The browser app opened this session. Both views show the same session.", undefined, true))
        .catch((e: Error) => line("✗", `The app did not start: ${e.message}`, "red"));
    };
    process.on("SIGUSR2", onSignal);
    return () => void process.off("SIGUSR2", onSignal);
  }, [serveApp]);

  const quitting = useRef(false);
  const quit = useCallback(async () => {
    if (quitting.current) return exit();
    quitting.current = true;
    let failure: Error | undefined;
    try {
      windowHandle.current?.close();
      await appHandle.current?.close();
    } catch (e) {
      failure = e as Error;
    }
    try {
      await session.close();
    } catch (e) {
      failure ??= e as Error;
    }
    opts.onQuit?.();
    exit();
    if (failure) process.stderr.write(`The session did not close cleanly: ${failure.message}\n`);
  }, [session, exit, opts]);

  const say: Say = useMemo(
    () => ({ ok: (t) => line("✓", t, "green"), bad: (t) => line("✗", t, "red"), dim: (t) => line("·", t, undefined, true), warn: (t) => line("!", t, "yellow") }),
    [line],
  );

  useEffect(() => {
    const first = startCards(session, env);
    line("▸", planIntro(session), undefined, true);
    if (opts.firstMessage) session.send(opts.firstMessage).catch((e: Error) => line("✗", `The agent stopped: ${e.message}`, "red"));
    if (!opts.firstMessage && opts.autoSetup !== false && needsSetup(session)) void openSetup({ openCard: addCard } as CommandCtx);
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
          if (en.kind === "assistant") clearLive();
          if (en.kind === "usage" || en.kind === "setting") setUsage(usageFields(session).usage);
          dropCard((c) => closesCard(en, c));
          if (refreshesStatus(en)) refresh();
          break;
        }
        case "delta":
          if (e.kind !== "text") break;
          liveBuf.current.text += e.text;
          liveBuf.current.timer ??= setTimeout(() => {
            const more = liveBuf.current.text;
            liveBuf.current = { text: "" };
            setLive((t) => t + more);
          }, LIVE_MS);
          break;
        case "delta_reset":
          setLive("");
          break;
        case "status":
          setStatus({ state: e.state, tool: e.tool, purpose: e.purpose, since: e.state === "running" ? e.since : undefined });
          idle.current = e.state === "idle";
          if (e.state === "idle") {
            show(collapser.current.flush());
            setPending([]);
            clearLive();
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

  useEffect(() => () => clearTimeout(liveBuf.current.timer), []);

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
        wipe();
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
      startApp: async () => {
        const fresh = !appHandle.current;
        const url = await serveApp();
        if (fresh) openWithOs(url);
        return url;
      },
      startPanel: async () => {
        if (!windowHandle.current) {
          const { startWindow } = await import("../server/window.ts");
          windowHandle.current = await startWindow(session, { port: 0 });
        }
        const u = new URL(windowHandle.current.url);
        u.pathname = "/panel";
        const url = u.toString();
        return { url, ...(await openPanels(session, url)) };
      },
    }),
    [session, cards, addCard, refresh, quit, opts, toggleDetails, keyStyle],
  );

  const runCommand = async (text: string) => {
    const { head, args } = parseCommand(text);
    push({ key: `u${++counter.current}`, t: "user", text });
    const cmd = commands.find((c) => c.name === head);
    if (!cmd) return line("✗", unknownCommand(head), "red");
    try {
      await cmd.run(args, ctx);
    } catch (e) {
      line("✗", failureText(cmd.name, e, session), "red");
    }
  };

  const sugg = cards.length ? [] : suggestions(input, session).slice(0, MAX_SUGGESTIONS);
  const selected = sugg[Math.min(sel, sugg.length - 1)];

  const setText = (v: string) => setInput(v);

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
    setCards((x) => reopenQuestions(x, session.questions.open()));
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

  usePaste(() => {});

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
    if (key.ctrl && ch === "t") {
      const next = FOOTER_HINTS[(FOOTER_HINTS.indexOf(hints) + 1) % FOOTER_HINTS.length]!;
      void changeSetting({ cwd: session.cwd ?? process.cwd(), env, session: session as unknown as SettingSession }, "footer_hints", next, "session").then(refresh);
      setHint(`Footer hints: ${next}. Ctrl+T changes them.`);
      setTimeout(() => setHint((h) => (h.startsWith("Footer hints:") ? "" : h)), 2000);
      return;
    }
    if (cards.length) return;
    if (key.escape || key.upArrow || key.downArrow) return;
    if (key.tab && key.shift) {
      const next = MODE_ORDER[(MODE_ORDER.indexOf(session.mode) + 1) % MODE_ORDER.length]!;
      session.setMode(next);
      setMode(next);
    } else if (key.tab) {
      if (selected) setText(`/${selected.name} `);
    }
  });

  const card = cards[0];
  const program = session.adapterInfo[0]?.title ?? "the program";
  const { columns, rows } = useWindowSize();
  const running = status.state !== "idle";
  const footKeys = card || hints !== "full" ? "" : footerKeys(keyStyle, vimMode, running);
  const inputRows = Math.min(INPUT_MAX_ROWS + 1, layout(input, Math.max(10, columns - 6)).length);
  const fit = liveLayout({ rows, columns, card: !!card, running, input: input.length, inputRows, keys: !!footKeys, status: statusRows({ hints, bypass, state: status.state, hint }), queue: queue.length, suggestions: sugg.length, text: !!live, pending: pending.length > 0 });
  const animate = animationsOn(opts.stdout ?? process.stdout, env, session.settings?.animations);

  return (
    <KeyStyle.Provider value={keyStyle}>
    <Box flexDirection="column">
      <Static items={items} key={epoch}>
        {(item) => (
          <Box key={item.key} flexDirection="column">
            {item.t === "header" ? <Header session={session} /> : <ItemView item={item} />}
          </Box>
        )}
      </Static>
      <Box flexDirection="column" maxHeight={Math.max(1, rows - 2)} overflowY="hidden" justifyContent="flex-end">
        <Box flexDirection="column" flexShrink={0}>
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
            <Markdown text={liveTail(live, fit.live, columns - 1)} width={columns - 1} />
          </Box>
        </Last>
      ) : null}
      {!fit.chrome ? null : running ? (
        <RunningLine
          key={`${status.state}${status.tool ?? ""}${status.since ?? ""}`}
          tool={status.tool ?? ""}
          purpose={activityText(card ? "waiting" : status.state, status.purpose, status.tool)}
          since={status.since}
          waiting={!!card || status.state === "waiting"}
          animate={animate}
          color={!env.NO_COLOR}
        />
      ) : (
        <Text> </Text>
      )}
      {card ? (
        <CardRows.Provider value={fit.card}>
          {(cardViews({ session, cards, seq, setSeq, env, popCard, setCards, line, say, submitKey, ask: submit, refresh, details, toggleDetails, busy: running, program, programs: opts.programs, setInput })[card.t] as (c: Card) => React.ReactNode)(card)}
        </CardRows.Provider>
      ) : null}
      {fit.inputBox ? <Box borderStyle="round" borderColor={card ? "gray" : "cyan"} paddingX={1}>
        <Box flexShrink={0}>
          <Text color="cyan">{"> "}</Text>
        </Box>
        {card ? (
          <Text dimColor>Answer the card above.</Text>
        ) : (
          <InputBox
            style={keyStyle}
            single={keyStyle === "classic"}
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
      {fit.chrome ? <StatusLine
        mode={mode}
        model={session.model.model}
        busy={status.state !== "idle"}
        state={status.state}
        tool={status.tool}
        purpose={status.purpose}
        openQuestions={openQ}
        usage={usage}
        hint={hint}
        details={showAll}
        queue={session.settings?.messages === "queue" || !session.steer}
        bypass={bypass}
        keys={footKeys}
        hints={hints}
        esc={keyStyle === "vim" && vimMode === "insert" ? "Esc twice stops this step. " : undefined}
      /> : null}
        </Box>
      </Box>
    </Box>
    </KeyStyle.Provider>
  );
}

interface CardDeps {
  session: SessionLike;
  cards: Card[];
  seq: QuestionSeq;
  setSeq: React.Dispatch<React.SetStateAction<QuestionSeq>>;
  env: Record<string, string | undefined>;
  popCard(): void;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  line(sym: string, text: string, color?: string, dim?: boolean): void;
  say: Say;
  submitKey(key: string): Promise<void>;
  ask(text: string): void;
  refresh(): void;
  details: { current: boolean };
  toggleDetails(): void;
  busy: boolean;
  program: string;
  programs?: ProgramHooks;
  setInput(text: string): void;
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
          const request = problem ? undefined : setupRequest(session, values);
          if (request) d.ask(request);
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
    phi: (card) => <PhiCard key={card.rid} card={card} onAction={(a) => (respondPhi(session, card, a), popCard())} />,
    question: (card) => {
      const failed = (e: Error, again: Card) => {
        d.line("✗", `${e.message} Try again.`, "red");
        d.setCards((x) => (x.some((c) => c.t === "question" && c.q.qid === card.q.qid) ? x : [again, ...x]));
      };
      if (card.act) {
        const act = card.act;
        return (
          <QuestionCard
            key={`${card.q.qid}${act.kind}`}
            card={card}
            title={act.kind === "change" ? `Change: ${questionHead(card.q).title}` : questionHead(card.q).title}
            current={act.kind === "change" ? act.current : undefined}
            note={act.kind === "change" ? act.note : undefined}
            onAnswer={(value, note) => {
              popCard();
              respondQuestion(session, card, value, note)
                .then((r) => {
                  if (r.line) d.line("✓", r.line, "green");
                  if (r.next) d.setCards((x) => [r.next!, ...x]);
                })
                .catch((e: Error) => failed(e, card));
            }}
            onDismiss={popCard}
          />
        );
      }
      const v = seqView(d.seq, seqPending(d.cards)) ?? { q: card.q, n: 1, total: 1, changing: false };
      return (
        <QuestionCard
          key={`${v.q.qid}${v.changing ? "back" : ""}`}
          card={{ t: "question", q: v.q }}
          current={v.current}
          progress={v.total > 1 ? seqProgress(v) : undefined}
          onBack={canGoBack(d.seq) ? () => d.setSeq(seqBack(d.seq)) : undefined}
          onAnswer={(value, note) => {
            d.setSeq(seqAnswered(d.seq, v.q, value));
            if (v.changing) return void session.changeAnswer?.(v.q.qid, value, note).catch((e: Error) => d.line("✗", e.message, "red"));
            d.setCards((x) => x.filter((c) => !(isPlainQuestion(c) && c.q.qid === v.q.qid)));
            session.answer(v.q.qid, value, note).catch((e: Error) => {
              d.setSeq((s) => ({ ...s, done: s.done.filter((x) => x.q.qid !== v.q.qid) }));
              failed(e, { t: "question", q: v.q });
            });
          }}
          onDismiss={() => {
            session.answerLater?.(d.cards.filter(isPlainQuestion).map((c) => c.q.qid));
            d.setCards(seqLeave);
            d.setSeq(SEQ_START);
            d.line("▸", "The questions stay open. They come back with your next message or with /questions.", undefined, true);
          }}
        />
      );
    },
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
    rewind: (card) => (
      <RewindCard
        key="rewind"
        card={card}
        onClose={popCard}
        onChoose={(n) => {
          popCard();
          const r = applyRewind(session, n);
          d.line(r.ok ? "↶" : "✗", r.text, r.ok ? "cyan" : "red");
          if (r.input) d.setInput(r.input);
          d.refresh();
        }}
      />
    ),
    eln: () => <ElnCard key="eln" path={credentialsPath()} onCancel={popCard} onSubmit={(url, key) => void (saveEln(session, url, key, { ...d.say, ok: (t) => (popCard(), d.say.ok(t)) }))} />,
    config: () => (
      <ConfigPanel
        key="config"
        ctx={{ cwd: session.cwd ?? process.cwd(), env: d.env, session: session as unknown as SettingSession, ui: { details: () => d.details.current, toggleDetails: d.toggleDetails } }}
        busy={d.busy}
        onClose={() => (popCard(), d.refresh())}
        onSaved={d.refresh}
        onEdit={(t) => d.setCards((x) => [t === "key" ? { t: "key" } : t === "eln" ? { t: "eln" } : { t: "programs" }, ...x.slice(1)])}
      />
    ),
    programs: (card) => (
      <ProgramsPanel
        key="programs"
        cwd={session.cwd ?? process.cwd()}
        start={card.name}
        hooks={d.programs}
        record={session.record as never}
        onClose={() => (popCard(), d.refresh())}
      />
    ),
    key: (card) => <KeyCard key="key" card={card} path={credentialsPath()} onSubmit={(k) => void d.submitKey(k)} onCancel={popCard} />,
  };
}

export const TUI_CARD_TYPES = Object.keys(cardViews({} as CardDeps)) as CardType[];

export async function runTui(session: SessionLike, opts: TuiOptions = {}): Promise<void> {
  const screen: Screen = {};
  const stdout = opts.stdout ?? process.stdout;
  if (stdout.isTTY) stdout.write(toBottom(stdout.rows));
  const instance = render(<App session={session} opts={opts} screen={screen} />, {
    stdin: opts.stdin ?? terminalStdin(opts.env ?? process.env),
    stdout: opts.stdout,
    exitOnCtrlC: false,
    patchConsole: false,
    kittyKeyboard: { mode: "auto", flags: ["disambiguateEscapeCodes"] },
    incrementalRendering: true,
  });
  screen.wipe = () => {
    instance.clear();
    stdout.write(CLEAR_ALL + (stdout.isTTY ? toBottom(stdout.rows) : ""));
  };
  let timer: NodeJS.Timeout | undefined;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      screen.wipe!();
      screen.reprint?.();
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
