import { SparklesIcon } from "lucide-react";
import { useState } from "react";
import { askNotify, call } from "../lib/api.ts";
import { Button } from "./ui/button.tsx";

interface Suggestion {
  adapter: string;
  program: string;
  reason: string;
  headline: string;
  table: boolean;
}

interface Pending {
  folder: string;
  matches: Suggestion[];
}

export function useFolderPick(onOpened: () => void) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const open = async (folder: string, adapter?: string) => {
    setBusy(true);
    setMsg("");
    try {
      askNotify();
      await call("api/open", { folder, adapter });
      setPending(null);
      onOpened();
    } catch (e) {
      setBusy(false);
      setMsg((e as Error).message);
    }
  };

  const choose = async (folder: string) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await call<{ scanned: number; matches: Suggestion[] }>("api/suggest?p=" + encodeURIComponent(folder));
      if (r.matches.length || r.scanned === 0) {
        setPending({ folder, matches: r.matches });
        setBusy(false);
        return;
      }
    } catch {}
    await open(folder);
  };

  const cancel = () => setPending(null);

  return { pending, busy, msg, open, choose, cancel };
}

export function SuggestCard({ pending, busy, open, cancel }: { pending: Pending; busy: boolean; open: (folder: string, adapter?: string) => void; cancel: () => void }) {
  const [best, ...rest] = pending.matches;
  const name = pending.folder.replace(/[\u202a-\u202e\u2066-\u2069]/g, "").split("/").filter(Boolean).pop() || pending.folder;
  if (!best)
    return (
      <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-4" role="group" aria-label="Empty folder">
        <p className="text-sm [overflow-wrap:anywhere]">Cuvette found no files in {name}. Choose the folder that holds your data, or open this folder to add files later.</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={cancel}>
            Back
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => open(pending.folder)}>
            Open the empty folder
          </Button>
        </div>
      </div>
    );
  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-4" role="group" aria-label="Suggested program">
      <div className="flex items-center gap-2 text-sm font-medium">
        <SparklesIcon className="size-4 text-accent-brand" /> {best.headline}
      </div>
      <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
        Found in {name}: {best.reason}.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => open(pending.folder, best.adapter)}>
          {best.table ? "Use the table route" : `Use ${best.program}`}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => open(pending.folder)}>
          Let Cuvette choose later
        </Button>
        <Button variant="ghost" disabled={busy} onClick={cancel}>
          Back
        </Button>
      </div>
      {rest.length > 0 && (
        <div>
          <div className="pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Other matches</div>
          <ul className="rounded-lg border p-1">
            {rest.slice(0, 5).map((m) => (
              <li key={m.adapter}>
                <button type="button" disabled={busy} onClick={() => open(pending.folder, m.adapter)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <span className="min-w-0 truncate">{m.program}</span>
                  <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground">{m.reason}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
