import { InfoTip } from "../components/info-tip.tsx";
import { CopyIcon, EllipsisIcon, LoaderCircleIcon, PlusIcon, RefreshCwIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppCtx } from "../App.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu.tsx";
import { Input } from "../components/ui/input.tsx";
import { call, copyText, withT } from "../lib/api.ts";
import { cn } from "../lib/utils.ts";

interface Action {
  action: string;
  label: string;
}
interface ProgramRow {
  name: string;
  program: string;
  state: string;
  tone: string;
  version: string;
  size: string;
  lastUse: string;
  origin: string;
  detail: string;
  warn: string;
  cite: string;
  off: boolean;
  path: string;
  tags: { text: string; tone: string; title?: string }[];
  actions: Action[];
}
interface Programs {
  summary: string;
  checking: boolean;
  groups: { title: string; rows: ProgramRow[] }[];
}
interface Plan {
  action: string;
  name: string;
  title: string;
  lines: string[];
  command?: string;
  link?: string;
  runs: boolean;
  confirm?: string;
  danger?: boolean;
  refused?: string;
  review?: string;
  installId?: string;
}
interface Run {
  name?: string;
  action?: string;
  path?: string;
  install?: string;
}

const TONE: Record<string, "ok" | "bad" | "warn" | "default"> = { ok: "ok", bad: "bad", warn: "warn", none: "default" };
const MAIN = new Set(["install", "update", "check"]);

