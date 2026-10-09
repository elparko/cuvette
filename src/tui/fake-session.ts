import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activity } from "../core/housekeeping.ts";
import { Bus } from "../core/bus.ts";
import { AnalysisRecord } from "../core/record.ts";
import type { Args, Fidelity, Finding, Mode, ModelInfo, Owner, Question } from "../core/types.ts";
import type { DecisionFieldLike, SessionLike } from "./types.ts";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export interface FakeOptions {
  delayMs?: number;
  mode?: Mode;
  dir?: string;
}

interface ToolOut {
  summary: string;
  route: string;
  fidelity?: Fidelity;
  images?: string[];
  deviations?: unknown[];
  error?: string;
  parents?: string[];
}

type Reply = { ok: boolean; value?: unknown };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function initialFields(): DecisionFieldLike[] {
  const f = (x: Partial<DecisionFieldLike> & { key: string; label: string; kind: string }): DecisionFieldLike => ({
    owner: "human",
    value: x.default,
    set: false,
    essential: false,
    ...x,
  });
  return [
    f({ key: "question", label: "What question are you asking?", kind: "text", essential: true, default: "", help: "One sentence. The agent checks its work against it." }),
    f({ key: "tolerance_ppm", label: "Mass tolerance (ppm)", kind: "number", essential: true, default: 5, lo: 1, hi: 50, help: "How far apart two peaks can be and still count as the same feature." }),
    f({ key: "normalization", label: "Normalization", kind: "choice", essential: true, default: "TIC", choices: [{ value: "TIC", label: "TIC (total ion current)" }, { value: "RMS", label: "RMS" }, { value: "median", label: "Median" }] }),
    f({ key: "min_auc", label: "Minimum AUC", kind: "number", essential: true, default: 0.7, lo: 0.5, hi: 1 }),
    f({ key: "alpha", label: "Significance level", kind: "number", default: 0.05, lo: 0, hi: 1, group: "Statistics" }),
    f({ key: "log_transform", label: "Log-transform intensities", kind: "bool", default: false, group: "Statistics" }),
    f({ key: "seed", label: "Random seed", kind: "number", default: 42, owner: "agent", group: "Advanced" }),
    f({ key: "bins", label: "Histogram bins", kind: "number", default: 30, owner: "agent", group: "Advanced" }),
  ];
}

export class FakeSession implements SessionLike {
  id = "20261008-101500-ab12";
  dir: string;
  workDir: string;
  mode: Mode;
  permissionMode: "ask" | "bypass" = "ask";
  busy = false;
  cwd: string;
  settings: Record<string, unknown> = { model: "fake:", referee: "same", effort: "high", mode: "watch" };
  model: ModelInfo = { provider: "fake", model: "fake-model", contextWindow: 200000, vision: true, small: false };
  adapterInfo = [
    { name: "smile-msi", title: "SMILE MSI", version: "0.1.0", programVersion: "2.4.0" },
    { name: "imagej", title: "ImageJ", version: "0.1.0", programVersion: "1.54f" },
  ];
  bus = new Bus();
  record: AnalysisRecord;
  interrupts = 0;
  sent: string[] = [];
  private fields = initialFields();
  private owners = new Map<string, Owner>();
  private qs: Question[] = [];
  private fs: Finding[] = [];
  private waiters = new Map<string, (v: Reply) => void>();
  private aborted = false;
  private delay: number;

  constructor(opts: FakeOptions = {}) {
    this.dir = opts.dir ?? mkdtempSync(join(tmpdir(), "ga-fake-"));
    this.cwd = this.dir;
    this.workDir = join(this.dir, "work");
    this.mode = opts.mode ?? "watch";
    this.delay = opts.delayMs ?? 250;
    this.record = new AnalysisRecord(this.dir, this.id);
    this.record.onAppend = (entry) => this.bus.emit({ type: "entry", entry });
    this.record.append("session", { adapters: this.adapterInfo, model: this.model.model, mode: this.mode, cwd: process.cwd() });
  }

