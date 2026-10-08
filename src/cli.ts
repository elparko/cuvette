import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { adapterDirs, gaHome, loadAdapter } from "./adapters/manifest.ts";
import { fitAnswer } from "./core/answers.ts";
import type { Mode } from "./core/types.ts";

const HELP = `ga - a guided analysis agent for science programs

Usage
  ga [--adapter imagej] [--model claude|ollama:qwen3:8b] [--referee <model>] [--mode watch|follow|teach|plan] [--resume <id>]
  ga -p "<request>" --adapter imagej --model <model> [--setup setup.json] [--answers answers.json] [--allow tool,tool|all] [--output text|json|stream-json]
  ga adapters                          list the adapters
  ga adapter check <name|dir> [--run-tests]
  ga adapter approve <name|dir> --by <name>
  ga onboard <program> --model <model> [--docs <url>] [--kind cli]
  ga models                            list the models
  ga sessions                          list the sessions
  ga export <session> --format html|md|jsonl|pdf|protocol|script|notebook|flow
  ga replay <flow.json> [--input name=path ...] [--session <id>]
  ga run-step <adapter> <tool> '<json args>'
  ga questions                         open questions in every session
  ga bench [scenario|all] --model <model> [--guidance on|off|both]
  ga mcp                               run the harness as an MCP server on stdio

Models: "claude" (claude-opus-5-5), "claude:<model id>", "ollama:<model>", "openai:<base url>|<model>".`;

