import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { gaHome } from "../adapters/manifest.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Question } from "./types.ts";

function indexPath(): string {
  return join(gaHome(), "questions.json");
}

function readIndex(): Question[] {
  try {
    return JSON.parse(readFileSync(indexPath(), "utf8"));
  } catch {
    return [];
  }
}

function upsert(q: Question): void {
  const all = readIndex();
  const i = all.findIndex((x) => x.session === q.session && x.qid === q.qid);
  if (i >= 0) all[i] = q;
  else all.push(q);
  mkdirSync(gaHome(), { recursive: true });
  const tmp = `${indexPath()}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(all, null, 2));
  renameSync(tmp, indexPath());
}

export function allOpenQuestions(): Question[] {
  if (!existsSync(indexPath())) return [];
  return readIndex()
    .filter((q) => q.status === "open")
    .sort((a, b) => a.created.localeCompare(b.created));
}

export class QuestionQueue {
  private questions = new Map<string, Question>();
  private waiters = new Map<string, ((q: Question) => void)[]>();
  private counter = 0;
  private session: string;

  constructor(private record: AnalysisRecord, private opts: { notify?: (q: Question) => Promise<void> } = {}) {
    this.session = record.sessionId;
    for (const e of record.entries(["question", "answer"])) {
      const d = e.data as any;
      if (e.kind === "question") {
        const q = { ...d } as Question;
        this.questions.set(q.qid, q);
        this.counter = Math.max(this.counter, Number(/^q(\d+)$/.exec(q.qid)?.[1] ?? 0));
        this.session = q.session;
      } else {
        const q = this.questions.get(d.qid);
        if (!q) continue;
        q.answer = d.value;
        q.answered = e.ts;
        q.status = d.by === "timeout" ? "timed_out" : d.by === "timeout-default" ? "defaulted" : "answered";
      }
    }
  }

  async ask(spec: Omit<Question, "qid" | "session" | "status" | "created">): Promise<Question> {
    const q: Question = {
      ...spec,
      qid: `q${++this.counter}`,
      session: this.session,
      status: "open",
      created: new Date().toISOString(),
    };
    this.questions.set(q.qid, q);
    this.record.append("question", { ...q });
    upsert(q);
    if (this.opts.notify)
      void this.opts.notify(q).catch((err) => {
        this.record.append("notice", { text: `Could not send the notice for question ${q.qid}: ${(err as Error).message}` });
      });
    return q;
  }

  answer(qid: string, value: unknown, note?: string, by = "human"): Question {
    const q = this.questions.get(qid);
    if (!q) throw new Error(`No question ${qid}.`);
    if (q.status !== "open") throw new Error(`Question ${qid} is already closed (${q.status}).`);
    let chosen = value;
    if (q.options.length) {
      const text = String(value).trim().toLowerCase();
      const hit =
        q.options.find((o) => o.value === value) ??
        q.options.find((o) => String(o.value).toLowerCase() === text) ??
        q.options.find((o) => o.label.trim().toLowerCase() === text);
      if (!hit && q.decisionKey) throw new Error(`Answer must be one of: ${q.options.map((o) => o.label).join(", ")}.`);
      chosen = hit ? hit.value : value;
    }
    q.status = "answered";
    q.answer = chosen;
    q.answered = new Date().toISOString();
    this.record.append("answer", { qid, value: chosen, note: note ?? "", by });
    upsert(q);
    this.release(q);
    return q;
  }

  get(qid: string): Question | undefined {
    return this.questions.get(qid);
  }

  open(): Question[] {
    return [...this.questions.values()].filter((q) => q.status === "open");
  }

  expire(now = Date.now()): Question[] {
    const closed: Question[] = [];
    for (const q of this.open()) {
      if (q.timeoutS === undefined || Date.parse(q.created) + q.timeoutS * 1000 > now) continue;
      q.answered = new Date(now).toISOString();
      if (q.useDefaultOnTimeout && q.default !== undefined) {
        q.status = "defaulted";
        q.answer = q.default;
        this.record.append("answer", { qid: q.qid, value: q.default, note: "", by: "timeout-default" });
      } else {
        q.status = "timed_out";
        this.record.append("answer", { qid: q.qid, value: null, note: "", by: "timeout" });
      }
      upsert(q);
      this.release(q);
      closed.push(q);
    }
    return closed;
  }

  wait(qid: string, timeoutMs?: number): Promise<Question> {
    const q = this.questions.get(qid);
    if (!q) return Promise.reject(new Error(`No question ${qid}.`));
    if (q.status !== "open") return Promise.resolve(q);
    return new Promise((resolve) => {
      let timer: NodeJS.Timeout | undefined;
      const done = (x: Question) => {
        if (timer) clearTimeout(timer);
        resolve(x);
      };
      this.waiters.set(qid, [...(this.waiters.get(qid) ?? []), done]);
      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          this.waiters.set(qid, (this.waiters.get(qid) ?? []).filter((w) => w !== done));
          resolve(q);
        }, timeoutMs);
      }
    });
  }

  private release(q: Question): void {
    for (const w of this.waiters.get(q.qid) ?? []) w(q);
    this.waiters.delete(q.qid);
  }
}
