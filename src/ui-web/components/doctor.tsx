import { CheckCircle2Icon, CircleAlertIcon, LoaderCircleIcon, TriangleAlertIcon, XCircleIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { call } from "../lib/api.ts";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";

interface Check {
  id: string;
  group: string;
  name: string;
  status: string;
  detail: string;
  command: string;
  link: string;
  cite: string;
}
interface Doctor {
  ready: boolean;
  counts: { ok: number; missing: number; old: number };
  checks: Check[];
}

const ICON: Record<string, React.ReactNode> = {
  ok: <CheckCircle2Icon className="size-4 text-ok" />,
  missing: <XCircleIcon className="size-4 text-bad" />,
  old: <TriangleAlertIcon className="size-4 text-warn" />,
};

export function DoctorView({ auto = true }: { auto?: boolean }) {
  const [d, setD] = useState<Doctor | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [all, setAll] = useState(false);

  const run = useCallback(async (full: boolean) => {
    setBusy(true);
    setErr("");
    try {
      setD(await call<Doctor>("api/doctor", { all: full, json: true }));
      setAll(full);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }, []);

  useEffect(() => {
    if (auto) void run(false);
  }, [auto, run]);

  const groups = d ? [...new Set(d.checks.map((c) => c.group))] : [];

  return (
    <div className="flex flex-col gap-3">
      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" /> Checking the programs that Cuvette uses. This takes about 15 seconds.
        </p>
      )}
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      {d && !busy && (
        <>
          <div className={d.ready ? "flex items-start gap-2 rounded-xl bg-ok-bg px-3 py-2.5 text-sm text-ok" : "flex items-start gap-2 rounded-xl bg-warn-bg px-3 py-2.5 text-sm text-warn"}>
            {d.ready ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" /> : <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />}
            <span className="font-medium">{d.ready ? "Cuvette can start: Node is new enough and a model is ready." : "Cuvette cannot start yet. It needs Node 22 or later, and a Claude API key or an Ollama model."}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {d.counts.ok} ok, {d.counts.missing} missing, {d.counts.old} old. A missing program matters only if your analysis uses it.
          </p>
          {groups.map((g) => (
            <div key={g}>
              <h4 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{g}</h4>
              <ul className="divide-y rounded-xl border bg-card">
                {d.checks
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <li key={c.id} className="flex gap-3 px-3 py-2.5 text-sm">
                      <span className="mt-0.5">{ICON[c.status] ?? ICON.old}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="min-w-0 font-medium break-words">{c.name}</span>
                          {c.status !== "ok" && <Badge tone={c.status === "missing" ? "bad" : "warn"}>{c.status}</Badge>}
                        </div>
                        <p className="text-[13px] break-words text-muted-foreground">{c.detail}</p>
                        {c.status !== "ok" && c.command && (
                          <p className="mt-1 text-xs">
                            Install: <code className="rounded bg-code px-1.5 py-0.5 font-mono break-all">{c.command}</code>
                          </p>
                        )}
                        {c.status !== "ok" && c.link && (
                          <p className="mt-1 text-xs">
                            {c.command ? "Or download" : "Download"}:{" "}
                            <a href={c.link} target="_blank" rel="noopener" className="break-all">
                              {c.link}
                            </a>
                          </p>
                        )}
                        {c.cite && <p className="mt-1 text-xs break-words text-muted-foreground">How to cite: {c.cite}</p>}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          {!d.checks.length && <p className="text-sm text-muted-foreground">Nothing is missing.</p>}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => run(false)} disabled={busy}>
          Check this computer
        </Button>
        {!all && (
          <Button variant="ghost" size="sm" onClick={() => run(true)} disabled={busy}>
            Show the full list
          </Button>
        )}
      </div>
    </div>
  );
}