  decisions = {
    fields: () => this.fields,
    applySetup: (values: Record<string, unknown>, opts?: { profile?: string; how?: string }) => {
      const defaultsAccepted: string[] = [];
      for (const f of this.fields) {
        const v = values[f.key] ?? f.default;
        if (JSON.stringify(v) === JSON.stringify(f.default)) defaultsAccepted.push(f.key);
        f.value = v;
        f.set = true;
      }
      this.record.append("setup", {
        values: Object.fromEntries(this.fields.map((f) => [f.key, f.value])),
        profile: opts?.profile,
        how: opts?.how,
        defaultsAccepted,
      });
    },
    value: (key: string) => this.fields.find((f) => f.key === key)?.value,
    owner: (key: string): Owner => this.owners.get(key) ?? this.fields.find((f) => f.key === key)?.owner ?? "human",
    values: () => Object.fromEntries(this.fields.map((f) => [f.key, f.value])),
  };

  questions = { open: () => this.qs.filter((q) => q.status === "open") };

  findings = {
    list: (status?: Finding["status"]) => this.fs.filter((f) => !status || f.status === status),
    resolve: (fid: string, action: "accept" | "reject" | "fix", reason?: string) => {
      const f = this.fs.find((x) => x.fid === fid);
      if (!f) return;
      f.status = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "fixed";
      this.record.append("finding_resolution", { fid, action, reason });
    },
  };

  private sleep(ms = this.delay) {
    return this.delay === 0 ? Promise.resolve() : wait(ms);
  }

  private status(state: "idle" | "thinking" | "running" | "waiting", tool?: string, args?: Args) {
    this.busy = state !== "idle";
    this.bus.emit({ type: "status", state, tool, purpose: state === "running" && tool ? activity(tool, args) : undefined, since: Date.now() });
  }

  private async stream(text: string) {
    for (const w of text.split(/(?<= )/)) {
      if (this.aborted) return;
      this.bus.emit({ type: "delta", kind: "text", text: w });
      await this.sleep(this.delay / 5);
    }
  }

  private async runTool(tool: string, args: Args, out: ToolOut) {
    const callId = `c${this.record.entries(["tool_call"]).length + 1}`;
    this.status("running", tool, args);
    this.record.append("tool_call", { callId, tool, adapter: "smile-msi", args });
    await this.sleep();
    if (this.aborted) return undefined;
    if (out.deviations) this.record.append("deviation", { callId, tool, deviations: out.deviations });
    let node: string | undefined;
    if (!out.error) {
      node = this.record.addNode({
        entry: this.record.entries().length,
        adapter: "smile-msi",
        adapterVersion: "0.1.0",
        programVersion: "2.4.0",
        tool,
        args,
        decisions: this.decisions.values(),
        codeHash: "0000",
        inputHashes: [],
        outputs: [],
        result: {},
        parents: out.parents ?? [],
        summary: out.summary,
        model: this.model.model,
        manualRoute: out.route,
        fidelity: out.fidelity ?? "exact",
      }).id;
    }
    this.record.append(
      "tool_result",
      {
        callId,
        tool,
        adapter: "smile-msi",
        ok: !out.error,
        error: out.error,
        summary: out.summary,
        images: out.images ?? [],
        files: [],
        durationS: 0.2,
        effectiveArgs: args,
        manualRoute: out.route,
        fidelity: out.fidelity ?? "exact",
      },
      { node },
    );
    this.record.append("usage", { inputTokens: 1200, outputTokens: 180, model: this.model.model });
    return node;
  }

  private async look(tool: string, args: Args, summary: string) {
    const callId = `c${this.record.entries(["tool_call"]).length + 1}`;
    this.status("running", tool, args);
    this.record.append("tool_call", { callId, tool, args });
    await this.sleep();
    this.record.append("tool_result", { callId, tool, ok: true, summary, effectiveArgs: args, fidelity: "none" });
  }

