import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { adapterDirs, gaHome, loadAdapter } from "./adapters/manifest.ts";
import { applyHeadlessSetup, attachHeadless } from "./core/headless.ts";
import type { Mode } from "./core/types.ts";

const HELP = `ga - a guided analysis agent for science programs

Usage
  ga [--adapter imagej] [--model claude|ollama:qwen3:8b] [--referee <model>] [--mode watch|follow|teach|plan] [--resume <id>]
  ga -p "<request>" [--adapter imagej] --model <model> [--setup setup.json] [--answers answers.json] [--allow tool,tool|all] [--output text|json|stream-json]

  With no --adapter, the agent calls list_adapters and asks to load the adapter that fits
  the request with use_adapter. The program is your decision: accept or change it on the
  card, or set "adapter": "<name>" in the answers file. The record keeps each load and its
  reason. With --adapter, the session has only the adapters that you name.

  ga adapters                        list the adapters (name, kind, status, field, program)
  ga adapter check <name|dir> [--run-tests]
  ga adapter approve <name|dir> --by <name>
  ga onboard <program> --model <model> [--docs <url>] [--kind cli]
  ga models                            list the models
  ga spend                             Claude spend by day and model (set GA_BUDGET_USD to stop at a limit)
  ga key [status|remove|workspace <id>] save, show or remove your Claude API key
  ga eln setup [--url <address>]       save your eLabFTW address and API key
  ga eln status|remove                 show or remove the saved eLabFTW key
  ga eln push <session>                send a session to eLabFTW after you approve the list
  ga eln link <session> <id>           read an eLabFTW experiment and propose setup values
  ga sessions                          list the sessions
  ga export <session> --format html|md|jsonl|pdf|protocol|script|notebook|flow|eln
  ga replay <flow.json> [--input name=path ...] [--session <id>]
  ga run-step <adapter> <tool> '<json args>'
  ga questions                         open questions in every session
  ga bench [scenario|all] --model <model> [--guidance on|off|both]
  ga bench papers [--papers id,id|all] --models spec,spec [--runs N] [--out file] [--dry-run] [--no-blind]
  ga bench site --results a.json[,b.json] --out <folder>
  ga bench cases --results a.json[,b.json] --out <folder> [--style site/style.css]
  ga mcp [--adapter <name>]            run the harness as an MCP server on stdio (no --adapter: the client loads adapters with use_adapter)

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
    url: { type: "string" },
    guidance: { type: "string" },
    papers: { type: "string" },
    models: { type: "string" },
    runs: { type: "string" },
    results: { type: "string" },
    out: { type: "string" },
    style: { type: "string" },
    "dry-run": { type: "boolean" },
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
  attachHeadless(s, { answers, allow });
  s.bus.on((e) => {
    if (out === "stream-json") process.stdout.write(JSON.stringify(e) + "\n");
    if (out !== "stream-json" && e.type === "entry" && (e.entry.kind === "error" || e.entry.kind === "notice")) process.stderr.write(`${e.entry.kind === "error" ? "Error" : "Note"}: ${e.entry.data.message ?? e.entry.data.text}\n`);
    if (out === "text" && e.type === "entry" && e.entry.kind === "tool_result") process.stderr.write(`  ${e.entry.data.ok ? "●" : "✗"} ${e.entry.data.summary ?? e.entry.data.error ?? e.entry.data.tool}\n`);
  });
  applyHeadlessSetup(s, readJson(str(o.setup)) as Record<string, unknown> | undefined, answers);
  const answer = await s.send(prompt);
  if (out === "json") console.log(JSON.stringify({ session: s.id, dir: s.dir, answer, findings: s.findings.list() }, null, 1));
  else if (out === "text") console.log(`${answer}\n\nSession: ${s.id}\nRecord: ${join(s.dir, "log.jsonl")}`);
  await s.close();
}

async function interactive() {
  const { Session } = await import("./core/session.ts");
  const { runTui } = await import("./tui/app.tsx");
  const adapters = (o.adapter as string[]) ?? [];
  if (!adapters.length && !o.resume) console.error("No adapter given. The agent proposes an adapter after your request, and you accept or change it. Use --adapter <name> to choose now; see `ga adapters`.");
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
          console.log(`${name.padEnd(16)} ${m.connection.kind.padEnd(7)} ${m.adapter.status.padEnd(9)} ${m.adapter.field.padEnd(28)} ${m.program.name} ${m.program.tested_versions.join(", ")}  ${dir}`);
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
    case "key": {
      const cred = await import("./core/credentials.ts");
      if (a1 === "status") {
        const k = cred.claudeKey();
        const ws = cred.claudeWorkspace();
        return console.log((k.from === "none" ? "No Claude API key is set." : `${cred.maskKey(k.key!)} from ${k.from === "env" ? "ANTHROPIC_API_KEY" : cred.credentialsPath()}`) + (ws ? `\nWorkspace ID: ${ws}` : ""));
      }
      if (a1 === "remove") return console.log(cred.removeClaudeKey() ? `Removed the key from ${cred.credentialsPath()}.` : "No key was saved.");
      if (a1 === "workspace") {
        cred.saveClaudeWorkspace(a2 ?? "");
        return console.log(a2 ? `Saved the workspace ID ${a2}. Each request now sends it.` : "Removed the workspace ID.");
      }
      if (a1) return fail("usage: ga key [status|remove|workspace <id>]");
      const key = (await readSecret("Claude API key: ")).trim();
      const problem = cred.keyProblem(key);
      if (problem) return fail(problem);
      const { checkClaudeKey } = await import("./providers/claude.ts");
      const r = await checkClaudeKey(key);
      if (!r.ok) return fail(r.text);
      console.log(`${r.text} Saved to ${cred.saveClaudeKey(key)}.`);
      return;
    }
    case "eln": {
      const cred = await import("./core/credentials.ts");
      if (a1 === "status") {
        const c = cred.elabftwConfig();
        return console.log(c ? `${c.url}\nKey ${cred.maskKey(c.key)} in ${cred.credentialsPath()}` : "eLabFTW is not set up.");
      }
      if (a1 === "remove") return console.log(cred.removeElabftw() ? "Removed the eLabFTW address and key." : "No eLabFTW key was saved.");
      if (a1 === "setup") {
        const url = (str(o.url) ?? (await ask("eLabFTW address (https://...): "))).trim();
        const key = (await readSecret("eLabFTW API key: ")).trim();
        const problem = cred.elabftwProblem(url, key);
        if (problem) return fail(problem);
        return console.log(`Saved the address and key ${cred.maskKey(key)} to ${cred.saveElabftw(url, key)}.`);
      }
      if (a1 !== "push" && a1 !== "link") return fail("usage: ga eln setup|status|remove|push <session>|link <session> <id>");
      if (!a2) return fail(`usage: ga eln ${a1} <session>${a1 === "link" ? " <id>" : ""}`);
      if (a1 === "link" && !/^\d+$/.test(a3 ?? "")) return fail("usage: ga eln link <session> <experiment id>");
      const { Session } = await import("./core/session.ts");
      const s = await Session.resume(a2, { model: "fake:" });
      try {
        if (a1 === "push") {
          s.bus.on((e) => {
            if (e.type !== "permission") return;
            const lines = Object.entries(e.args).map(([k, v]) => `  ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
            console.log(`This will be sent:\n${lines.join("\n")}\n${e.touches}`);
            void ask("Send it? [y/N] ").then((x) => s.respondPermission(e.rid, /^y(es)?$/i.test(x.trim()), "answered in the terminal"));
          });
          const r = await s.elnPush();
          console.log(`${r.created ? "Created" : "Updated"} experiment ${r.experiment} (version ${r.version}): ${r.url}`);
        } else {
          const r = await s.elnLink(Number(a3));
          console.log(r.text);
          if (r.proposals.length && /^y(es)?$/i.test((await ask("Apply these values to the setup? [y/N] ")).trim())) {
            s.decisions.applySetup(Object.fromEntries(r.proposals.map((p) => [p.key, p.value])), { how: `from eLabFTW experiment ${a3}, confirmed in the terminal` });
            console.log("Applied.");
          }
        }
      } catch (e) {
        process.exitCode = 1;
        console.error((e as Error).message);
      }
      return s.close();
    }
    case "spend": {
      const { readSpend, spendFile, budgetUsd } = await import("./core/spend.ts");
      const rows = readSpend();
      const by = new Map<string, number>();
      for (const r of rows) by.set(`${r.t.slice(0, 10)} ${r.model}`, (by.get(`${r.t.slice(0, 10)} ${r.model}`) ?? 0) + (Number(r.usd) || 0));
      for (const [k, v] of [...by].sort()) console.log(`${k.padEnd(36)} $${v.toFixed(2)}`);
      const total = rows.reduce((s, r) => s + (Number(r.usd) || 0), 0);
      const b = budgetUsd();
      console.log(`Total: $${total.toFixed(2)} (list prices, from ${spendFile()})${b ? `. Budget: $${b.toFixed(2)} (GA_BUDGET_USD).` : ""}`);
      return;
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
        const used = [...(first?.data.adapters ?? []), ...lines.filter((e) => e.kind === "adapter").map((e) => e.data)];
        console.log(`${id}  ${used.map((a: { name: string }) => a.name).join(",").padEnd(12)} ${String(first?.data.model ?? "").padEnd(18)} ${String(ask?.data.text ?? "").slice(0, 60)}`);
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
      if (a1 === "papers") {
        const { runPapers } = await import("./bench/papers.ts");
        const models = (str(o.models) ?? str(o.model) ?? "").split(",").filter(Boolean);
        if (!models.length) return fail("usage: ga bench papers [--papers id,id|all] --models spec,spec [--runs N] [--out file] [--dry-run]");
        const papers = str(o.papers);
        const r = await runPapers({ papers: !papers || papers === "all" ? "all" : papers.split(","), models, runs: str(o.runs) ? Number(str(o.runs)) : 1, out: str(o.out), dryRun: !!o["dry-run"], blind: !o["no-blind"] });
        if (r.problems.length) process.exitCode = 1;
        if (r.paths) console.log(`${r.paths.md}\n${r.paths.json}`);
        return;
      }
      if (a1 === "rescore") {
        const results = (str(o.results) ?? "").split(",").filter(Boolean);
        if (!results.length) return fail("usage: ga bench rescore --results a.json[,b.json]");
        const { rescoreResults } = await import("./bench/papers.ts");
        for (const f of results) {
          const r = rescoreResults(f);
          console.log(`${f}: rescored ${r.rescored} of ${r.runs} runs`);
        }
        return;
      }
      if (a1 === "site") {
        const results = (str(o.results) ?? "").split(",").filter(Boolean);
        const out = str(o.out);
        if (!results.length || !out) return fail("usage: ga bench site --results a.json[,b.json] --out <folder>");
        const { buildSite } = await import("./bench/papers-site.ts");
        const info = buildSite({ results, out, log: (l) => console.error(l) });
        console.log(`${info.index}\n${info.images.length} images, ${info.papers} papers, ${info.runs} runs`);
        return;
      }
      if (a1 === "cases") {
        const results = (str(o.results) ?? "").split(",").filter(Boolean);
        const out = str(o.out);
        if (!results.length || !out) return fail("usage: ga bench cases --results a.json[,b.json] --out <folder> [--style site/style.css]");
        const { buildCases } = await import("./bench/papers-cases.ts");
        const info = buildCases({ results, out, style: str(o.style), log: (l) => console.error(l) });
        for (const p of info.problems) console.error(`problem: ${p}`);
        console.log(`${info.index}\n${info.pages.length} pages, ${info.records.length} session records`);
        return;
      }
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

let lines: string[] | undefined;

async function ask(prompt: string): Promise<string> {
  process.stderr.write(prompt);
  if (!lines) {
    let all = "";
    if (process.stdin.isTTY) {
      const { createInterface } = await import("node:readline");
      const rl = createInterface({ input: process.stdin, terminal: false });
      return new Promise((resolve) => rl.once("line", (l) => (rl.close(), resolve(l))));
    }
    for await (const c of process.stdin) all += c;
    lines = all.split("\n");
  }
  return lines.shift() ?? "";
}

async function readSecret(prompt: string): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY) return ask(prompt);
  process.stderr.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");
  return new Promise((resolve) => {
    let v = "";
    const done = (out: string) => {
      input.setRawMode(false);
      input.pause();
      input.off("data", on);
      process.stderr.write("\n");
      resolve(out);
    };
    const on = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") return done(v);
        if (ch === "\u0003") return done("");
        if (ch === "\u007f" || ch === "\b") {
          if (v.length) (v = v.slice(0, -1)), process.stderr.write("\b \b");
        } else if (ch >= " ") (v += ch), process.stderr.write("*");
      }
    };
    input.on("data", on);
  });
}