const argv = process.argv.slice(2);
const { values: o, positionals: pos } = parseArgs({
  args: argv,
  allowPositionals: true,
  strict: false,
  options: {
    adapter: { type: "string", multiple: true, short: "a" },
    model: { type: "string", short: "m" },
    referee: { type: "string" },
    mode: { type: "string" },
    resume: { type: "string", short: "r" },
    print: { type: "string", short: "p" },
    setup: { type: "string" },
    answers: { type: "string" },
    allow: { type: "string" },
    output: { type: "string" },
    format: { type: "string" },
    input: { type: "string", multiple: true },
    session: { type: "string" },
    by: { type: "string" },
    docs: { type: "string", multiple: true },
    kind: { type: "string" },
    guidance: { type: "string" },
    "run-tests": { type: "boolean" },
    generic: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const readJson = (p?: string) => (p ? JSON.parse(readFileSync(p, "utf8")) : undefined);

async function headless(prompt: string) {
  const { Session } = await import("./core/session.ts");
  const answers = (readJson(str(o.answers)) ?? {}) as Record<string, unknown>;
  const allow = new Set((str(o.allow) ?? "").split(",").filter(Boolean));
  const out = str(o.output) ?? "text";
  const s = await Session.create({ adapters: (o.adapter as string[]) ?? [], model: str(o.model), referee: str(o.referee), mode: str(o.mode) as Mode, generic: !!o.generic, settings: { headless: true } });
  s.bus.on((e) => {
    if (out === "stream-json") process.stdout.write(JSON.stringify(e) + "\n");
    if (e.type === "question") {
      const q = e.question;
      const wanted = q.decisionKey && q.decisionKey in answers ? answers[q.decisionKey] : q.title in answers ? answers[q.title] : "*" in answers ? answers["*"] : q.recommendation?.value;
      const fallback = "The scientist is not available. Use your recommendation and state it as an assumption.";
      const v = q.decisionKey ? (q.options.length ? fitAnswer(q, wanted) : wanted) : wanted ?? fallback;
      if (v === undefined) return;
      const note = wanted === undefined ? "no answer in the answers file; the harness used the recommendation or the first option" : "answered from the answers file";
      setTimeout(() => s.answer(q.qid, v, note).catch((err) => console.error(String(err))), 0);
    }
    if (e.type === "permission") s.respondPermission(e.rid, allow.has("all") || allow.has(e.tool), allow.size ? "" : "headless mode denies by default; pass --allow");
    if (e.type === "instruction") s.followDone(e.step, "", true);
    if (out !== "stream-json" && e.type === "entry" && (e.entry.kind === "error" || e.entry.kind === "notice")) process.stderr.write(`${e.entry.kind === "error" ? "Error" : "Note"}: ${e.entry.data.message ?? e.entry.data.text}\n`);
    if (out === "text" && e.type === "entry" && e.entry.kind === "tool_result") process.stderr.write(`  ${e.entry.data.ok ? "●" : "✗"} ${e.entry.data.summary ?? e.entry.data.error ?? e.entry.data.tool}\n`);
  });
  s.settings.autoResume = false;
  const setup = readJson(str(o.setup)) as Record<string, unknown> | undefined;
  const setupKeys = new Set(s.decisions.fields().filter((f) => f.stage === "setup").map((f) => f.key));
  const fromAnswers = Object.fromEntries(Object.entries(answers).filter(([k]) => setupKeys.has(k)));
  if (setup || Object.keys(fromAnswers).length || s.setupNeeded())
    s.decisions.applySetup({ ...fromAnswers, ...(setup ?? {}) }, { how: setup || Object.keys(fromAnswers).length ? "from the setup and answers files" : "defaults accepted (headless)" });
  const answer = await s.send(prompt);
  if (out === "json") console.log(JSON.stringify({ session: s.id, dir: s.dir, answer, findings: s.findings.list() }, null, 1));
  else if (out === "text") console.log(`${answer}\n\nSession: ${s.id}\nRecord: ${join(s.dir, "log.jsonl")}`);
  await s.close();
}

async function interactive() {
  const { Session } = await import("./core/session.ts");
  const { runTui } = await import("./tui/app.tsx");
  const adapters = (o.adapter as string[]) ?? [];
  if (!adapters.length && !o.resume) console.error("No adapter given. The agent can use only the generic tools. Use --adapter <name>; see `ga adapters`.");
  const s = o.resume
    ? await Session.resume(str(o.resume)!, { model: str(o.model) })
    : await Session.create({ adapters, model: str(o.model), referee: str(o.referee), mode: str(o.mode) as Mode, generic: !!o.generic });
  await runTui(s as never, {});
  await s.close();
}

async function main() {
  if (o.help) return console.log(HELP);
  if (typeof o.print === "string") return headless(o.print);
  const [cmd, a1, a2, a3] = pos;
  switch (cmd) {
    case undefined:
      return interactive();
    case "help":
      return console.log(HELP);
    case "adapters": {
      for (const [name, dir] of Object.entries(adapterDirs())) {
        try {
          const a = loadAdapter(dir);
          const m = a.manifest;
          console.log(`${name.padEnd(16)} ${m.connection.kind.padEnd(7)} ${m.adapter.status.padEnd(9)} ${m.program.name} ${m.program.tested_versions.join(", ")}  ${dir}`);
        } catch (e) {
          console.log(`${name.padEnd(16)} invalid: ${(e as Error).message.split("\n")[0]}`);
        }
      }
      return;
    }
    case "adapter": {
      const checker = await import("./onboarding/checker.ts");
      if (a1 === "check") {
        const r = await checker.checkAdapter(a2, { runTests: !!o["run-tests"] });
        for (const e of r.errors) console.log(`error: ${e}`);
        for (const w of r.warnings) console.log(`warning: ${w}`);
        for (const t of r.tests ?? []) console.log(`${t.ok ? "pass" : "FAIL"} ${t.id}${t.failures.length ? ": " + t.failures.join("; ") : ""}`);
        console.log(r.ok ? "The adapter passes." : "The adapter does not pass.");
        process.exitCode = r.ok ? 0 : 1;
        return;
      }
      if (a1 === "approve") {
        const dir = existsSync(a2) ? a2 : adapterDirs()[a2];
        if (!dir) fail(`no adapter ${a2}`);
        await checker.approveAdapter(dir, str(o.by) ?? process.env.USER ?? "scientist");
        return console.log(`Approved ${a2}.`);
      }
      return fail("usage: ga adapter check|approve <name|dir>");
    }
    case "onboard": {
      const { onboardCommand } = await import("./onboarding/agent.ts");
      const { Session } = await import("./core/session.ts");
      const { runTui } = await import("./tui/app.tsx");
      const plan = await onboardCommand(a1, { model: str(o.model) ?? "claude", docs: (o.docs as string[]) ?? [], kind: str(o.kind) });
      process.env.GA_DRAFT_DIR = plan.draftDir;
      Object.assign(process.env, plan.env ?? {});
      const s = await Session.create({ adapters: plan.adapters, model: plan.model, mode: plan.mode as Mode, cwd: plan.cwd });
      await runTui(s as never, { firstMessage: plan.firstMessage });
      return s.close();
    }
    case "models": {
      const { listModels } = await import("./providers/index.ts");
      for (const m of await listModels()) console.log(`${m.spec.padEnd(32)} ${m.local ? "local" : "cloud"} tools:${m.tools ? "yes" : "no"} context:${m.contextWindow}  ${m.label}`);
      return;
    }
    case "sessions": {
      const dir = join(gaHome(), "sessions");
      if (!existsSync(dir)) return;
      for (const id of readdirSync(dir).sort()) {
        const log = join(dir, id, "log.jsonl");
        if (!existsSync(log)) continue;
        const lines = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
        const first = lines.find((e) => e.kind === "session");
        const ask = lines.find((e) => e.kind === "user");
        console.log(`${id}  ${(first?.data.adapters ?? []).map((a: { name: string }) => a.name).join(",").padEnd(12)} ${String(first?.data.model ?? "").padEnd(18)} ${String(ask?.data.text ?? "").slice(0, 60)}`);
      }
      return;
    }
    case "export": {
      const { Session } = await import("./core/session.ts");
      const s = await Session.resume(a1, { model: "fake:" });
      console.log(await s.exportAs((str(o.format) ?? "html") as never));
      return s.close();
    }
    case "replay": {
      const { replayFlow } = await import("./core/replay.ts");
      const inputs = Object.fromEntries(((o.input as string[]) ?? []).map((kv) => kv.split("=", 2)));
      const sessionDir = o.session ? join(gaHome(), "sessions", str(o.session)!) : undefined;
      const r = await replayFlow(a1, inputs, { sessionDir });
      for (const st of r.steps) console.log(`${st.ok ? "●" : "✗"} ${st.tool} ${st.diffs.length ? "differs: " + st.diffs.join("; ") : "same"}`);
      return;
    }
    case "run-step": {
      const { ToolRunner } = await import("./core/replay.ts");
      const run = await ToolRunner.start([a1]);
      const r = await run.call(a1, a2, a3 ? JSON.parse(a3) : {});
      console.log(JSON.stringify(r, null, 1));
      return run.close();
    }
    case "questions": {
      const { allOpenQuestions } = await import("./core/questions.ts");
      for (const q of allOpenQuestions()) console.log(`${q.session} ${q.qid}  ${q.title}  [${q.options.map((x) => x.label).join(" | ")}]`);
      return;
    }
    case "bench": {
      const { runBench } = await import("./bench/run.ts");
      const g = (str(o.guidance) ?? "both") as "on" | "off" | "both";
      const r = await runBench(!a1 || a1 === "all" ? "all" : a1.split(","), { model: str(o.model) ?? "claude", guidance: g });
      console.log(typeof r === "string" ? r : JSON.stringify(r, null, 1));
      return;
    }
    case "mcp": {
      const { runMcpServer } = await import("./mcp-server.ts");
      return runMcpServer({ adapters: (o.adapter as string[]) ?? [] });
    }
    default:
      fail(`unknown command ${cmd}\n\n${HELP}`);
  }
}

main().catch((e) => fail(`ga: ${(e as Error).message}`));
