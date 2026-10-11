import { ArrowUpIcon, ChevronRightIcon, FolderIcon, LockIcon, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppCtx } from "../App.tsx";
import { DoctorView } from "../components/doctor.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog.tsx";
import { Input } from "../components/ui/input.tsx";
import { Select } from "../components/ui/select.tsx";
import { Switch } from "../components/ui/switch.tsx";
import { bridge, call } from "../lib/api.ts";
import { cn } from "../lib/utils.ts";

interface Row {
  name: string;
  label: string;
  group: string;
  control: "toggle" | "segmented" | "options" | "select" | "number" | "text" | "path" | "secret" | "card" | "info";
  value: string;
  source: string;
  badge: { text: string; file?: string };
  brief: string;
  more: string;
  details: string[];
  choices: { value: string; label: string; note: string }[];
  free: boolean;
  min: number;
  unit: string;
  locked: boolean;
  lock: string;
  scopes: { id: string; label: string }[];
  reset: boolean;
  secret: string;
  edit: string;
  spend: { pct: number | null; text: string } | null;
}
interface Settings {
  sections: string[];
  rows: Row[];
}

const remembered = (name: string) => {
  try {
    return localStorage.getItem("cuvette.scope." + name) ?? "";
  } catch {
    return "";
  }
};
const remember = (name: string, scope: string) => {
  try {
    localStorage.setItem("cuvette.scope." + name, scope);
  } catch {}
};

