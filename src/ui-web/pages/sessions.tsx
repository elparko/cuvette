import { FolderOpenIcon, ImageIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppCtx, Page } from "../App.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Select } from "../components/ui/select.tsx";
import { call } from "../lib/api.ts";
import { cn } from "../lib/utils.ts";

export interface SessionCard {
  id: string;
  title: string;
  text: string;
  folder: string;
  folderName: string;
  age: string;
  status: string;
  moved: boolean;
  thumb: string;
}

export function useSessions(page: Page, boots: number) {
  const [list, setList] = useState<SessionCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    call<SessionCard[]>("api/sessions.json")
      .then((l) => {
        setList(l);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [page, boots]);
  const open = useCallback(async (id: string, done: () => void) => {
    try {
      await call("api/open", { id });
      done();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  return { list, loaded, open };
}

export type Sessions = ReturnType<typeof useSessions>;

const STATUS_TONE: Record<string, "mag" | "info" | "ok" | "default"> = { "waiting for you": "mag", running: "info", answered: "ok" };

export function SessionGrid({ list, onOpen, compact }: { list: SessionCard[]; onOpen: (id: string) => void; compact?: boolean }) {
  return (
    <ul className={cn("grid gap-3", compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3")}>
      {list.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            disabled={s.moved}
            onClick={() => onOpen(s.id)}
            className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-card transition-[border-color,box-shadow] outline-none hover:border-accent-brand/50 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-55"
          >
            {!compact && (
              <div className="flex aspect-[16/8] w-full items-center justify-center overflow-hidden border-b bg-muted">
                {s.thumb ? <img src={s.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" /> : <ImageIcon className="size-6 text-muted-foreground/50" />}
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1 p-3.5">
              <span className="line-clamp-2 font-medium">{s.title}</span>
              {s.text && <span className="line-clamp-2 text-[13px] text-muted-foreground">{s.text}</span>}
              <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 text-xs text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1 truncate" title={s.folder}>
                  <FolderOpenIcon className="size-3.5 shrink-0" />
                  {s.folderName}
                </span>
                <span>· {s.age}</span>
                {s.status && <Badge tone={STATUS_TONE[s.status] ?? "default"}>{s.status}</Badge>}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SessionsPage({ ctx, sessions }: { ctx: AppCtx; sessions: Sessions }) {
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState("all");
  const [moved, setMoved] = useState(false);
  const movedCount = sessions.list.filter((s) => s.moved).length;
  const folders = useMemo(() => [...new Set(sessions.list.map((s) => s.folder).filter(Boolean))].sort(), [sessions.list]);
  const shown = sessions.list.filter((s) => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const text = `${s.title} ${s.text} ${s.folder}`.toLowerCase();
    return words.every((w) => text.includes(w)) && (folder === "all" || s.folder === folder) && (moved || !s.moved);
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <Button onClick={ctx.openFolder}>
          <FolderOpenIcon /> Open a folder
        </Button>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Newest first. Choose one to continue it. A session that you start here also opens in the terminal with cuvette --resume, and the other way.</p>
      {sessions.list.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, requests and folders" aria-label="Search sessions" className="pl-9" />
          </div>
          <Select value={folder} onValueChange={setFolder} label="Folder" className="min-w-[180px]" options={[{ value: "all", label: "All folders" }, ...folders.map((f) => ({ value: f, label: f.split("/").filter(Boolean).pop() || f }))]} />
          {movedCount > 0 && (
            <Button variant="ghost" onClick={() => setMoved(!moved)} aria-pressed={moved}>
              {moved ? "Hide the moved sessions" : `Show the moved sessions (${movedCount})`}
            </Button>
          )}
        </div>
      )}
      {!sessions.loaded ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !sessions.list.length ? (
        <p className="text-muted-foreground">No sessions yet.</p>
      ) : !shown.length ? (
        <p className="text-muted-foreground">No session matches.</p>
      ) : (
        <SessionGrid list={shown} onOpen={(id) => sessions.open(id, ctx.opened)} />
      )}
    </div>
  );
}
