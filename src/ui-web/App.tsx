import { BoxesIcon, CalendarIcon, CopyIcon, ExternalLinkIcon, FlaskConicalIcon, FolderOpenIcon, FolderSearchIcon, HistoryIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, PencilIcon, SettingsIcon, Trash2Icon, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { FolderDialog } from "./components/folder-chooser.tsx";
import { Button } from "./components/ui/button.tsx";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "./components/ui/context-menu.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./components/ui/dialog.tsx";
import { Input } from "./components/ui/input.tsx";
import { Tooltip, TooltipProvider } from "./components/ui/tooltip.tsx";
import { useStored } from "./lib/stored.ts";
import { call, copyText, enableFinder, type AppState } from "./lib/api.ts";
import { useStream } from "./lib/stream.ts";
import { cn } from "./lib/utils.ts";
import { AnalysisPage } from "./pages/analysis.tsx";
import { ProgramsPage } from "./pages/programs.tsx";
import { SessionsPage, useSessions, type SessionCard } from "./pages/sessions.tsx";
import { SettingsPage } from "./pages/settings.tsx";
import { SetupPage } from "./pages/setup.tsx";
import { StartPage } from "./pages/start.tsx";

export type Page = "session" | "start" | "setup" | "settings" | "sessions" | "programs";
const OWN_PAGES: Page[] = ["settings", "sessions", "programs"];

const NAV: { page: Page; label: string; icon: LucideIcon }[] = [
  { page: "session", label: "Analysis", icon: FlaskConicalIcon },
  { page: "sessions", label: "Sessions", icon: HistoryIcon },
  { page: "programs", label: "Programs", icon: BoxesIcon },
  { page: "settings", label: "Settings", icon: SettingsIcon },
];

export interface AppCtx {
  state: AppState;
  go: (p: Page) => void;
  boot: () => void;
  openFolder: () => void;
  opened: () => void;
  programStart: string;
  setProgramStart: (name: string) => void;
}

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#151515" />
      <g transform="translate(5 2) scale(.84)">
        <path d="M18 27H38V60H18Z" fill="#4f1e2d" />
        <path d="M38 27L46 21V54L38 60Z" fill="#73304a" />
        <path d="M18 27H38L46 21H26Z" fill="#73304a" />
        <path d="M2 31H18V39H2Z" fill="#f06a8e" />
        <path d="M18 31L46 35V36.5L18 39Z" fill="#f06a8e" opacity=".8" />
        <path d="M46 35H62V36.5H46Z" fill="#f06a8e" opacity=".55" />
        <path d="M18 12H38V60H18Z M38 12L46 6V54L38 60 M18 12L26 6H46" fill="none" stroke="#ecebe7" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<Page>((new URLSearchParams(location.search).get("page") as Page) || "session");
  const [boots, setBoots] = useState(0);
  const [folderOpen, setFolderOpen] = useState(false);
  const [programStart, setProgramStart] = useState("");
  const [renaming, setRenaming] = useState<SessionCard | null>(null);
  const [removing, setRemoving] = useState<SessionCard | null>(null);
  const [draft, setDraft] = useState("");
  const [rail, setRail] = useStored("cuvette.rail", false);
  const wanted = useRef(page);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const boot = useCallback(async () => {
    clearTimeout(timer.current);
    let s: AppState;
    try {
      s = await call<AppState>("api/state");
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    if (s.finder) enableFinder();
    setState(s);
    if (s.session || !s.opening) toast.dismiss("opening");
    if (s.error) toast.error(s.error, { id: "opening" });
    const want = wanted.current;
    const next: Page = s.session ? (OWN_PAGES.includes(want) ? want : "session") : s.setup || want === "setup" ? "setup" : OWN_PAGES.includes(want) ? want : "start";
    setPage(next);
    if (!s.session && s.opening) timer.current = setTimeout(boot, 800);
    setBoots((n) => n + 1);
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  const go = useCallback(
    (p: Page) => {
      const target = p === "session" && !state?.session ? (state?.setup ? "setup" : "start") : p;
      wanted.current = target;
      setPage(target);
      document.querySelector("main")?.scrollTo(0, 0);
    },
    [state],
  );

  const opened = useCallback(() => {
    wanted.current = "session";
    setFolderOpen(false);
    toast.loading("Opening the session…", { id: "opening" });
    setTimeout(boot, 300);
  }, [boot]);

  const stream = useStream(boot, !!state?.session);
  const sessions = useSessions(page, boots);

  useEffect(() => {
    const w = window as unknown as { cuvetteApp?: unknown; toast?: (t: string) => void };
    w.cuvetteApp = { refresh: opened, show: (p: Page) => go(p) };
    w.toast = (t: string) => toast(t);
  }, [opened, go]);

  if (!state) return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>;

  const ctx: AppCtx = { state, go, boot, openFolder: () => setFolderOpen(true), opened, programStart, setProgramStart };
  const current = (p: Page) => p === page || (p === "session" && !OWN_PAGES.includes(page));
  const recent = sessions.list.filter((x) => !x.moved).slice(0, 6);
  const dateName = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const startRename = (s: SessionCard) => {
    setDraft(s.title);
    setRenaming(s);
  };
  const saveRename = () => {
    if (renaming) void sessions.rename(renaming.id, draft);
    setRenaming(null);
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-full min-h-0">
        <ContextMenu>
        <ContextMenuTrigger asChild>
        <aside className={cn("hidden shrink-0 flex-col overflow-hidden border-r bg-sidebar transition-[width] duration-150 md:flex", rail ? "w-14" : "w-60")} aria-label="Navigation">
          <div className={cn("flex items-center pt-4 pb-3", rail ? "flex-col gap-2 px-2" : "gap-2.5 px-4")}>
            <Logo className="size-7 shrink-0" />
            {!rail && <span className="text-[15px] font-semibold tracking-tight">Cuvette</span>}
            <Tooltip content={rail ? "Show the sidebar" : "Hide the sidebar"} side="right">
              <Button variant="ghost" size="icon-sm" className={cn("text-muted-foreground", !rail && "ml-auto")} onClick={() => setRail(!rail)} aria-label={rail ? "Show the sidebar" : "Hide the sidebar"} aria-expanded={!rail}>
                {rail ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
              </Button>
            </Tooltip>
          </div>
          <div className={cn("pb-2", rail ? "px-2" : "px-3")}>
            {rail ? (
              <Tooltip content="Open a folder" side="right">
                <Button variant="outline" size="icon" className="w-full" onClick={() => setFolderOpen(true)} aria-label="Open a folder">
                  <FolderOpenIcon />
                </Button>
              </Tooltip>
            ) : (
              <Button variant="outline" className="w-full justify-start" onClick={() => setFolderOpen(true)}>
                <FolderOpenIcon /> Open a folder
              </Button>
            )}
          </div>
          <nav className={cn("flex flex-col gap-0.5 py-1", rail ? "px-2" : "px-3")} aria-label="Pages">
            {NAV.map((n) => (
              <Tooltip key={n.page} content={rail ? n.label : ""} side="right">
                <button
                  type="button"
                  onClick={() => go(n.page)}
                  aria-current={current(n.page) ? "page" : undefined}
                  aria-label={rail ? n.label : undefined}
                  className={cn("flex h-8 items-center gap-2.5 rounded-lg text-left text-[13.5px] text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50", rail ? "justify-center" : "px-2.5", current(n.page) && "bg-card font-medium text-foreground shadow-card")}
                >
                  <n.icon className="size-4" />
                  {!rail && n.label}
                </button>
              </Tooltip>
            ))}
          </nav>
          {!rail && recent.length > 0 && (
            <div className="mt-4 min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-2">
              <div className="px-2.5 pb-1 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">Recent</div>
              {recent.map((s) => (
                <ContextMenu key={s.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      title={s.folder}
                      onClick={() => sessions.open(s.id, opened)}
                      onContextMenu={(e) => e.stopPropagation()}
                      className={cn("flex w-full min-w-0 flex-col rounded-lg px-2.5 py-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50", state.session?.id === s.id && "bg-muted")}
                    >
                      <span className="truncate text-[13px]">{s.title}</span>
                      <span className="truncate text-[11.5px] text-muted-foreground">{s.title === s.folderName ? `No request yet · ${s.age}` : `${s.folderName} · ${s.age}`}</span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => sessions.open(s.id, opened)}>
                      <ExternalLinkIcon /> Open
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => startRename(s)}>
                      <PencilIcon /> Rename
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => void sessions.reveal(s.id)}>
                      <FolderSearchIcon /> Show in Finder
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => copyText(s.folder)}>
                      <CopyIcon /> Copy the project folder
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem destructive disabled={state.session?.id === s.id} onSelect={() => setRemoving(s)}>
                      <Trash2Icon /> Remove from the list
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
              <button type="button" onClick={() => go("sessions")} className="mt-1 flex h-8 w-full items-center rounded-lg px-2.5 text-left text-[12.5px] text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50">
                All sessions
              </button>
            </div>
          )}
          {!rail && (
            <div className="mt-auto border-t px-4 py-3 text-xs text-muted-foreground">
              <div className="truncate" title={state.session?.model ?? state.model}>
                Model: <span className="text-foreground">{state.session?.model ?? state.model}</span>
              </div>
              {stream.status.usage && (
                <div className="truncate" title={stream.status.usageLong}>
                  {stream.status.usage}
                </div>
              )}
            </div>
          )}
        </aside>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => setFolderOpen(true)}>
            <FolderOpenIcon /> Open a folder
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => setRail(!rail)}>{rail ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />} {rail ? "Show the sidebar" : "Hide the sidebar"}</ContextMenuItem>
          <ContextMenuSeparator />
          {NAV.map((n) => (
            <ContextMenuItem key={n.page} onSelect={() => go(n.page)}>
              <n.icon /> {n.label}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
        </ContextMenu>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b bg-sidebar px-3 py-2 md:hidden">
            <Logo className="size-6" />
            <span className="font-semibold">Cuvette</span>
            <nav className="ml-auto flex gap-0.5" aria-label="Pages">
              {NAV.map((n) => (
                <Button key={n.page} variant="ghost" size="icon-sm" onClick={() => go(n.page)} aria-label={n.label} aria-current={current(n.page) ? "page" : undefined} className={cn(current(n.page) && "bg-card shadow-card")}>
                  <n.icon />
                </Button>
              ))}
              <Button variant="ghost" size="icon-sm" onClick={() => setFolderOpen(true)} aria-label="Open a folder">
                <FolderOpenIcon />
              </Button>
            </nav>
          </header>

          {page === "session" && state.session ? (
            <AnalysisPage ctx={ctx} stream={stream} />
          ) : (
            <main className="min-h-0 flex-1 overflow-y-auto">
              {page === "start" && <StartPage ctx={ctx} sessions={sessions} />}
              {page === "setup" && <SetupPage ctx={ctx} />}
              {page === "sessions" && <SessionsPage ctx={ctx} sessions={sessions} />}
              {page === "programs" && <ProgramsPage ctx={ctx} />}
              {page === "settings" && <SettingsPage ctx={ctx} />}
              {page === "session" && !state.session && <StartPage ctx={ctx} sessions={sessions} />}
            </main>
          )}
        </div>
      </div>
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename the session</DialogTitle>
            <DialogDescription>Use one or two words, or the date. An empty name brings back the automatic name.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveRename();
            }}
          >
            <Input autoFocus value={draft} maxLength={60} onChange={(e) => setDraft(e.target.value)} aria-label="Session name" />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDraft(dateName)}>
                <CalendarIcon /> Use the date
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this session from the list?</DialogTitle>
            <DialogDescription>The files stay in the results folder. To show the session again, open that folder.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removing) void sessions.remove(removing.id);
                setRemoving(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FolderDialog open={folderOpen} onOpenChange={setFolderOpen} start={state.folder || state.start} onOpened={opened} />
      <Toaster position="bottom-center" toastOptions={{ className: "!rounded-xl !border !bg-popover !text-popover-foreground !shadow-xl" }} />
    </TooltipProvider>
  );
}