function ProgramDialog({ open, setOpen, run, setRun, plan, setPlan, mode, onDone }: { open: boolean; setOpen: (o: boolean) => void; run: Run | null; setRun: (r: Run | null) => void; plan: Plan | null; setPlan: (p: Plan | null) => void; mode: "" | "path" | "add"; onDone: () => void }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ text: string; ok?: boolean } | null>(null);
  const [log, setLog] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stage, setStage] = useState(mode);
  const logRef = useRef<HTMLPreElement>(null);
  const gen = useRef(0);
  const live = (g: number) => g === gen.current;

  useEffect(() => {
    gen.current++;
    if (!open) return;
    setInput(mode === "path" ? (run?.path ?? "") : "");
    setResult(null);
    setLog(null);
    setBusy(false);
    setFinished(false);
    setStage(mode);
  }, [open, mode]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const close = (o: boolean) => {
    if (!o && run?.install) call("api/adapters/drop", { install: run.install }).catch(() => {});
    if (!o) setRun(null);
    setOpen(o);
  };

  const show = (p: Plan) => {
    setPlan(p);
    if (run && p.installId) setRun({ ...run, install: p.installId });
  };

  const checkPath = async () => {
    if (!run) return;
    const g = gen.current;
    setResult({ text: "Checking the path…" });
    try {
      const r = await call<{ plan: Plan }>("api/programs/plan", { ...run, path: input });
      if (!live(g)) return;
      setRun({ ...run, path: input });
      show(r.plan);
      setResult(null);
    } catch (e) {
      if (live(g)) setResult({ text: (e as Error).message, ok: false });
    }
  };

  const checkAdd = async () => {
    const g = gen.current;
    setResult({ text: "Fetching and checking the adapter…" });
    try {
      const r = await call<{ plan: Plan }>("api/adapters/plan", { source: input });
      if (!live(g)) {
        if (r.plan.installId) call("api/adapters/drop", { install: r.plan.installId }).catch(() => {});
        return;
      }
      const next = { action: r.plan.action, name: r.plan.name, install: r.plan.installId };
      setRun(next);
      setPlan(r.plan);
      setResult(null);
      setStage("");
    } catch (e) {
      if (live(g)) setResult({ text: (e as Error).message, ok: false });
    }
  };

  const review = async () => {
    if (!run?.install) return;
    const g = gen.current;
    setBusy(true);
    setResult({ text: "Claude is reading the files…" });
    try {
      const r = await call<{ plan: Plan }>("api/adapters/review", { install: run.install });
      if (!live(g)) return;
      show(r.plan);
      setResult(null);
    } catch (e) {
      if (live(g)) setResult({ text: (e as Error).message, ok: false });
    }
    if (live(g)) setBusy(false);
  };

  const finish = (r: { ok: boolean; text: string }, g: number) => {
    onDone();
    if (!live(g)) return;
    setResult({ text: r.text, ok: r.ok });
    setFinished(true);
    setBusy(false);
    if (run) setRun({ ...run, install: "" });
  };

  const confirm = async () => {
    if (!run) return;
    const g = gen.current;
    setBusy(true);
    setResult({ text: "Working…" });
    let r: { job?: string; ok: boolean; text: string };
    try {
      r = await call("api/programs/run", { ...run, confirmed: true });
    } catch (e) {
      if (!live(g)) return;
      setResult({ text: (e as Error).message, ok: false });
      setBusy(false);
      return;
    }
    if (!r.job) return finish(r, g);
    if (live(g)) setLog([]);
    const src = new EventSource(withT("api/programs/progress?job=" + r.job));
    src.onopen = () => live(g) && setLog([]);
    src.onerror = () => {
      if (src.readyState !== EventSource.CLOSED) return;
      finish({ ok: false, text: "The connection to the job stopped. The program list shows the result." }, g);
    };
    src.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.line !== undefined && live(g)) setLog((l) => [...(l ?? []), m.line]);
      if (m.done) {
        src.close();
        finish(m, g);
      }
    };
  };

  const can = !!plan && plan.runs && !plan.refused && !finished;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={cn(plan?.danger && "text-destructive")}>{plan?.title || (stage === "add" ? "Add an adapter" : "")}</DialogTitle>
          {stage === "add" && <DialogDescription>Give the address of a repository, a folder, a zip file, or the name of an adapter in the registry.</DialogDescription>}
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          {plan?.refused && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-bad-bg px-3 py-2 text-sm text-bad">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" /> {plan.refused}
            </p>
          )}
          {(stage === "path" || stage === "add") && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="proginput">
                {stage === "path" ? "Path of the program, or of the folder that holds it" : "Address or name"}
              </label>
              <div className="flex gap-2">
                <Input id="proginput" autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder={stage === "path" ? "~/Applications/Fiji.app" : "https://github.com/name/adapter.git"} className="font-mono text-[13px]" onKeyDown={(e) => e.key === "Enter" && (stage === "path" ? checkPath() : checkAdd())} spellCheck={false} />
                <Button variant="outline" onClick={stage === "path" ? checkPath : checkAdd}>
                  {stage === "path" ? "Check this path" : "Check the adapter"}
                </Button>
              </div>
            </div>
          )}
          {plan && plan.lines.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {plan.lines.map((l, i) => (
                <li key={i} className="break-words">
                  {l.trim()}
                </li>
              ))}
            </ul>
          )}
          {plan?.command && (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Command</div>
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 rounded-xl border bg-code px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap">{plan.command}</pre>
                <Button variant="outline" size="icon-sm" aria-label="Copy the command" onClick={() => copyText(plan.command!)}>
                  <CopyIcon />
                </Button>
              </div>
            </div>
          )}
          {plan?.link && (
            <p className="text-sm">
              Link:{" "}
              <a href={plan.link} target="_blank" rel="noopener" className="break-all">
                {plan.link}
              </a>{" "}
              <Button variant="link" size="sm" onClick={() => copyText(plan.link!)}>
                Copy
              </Button>
            </p>
          )}
          {log && (
            <pre ref={logRef} aria-live="polite" className="max-h-56 overflow-y-auto rounded-xl border bg-code px-3 py-2 font-mono text-xs whitespace-pre-wrap">
              {log.join("\n")}
            </pre>
          )}
          {result && (
            <p role="status" className={cn("flex items-center gap-2 text-sm", result.ok === true && "text-ok", result.ok === false && "text-bad")}>
              {busy && <LoaderCircleIcon className="size-4 animate-spin" />}
              {result.text}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            {can ? "Cancel" : "Close"}
          </Button>
          {plan?.review && !finished && (
            <Button variant="outline" onClick={review} disabled={busy}>
              {plan.review}
            </Button>
          )}
          {can && (
            <Button variant={plan!.danger ? "destructive" : "default"} onClick={confirm} disabled={busy}>
              {plan!.confirm || "Run"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProgramsPage({ ctx }: { ctx: AppCtx }) {
  const [data, setData] = useState<Programs | null>(null);
  const [err, setErr] = useState("");
  const [checking, setChecking] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [mode, setMode] = useState<"" | "path" | "add">("");
  const [q, setQ] = useState("");
  const startRef = useRef(ctx.programStart);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) {
      try {
        setData(await call<Programs>("api/programs.json?quick=1"));
      } catch (e) {
        setErr((e as Error).message);
        return;
      }
    }
    try {
      setData(await call<Programs>("api/programs.json"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data || !startRef.current) return;
    const el = document.querySelector<HTMLElement>(`[data-prog="${CSS.escape(startRef.current)}"]`);
    startRef.current = "";
    ctx.setProgramStart("");
    if (el) {
      el.scrollIntoView({ block: "center" });
      el.querySelector("button")?.focus();
    }
  }, [data, ctx]);

  const act = async (r: ProgramRow, action: string) => {
    setPlan(null);
    if (action === "check") {
      setChecking(r.name);
      try {
        const res = await call<{ text: string }>("api/programs/run", { name: r.name, action: "check" });
        toast(res.text);
      } catch (e) {
        toast.error((e as Error).message);
      }
      await load(true);
      setChecking("");
      return;
    }
    if (action === "path") {
      setRun({ name: r.name, action, path: r.path });
      setPlan({ action, name: r.name, title: `Set path: ${r.program} (${r.name})`, lines: [], runs: false });
      setMode("path");
      setOpen(true);
      return;
    }
    let res: { plan: Plan };
    try {
      res = await call("api/programs/plan", { name: r.name, action });
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    setRun({ name: r.name, action });
    setPlan(res.plan);
    setMode("");
    setOpen(true);
  };

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = data?.groups.map((g) => ({ ...g, rows: g.rows.filter((r) => words.every((w) => `${g.title} ${r.program} ${r.name} ${r.state} ${r.detail}`.toLowerCase().includes(w))) })).filter((g) => g.rows.length);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Programs</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setRun({});
              setPlan(null);
              setMode("add");
              setOpen(true);
            }}
          >
            <PlusIcon /> Add an adapter
          </Button>
          <Button variant="outline" onClick={() => load()}>
            <RefreshCwIcon /> Check all again
          </Button>
        </div>
      </div>
      <p className="mb-6 max-w-3xl text-sm text-muted-foreground">The programs that the adapters use, grouped by field. The same list as /programs in the terminal and cuvette programs. Each change asks first and shows what it does. It goes in the programs log and in the session record.</p>
      {err && <p className="text-sm text-bad">{err}</p>}
      {!data && !err && <p className="text-muted-foreground">Looking for the programs…</p>}
      {data && (
        <>
          <p className="mb-4 flex items-center gap-2 text-[13px] text-muted-foreground">
            {data.checking && <LoaderCircleIcon className="size-3.5 animate-spin" />}
            {data.summary}
          </p>
          <div className="relative mb-5 max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search programs, adapters and fields" aria-label="Search programs" className="pl-9" />
          </div>
          {shown!.map((g) => (
            <section key={g.title} className="mb-6">
              <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.title}</h2>
              <Card className="divide-y overflow-hidden">
                {g.rows.map((r) => {
                  const main = r.actions.filter((a) => MAIN.has(a.action));
                  const more = r.actions.filter((a) => !MAIN.has(a.action));
                  return (
                    <div key={r.name} data-prog={r.name} className={cn("flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-start sm:gap-4", r.off && "opacity-70")}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium">{r.program}</span>
                          <span className="text-xs text-muted-foreground">{r.name}</span>
                          <Badge tone={TONE[r.tone] ?? "default"}>{r.state}</Badge>
                          {r.tags.map((t) => (
                            <Badge key={t.text} tone={t.tone === "warn" ? "warn" : "default"} title={t.title}>
                              {t.text}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
                          {[r.version, r.size, `last use: ${r.lastUse}`, r.origin].filter(Boolean).map((x, i) => (
                            <span key={i} title={x} className="max-w-[24rem] truncate">
                              {i > 0 && "· "}
                              {x}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 text-[13px] break-words">{checking === r.name ? "Checking…" : r.detail}</p>
                        {r.warn && <p className="mt-1 text-[13px] text-warn">{r.warn}</p>}
                        {r.cite && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            How to cite
                            <InfoTip label="How to cite">{r.cite}</InfoTip>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:pt-0">
                        {main.map((a) => (
                          <Button key={a.action} size="sm" variant={a.action === "install" ? "default" : a.action === "check" ? "ghost" : "outline"} disabled={checking === r.name} onClick={() => act(r, a.action)}>
                            {a.label}
                          </Button>
                        ))}
                        {more.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${r.program}`}>
                                <EllipsisIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {more.map((a) => (
                                <DropdownMenuItem key={a.action} destructive={a.action === "remove"} onSelect={() => act(r, a.action)}>
                                  {a.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
          {!data.groups.length && <p className="text-muted-foreground">No adapters.</p>}
          {data.groups.length > 0 && !shown!.length && <p className="text-muted-foreground">No program matches the search.</p>}
        </>
      )}
      <ProgramDialog open={open} setOpen={setOpen} run={run} setRun={setRun} plan={plan} setPlan={setPlan} mode={mode} onDone={() => load(true)} />
    </div>
  );
}