function PathDialog({ start, onDone }: { start: string; onDone: (p: string) => void }) {
  const [d, setD] = useState<{ path: string; parent: string | null; dirs: string[] } | null>(null);
  const [msg, setMsg] = useState("");
  const list = useCallback(async (p: string) => {
    try {
      setD(await call("api/dirs?p=" + encodeURIComponent(p)));
      setMsg("");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void list(start.startsWith("/") ? start : "");
  }, [list, start]);
  return (
    <Dialog open onOpenChange={(o) => !o && onDone("")}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a folder</DialogTitle>
          <p className="font-mono text-xs break-all text-muted-foreground">{d?.path}</p>
        </DialogHeader>
        <ul className="max-h-[50vh] overflow-y-auto rounded-xl border p-1">
          {d?.parent && (
            <li>
              <button type="button" onClick={() => list(d.parent!)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted">
                <ArrowUpIcon className="size-4 text-muted-foreground" /> Up one folder
              </button>
            </li>
          )}
          {d?.dirs.map((n) => (
            <li key={n}>
              <button type="button" onClick={() => list(d.path.replace(/\/$/, "") + "/" + n)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted">
                <FolderIcon className="size-4 text-muted-foreground" /> {n}
              </button>
            </li>
          ))}
        </ul>
        {msg && <p className="text-sm text-bad">{msg}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onDone("")}>
            Cancel
          </Button>
          <Button onClick={() => onDone(d?.path ?? "")}>Use this folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({ r, ctx, reload, saved, setSaved }: { r: Row; ctx: AppCtx; reload: () => Promise<void>; saved?: { text: string; ok: boolean }; setSaved: (name: string, v?: { text: string; ok: boolean }) => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState(r.value === "not set" ? "" : r.value);
  const [other, setOther] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [sure, setSure] = useState(false);
  const [picking, setPicking] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const id = `sl-${r.name}`;
  const dis = r.locked;

  useEffect(() => {
    setDraft(r.value === "not set" ? "" : r.value);
    setPending(null);
    setOther(false);
  }, [r.value]);

  const ask = (v: string) => {
    setPending(v);
    setSaved(r.name, undefined);
  };

  const finish = async (path: string, body: Record<string, unknown>, key = "") => {
    let next: { text: string; ok: boolean };
    try {
      const res = await call<{ text: string; confirm?: boolean }>(path, body);
      next = { text: res.text, ok: !res.confirm };
      setConfirm(res.confirm ? key : "");
    } catch (e) {
      next = { text: (e as Error).message, ok: false };
    }
    setSaved(r.name, next);
    if (next.ok) setPending(null);
    await reload();
    if (!ctx.state.session) ctx.boot();
  };

  const save = (scope: string) => {
    if (pending === null) return;
    remember(r.name, scope);
    const key = `${r.name}=${pending}=${scope}`;
    void finish("api/setting", { name: r.name, value: pending, scope, confirm: confirm === key }, key);
  };

  const edit = async () => {
    if (r.edit === "programs") return ctx.go("programs");
    if (!ctx.state.session) {
      if (r.edit === "key") return ctx.go("setup");
      return toast("Open a session first.");
    }
    await call("api/send", { text: r.edit === "key" ? "/key" : "/eln setup" }).catch((e: Error) => toast.error(e.message));
    ctx.go("session");
  };

  const shown = pending ?? r.value;
  let control: React.ReactNode;
  switch (r.control) {
    case "toggle":
      control = (
        <label className="inline-flex items-center gap-2.5 text-sm">
          <Switch checked={shown === "on"} disabled={dis} aria-labelledby={id} onCheckedChange={(on) => ask(on ? "on" : "off")} />
          {shown === "on" ? "On" : "Off"}
        </label>
      );
      break;
    case "segmented":
      control = (
        <div role="radiogroup" aria-labelledby={id} className="inline-flex flex-wrap rounded-lg bg-muted p-[3px]">
          {r.choices.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={c.value === shown}
              disabled={dis}
              onClick={() => ask(c.value)}
              className={cn("h-7 rounded-md px-3 text-[13px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40", c.value === shown && "bg-card font-medium text-foreground shadow-sm")}
            >
              {c.label}
            </button>
          ))}
        </div>
      );
      break;
    case "options":
      control = (
        <div className="flex w-full max-w-xl flex-col gap-2">
          <div role="radiogroup" aria-labelledby={id} className="flex flex-col overflow-hidden rounded-xl border">
            {r.choices.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={c.value === shown}
                disabled={dis}
                onClick={() => ask(c.value)}
                className={cn("flex items-center gap-3 border-b px-3 py-2 text-left text-sm transition-colors outline-none last:border-b-0 hover:bg-muted focus-visible:bg-muted", c.value === shown && "bg-muted")}
              >
                <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", c.value === shown && "border-accent-brand")}>{c.value === shown && <span className="size-2 rounded-full bg-accent-brand" />}</span>
                <span className={cn("flex-1", c.value === shown && "font-medium")}>{c.label}</span>
                {c.note && <span className="text-xs text-muted-foreground tabular-nums">{c.note}</span>}
              </button>
            ))}
          </div>
          {r.free && <Input placeholder="Other model, for example ollama:qwen3:8b" aria-label={`Other value for ${r.label}`} disabled={dis} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.value.trim() ? ask(e.currentTarget.value.trim()) : undefined)} onBlur={(e) => e.currentTarget.value.trim() && ask(e.currentTarget.value.trim())} />}
        </div>
      );
      break;
    case "select":
      control = (
        <div className="flex flex-wrap gap-2">
          <Select
            value={other ? "__other" : shown}
            label={r.label}
            disabled={dis}
            className="min-w-[200px]"
            onValueChange={(v) => {
              if (v === "__other") return setOther(true);
              setOther(false);
              ask(v);
            }}
            options={[...r.choices.map((c) => ({ value: c.value, label: c.label })), ...(r.free ? [{ value: "__other", label: "Other…" }] : [])]}
          />
          {other && <Input autoFocus placeholder="Type a value" aria-label={`Other value for ${r.label}`} className="w-60" onKeyDown={(e) => e.key === "Enter" && e.currentTarget.value.trim() && ask(e.currentTarget.value.trim())} onBlur={(e) => e.currentTarget.value.trim() && ask(e.currentTarget.value.trim())} />}
        </div>
      );
      break;
    case "number": {
      const env = r.source === "env";
      const m = /^\$?([\d.]+)$/.exec(r.value);
      const num = m ? String(Number(m[1])) : "";
      control = (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min={r.min}
              defaultValue={num}
              key={num}
              placeholder="No limit"
              aria-labelledby={id}
              disabled={env || dis}
              className="w-36"
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              onBlur={(e) => e.currentTarget.value.trim() !== num && ask(e.currentTarget.value.trim() || "off")}
            />
            <span className="text-[13px] text-muted-foreground">{r.unit}</span>
          </div>
          {num && !env && (
            <Button variant="ghost" size="sm" disabled={dis} onClick={() => ask("off")}>
              No limit
            </Button>
          )}
          {env && <span className="text-xs text-muted-foreground">CUVETTE_BUDGET_USD in the shell sets this limit.</span>}
        </div>
      );
      break;
    }
    case "path":
      control = (
        <div className="flex w-full max-w-xl gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-labelledby={id} spellCheck={false} disabled={dis} className="font-mono text-[13px]" onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} onBlur={() => draft.trim() && draft.trim() !== r.value && ask(draft.trim())} />
          <Button
            variant="outline"
            disabled={dis}
            onClick={async () => {
              if (bridge.chooseFolder) {
                const f = await bridge.chooseFolder(draft).catch((e: Error) => (toast.error(e.message), null));
                if (f) {
                  setDraft(f);
                  ask(f);
                }
              } else setPicking(true);
            }}
          >
            Choose…
          </Button>
          {picking && (
            <PathDialog
              start={draft}
              onDone={(p) => {
                setPicking(false);
                if (p) {
                  setDraft(p);
                  ask(p);
                }
              }}
            />
          )}
        </div>
      );
      break;
    case "text":
      control = <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-labelledby={id} spellCheck={false} disabled={dis} className="max-w-md" onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} onBlur={() => draft.trim() !== (r.value === "not set" ? "" : r.value) && draft.trim() && ask(draft.trim())} />;
      break;
    case "secret":
      control = (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={r.secret === "not set" ? "default" : "ok"}>{r.secret}</Badge>
          <Button variant="outline" size="sm" onClick={edit}>
            Change
          </Button>
          {r.secret === "saved" && (
            <Button
              variant={sure ? "destructive" : "ghost"}
              size="sm"
              onClick={() => {
                if (!sure) return setSure(true);
                setSure(false);
                void finish("api/setting/remove", { name: r.name });
              }}
            >
              {sure ? "Click again to remove" : "Remove"}
            </Button>
          )}
        </div>
      );
      break;
    case "card":
      control = (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px]">{r.value}</span>
          <Button variant="outline" size="sm" onClick={edit}>
            Change
          </Button>
        </div>
      );
      break;
    default:
      control = r.spend ? (
        <div className="flex w-full max-w-md flex-col gap-1.5">
          {r.spend.pct !== null && (
            <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.spend.pct} aria-labelledby={id} className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", r.spend.pct >= 100 ? "bg-bad" : "bg-accent-brand")} style={{ width: `${r.spend.pct}%` }} />
            </div>
          )}
          <span className="text-sm tabular-nums">{r.spend.text}</span>
        </div>
      ) : (
        <span className="font-mono text-[13px] break-all">{r.value}</span>
      );
  }

  const mem = remembered(r.name);
  const pick = r.scopes.find((s) => s.id === mem)?.id ?? r.scopes[0]?.id;
  const scopesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pending !== null) scopesRef.current?.querySelector<HTMLButtonElement>("[data-primary]")?.focus();
  }, [pending]);

  return (
    <div data-setting={r.name} className="border-t py-4 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span id={id} className="font-medium">
          {r.label}
        </span>
        {r.badge.text && (
          <Badge title={r.badge.file} tone={r.source === "default" || r.source === "env" ? "default" : "info"}>
            {r.badge.text}
            {r.badge.file && r.source === "project" ? ` · ${r.badge.file}` : ""}
          </Badge>
        )}
      </div>
      <div className={cn("mt-2 mb-1.5 flex flex-wrap items-center gap-2", r.locked && "opacity-55")}>{control}</div>
      <p className="text-[13px] text-muted-foreground">{r.brief}</p>
      {(r.more || r.details.length > 0) && (
        <div className="mt-1">
          <button type="button" onClick={() => setMoreOpen(!moreOpen)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" aria-expanded={moreOpen}>
            <ChevronRightIcon className={cn("size-3 transition-transform", moreOpen && "rotate-90")} /> More
          </button>
          {moreOpen && (
            <div className="mt-1 pl-4 text-[13px] text-muted-foreground">
              {r.more && <p>{r.more}</p>}
              {r.details.length > 0 && (
                <ul className="mt-1 list-disc pl-4 font-mono text-xs">
                  {r.details.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {r.locked && (
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-warn">
          <LockIcon className="size-3.5" /> {r.lock}
        </p>
      )}
      {r.reset && pending === null && (
        <Button variant="link" size="sm" className="mt-1 text-xs text-muted-foreground" onClick={() => finish("api/setting/reset", { name: r.name })}>
          Reset to default
        </Button>
      )}
      {pending !== null && r.scopes.length > 0 && (
        <div
          ref={scopesRef}
          role="group"
          aria-label="Save for"
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted px-3 py-2"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setPending(null);
            }
          }}
        >
          <span className="text-[13px] font-medium">Save for:</span>
          {r.scopes.map((s) => (
            <Button key={s.id} size="sm" variant={s.id === pick ? "default" : "outline"} data-scope={s.id} data-primary={s.id === pick ? "" : undefined} onClick={() => save(s.id)}>
              {s.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
            Cancel
          </Button>
        </div>
      )}
      {saved && (
        <p role="status" className={cn("mt-2 text-[13px]", saved.ok ? "text-ok" : confirm ? "text-warn" : "text-bad")}>
          {saved.ok ? "✓ " : ""}
          {saved.text}
        </p>
      )}
    </div>
  );
}

export function SettingsPanel({ ctx }: { ctx: AppCtx }) {
  const [data, setData] = useState<Settings | null>(null);
  const [err, setErr] = useState("");
  const [sec, setSec] = useState("");
  const [q, setQ] = useState("");
  const [saved, setSavedMap] = useState<Record<string, { text: string; ok: boolean } | undefined>>({});

  const reload = useCallback(async () => {
    try {
      setData(await call<Settings>("api/settings.json"));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);

  const setSaved = useCallback((name: string, v?: { text: string; ok: boolean }) => {
    setSavedMap((m) => ({ ...m, [name]: v }));
    if (v) setTimeout(() => setSavedMap((m) => (m[name] === v ? { ...m, [name]: undefined } : m)), 8000);
  }, []);

  if (err) return <p className="text-sm text-bad">{err}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const current = data.sections.includes(sec) ? sec : data.sections[0]!;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const match = (r: Row) => words.every((w) => `${r.label} ${r.brief} ${r.more}`.toLowerCase().includes(w));
  const count = (s: string) => data.rows.filter((r) => r.group === s && match(r)).length;
  const shownSecs = words.length ? data.sections.filter((s) => count(s) > 0) : [current];

  return (
    <div className="grid gap-6 md:grid-cols-[190px_minmax(0,1fr)]">
      <div className="flex flex-col gap-3 md:sticky md:top-0 md:self-start">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search the settings" autoComplete="off" className="pl-9" />
        </div>
        <nav aria-label="Setting sections" className="flex flex-row flex-wrap gap-0.5 md:flex-col">
          {data.sections.map((s) => (
            <button
              key={s}
              type="button"
              disabled={words.length > 0 && count(s) === 0}
              aria-current={!words.length && s === current ? "true" : undefined}
              onClick={() => {
                setSec(s);
                setQ("");
              }}
              className={cn("flex h-8 items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13.5px] text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-40", !words.length && s === current && "bg-card font-medium text-foreground shadow-card")}
            >
              <span>{s}</span>
              {words.length > 0 && <span className="text-xs tabular-nums">{count(s)}</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="min-w-0">
        {shownSecs.map((s) => (
          <Card key={s} className="mb-4">
            <CardContent className="py-2">
              <h3 className="pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{s}</h3>
              {data.rows
                .filter((r) => r.group === s && match(r))
                .map((r) => (
                  <SettingRow key={r.name} r={r} ctx={ctx} reload={reload} saved={saved[r.name]} setSaved={setSaved} />
                ))}
            </CardContent>
          </Card>
        ))}
        {!shownSecs.length && <p className="text-sm text-muted-foreground">No setting matches the search.</p>}
      </div>
    </div>
  );
}

export function SettingsPage({ ctx }: { ctx: AppCtx }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">The same settings as /config in the terminal. Each change goes in the record.</p>
      <SettingsPanel ctx={ctx} />
      <Card className="mt-8">
        <CardContent>
          <h2 className="text-base font-semibold tracking-tight">Programs on this computer</h2>
          <p className="mb-3 text-sm text-muted-foreground">The same check as cuvette doctor in the terminal.</p>
          <DoctorView auto={false} />
        </CardContent>
      </Card>
    </div>
  );
}