  private waitFor(id: string): Promise<Reply> {
    return new Promise((resolve) => this.waiters.set(id, resolve));
  }

  async send(text: string): Promise<string> {
    this.sent.push(text);
    this.aborted = false;
    this.record.append("user", { text });
    this.record.append("message", { message: { role: "user", parts: [{ type: "text", text }] } });
    this.status("thinking");
    await this.stream("I will load the data, normalize it, and compare endo with epi. ");
    if (this.aborted) return this.stopped();

    await this.look("list_dir", { path: "/data/msi" }, "3 entries in /data/msi.");
    await this.look("read_file", { path: "/data/msi/endo_epi.imzML" }, "Read 400 of 400 bytes.");
    await this.look("read_file", { path: "/data/msi/samples.csv" }, "Read 90 of 90 bytes.");
    if (this.aborted) return this.stopped();
    const n1 = await this.runTool("load_dataset", { path: "endo_epi.imzML" }, {
      summary: "Loaded 2 samples with 4812 spectra",
      route: "File > Open > endo_epi.imzML",
    });
    if (this.aborted) return this.stopped();
    const n2 = await this.runTool("normalize", { method: this.decisions.value("normalization"), log_transform: false }, {
      summary: `Normalized spectra with ${this.decisions.value("normalization")}`,
      route: "Preprocess > Normalization",
      fidelity: "close",
      parents: n1 ? [n1] : [],
    });
    if (this.aborted) return this.stopped();

    this.status("waiting");
    const rid = `r${Date.now()}`;
    const code = "import numpy as np\nscores = auc(spectra, labels)\nprint(scores.shape)";
    const permReply = this.waitFor(rid);
    this.bus.emit({ type: "permission", rid, tool: "run_script", args: { purpose: "AUC per feature", does: "Computes the AUC of each feature between endo and epi.", code }, code, touches: "a Python process in the session work folder" });
    const perm = await permReply;
    if (this.aborted) return this.stopped();
    this.record.append("permission", { rid, tool: "run_script", decision: perm.ok ? "allowed" : "denied", by: "human", note: perm.value });
    if (!perm.ok) {
      this.status("idle");
      this.record.append("assistant", { text: "I did not run the script. Tell me how you want to continue.", final: true });
      return "denied";
    }

    const q: Question = {
      qid: `q${this.qs.length + 1}`,
      session: this.id,
      decisionKey: "min_auc",
      title: "Which AUC cutoff do you want?",
      text: "The cutoff changes how many features pass. You own this choice.",
      options: [
        { value: 0.7, label: "0.7 (14 features)" },
        { value: 0.8, label: "0.8 (6 features)" },
      ],
      recommendation: { value: 0.7, reason: "0.7 is the cutoff in your lab profile." },
      evidence: "Cutoff  Features  Both normalizations\n0.7     14        9\n0.8     6         4",
      status: "open",
      created: new Date().toISOString(),
    };
    this.qs.push(q);
    this.record.append("sensitivity", { decisionKey: "min_auc", table: q.evidence, holds: ["4 features pass at every cutoff"], depends: ["10 features depend on the cutoff"] });
    this.record.append("blocked", { callId: "c3", tool: "find_features", reason: "min AUC is not set", qid: q.qid });
    this.record.append("question", q as unknown as Record<string, unknown>);
    const answerReply = this.waitFor(q.qid);
    this.bus.emit({ type: "question", question: q });
    this.status("waiting");
    const ans = await answerReply;
    if (this.aborted) return this.stopped();

    const step = this.record.entries(["tool_result"]).length + 1;
    if (this.mode === "follow") {
      this.status("waiting");
      const stepReply = this.waitFor(`step${step}`);
      this.bus.emit({ type: "instruction", step, tool: "find_features", text: `Analyze > Discriminating features. Group A = endo. Group B = epi. Tolerance 5 ppm. Minimum AUC ${String(ans.value)}.` });
      await stepReply;
      if (this.aborted) return this.stopped();
    }

    const sha = this.record.putBlob(PNG_1X1, ".png");
    await this.runTool("find_features", { group_a: "endo", group_b: "epi", tolerance_ppm: 10, min_auc: ans.value }, {
      summary: "Found 14 features different between endo and epi",
      route: "Analyze > Discriminating features",
      images: [sha],
      deviations: [{ arg: "tolerance_ppm", key: "tolerance_ppm", setup: 5, used: 10 }],
      parents: n2 ? [n2] : [],
    });
    await this.runTool("export_table", { path: "missing.csv" }, { summary: "", route: "File > Save as", error: "Folder is read-only", fidelity: "code_only" });
    const finalText = `14 features differ between endo and epi at AUC ${String(ans.value)}.`;
    await this.stream(finalText);
    this.record.append("assistant", { text: finalText, final: true });
    this.status("idle");
    return finalText;
  }

