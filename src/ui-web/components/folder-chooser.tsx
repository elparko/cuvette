import { ArrowUpIcon, ClockIcon, FolderIcon, FolderOpenIcon, HomeIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { askNotify, bridge, call, midText } from "../lib/api.ts";
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

async function openFolder(folder: string) {
  askNotify();
  await call("api/open", { folder });
}

export function FolderChooser({ start, onOpened, big }: { start: string; onOpened: () => void; big?: boolean }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (bridge.chooseFolder) {
    const pick = async () => {
      const f = await bridge.chooseFolder!(start);
      if (!f) return;
      setBusy(true);
      try {
        await openFolder(f);
        setMsg("Opening…");
        onOpened();
      } catch (e) {
        setBusy(false);
        setMsg((e as Error).message);
      }
    };
    return (
      <div className="flex flex-col items-start gap-2">
        <Button size={big ? "lg" : "default"} onClick={pick} disabled={busy}>
          <FolderOpenIcon /> Choose a folder…
        </Button>
        {msg && <p className="text-sm text-bad">{msg}</p>}
      </div>
    );
  }
  return <FolderBrowser start={start} onOpened={onOpened} />;
}

export function FolderBrowser({ start, onOpened }: { start: string; onOpened: () => void }) {
  const [path, setPath] = useState(start);
  const [d, setD] = useState<Dirs | null>(null);
  const [msg, setMsg] = useState("");

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

  const go = async () => {
    try {
      await openFolder(path);
      setMsg("Opening…");
      onOpened();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

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
        <Button onClick={go}>Analyze this folder</Button>
      </div>
      {msg && <p className="text-sm text-bad">{msg}</p>}
      {d && (
        <div className="min-h-0 overflow-y-auto rounded-xl border bg-card p-1" style={{ maxHeight: "min(420px, 50vh)" }}>
          <ul>
            {d.parent && row("up", <ArrowUpIcon className="size-4" />, "Up one folder", d.parent, d.parent)}
            {d.path !== d.home && row("home", <HomeIcon className="size-4" />, "Home folder", d.home)}
            {d.dirs.slice(0, 300).map((n) => row("d" + n, <FolderIcon className="size-4" />, n, d.path.replace(/\/$/, "") + "/" + n))}
            {!d.dirs.length && <li className="px-2.5 py-2 text-sm text-muted-foreground">No folders here.</li>}
          </ul>
          {d.recent.length > 0 && (
            <>
              <div className="px-2.5 pt-3 pb-1 text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">Recent project folders</div>
              <ul>{d.recent.map((r) => row("r" + r, <ClockIcon className="size-4" />, r.split("/").filter(Boolean).pop() || r, r, r))}</ul>
            </>
          )}
        </div>
      )}
    </div>
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
