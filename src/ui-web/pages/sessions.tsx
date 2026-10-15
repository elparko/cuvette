import { FolderOpenIcon, ImageIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppCtx, Page } from "../App.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { call } from "../lib/api.ts";
import { useRoving } from "../lib/rove.ts";
import { cn } from "../lib/utils.ts";

export interface SessionCard {
  id: string;
  title: string;
  text: string;
  folder: string;
  folderName: string;
  folderShown: string;
  age: string;
  status: string;
  moved: boolean;
  hasRequest?: boolean;
  thumb: string;
}

export function useSessions(page: Page, boots: number, idle = true) {
  const [list, setList] = useState<SessionCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    call<SessionCard[]>("api/sessions.json")
      .then((l) => {
        setList(l);
        setErr("");
        setLoaded(true);
      })
      .catch((e: Error) => {
        setErr(e.message);
        setLoaded(true);
      });
  }, [page, boots, tick, idle]);
  const opening = useRef(false);
  const open = useCallback(async (id: string, done: () => void) => {
    if (opening.current) return;
    opening.current = true;
    try {
      await call("api/open", { id });
      done();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setTimeout(() => (opening.current = false), 1500);
  }, []);
  const rename = useCallback(async (id: string, name: string) => {
    try {
      await call("api/session-rename", { id, name });
      setTick((n) => n + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  const remove = useCallback(async (id: string) => {
    try {
      await call("api/session-remove", { id });
      setTick((n) => n + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  const reveal = useCallback(async (id: string) => {
    try {
      await call("api/session-reveal", { id });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  return { list, loaded, err, open, rename, remove, reveal };
}

export type Sessions = ReturnType<typeof useSessions>;

const ACTION = "min-h-8 rounded-md px-2 py-1 text-xs text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring";

const STATUS_TONE: Record<string, "mag" | "info" | "ok" | "default"> = { "waiting for you": "mag", running: "info", answered: "ok" };

export function SessionGrid({ list, onOpen, onRename, onRemove, compact, label = "Sessions" }: { list: SessionCard[]; onOpen: (id: string) => void; onRename?: (s: SessionCard) => void; onRemove?: (s: SessionCard) => void; compact?: boolean; label?: string }) {
  const rove = useRoving(list.filter((s) => !s.moved).map((s) => s.id));
  return (
    <ul aria-label={label} ref={rove.ref} onKeyDown={rove.onKeyDown} onFocus={rove.onFocus} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((s) => (
        <li key={s.id} className="flex flex-col gap-1">
          <button
            type="button"
            data-rove={s.id}
            tabIndex={rove.tabIndex(s.id)}
            disabled={s.moved}
            onClick={() => onOpen(s.id)}
            className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-card transition-[border-color,box-shadow] outline-none hover:border-accent-brand/50 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-55"
          >
            {!compact && (
              <div className="flex aspect-[16/8] w-full items-center justify-center overflow-hidden border-b bg-muted">
                {s.thumb ? <img src={s.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" /> : <ImageIcon className="size-6 text-muted-foreground/50" />}
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1 p-3.5">
              <span className="line-clamp-2 font-medium [overflow-wrap:anywhere]">{s.title}</span>
              {s.text && <span className="line-clamp-2 text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{s.text}</span>}
              <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 text-xs text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1 truncate" title={s.folderShown}>
                  <FolderOpenIcon className="size-3.5 shrink-0" />
                  {s.folderName}
                </span>
                <span>· {s.age}</span>
                {s.status && <Badge tone={STATUS_TONE[s.status] ?? "default"}>{s.status}</Badge>}
              </span>
            </div>
          </button>
          {(onRename || onRemove) && (
            <div className="flex flex-wrap gap-1">
              {onRename && (
                <button type="button" onClick={() => onRename(s)} className={ACTION} aria-label={`Rename ${s.title}`}>
                  Rename
                </button>
              )}
              {onRemove && (
                <button type="button" onClick={() => onRemove(s)} className={ACTION} aria-label={`Remove ${s.title} from the list`}>
                  Remove from the list
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
