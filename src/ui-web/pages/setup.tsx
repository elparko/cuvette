import { InfoTip } from "../components/info-tip.tsx";
import { CheckIcon, CloudIcon, CpuIcon, KeyRoundIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppCtx } from "../App.tsx";
import { DoctorView } from "../components/doctor.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { Input } from "../components/ui/input.tsx";
import { call, post, type AppState } from "../lib/api.ts";
import { cn } from "../lib/utils.ts";
import { runSample } from "./start.tsx";

interface FirstStart {
  needed: boolean;
  hasKey: boolean;
  model: string;
  ollama: { reachable: boolean; models: string[]; recommended?: string };
  choices: { id: string; label: string; help: string }[];
  recommended: string;
  sample: string;
  keyGuide: { title: string; intro: string; steps: string[]; notes: string[] };
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex gap-4">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", done && "border-transparent bg-ok text-white")}>{done ? <CheckIcon className="size-4" /> : n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="mb-2 text-base font-semibold tracking-tight">{title}</h2>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function SetupPage({ ctx }: { ctx: AppCtx }) {
  const [fs, setFs] = useState<FirstStart | null>(null);
  const [choice, setChoice] = useState("");
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  const [model, setModel] = useState(ctx.state.model);
  const [done, setDone] = useState(false);
  const [starting, setStarting] = useState(false);
  const [folder, setFolder] = useState(ctx.state.folder);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    call<FirstStart>("api/firststart", {})
      .then(setFs)
      .catch((e: Error) => setMsg(e.message));
  }, []);

  const after = async () => {
    const s = await call<AppState>("api/state");
    setModel(s.model);
    setFolder(s.folder);
    setDone(true);
  };

  const saveKey = async () => {
    if (checking || !key.trim()) return;
    setChecking(true);
    setMsg("Checking the key…");
    try {
      const r = await call<{ text: string }>("api/firststart/claude", { key });
      setKey("");
      setMsg(r.text);
      await after();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setChecking(false);
  };

  const useLocal = async (m: string) => {
    try {
      const r = await call<{ ok: boolean; text: string }>("api/firststart/local", { model: m });
      setMsg(r.text);
      if (r.ok) await after();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const o = fs?.ollama;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10">
      <div className="mb-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to Cuvette</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Cuvette analyzes your data in the programs you already use. You make each method decision. Cuvette records each step and each number.</p>
      </div>

      <Step n={1} title="Choose the model that does the analysis" done={done}>
        <div className="grid gap-2 sm:grid-cols-2">
          {fs?.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={choice === c.id}
              onClick={() => {
                setChoice(c.id);
                setMsg("");
              }}
              className={cn("flex flex-col gap-1 rounded-xl border bg-card p-3.5 text-left transition-[border-color,box-shadow] outline-none hover:border-accent-brand/50 focus-visible:ring-[3px] focus-visible:ring-ring/40", choice === c.id && "border-accent-brand ring-[3px] ring-ring/20")}
            >
              <span className="flex items-center gap-2 font-medium">
                {c.id === "claude" ? <CloudIcon className="size-4" /> : <CpuIcon className="size-4" />}
                {c.label}
                <InfoTip label={`About ${c.label}`}>{c.help}</InfoTip>
              </span>
            </button>
          ))}
        </div>
        {choice === "claude" && (
          <div className="mt-4">
            <p className="mb-2 text-[13px] text-muted-foreground">Paste your key. The app checks it with Anthropic, then saves it in a file that only your user can read.</p>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[220px] flex-1">
                <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  autoFocus
                  autoComplete="off"
                  aria-label="Claude API key"
                  placeholder="sk-ant-..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                  className="pl-9 font-mono"
                />
              </div>
              <Button onClick={saveKey} disabled={checking || !key.trim()}>
                Save the key
              </Button>
            </div>
          </div>
        )}
        {choice === "claude" && fs && (
          <details className="mt-3 rounded-lg border bg-card px-3 py-2 text-[13px]">
            <summary className="cursor-pointer font-medium">How do I get a key?</summary>
            <p className="mt-2 text-muted-foreground">{fs.keyGuide.intro}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {fs.keyGuide.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {fs.keyGuide.notes.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <a className="mt-2 inline-block text-accent-brand underline" href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener noreferrer">
              Open the keys page
            </a>
          </details>
        )}
        {choice === "local" && o && fs && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-[13px] text-muted-foreground">
              {!o.reachable
                ? `Ollama does not run on this computer yet. Install it from ollama.com/download, start it, and get a model: ollama pull ${fs.recommended}. You can save the model name now.`
                : o.models.length
                  ? "Models in Ollama on this computer:"
                  : `Ollama runs, but it has no model. Get one: ollama pull ${fs.recommended}.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {o.models.map((m) => (
                <Button key={m} variant={m === o.recommended ? "default" : "outline"} size="sm" onClick={() => useLocal(m)}>
                  Use {m}
                  {m === o.recommended ? " (recommended)" : ""}
                </Button>
              ))}
              {!o.models.length && (
                <Button size="sm" onClick={() => useLocal(fs.recommended)}>
                  Save {fs.recommended}
                </Button>
              )}
            </div>
          </div>
        )}
        {msg && (
          <p className="mt-3 text-sm" role="alert">
            {msg}
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Model now: <span className="font-mono text-foreground">{model}</span>
        </p>
      </Step>

      {done && (
        <Step n={2} title="Check this computer">
          <DoctorView />
        </Step>
      )}

      {done && (
        <Step n={3} title="Run the sample analysis">
          <p className="mb-3 text-sm text-muted-foreground">
            The sample is a public data set: extra sleep of 10 patients with two drugs (Student, 1908). It takes about 2 minutes. The app copies it to <span className="font-mono text-foreground">{fs?.sample}</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={starting}
              onClick={async () => {
                setStarting(true);
                if (!(await runSample(ctx))) setStarting(false);
              }}
            >
              Run the sample analysis
            </Button>
            <Button
              variant="outline"
              disabled={starting}
              onClick={async () => {
                if (folder) {
                  setStarting(true);
                  if (await post("api/open", { folder })) ctx.opened();
                  else setStarting(false);
                } else ctx.go("start");
              }}
            >
              {folder ? `Analyze ${folder}` : "Open my own folder"}
            </Button>
          </div>
        </Step>
      )}
    </div>
  );
}
