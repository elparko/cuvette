import { ArrowUpIcon, BoxesIcon, BrainIcon, EllipsisIcon, FolderOpenIcon, NetworkIcon, PanelRightCloseIcon, PanelRightOpenIcon, ScrollTextIcon, ShieldAlertIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppCtx } from "../App.tsx";
import { ImageViewer } from "../components/image-viewer.tsx";
import { ModeMenu } from "../components/mode-menu.tsx";
import { ModelMenu } from "../components/model-menu.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu.tsx";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Tooltip } from "../components/ui/tooltip.tsx";
import { askNotify, bridge, call, midText, post, withT } from "../lib/api.ts";
import type { StreamState } from "../lib/stream.ts";
import { liveHtml } from "../lib/markdown.ts";
import { useStored } from "../lib/stored.ts";
import { cn } from "../lib/utils.ts";
import { SettingsPanel } from "./settings.tsx";

interface Command {
  name: string;
  args: string;
  help: string;
}

const TABS = [
  { id: "analysis", label: "Analysis" },
  { id: "results", label: "Results" },
  { id: "decisions", label: "Decisions" },
  { id: "record", label: "Record" },
];

function elapsed(s: number) {
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

function fields(root: Element) {
  const out: Record<string, unknown> = {};
  for (const el of root.querySelectorAll<HTMLInputElement>("input[name], select[name], textarea[name]")) out[el.name] = el.type === "checkbox" ? el.checked : el.value;
  return out;
}

function activeCard(box: HTMLElement | null) {
  if (!box) return null;
  const cs = [...box.querySelectorAll<HTMLElement>("[data-card]")];
  return cs.find((c) => c.querySelector(".opts .btn")) ?? cs[0] ?? null;
}

function optionButtons(card: HTMLElement) {
  const sub = card.querySelector(".sub-q") ?? card;
  const opts = [...sub.querySelectorAll<HTMLButtonElement>(".opts .btn")];
  return opts.length ? opts : [...card.querySelectorAll<HTMLButtonElement>(".row .btn")].filter((b) => !b.classList.contains("quiet"));
}

function markSel(card: HTMLElement, i: number) {
  optionButtons(card).forEach((b, j) => b.classList.toggle("sel", j === i));
  card.dataset.sel = String(i);
}

const typing = (a: Element | null) => !!a && (a.tagName === "INPUT" || a.tagName === "SELECT" || a.tagName === "TEXTAREA");

function Thinking({ text, done }: { text: string; done: boolean }) {
  const [manual, setManual] = useState<boolean | null>(null);
  const [seconds, setSeconds] = useState(0);
  const box = useRef<HTMLParagraphElement>(null);
  const open = manual ?? !done;
  useEffect(() => {
    if (done) return;
    setSeconds(0);
    const start = Date.now();
    const t = setInterval(() => setSeconds(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [done]);
  useEffect(() => {
    if (!done && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [text, done, open]);
  useEffect(() => {
    if (done) setManual(null);
  }, [done]);
  return (
    <div className="my-3 rounded-xl border border-dashed bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
      <button type="button" onClick={() => setManual(!open)} aria-expanded={open} className="flex w-full items-center gap-2 text-left font-medium text-foreground">
        <BrainIcon className={cn("size-4 shrink-0 text-accent-brand", !done && "pulse-dot")} /> {done ? "Thought" : "Thinking"}
        {seconds > 0 && ` · ${seconds}s`}
        <span className="ml-auto text-xs font-normal text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <p ref={box} className="mt-1.5 max-h-72 overflow-y-auto whitespace-pre-wrap">
          {text}
        </p>
      )}
    </div>
  );
}

export function AnalysisPage({ ctx, stream }: { ctx: AppCtx; stream: StreamState }) {
  const session = ctx.state.session!;
  const status = stream.status;
  const busy = !!status.state && status.state !== "idle";
  const [tab, setTab] = useState("analysis");
  const [tabHtml, setTabHtml] = useState("");
  const [side, setSide] = useStored("cuvette.side", true);
  const [notes, setNotes] = useStored("cuvette.notes", false);
  const [sideWidth, setSideWidth] = useState(() => {
    try {
      return Number(localStorage.getItem("cuvette.sideWidth")) || 480;
    } catch {
      return 480;
    }
  });
  const gridRef = useRef<HTMLDivElement>(null);
  const dragSide = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const box = gridRef.current!.getBoundingClientRect();
    let last = sideWidth;
    const move = (m: PointerEvent) => {
      const w = box.right - m.clientX;
      if (w < 220) return setSide(false), up();
      last = Math.round(Math.min(w, box.width * 0.75));
      setSideWidth(Math.max(last, 300));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.userSelect = "";
      try {
        localStorage.setItem("cuvette.sideWidth", String(Math.max(last, 300)));
      } catch {}
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const [text, setText] = useState("");
  const [commands, setCommands] = useState<Command[]>([]);
  const [sugg, setSugg] = useState<Command[]>([]);
  const [sel, setSel] = useState(0);
  const [, setTick] = useState(0);
  const [light, setLight] = useState<{ src: string; alt: string } | null>(null);
  const [wide, setWide] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sent, setSent] = useState("");
  const sentAt = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const autoScroll = useRef(0);
  const openRuns = useRef(new Set<string>());

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [busy, stream.items.length]);

  const send = useCallback(async (value: string, now = false) => {
    if (!value.trim()) return;
    askNotify();
    if (!value.trim().startsWith("/") && (!busy || now)) {
      sentAt.current = stream.items.length;
      setSent(value.trim());
    }
    try {
      await post("api/send", { text: value, now });
    } catch (e) {
      setSent("");
      throw e;
    }
  }, [busy]);

  // The message shows at once; the copy from the server replaces it.
  useEffect(() => {
    if (sent && stream.items.slice(sentAt.current).some((h) => h.includes('class="msg user"'))) setSent("");
  }, [stream.items, sent]);
  const itemsHtml = useMemo(() => stream.items.map((h, i) => <div key={i} className="item" dangerouslySetInnerHTML={{ __html: h }} />), [stream.items]);
  const working = (busy || !!sent) && !stream.live && !stream.think;

  // Scroll: follow the end of the conversation unless the user scrolled up.
  useLayoutEffect(() => {
    if (!follow.current) return;
    const sc = scrollRef.current;
    if (!sc) return;
    autoScroll.current = Date.now();
    sc.scrollTop = sc.scrollHeight;
  }, [stream.items, stream.pending, stream.live, stream.think, stream.cards, sent]);

  useEffect(() => {
    follow.current = true;
    setSent("");
  }, [stream.resets]);

  // Step groups: an open group stays open when the server sends new HTML for it.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      const k = d.dataset?.run;
      if (!k) return;
      if (d.open) openRuns.current.add(k);
      else openRuns.current.delete(k);
    };
    sc.addEventListener("toggle", onToggle, true);
    return () => sc.removeEventListener("toggle", onToggle, true);
  }, []);
  useLayoutEffect(() => {
    if (!openRuns.current.size) return;
    for (const d of scrollRef.current?.querySelectorAll<HTMLDetailsElement>("details[data-run]") ?? []) if (openRuns.current.has(d.dataset.run!)) d.open = true;
  }, [stream.items, stream.pending]);

  // Cards: put the keyboard focus on the card that waits for an answer.
  useLayoutEffect(() => {
    const box = cardsRef.current;
    if (!box) return;
    for (const s of box.querySelectorAll('[data-type="config"] .settings')) {
      s.innerHTML = '<p class="dim small">The settings are on their own page.</p><div class="row"><button type="button" class="btn primary" data-open-settings="1">Open the settings</button></div>';
    }
    const card = activeCard(box);
    for (const c of box.querySelectorAll("[data-card]")) c.classList.toggle("active", c === card);
    if (!card) return;
    const bs = optionButtons(card);
    markSel(card, Math.max(0, bs.findIndex((b) => b.classList.contains("primary"))));
    const a = document.activeElement;
    const writing = typing(a) && !(a?.tagName === "TEXTAREA" && !(a as HTMLTextAreaElement).value.trim());
    if (!writing && !document.querySelector("[role=dialog]")) {
      card.tabIndex = -1;
      card.focus({ preventScroll: true });
    }
  }, [stream.cards]);

  useEffect(() => {
    if (document.activeElement === document.body) inputRef.current?.focus({ preventScroll: true });
  }, [session.id]);

  // Side panel tab.
  const loadTab = useCallback(
    async (quiet: boolean) => {
      const box = tabRef.current;
      if (quiet && box && box.contains(document.activeElement) && document.activeElement !== box) return;
      try {
        setTabHtml(await call<string>("api/tab?name=" + tab));
      } catch {}
    },
    [tab],
  );
  useEffect(() => {
    void loadTab(false);
  }, [loadTab, session.id]);
  useEffect(() => {
    if (stream.changed) void loadTab(true);
  }, [stream.changed]);

  // Keys for the open card: numbers choose, arrows move, Enter confirms, Escape answers later.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (typing(document.activeElement) || document.querySelector("[role=dialog], [role=menu]")) return;
      const card = activeCard(cardsRef.current);
      if (!card) return;
      const bs = optionButtons(card);
      const i = Number(card.dataset.sel || 0);
      if (/^[1-9]$/.test(e.key) && !card.querySelector(".opts .btn")) {
        const chip = [...card.querySelectorAll<HTMLButtonElement>("button.num")].find((b) => b.textContent === e.key);
        if (chip) {
          e.preventDefault();
          chip.click();
        }
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const b = bs[Number(e.key) - 1];
        if (b) {
          e.preventDefault();
          markSel(card, Number(e.key) - 1);
          b.click();
        }
        return;
      }
      const nav = (act: string) => card.querySelector<HTMLButtonElement>(`[data-act="${act}"]`);
      if (e.key === "ArrowLeft" && nav("back")) return (e.preventDefault(), nav("back")!.click());
      if (e.key === "ArrowRight" && nav("next")) return (e.preventDefault(), nav("next")!.click());
      if (!bs.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") return (e.preventDefault(), markSel(card, (i + 1) % bs.length));
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") return (e.preventDefault(), markSel(card, (i + bs.length - 1) % bs.length));
      if (e.key === "Enter" && bs[i]) return (e.preventDefault(), bs[i]!.click());
      if (e.key === "Escape") {
        const back = card.querySelector<HTMLButtonElement>('[data-act="later"], [data-act="skip"], [data-plan*="back"], [data-plan*="later"]');
        if (back) {
          e.preventDefault();
          back.click();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Clicks inside the server HTML.
  const onClick = async (e: React.MouseEvent) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const wideBtn = t.closest("[data-wide]");
    if (wideBtn) {
      const tb = wideBtn.closest("details")?.querySelector("table");
      if (tb) setWide(tb.outerHTML);
      return;
    }
    const thumb = t.closest<HTMLElement>(".thumb");
    if (thumb) return setLight({ src: thumb.dataset.full ?? "", alt: thumb.title });
    const rev = t.closest<HTMLElement>("[data-reveal]");
    if (rev) {
      try {
        await bridge.reveal(rev.dataset.reveal!);
      } catch (err) {
        toast.error((err as Error).message);
      }
      return;
    }
    const dl = t.closest("a[download]");
    if (dl && bridge.saveFile) {
      e.preventDefault();
      void bridge.saveFile(dl.getAttribute("href")!, dl.getAttribute("download")!);
      return;
    }
    if (t.closest("[data-open-settings]")) return setSettingsOpen(true);
    const accept = t.closest("[data-act=accept-def]");
    if (accept) return accept.setAttribute("aria-pressed", "true");
    const a = t.closest<HTMLElement>("[data-act]");
    const card = a?.closest<HTMLElement>("[data-card]");
    if (a && card) {
      const body: Record<string, unknown> = { id: Number(card.dataset.card), act: a.dataset.act, value: a.dataset.value, qid: a.dataset.qid, fid: a.dataset.fid, fields: fields(card) };
      if (a.dataset.plan) body.plan = JSON.parse(a.dataset.plan);
      const buttons = [...card.querySelectorAll("button")];
      for (const b of buttons) b.disabled = true;
      await post("api/act", body);
      for (const b of buttons) b.disabled = false;
      return;
    }
    const pg = t.closest<HTMLElement>("[data-page-go]");
    if (pg) {
      if (pg.dataset.progStart) ctx.setProgramStart(pg.dataset.progStart);
      return ctx.go(pg.dataset.pageGo as never);
    }
    const se = t.closest<HTMLElement>("[data-setting-edit]");
    if (se) {
      if (se.dataset.settingEdit === "programs") return ctx.go("programs");
      return send(se.dataset.settingEdit === "key" ? "/key" : "/eln setup");
    }
    const chg = t.closest<HTMLElement>("[data-change]");
    if (chg) return send("/change " + chg.dataset.change);
    const ds = t.closest<HTMLElement>("[data-decision-save]");
    if (ds) {
      const el = ds.closest("[data-decision]")!.querySelector<HTMLInputElement>("[name=value]")!;
      const v = el.type === "checkbox" ? String(el.checked) : el.tagName === "SELECT" ? String(Number(el.value) + 1) : el.value;
      return send(`/change ${ds.dataset.decisionSave} ${v}`);
    }
    if (t.closest("[data-rerun]")) return send("/rerun");
    const dc = t.closest<HTMLElement>("[data-command]");
    if (dc) return send(dc.dataset.command!);
    const dg = t.closest("[data-deck-go]");
    if (dg) {
      const row = dg.closest("[data-deck-row]")!;
      return send("/export images " + [...row.querySelectorAll<HTMLSelectElement>("[data-deck]")].map((x) => x.value).filter(Boolean).join(" "));
    }
    if (t.closest("[data-export-go]")) return send("/export " + (tabRef.current?.querySelector<HTMLSelectElement>("[data-export]")?.value ?? "html"));
  };

  const onChange = (e: React.FormEvent) => {
    const t = e.target as HTMLSelectElement;
    if (t.matches?.("[data-plan-mode]")) {
      const card = t.closest<HTMLElement>("[data-card]")!;
      void post("api/act", { id: Number(card.dataset.card), act: "plan", plan: { a: "mode", mode: t.value } });
    } else if (t.matches?.("[data-owner]")) void send(`/owner ${t.dataset.owner} ${t.value}`);
  };

  // Composer.
  const onInput = async (v: string) => {
    setText(v);
    if (!v.startsWith("/") || v.includes(" ")) return setSugg([]);
    let list = commands;
    if (!list.length) {
      try {
        list = await call<Command[]>("api/commands");
        setCommands(list);
      } catch {}
    }
    setSugg(list.filter((c) => c.name.startsWith(v.slice(1).toLowerCase())).slice(0, 8));
    setSel(0);
  };

  const pick = (c?: Command) => {
    if (!c) return;
    setSugg([]);
    if (c.args) {
      setText(`/${c.name} `);
      inputRef.current?.focus();
    } else {
      setText("");
      void send("/" + c.name);
    }
  };

  const submit = (now = false) => {
    if (sugg.length && text.startsWith("/") && !text.includes(" ")) return pick(sugg[sel]);
    const v = text;
    setText("");
    setSugg([]);
    void send(v, now);
  };

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.4) + "px";
  }, [text]);

  const waitText = (n: number) => `${n} ${n === 1 ? "decision waits" : "decisions wait"} for you`;
  let line = busy ? (status.text ?? "Working") : status.openQuestions ? waitText(status.openQuestions) + "." : "Ready.";
  if (busy && status.since) line += " · " + elapsed(Math.max(0, Math.floor((Date.now() - status.since) / 1000)));
  if (busy && status.openQuestions) line += " · " + waitText(status.openQuestions);
  const showQ = !!status.openQuestions && !/data-type="(question|plan|clarify)"/.test(stream.cards);
  const folderName = session.folder.split("/").filter(Boolean).pop() || session.folder;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background/80 px-5 py-2.5 backdrop-blur">
        <div className="flex min-w-0 basis-full items-center gap-2.5 sm:basis-0 sm:flex-1">
          <FolderOpenIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate font-semibold tracking-tight" title={session.folder}>
              {folderName}
            </div>
            <div className="truncate text-xs text-muted-foreground" title={status.where ?? session.folderLine}>
              {midText(session.folderLine || session.folder, 90)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status.bypass && (
            <Badge tone="warn">
              <ShieldAlertIcon /> bypass permissions
            </Badge>
          )}
          {status.usage && (
            <Tooltip content={status.usageLong}>
              <Badge className="tabular-nums">{status.usage}</Badge>
            </Tooltip>
          )}
          <Tooltip content={notes ? "Hide the status notes" : "Show the status notes"}>
            <Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", notes && "bg-muted text-foreground")} onClick={() => setNotes(!notes)} aria-label={notes ? "Hide the status notes" : "Show the status notes"} aria-pressed={notes}>
              <ScrollTextIcon />
            </Button>
          </Tooltip>
          <ModelMenu model={session.model} busy={busy} openSettings={() => ctx.go("settings")} />
          <ModeMenu mode={status.mode ?? "watch"} />
          <Tooltip content={side ? "Hide the side panel" : "Show the side panel"}>
            <Button variant="ghost" size="icon-sm" className="hidden text-muted-foreground lg:inline-flex" onClick={() => setSide(!side)} aria-label={side ? "Hide the side panel" : "Show the side panel"} aria-expanded={side}>
              {side ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
            </Button>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-80">
              {session.programs.length > 0 && (
                <>
                  <DropdownMenuLabel>Programs in this session</DropdownMenuLabel>
                  {session.programs.map((p) => (
                    <DropdownMenuItem key={p} onSelect={() => ctx.go("programs")} className="text-[13px]">
                      <BoxesIcon /> <span className="min-w-0 whitespace-normal">{p}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={() => send("/details")}>{session.details ? "Hide the housekeeping steps" : "Show every step (/details)"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open(withT("graph/"), "_blank", "noopener")}>
                <NetworkIcon /> Open the step graph
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => bridge.reveal(session.folder)}>
                <FolderOpenIcon /> Show the folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div ref={gridRef} style={{ "--side": `${sideWidth}px` } as React.CSSProperties} className={cn("grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto lg:overflow-hidden", side && "lg:grid-cols-[minmax(0,1fr)_var(--side)]")}>
        <section aria-label="Conversation" className="flex h-[calc(100dvh-150px)] min-h-[420px] min-w-0 flex-col lg:h-auto lg:min-h-0">
          <div
            ref={scrollRef}
            onScroll={() => {
              if (Date.now() - autoScroll.current < 150) return;
              const sc = scrollRef.current!;
              follow.current = sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80;
            }}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          >
            <div aria-live="polite" className={cn("srv stacked-wrap mx-auto w-full max-w-3xl flex-1 px-5 pt-4", !notes && "hide-notes")} onClick={onClick} onChange={onChange}>
              {itemsHtml}
              {sent && (
                <div className="msg user">
                  <div className="bubble">{sent}</div>
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: stream.pending }} />
              {stream.think && <Thinking text={stream.think} done={!!stream.live || !busy} />}
              {stream.live && (
                <div className="msg agent" dangerouslySetInnerHTML={{ __html: liveHtml(stream.live) }} />
              )}
              {working && (
                <div className="msg agent working" role="status">
                  <span className="caret working" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{busy ? line : "Sending"}</span>
                </div>
              )}
              <div ref={cardsRef} dangerouslySetInnerHTML={{ __html: stream.cards }} />
            </div>

          <div className="sticky bottom-0 z-10 bg-gradient-to-t from-background from-75% to-transparent pt-8">
          <div className="mx-auto w-full max-w-3xl px-5 pb-4">
            {(!working || busy) && (
              <div role="status" className="flex min-h-8 flex-wrap items-center gap-2 px-1 pb-1.5 text-[13px] text-muted-foreground">
                {!working && (
                  <>
                    <span className={cn("size-2 shrink-0 rounded-full", busy ? "pulse-dot bg-accent-brand" : status.openQuestions ? "bg-mag" : "bg-ok")} aria-hidden="true" />
                    <span className={cn("min-w-0 flex-1 truncate", busy && "text-foreground")}>{line}</span>
                  </>
                )}
                {showQ && (
                  <Button variant="link" size="sm" onClick={() => send("/questions")}>
                    Show the open decisions
                  </Button>
                )}
                {busy && (
                  <Button variant="outline" size="sm" onClick={() => post("api/stop", {})} className="ml-auto h-7 text-destructive">
                    <SquareIcon className="size-3 fill-current" /> Stop
                  </Button>
                )}
              </div>
            )}
            <form
              className="relative rounded-2xl border bg-card shadow-card transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:ring-[3px] focus-within:ring-ring/20"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {sugg.length > 0 && (
                <ul role="listbox" aria-label="Commands" className="absolute right-0 bottom-full left-0 z-20 mb-2 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 shadow-xl">
                  {sugg.map((c, i) => (
                    <li key={c.name} role="option" aria-selected={i === sel}>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} className={cn("flex w-full items-baseline gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm", i === sel && "bg-muted")}>
                        <span className="shrink-0 font-mono text-[13px] font-medium whitespace-nowrap">
                          /{c.name}
                          {c.args && <span className="text-muted-foreground"> {c.args}</span>}
                        </span>
                        <span className="min-w-0 truncate text-xs text-muted-foreground">{c.help}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label htmlFor="msg" className="sr-only">
                Your message
              </label>
              <textarea
                id="msg"
                ref={inputRef}
                rows={1}
                value={text}
                placeholder={status.placeholder || "Ask for an analysis, or type / for commands"}
                onChange={(e) => onInput(e.target.value)}
                onKeyDown={(e) => {
                  if (sugg.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                    e.preventDefault();
                    setSel((s) => (s + (e.key === "ArrowDown" ? 1 : sugg.length - 1)) % sugg.length);
                    return;
                  }
                  if (e.key === "ArrowUp" && !text && status.queue?.length) {
                    e.preventDefault();
                    void post<{ text: string }>("api/unqueue", {}).then((r) => r?.text && setText(r.text));
                    return;
                  }
                  if (sugg.length && e.key === "Tab") {
                    e.preventDefault();
                    pick(sugg[sel]);
                    return;
                  }
                  if (e.key === "Escape") {
                    if (sugg.length) setSugg([]);
                    else if (busy) void post("api/stop", {});
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="block max-h-[40vh] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14.5px] outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
                <span className="truncate pl-1.5 text-xs text-muted-foreground">{(status.queue ?? []).map((q) => "Queued: " + q).join(" · ") || "Enter sends. Shift+Enter adds a line."}</span>
                <div className="flex shrink-0 gap-1.5">
                  {busy && !status.queueMode && (
                    <Tooltip content="Stops the current step and sends your message now. The same as starting a message with ! in the terminal.">
                      <Button variant="outline" size="sm" onClick={() => submit(true)} disabled={!text.trim()}>
                        Stop and send now
                      </Button>
                    </Tooltip>
                  )}
                  <Button type="submit" size="sm" variant="accent" disabled={!text.trim()} aria-label={busy ? "Send after this step" : "Send"}>
                    {busy ? "Send after this step" : "Send"}
                    {!busy && <ArrowUpIcon />}
                  </Button>
                </div>
              </div>
            </form>
          </div>
          </div>
          </div>
        </section>

        {side && (
          <aside aria-label="Analysis details" className="relative flex min-h-[50vh] min-w-0 flex-col border-t bg-sidebar/60 lg:min-h-0 lg:border-t-0 lg:border-l">
            <div role="separator" aria-orientation="vertical" aria-label="Drag to resize the side panel" onPointerDown={dragSide} onDoubleClick={() => {
              setSideWidth(480);
              try {
                localStorage.setItem("cuvette.sideWidth", "480");
              } catch {}
            }} className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize transition-colors hover:bg-ring/40 active:bg-ring/60 lg:block" />
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <Tabs value={tab} onValueChange={setTab} className="min-w-0 flex-1">
                <TabsList className="w-full">
                  {TABS.map((t) => (
                    <TabsTrigger key={t.id} value={t.id}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div ref={tabRef} role="tabpanel" className="srv stacked-wrap min-h-0 flex-1 overflow-y-auto px-4 pb-6" onClick={onClick} onChange={onChange} dangerouslySetInnerHTML={{ __html: tabHtml }} />
          </aside>
        )}
      </div>

      <Dialog open={!!light} onOpenChange={(o) => !o && setLight(null)}>
        <DialogContent wide className="h-[94vh] max-h-[94vh] max-w-[97vw] gap-2 p-3 pt-10">
          <DialogTitle className="sr-only">{light?.alt || "Image"}</DialogTitle>
          {light && <ImageViewer src={light.src} alt={light.alt} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!wide} onOpenChange={(o) => !o && setWide("")}>
        <DialogContent wide>
          <DialogTitle className="sr-only">Table</DialogTitle>
          <div className="srv max-h-[80vh] overflow-auto" dangerouslySetInnerHTML={{ __html: wide }} />
        </DialogContent>
      </Dialog>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent wide className="bg-background">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            <SettingsPanel ctx={ctx} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