  private stopped(): string {
    this.record.append("notice", { text: "Stopped." });
    this.status("idle");
    return "";
  }

  interrupt(): void {
    this.interrupts++;
    this.aborted = true;
    for (const fn of this.waiters.values()) fn({ ok: false });
    this.waiters.clear();
  }

  respondPermission(rid: string, ok: boolean, note?: string, _always?: boolean): void {
    this.waiters.get(rid)?.({ ok, value: note });
    this.waiters.delete(rid);
  }

  async answer(qid: string, value: unknown, note?: string): Promise<void> {
    const q = this.qs.find((x) => x.qid === qid);
    if (!q || q.status !== "open") throw new Error(`No open question ${qid}`);
    q.status = "answered";
    q.answer = value;
    this.record.append("answer", { qid, value, note, by: "human" });
    this.waiters.get(qid)?.({ ok: true, value });
    this.waiters.delete(qid);
    this.status("running");
  }

  setDecision(key: string, value: unknown, reason?: string): string[] {
    const f = this.fields.find((x) => x.key === key);
    const old = f?.value;
    if (f) f.value = value;
    const stale = this.record.markStale(key, reason ?? "decision changed");
    this.record.append("decision", { key, old, new: value, by: "human", reason, staleNodes: stale });
    return stale;
  }

  setOwner(key: string, owner: Owner): void {
    const old = this.decisions.owner(key);
    this.owners.set(key, owner);
    this.record.append("owner_change", { key, old, new: owner, by: "human" });
  }

  setPermissionMode(m: "ask" | "bypass"): void {
    if (m === this.permissionMode) return;
    this.record.append("permission_mode", { old: this.permissionMode, new: m, how: `/permissions ${m}` });
    this.permissionMode = m;
  }

  setMode(mode: Mode): void {
    const old = this.mode;
    this.mode = mode;
    this.record.append("mode", { old, new: mode });
  }

  async followDone(step: number, note?: string, agentDoes?: boolean): Promise<void> {
    this.record.append("follow_step", { step, tool: "find_features", instruction: "", expected: {}, observed: {}, match: true, differences: [], note, agentDoes });
    this.waiters.get(`step${step}`)?.({ ok: true, value: note });
    this.waiters.delete(`step${step}`);
  }

  async review(): Promise<Finding[]> {
    const f: Finding = {
      fid: `f${this.fs.length + 1}`,
      check: "tolerance-matches-setup",
      severity: "warning",
      message: "Step 3 used tolerance 10 ppm. The setup says 5 ppm.",
      nodes: ["n3"],
      source: "rule",
      status: "open",
    };
    this.fs.push(f);
    this.record.append("finding", f as unknown as Record<string, unknown>);
    return [f];
  }

  async compact(): Promise<void> {
    this.record.append("compaction", { summary: "Earlier steps summarized.", upTo: this.record.entries().length });
  }

  async exportAs(fmt: string): Promise<string> {
    return join(this.dir, "exports", `trail.${fmt}`);
  }

  async close(): Promise<void> {}
}
