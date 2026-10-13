import { FolderOpenIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppCtx } from "../App.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Select } from "../components/ui/select.tsx";
import { SessionGrid, type Sessions } from "./sessions.tsx";

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
      {sessions.err && (
        <p role="alert" className="mb-4 text-sm text-bad">
          The list of sessions did not load: {sessions.err}
        </p>
      )}
      {!sessions.loaded ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !sessions.list.length ? (
        !sessions.err && <p className="text-muted-foreground">No sessions yet.</p>
      ) : !shown.length ? (
        <p className="text-muted-foreground">No session matches.</p>
      ) : (
        <SessionGrid list={shown} onOpen={(id) => sessions.open(id, ctx.opened)} onRemove={(id) => void sessions.remove(id)} />
      )}
    </div>
  );
}
