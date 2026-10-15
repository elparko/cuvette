import { ArrowUpIcon, BoxesIcon, BrainIcon, EllipsisIcon, FolderOpenIcon, NetworkIcon, PanelRightCloseIcon, PanelRightOpenIcon, ScrollTextIcon, ShieldAlertIcon, SquareIcon } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { IMAGE_PASTE_HELP, pastedImageOnly } from "../lib/drop.ts";
import { cardTakesFocus, patchCards } from "../lib/cards.ts";
import { onTableCopy } from "../lib/table-copy.ts";
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
import { LiveReply } from "../components/live-reply.tsx";
import { useStored } from "../lib/stored.ts";
import { cn } from "../lib/utils.ts";

const SettingsPanel = lazy(() => import("./settings.tsx").then((m) => ({ default: m.SettingsPanel })));

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

const CARD_QUIET_MS = 400;
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
    <div aria-live="off" className="my-3 rounded-xl border border-dashed bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
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
  // On a narrow screen the header wraps, so the conversation takes the height that is left under it.
  const [gridH, setGridH] = useState(0);
  useEffect(() => {
    const g = gridRef.current;
    if (!g) return;
    const ro = new ResizeObserver(() => setGridH(g.clientHeight));
    ro.observe(g);
    return () => ro.disconnect();
  }, []);
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
  const lastTop = useRef(0);
  const openRuns = useRef(new Set<string>());

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [busy, stream.items.length]);

  const itemCount = useRef(0);
  itemCount.current = stream.items.length;
  const stop = async () => {
    const r = await post<{ dropped?: string[] }>("api/stop", {});
    const back = (r?.dropped ?? []).join("\n");
    if (back) setText((t) => (t.trim() ? `${t}\n${back}` : back));
  };

  const send = useCallback(async (value: string, now = false) => {
    if (!value.trim()) return true;
    askNotify();
    follow.current = true;
    lastTop.current = 0;
    if (!value.trim().startsWith("/") && (!busy || now)) {
      sentAt.current = itemCount.current;
      setSent(value.trim());
    }
    try {
      await call("api/send", { text: value, now });
      return true;
    } catch (e) {
      setSent("");
      toast.error((e as Error).message);
      return false;
    }
  }, [busy]);

  // The message shows at once; the copy from the server replaces it.
  useEffect(() => {
    if (sent && stream.items.slice(sentAt.current).some((h) => h.includes('class="msg user"'))) setSent("");
  }, [stream.items, sent]);
  const itemsHtml = useMemo(() => stream.items.map((h, i) => <div key={i} className="item" dangerouslySetInnerHTML={{ __html: h }} />), [stream.items]);
  const working = (busy || !!sent) && !stream.live && !stream.think;

  // Scroll: follow the end of the conversation unless the user scrolled up.
  // A scroll up that has no scroll event yet also stops the follow.
  const pin = (sc: HTMLElement) => {
    if (!follow.current) return;
    if (sc.scrollTop < lastTop.current - 1 && sc.scrollHeight - sc.scrollTop - sc.clientHeight >= 80) {
      follow.current = false;
      return;
    }
    sc.scrollTop = sc.scrollHeight;
    lastTop.current = sc.scrollTop;
  };
  // A card that did not change stays in the page, so that a screen reader does not read it again.
  const cardText = useRef(new Map<string, string>());
  const keptCards = useRef<Set<Element>>(new Set());
  const cardOpened = useRef<{ card: string | null; at: number }>({ card: null, at: 0 });
  useLayoutEffect(() => {
    if (cardsRef.current) keptCards.current = patchCards(cardsRef.current, stream.cards, cardText.current);
  }, [stream.cards]);

  useLayoutEffect(() => {
    const sc = scrollRef.current;
    if (sc) pin(sc);
  }, [stream.items, stream.pending, stream.live, stream.think, stream.cards, sent]);

  // Items with content-visibility, images and cards get their real height after the first paint.
  useEffect(() => {
    const sc = scrollRef.current;
    const log = sc?.firstElementChild;
    if (!sc || !log) return;
    const ro = new ResizeObserver(() => pin(sc));
    ro.observe(log);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    follow.current = true;
    lastTop.current = 0;
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
    for (const s of box.querySelectorAll<HTMLElement>('[data-type="config"] .settings:not([data-replaced])')) {
      s.dataset.replaced = "1";
      s.innerHTML = '<p class="dim small">The settings are on their own page.</p><div class="row"><button type="button" class="btn primary" data-open-settings="1">Open the settings</button></div>';
    }
    const card = activeCard(box);
    for (const c of box.querySelectorAll("[data-card]")) c.classList.toggle("active", c === card);
    if (card && card.dataset.card !== cardOpened.current.card) cardOpened.current = { card: card.dataset.card ?? null, at: Date.now() };
    if (!card) {
      // The answered card is gone. Keep the keyboard in the page, but do not open a phone keyboard.
      if (document.activeElement === document.body && !document.querySelector("[role=dialog]") && !matchMedia("(pointer: coarse)").matches) inputRef.current?.focus({ preventScroll: true });
      return;
    }
    const a = document.activeElement;
    const keptHere = [...keptCards.current].some((k) => !!a && k.contains(a));
    if (keptHere) return;
    const bs = optionButtons(card);
    markSel(card, Math.max(0, bs.findIndex((b) => b.classList.contains("primary"))));
    const free = cardTakesFocus(a, document.body, box);
    if (free && !document.querySelector("[role=dialog]")) {
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
      if (!side) return;
      const box = tabRef.current;
      if (quiet && box && box.contains(document.activeElement) && document.activeElement !== box) return;
      try {
        setTabHtml(await call<string>("api/tab?name=" + tab));
      } catch {
        if (!quiet) setTabHtml(`<p class="empty">This tab could not load. Choose the tab again in a moment.</p>`);
      }
    },
    [tab, side],
  );
  useEffect(() => {
    void loadTab(false);
  }, [loadTab, session.id]);
  useEffect(() => {
    if (stream.changed) void loadTab(true);
  }, [stream.changed]);

  // Keys for the open card: numbers choose, arrows move, Enter confirms, Escape answers later.
  useEffect(() => {
    let digits = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const a = document.activeElement;
      const inCards = !!a && !!cardsRef.current?.contains(a);
      if (typing(a)) {
        if (inCards && e.key === "Enter" && !e.shiftKey) {
          const f = a as HTMLInputElement;
          const c = f.closest("[data-card]") ?? cardsRef.current!;
          const go = f.name === "other" ? f.closest(".row")?.querySelector<HTMLButtonElement>(".btn") : f.tagName === "TEXTAREA" && f.name === "text" ? c.querySelector<HTMLButtonElement>(".row .btn.primary") : f.type === "password" || f.type === "url" ? c.querySelector<HTMLButtonElement>('[data-act="save"]') : null;
          if (go && f.value.trim()) {
            e.preventDefault();
            go.click();
          }
        }
        return;
      }
      if (document.querySelector("[role=dialog], [role=menu]")) return;
      const card = activeCard(cardsRef.current);
      if (!card) return;
      if (card.dataset.card === cardOpened.current.card && Date.now() - cardOpened.current.at < CARD_QUIET_MS) return;
      if (a && a !== card && e.key === "Enter" && a.closest("button, a[href], summary, [role=tab], [role=button]")) return;
      if (a && !inCards && a.closest("[role=tab]")) return;
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
      if (bs.length >= 10 && /^[0-9]$/.test(e.key)) {
        const n = Number(digits + e.key);
        digits = n >= 1 && n <= bs.length ? digits + e.key : e.key;
        const at = Number(digits) - 1;
        if (bs[at]) {
          e.preventDefault();
          markSel(card, at);
          if (a === card || bs.includes(a as HTMLButtonElement)) bs[at]!.focus();
        }
        return;
      }
      digits = "";
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
      const move = (n: number) => {
        e.preventDefault();
        markSel(card, n);
        if (a === card || bs.includes(a as HTMLButtonElement)) bs[n]!.focus();
      };
      if (e.key === "ArrowDown" || e.key === "ArrowRight") return move((i + 1) % bs.length);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") return move((i + bs.length - 1) % bs.length);
      if (e.key === "Enter" && bs[i]) return (e.preventDefault(), bs[i]!.click());
      if (e.key === "Escape") {
        const back = card.querySelector<HTMLButtonElement>('[data-act="later"], [data-act="skip"], [data-plan*="back"], [data-plan*="later"]');
        if (back) {
          e.preventDefault();
          back.click();
        }
      }
    };
    const onFocus = (e: FocusEvent) => {
      const card = activeCard(cardsRef.current);
      const n = card ? optionButtons(card).indexOf(e.target as HTMLButtonElement) : -1;
      if (n >= 0) markSel(card!, n);
    };
    const box = cardsRef.current;
    document.addEventListener("keydown", onKey);
    box?.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      box?.removeEventListener("focusin", onFocus);
    };
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
        await bridge.reveal(decodeURIComponent(rev.dataset.reveal!));
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
      if (inputRef.current?.value !== v || document.activeElement !== inputRef.current) return;
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
    if (sugg.length && text.startsWith("/") && !text.includes(" ") && !commands.some((c) => c.name === text.slice(1))) return pick(sugg[sel]);
    const v = text;
    setText("");
    setSugg([]);
    void send(v, now).then((ok) => ok || setText((t) => t || v));
  };

  // An empty box takes the height of its placeholder, so that a long placeholder does not go under the buttons.
  const placeholder = status.placeholder || "Ask for an analysis, or type / for commands";
  const fitInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const typed = el.value;
    el.style.height = "auto";
    if (!typed) el.value = placeholder;
    const h = el.scrollHeight;
    if (!typed) el.value = "";
    el.style.height = Math.min(h, window.innerHeight * 0.4) + "px";
  }, [placeholder]);
  useLayoutEffect(() => {
    fitInput();
  }, [text, fitInput]);
  useEffect(() => {
    window.addEventListener("resize", fitInput);
    return () => window.removeEventListener("resize", fitInput);
  }, [fitInput]);

  const waitText = (n: number) => `${n} ${n === 1 ? "decision waits" : "decisions wait"} for you`;
  const line = busy ? (status.text ?? "Working") : status.openQuestions ? waitText(status.openQuestions) + "." : "Ready.";
  const time = busy && status.since ? elapsed(Math.max(0, Math.floor((Date.now() - status.since) / 1000))) : "";
  const waits = busy && status.openQuestions ? " · " + waitText(status.openQuestions) : "";
  const showQ = !!status.openQuestions && !/data-type="(question|plan|clarify)"/.test(stream.cards);
  const folderName = session.folderShown.split("/").filter(Boolean).pop() || session.folderShown;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b bg-background/80 px-4 py-2 backdrop-blur sm:px-5 sm:py-2.5">
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-2.5 max-sm:basis-full">
          <FolderOpenIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h1 className="truncate font-semibold tracking-tight" title={session.folderShown}>
              {folderName}
            </h1>
            <div className="truncate text-xs text-muted-foreground max-sm:hidden" title={status.where ?? session.folderLine}>
              {midText(session.folderLine || session.folderShown, 90)}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-none">
          {status.bypass && (
            <Badge tone="warn">
              <ShieldAlertIcon /> <span className="max-sm:sr-only">bypass permissions</span>
            </Badge>
          )}
          {status.usage && (
            <Tooltip content={status.usageLong}>
              <Badge className="min-w-0 truncate tabular-nums max-lg:hidden">{status.usage}</Badge>
            </Tooltip>
          )}
          <ModelMenu model={status.model ?? session.model} busy={busy} openSettings={() => ctx.go("settings")} />
          <ModeMenu mode={status.mode ?? "watch"} />
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content={notes ? "Hide the status notes" : "Show the status notes"}>
            <Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", notes && "bg-muted text-foreground")} onClick={() => setNotes(!notes)} aria-label={notes ? "Hide the status notes" : "Show the status notes"} aria-pressed={notes}>
              <ScrollTextIcon />
            </Button>
          </Tooltip>
          <Tooltip content={side ? "Hide the side panel" : "Show the side panel"}>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => setSide(!side)} aria-label={side ? "Hide the side panel" : "Show the side panel"} aria-expanded={side}>
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
              {status.usage && (
                <>
                  <DropdownMenuLabel className="font-normal text-muted-foreground lg:hidden">{status.usage}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="lg:hidden" />
                </>
              )}
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
              <DropdownMenuItem onSelect={() => send("/details")}>{(status.details ?? session.details) ? "Hide the housekeeping steps" : "Show every step (/details)"}</DropdownMenuItem>
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

      <div ref={gridRef} style={{ "--side": `${sideWidth}px`, ...(gridH ? { "--grid-h": `${gridH}px` } : {}) } as React.CSSProperties} className={cn("grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto lg:overflow-hidden", side && "lg:grid-cols-[minmax(0,1fr)_var(--side)]")}>
        <section aria-label="Conversation" className="flex h-[var(--grid-h,calc(100dvh-150px))] min-h-[420px] min-w-0 flex-col lg:h-auto lg:min-h-0">
          <h2 className="sr-only">Conversation</h2>
          <div
            ref={scrollRef}
            onScroll={() => {
              const sc = scrollRef.current!;
              const up = sc.scrollTop < lastTop.current;
              lastTop.current = sc.scrollTop;
              const gap = sc.scrollHeight - sc.scrollTop - sc.clientHeight;
              if (up && gap >= 2) follow.current = false;
              else if (gap < 80) follow.current = true;
            }}
            onWheel={(e) => {
              if (e.deltaY < 0) follow.current = false;
            }}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          >
            <div role="log" aria-label="Messages" className={cn("srv stacked-wrap mx-auto w-full max-w-3xl flex-1 px-5 pt-4", !notes && "hide-notes")} onClick={onClick} onChange={onChange} onCopy={onTableCopy}>
              <h3 className="sr-only">Messages</h3>
              {itemsHtml}
              {sent && (
                <div className="msg user">
                  <div className="bubble">{sent}</div>
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: stream.pending }} />
              {stream.think && <Thinking text={stream.think} done={!!stream.live || !busy} />}
              {stream.live && <LiveReply text={stream.live} />}
              {working && (
                <div className="msg agent working" role="status">
                  <span className="caret working" aria-hidden="true" />
                  <span title={busy ? line + (time ? " · " + time : "") + waits : undefined} className="min-w-0 flex-1 truncate">
                    {busy ? line : "Sending"}
                    {busy && time && <span aria-hidden="true"> · {time}</span>}
                    {busy && waits}
                  </span>
                </div>
              )}
              <div ref={cardsRef} />
            </div>

          <div className="sticky bottom-0 z-10 bg-gradient-to-t from-background from-75% to-transparent pt-8">
          <div className="mx-auto w-full max-w-3xl px-5 pb-4">
            {(!working || showQ) && (
              <div role="status" className="flex min-h-8 flex-wrap items-center gap-2 px-1 pb-1.5 text-[13px] text-muted-foreground">
                {!working && (
                  <>
                    <span className={cn("size-2 shrink-0 rounded-full", busy ? "pulse-dot bg-accent-brand" : status.openQuestions ? "bg-mag" : "bg-ok")} aria-hidden="true" />
                    <span title={line + (time ? " · " + time : "") + waits} className={cn("line-clamp-2 min-w-0 flex-1 break-words sm:line-clamp-1", busy && "text-foreground")}>
                      {line}
                      {time && <span aria-hidden="true"> · {time}</span>}
                      {waits}
                    </span>
                  </>
                )}
                {showQ && (
                  <Button variant="link" size="sm" onClick={() => send("/questions")}>
                    Show the open decisions
                  </Button>
                )}
              </div>
            )}
            <form
              className="relative rounded-2xl border border-input bg-card shadow-card transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {sugg.length > 0 && (
                <ul id="cmd-list" role="listbox" aria-label="Commands" className="absolute right-0 bottom-full left-0 z-20 mb-2 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 shadow-xl">
                  {sugg.map((c, i) => (
                    <li key={c.name} id={`cmd-${i}`} role="option" aria-selected={i === sel} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} className={cn("flex w-full items-baseline gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm", i === sel && "bg-muted")}>
                      <span className="shrink-0 font-mono text-[13px] font-medium whitespace-nowrap">
                        /{c.name}
                        {c.args && <span className="text-muted-foreground"> {c.args}</span>}
                      </span>
                      <span className="min-w-0 truncate text-xs text-muted-foreground">{c.help}</span>
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
                aria-autocomplete="list"
                aria-controls={sugg.length ? "cmd-list" : undefined}
                aria-activedescendant={sugg.length ? `cmd-${sel}` : undefined}
                value={text}
                placeholder={placeholder}
                onChange={(e) => onInput(e.target.value)}
                onPaste={(e) => {
                  if (!pastedImageOnly(e.clipboardData)) return;
                  e.preventDefault();
                  toast.error(IMAGE_PASTE_HELP);
                }}
                onBlur={() => setSugg([])}
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
                    else if (busy) void stop();
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                className="block max-h-[40vh] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14.5px] outline-none placeholder:text-muted-foreground"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 pb-2.5">
                <span className={cn("line-clamp-2 min-w-0 pl-1.5 text-xs leading-snug break-words text-muted-foreground", busy && !status.queue?.length && "max-sm:hidden")}>{(status.queue ?? []).map((q) => "Queued: " + q).join(" · ") || "Enter sends. Shift+Enter adds a line."}</span>
                <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
                  {busy && (
                    <Tooltip content="Stops the current step. Esc does the same.">
                      <Button type="button" size="sm" variant="destructive" onClick={() => void stop()} aria-label="Stop the agent">
                        <SquareIcon className="size-3 fill-current" /> Stop
                      </Button>
                    </Tooltip>
                  )}
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
            <div role="separator" tabIndex={0} aria-orientation="vertical" aria-label="Resize the side panel" aria-valuemin={300} aria-valuemax={900} aria-valuenow={Math.min(sideWidth, 900)} onPointerDown={dragSide} onKeyDown={(e) => {
              const w = { ArrowLeft: sideWidth + 24, ArrowRight: sideWidth - 24, Home: 300, End: 900 }[e.key];
              if (w === undefined) return;
              e.preventDefault();
              e.stopPropagation();
              const next = Math.min(Math.max(w, 300), 900);
              setSideWidth(next);
              try {
                localStorage.setItem("cuvette.sideWidth", String(next));
              } catch {}
            }} onDoubleClick={() => {
              setSideWidth(480);
              try {
                localStorage.setItem("cuvette.sideWidth", "480");
              } catch {}
            }} className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize transition-colors hover:bg-ring/40 active:bg-ring/60 lg:block" />
            <h2 className="sr-only">Analysis details</h2>
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <Tabs value={tab} onValueChange={setTab} className="min-w-0 flex-1">
                <TabsList className="h-auto w-full flex-wrap">
                  {TABS.map((t) => (
                    <TabsTrigger key={t.id} value={t.id} aria-controls="analysis-panel" className="min-h-7 py-1">
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <h3 className="sr-only">{TABS.find((t) => t.id === tab)?.label}</h3>
            <div ref={tabRef} id="analysis-panel" role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label} className="srv stacked-wrap min-h-0 flex-1 overflow-y-auto px-4 pb-6" onClick={onClick} onChange={onChange} onCopy={onTableCopy} dangerouslySetInnerHTML={{ __html: tabHtml }} />
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
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the settings...</p>}>
              <SettingsPanel ctx={ctx} />
            </Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
