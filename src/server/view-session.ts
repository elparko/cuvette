import { cpSync, existsSync, mkdirSync, mkdtempSync, symlinkSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { loadAdapter } from "../adapters/manifest.ts";
import { Bus } from "../core/bus.ts";
import { DecisionRecord } from "../core/decisions.ts";
import { readOldEnv } from "../core/old-names.ts";
import { AnalysisRecord } from "../core/record.ts";
import { findPlace, inProject } from "../core/places.ts";
import { QuestionQueue } from "../core/questions.ts";
import { startWindow, type WindowSession } from "./window.ts";

readOldEnv();
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) {
  console.error("Usage: tsx src/server/view-session.ts <session id> [--port N] [--ask]");
  process.exit(1);
}
const port = Number(args[args.indexOf("--port") + 1]) || 0;
const place = findPlace(id);
const source = place?.recordDir ?? join(process.env.CUVETTE_HOME || join(homedir(), ".cuvette"), "sessions", id);
if (!existsSync(join(source, "log.jsonl"))) {
  console.error(`No session ${id}.`);
  process.exit(1);
}

const home = mkdtempSync(join(tmpdir(), "cuvette-view-"));
process.env.CUVETTE_HOME = home;
const dir = join(home, "sessions", id);
mkdirSync(dir, { recursive: true });
cpSync(join(source, "log.jsonl"), join(dir, "log.jsonl"));
symlinkSync(join(source, "blobs"), join(dir, "blobs"));

const record = new AnalysisRecord(dir, id, place && inProject(place) ? { project: place.project } : {});
const first = record.entries(["session"])[0];
const adapters = ((first?.data.adapters ?? []) as { name: string; path?: string }[])
  .filter((a) => a.path && existsSync(a.path))
  .map((a) => loadAdapter(a.path!));
const decisions = new DecisionRecord(adapters, record);
const questions = new QuestionQueue(record);

if (args.includes("--ask")) {
  const key = decisions.fields().find((f) => f.set && f.owner === "human" && typeof f.value === "number");
  if (key) {
    const other = Number(key.value) * 2;
    await questions.ask({
      decisionKey: key.key,
      title: `Change ${key.label}?`,
      text: `The agent asks to change "${key.label}" from ${JSON.stringify(key.value)} to ${JSON.stringify(other)}. Reason: the recorded result is close to the cutoff.`,
      options: [{ value: other, label: `Change to ${JSON.stringify(other)}` }, { value: key.value, label: `Keep ${JSON.stringify(key.value)}` }],
      recommendation: { value: other, reason: "The recorded result is close to the cutoff." },
      evidence: "",
    });
  }
}

const session: WindowSession = {
  id,
  bus: new Bus(),
  record,
  decisions,
  questions,
  busy: false,
  mode: "watch",
  answer: async () => {},
  send: async () => "This window is read-only.",
  interrupt: () => {},
  respondPermission: () => {},
  followDone: async () => {},
  setMode: () => {},
};

const w = await startWindow(session, { port });
console.log(w.url);
