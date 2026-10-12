import { ArrowUpIcon, ClockIcon, FolderIcon, FolderOpenIcon, HomeIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { bridge, call, midText } from "../lib/api.ts";
import { DropZone } from "./drop-zone.tsx";
import { SuggestCard, useFolderPick } from "./suggest-card.tsx";
import { Button } from "./ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog.tsx";
import { Input } from "./ui/input.tsx";

interface Dirs {
  path: string;
  parent: string | null;
  dirs: string[];
  recent: string[];
  home: string;
}

export function FolderChooser({ start, onOpened, big }: { start: string; onOpened: () => void; big?: boolean }) {
  const [recent, setRecent] = useState<string[]>([]);
  const { pending, busy, msg, open, choose, cancel } = useFolderPick(onOpened);
  const [pickMsg, setPickMsg] = useState("");

  useEffect(() => {
    call<Dirs>("api/dirs?p=" + encodeURIComponent(start || ""))
      .then((d) => setRecent(d.recent))
      .catch(() => {});
  }, [start]);

  if (bridge.chooseFolder) {
    const pick = async () => {
      setPickMsg("");
      try {
        const f = await bridge.chooseFolder!(start);
        if (f) await choose(f);
      } catch (e) {
        setPickMsg((e as Error).message);
      }
    };
    return (
      <DropZone choose={choose} disabled={busy} browserHint="Choose the folder with the button.">
      <div className="flex flex-col items-start gap-3">
        <Button size={big ? "lg" : "default"} onClick={pick} disabled={busy}>
          <FolderOpenIcon /> Choose a folder in Finder…
        </Button>
        {(msg || pickMsg) && <p className="text-sm text-bad">{msg || pickMsg}</p>}
        {pending && <SuggestCard pending={pending} busy={busy} open={open} cancel={cancel} />}
        {!pending && recent.length > 0 && (
          <div className="w-full">
            <div className="pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Recent project folders</div>
            <ul className="rounded-xl border bg-card p-1">
              {recent.slice(0, 6).map((r) => (
                <li key={r}>
                  <button type="button" disabled={busy} onClick={() => choose(r)} title={r} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted">
                    <ClockIcon className="size-4 text-muted-foreground" />
                    <span className="min-w-0 truncate">{r.split("/").filter(Boolean).pop() || r}</span>
                    <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground">{midText(r, 40)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      </DropZone>
    );
  }
  return <FolderBrowser start={start} onOpened={onOpened} />;
}

export function FolderBrowser({ start, onOpened }: { start: string; onOpened: () => void }) {
  const [path, setPath] = useState(start);
  const [d, setD] = useState<Dirs | null>(null);
  const [msg, setMsg] = useState("");
  const pick = useFolderPick(onOpened);

  const list = useCallback(async (p: string) => {
    try {
      const r = await call<Dirs>("api/dirs?p=" + encodeURIComponent(p || ""));
      setD(r);
      setPath(r.path);
      setMsg("");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void list(start);
  }, [list, start]);

  const row = (key: string, icon: React.ReactNode, label: string, target: string, sub?: string) => (
    <li key={key}>
      <button type="button" onClick={() => list(target)} onDoubleClick={() => list(target)} title={target} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted">
        <span className="text-muted-foreground">{icon}</span>
        <span className="min-w-0 truncate">{label}</span>
        {sub && <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground">{midText(sub, 40)}</span>}
      </button>
    </li>
  );

  return (
    <DropZone choose={pick.choose} disabled={pick.busy} browserHint="Type the path in the Folder box.">
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void list(path);
            }
          }}
          aria-label="Folder"
          placeholder="Folder, for example ~/Data/experiment-12"
          className="flex-1 font-mono text-[13px]"
          spellCheck={false}
        />
        <Button onClick={() => pick.choose(path)} disabled={pick.busy}>Analyze this folder</Button>
      </div>
      {(msg || pick.msg) && <p className="text-sm text-bad">{msg || pick.msg}</p>}
      {pick.pending && <SuggestCard pending={pick.pending} busy={pick.busy} open={pick.open} cancel={pick.cancel} />}
      {d && !pick.pending && (
        <div className="min-h-0 overflow-y-auto rounded-xl border bg-card p-1" style={{ maxHeight: "min(420px, 50vh)" }}>
          <ul>
            {d.parent && row("up", <ArrowUpIcon className="size-4" />, "Up one folder", d.parent, d.parent)}
            {d.path !== d.home && row("home", <HomeIcon className="size-4" />, "Home folder", d.home)}
            {d.dirs.slice(0, 300).map((n) => row("d" + n, <FolderIcon className="size-4" />, n, d.path.replace(/\/$/, "") + "/" + n))}
            {!d.dirs.length && <li className="px-2.5 py-2 text-sm text-muted-foreground">No folders here.</li>}
          </ul>
          {d.recent.length > 0 && (
            <>
              <div className="px-2.5 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Recent project folders</div>
              <ul>{d.recent.map((r) => row("r" + r, <ClockIcon className="size-4" />, r.split("/").filter(Boolean).pop() || r, r, r))}</ul>
            </>
          )}
        </div>
      )}
    </div>
    </DropZone>
  );
}

export function FolderDialog({ open, onOpenChange, start, onOpened }: { open: boolean; onOpenChange: (o: boolean) => void; start: string; onOpened: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Open a folder</DialogTitle>
          <DialogDescription>Choose the folder with your data. Cuvette does not change your files. The results go in a new folder inside it.</DialogDescription>
        </DialogHeader>
        <FolderChooser start={start} onOpened={onOpened} />
      </DialogContent>
    </Dialog>
  );
}
