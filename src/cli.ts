import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { adapterDirs, gaHome, loadAdapter } from "./adapters/manifest.ts";
import { applyHeadlessSetup, attachHeadless } from "./core/headless.ts";
import type { Mode } from "./core/types.ts";

const HELP = `ga - a guided analysis agent for science programs

Usage
  ga [--adapter imagej] [--model claude|ollama:qwen3:8b] [--referee <model>] [--mode watch|follow|teach|plan] [--resume [<id>|<folder>]] [--output <folder>]
  ga resume [<id>]                     pick one of the last 10 sessions and continue it [--bypass-permissions]
  ga open [<folder>]                   continue a session from its folder or from the project folder (default: this folder)
  ga app [<folder>] [--resume [<id>|<folder>]] [--model <model>] [--no-open (no browser or other window; for tests)]
                                       the browser app: a full session in a browser window on this computer only.
                                       With a folder it starts a session there; with no folder it shows a folder chooser.
                                       ga --resume in the terminal continues a session that the app started, and back.
  ga -p "<request>" [--adapter imagej] --model <model> [--setup setup.json] [--answers answers.json] [--allow tool,tool|all] [--output text|json|stream-json]

  With no --adapter, the agent calls list_adapters and asks to load the adapter that fits
  the request with use_adapter. The program is your decision: accept or change it on the
  card, or set "adapter": "<name>" in the answers file. The record keeps each load and its
  reason. With --adapter, the session has only the adapters that you name.

  --bypass-permissions
  WARNING: In bypass, the agent can run commands and write files without asking.
  The harness allows each tool call that has a permission card and logs it with the reason
  "bypass permissions". The status line shows "bypass permissions". Also /permissions bypass,
  or "permissions": "bypass" in ~/.guided-analysis/settings.json or .ga/settings.json.
  Bypass does not change these: method decisions stay with you (/decisions agent gives them
  to the agent); plan and teach mode still block steps; blind benchmark rules and the macOS
  sandbox still apply; a push to eLabFTW still asks; "deny" rules in settings still deny.

  ga adapters                        list the adapters (name, kind, status, field, program)
  ga adapter check <name|dir> [--run-tests] [--gui]
                                     --gui also runs the tests marked gui: true (they open a window)
  ga adapter check <name|dir> --drive [--model ollama:qwen3:8b] [--tool <name>]
                                     drive test: one plain request for each tool, run by the
                                     model with this adapter only; reports the tool choice, the
                                     arguments and the answer
  ga adapter approve <name|dir> --by <name>
  ga onboard <program> --model <model> [--docs <url>] [--kind cli]
  Each session saves its work in the folder where you start ga, in cuvette/<date>-<title>/:
  tables, figures, scripts, exports and index.html (open it in a browser). The record is in
  .record/ in that folder. To continue later, run "ga open <that folder>", or run
  "ga --resume" with no value in the session folder or the project folder.
  --output <folder> or the setting output_folder changes "cuvette": a name is a folder in the
  project folder, an absolute path (a lab share, a results drive) is used as given. A project
  setting wins over a user setting. If the folder is read-only, the session folder goes to
  ~/.guided-analysis/projects/.

  ga doctor [--fix]                    check Node, the model, the Python environments, R, Java and each adapter's program;
                                       --fix installs the missing Python environments and R packages after it asks
  ga install-finder-action             add "Analyze with Cuvette" to the Quick Actions of folders and files in Finder (macOS)
  ga uninstall-finder-action           remove it
  ga install-launcher                  add Cuvette.app to ~/Applications: double-click it, choose a folder (macOS)
  ga uninstall-launcher                remove it

  On the first start with no Claude API key and no local model, ga asks which model to use,
  checks this Mac, and offers a 2-minute sample analysis.

  ga models                            list the models
  ga config                            show each setting, its value and where it comes from
  ga config get <name>                 show one setting
  ga config set <name> <value> [--user|--project]   save a setting (default: user settings)
  ga spend                             Claude spend by day and model (set GA_BUDGET_USD to stop at a limit)
  ga key [status|remove|workspace <id>] save, show or remove your Claude API key
  ga eln setup [--url <address>]       save your eLabFTW address and API key
  ga eln status|remove                 show or remove the saved eLabFTW key
  ga eln push <session>                send a session to eLabFTW after you approve the list
  ga eln link <session> <id>           read an eLabFTW experiment and propose setup values
  ga sessions                          list the sessions, newest first: folder, age, first request ("moved" if a folder is gone)
  ga export <session> --format html|md|jsonl|pdf|protocol|script|notebook|flow|eln|xlsx
  ga export <session> --format pptx|pdf --images figures|qc|pilot|all|<glob> [--order step|group|name]
            [--per-page 1|2|4|6|9] [--size 16:9|a4|letter]
                                       put the session images in images.pptx or images.pdf in the session
                                       folder: a title slide, the images with captions from the record, and
                                       a last slide with the methods and the record hash. pptx needs
                                       python-pptx in the science environment (ga doctor --fix)
  ga databook [<session folder>|<project folder>] [--format pdf|docx|html] [--sessions all|<id,...>]
                                       write a data book: the data, methods, results and figures of a session,
                                       or of all sessions of a project folder (default: the current folder)
  ga replay <flow.json> [--input name=path ...] [--session <id>]
  ga run-step <adapter> <tool> '<json args>'
  ga questions                         open questions in every session
  ga bench [scenario|all] --model <model> [--guidance on|off|both]
  ga bench papers [--papers id,id|all] --models spec,spec [--runs N] [--out file] [--dry-run] [--no-blind]
  ga bench site --results a.json[,b.json] --out <folder>
  ga bench cases --results a.json[,b.json] --out <folder> [--style site/style.css]
  ga mcp [--adapter <name>]            run the harness as an MCP server on stdio (no --adapter: the client loads adapters with use_adapter)

Proposed analysis: in an interactive session the agent goes through four stages before the batch runs:
  Questions (what counts as one n, what counts as positive), Proposed metrics (each with its settings, which you
  can change), Demonstration on a sample (numbers and a QC image), and Confirmed.
  --no-plan, /plan off, or "planFirst": "off" in settings.json skips it. --plan turns it on for a -p run.
  A step that processes many files waits for a confirmed demonstration. /pilot off skips that.
  GA_NO_OPEN=1 or "openImages": "off" keeps the QC images from opening on screen.

Models: "claude" (claude-opus-5-5), "claude:<model id>", "ollama:<model>", "openai:<base url>|<model>".`;

const argv = process.argv.slice(2).map((a, i, all) => ((a === "--resume" || a === "-r") && (all[i + 1] === undefined || all[i + 1]!.startsWith("-")) ? "--resume=" : a));
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
    images: { type: "string" },
    order: { type: "string" },
    "per-page": { type: "string" },
    size: { type: "string" },
    input: { type: "string", multiple: true },
    session: { type: "string" },
    sessions: { type: "string" },
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
    user: { type: "boolean" },
    project: { type: "boolean" },
    "run-tests": { type: "boolean" },
    drive: { type: "boolean" },
    gui: { type: "boolean" },
    tool: { type: "string", multiple: true },
    generic: { type: "boolean" },
    "bypass-permissions": { type: "boolean" },
    plan: { type: "boolean" },
    "no-plan": { type: "boolean" },
    fix: { type: "boolean" },
    "no-open": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const planSetting = () => (o.plan ? { planFirst: true } : o["no-plan"] ? { planFirst: false } : {});
const readJson = (p?: string) => (p ? JSON.parse(readFileSync(p, "utf8")) : undefined);
const FORMATS = new Set(["text", "json", "stream-json"]);
const outputFolder = () => {
  const v = str(o.output);
  return v && !FORMATS.has(v) ? { output_folder: v } : {};
};
const bypass = () => ({ ...(o["bypass-permissions"] ? { permissionMode: "bypass" as const } : {}), ...outputFolder() });

async function headless(prompt: string) {
  const { Session } = await import("./core/session.ts");
  const answers = (readJson(str(o.answers)) ?? {}) as Record<string, unknown>;
  const allow = new Set((str(o.allow) ?? "").split(",").filter(Boolean));
  const out = FORMATS.has(str(o.output) ?? "") ? str(o.output)! : "text";
  const s = await Session.create({ adapters: (o.adapter as string[]) ?? [], model: str(o.model), referee: str(o.referee), mode: str(o.mode) as Mode, generic: !!o.generic, defaults: true, settings: { headless: true, ...bypass(), ...planSetting() } });
  attachHeadless(s, { answers, allow });
  s.bus.on((e) => {
    if (out === "stream-json") process.stdout.write(JSON.stringify(e) + "\n");
    if (out !== "stream-json" && e.type === "entry" && (e.entry.kind === "error" || e.entry.kind === "notice")) process.stderr.write(`${e.entry.kind === "error" ? "Error" : "Note"}: ${e.entry.data.message ?? e.entry.data.text}\n`);
    if (out === "text" && e.type === "entry" && e.entry.kind === "tool_result") process.stderr.write(`  ${e.entry.data.ok ? "●" : "✗"} ${e.entry.data.summary ?? e.entry.data.error ?? e.entry.data.tool}\n`);
  });
  applyHeadlessSetup(s, readJson(str(o.setup)) as Record<string, unknown> | undefined, answers);
  const answer = await s.send(prompt);
  if (out === "json") console.log(JSON.stringify({ session: s.id, dir: s.dir, answer, findings: s.findings.list() }, null, 1));
  else if (out === "text") console.log(`${answer}\n\nSession: ${s.id}\nFolder: ${s.workDir}\nRecord: ${join(s.dir, "log.jsonl")}`);
  await s.close();
}

const RECENT_MS = 7 * 24 * 3600 * 1000;

async function chooseSession(always: boolean): Promise<string> {
  const { listSessions, defaultSession, folderText } = await import("./core/sessions.ts");
  const list = listSessions();
  const pick = defaultSession(list, process.cwd());
  if (!pick) fail("There is no session to resume.");
  const note = pick.here ? "" : `No session was started in this folder. The newest session is ${pick.info.id} in ${folderText(pick.info.cwd)}.`;
  const recent = list.filter((s) => Date.now() - s.used < RECENT_MS);
  if (process.stdin.isTTY && process.stdout.isTTY && (always || recent.length > 1)) {
    const shown = list.slice(0, 10);
    if (!shown.includes(pick.info)) shown.unshift(pick.info);
    const { pickSession } = await import("./tui/picker.tsx");
    const s = await pickSession(shown, shown.indexOf(pick.info), note);
    if (!s) process.exit(0);
    return s.id;
  }
  if (note) console.error(`${note} It opens now.`);
  return pick.info.id;
}

async function firstStart(): Promise<{ cwd: string; message: string } | undefined> {
  const fs = await import("./core/firststart.ts");
  console.log("Welcome to Cuvette. First, choose the model that does the analysis.\n");
  fs.CHOICES.forEach((c, i) => console.log(`  ${i + 1}  ${c.label}\n     ${c.help}\n`));
  let pick = "";
  while (pick !== "1" && pick !== "2") pick = (await ask("Type 1 or 2: ")).trim();
  if (pick === "1") {
    for (let i = 1; ; i++) {
      const r = await fs.chooseClaude(await readSecret("Paste your Claude API key (it starts with sk-ant-): "));
      console.log(r.text);
      if (r.ok) break;
      if (i === 3) fail("No key was saved. Run ga key when you have a key, or run ga again and choose the local model.");
    }
  } else {
    const st = await fs.ollamaState();
    let model = st.recommended ?? fs.RECOMMENDED_LOCAL;
    if (st.models.length > 1) {
      console.log("\nModels in Ollama on this Mac:");
      st.models.forEach((m, i) => console.log(`  ${i + 1}  ${m}${m === model ? " (recommended)" : ""}`));
      const a = (await ask(`Type a number, or press Enter for ${model}: `)).trim();
      model = st.models[Number(a) - 1] ?? (a || model);
    }
    const r = await fs.chooseLocal(model);
    console.log(r.text);
    if (!r.ok) {
      console.log("Then start Cuvette again.");
      process.exit(0);
    }
  }
  console.log("\nChecking this Mac for the programs that Cuvette uses (about 15 seconds)...");
  const dr = await import("./core/doctor.ts");
  const checks = await dr.runDoctor();
  console.log(dr.doctorText(checks, { only: ["missing", "old"] }) + "\nThe full list: ga doctor\n");
  const yes = (await ask("Try a 2-minute sample analysis? It uses a small public data set: extra sleep of 10 patients with two drugs (Student, 1908). [Y/n] ")).trim();
  if (/^n/i.test(yes)) return undefined;
  const s = fs.copySample();
  console.log(`Copied the data to ${s.file}. The results go in that folder.\n`);
  return { cwd: s.folder, message: s.request };
}

async function interactive(resumeId?: string) {
  const { Session } = await import("./core/session.ts");
  const { runTui } = await import("./tui/app.tsx");
  const adapters = (o.adapter as string[]) ?? [];
  if (o.resume !== undefined && !resumeId) resumeId = str(o.resume) || (await chooseSession(false));
  let sample: { cwd: string; message: string } | undefined;
  if (!resumeId && !str(o.model) && process.stdin.isTTY && (await import("./core/firststart.ts")).needsFirstStart()) sample = await firstStart();
  if (resumeId) {
    const lock = await liveLock(resumeId);
    if (lock) fail(lock.app ? `This session is open in the app: ${lock.app}\nUse it there, or close the session there (Sessions, or /quit) and run this again.` : "This session is open in another terminal. Close it there first.");
  }
  if (!adapters.length && !resumeId && !sample) console.error("No adapter given. The agent proposes an adapter after your request, and you accept or change it. Use --adapter <name> to choose now; see `ga adapters`.");
  const s = resumeId
    ? await Session.resume(resumeId, { model: str(o.model), interactive: true, settings: { ...bypass(), ...planSetting() } }).catch((e: Error) => fail(`${e.message}. Give a session id, a session folder or a project folder. See ga sessions.`))
    : await Session.create({ adapters, model: str(o.model), referee: str(o.referee), mode: str(o.mode) as Mode, generic: !!o.generic, defaults: true, interactive: true, cwd: sample?.cwd, settings: { ...bypass(), ...planSetting() } });
  await runTui(s as never, { firstMessage: sample?.message });
  await s.close();
}

async function liveLock(ref: string) {
  const { findPlace } = await import("./core/places.ts");
  const { openLock } = await import("./core/sessions.ts");
  const place = findPlace(ref, { cwd: process.cwd() });
  const lock = place ? openLock(place.recordDir) : undefined;
  return lock && lock.pid !== process.pid ? lock : undefined;
}

async function sharedApp(ref: string): Promise<string | undefined> {
  const lock = await liveLock(ref);
  if (!lock) return undefined;
  if (lock.app) return lock.app;
  if (process.platform === "win32") fail("This session is open in another window. Close it there first.");
  process.kill(lock.pid, "SIGUSR2");
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const now = await liveLock(ref);
    if (now?.app) return now.app;
  }
  fail("This session is open in another window, and that window did not start the app. Type /app there, or close the session there first.");
}

async function app(folder?: string) {
  if (o["no-open"]) process.env.GA_NO_OPEN = "1";
  const { startApp } = await import("./server/app.ts");
  const { openWithOs } = await import("./ui/commands.ts");
  let resume: string | undefined;
  if (o.resume !== undefined) {
    const { listSessions, defaultSession } = await import("./core/sessions.ts");
    resume = str(o.resume) || defaultSession(listSessions(), folder ?? process.cwd())?.info.id;
    if (!resume) fail("There is no session to resume.");
  }
  if (folder && !existsSync(folder)) fail(`No folder ${folder}.`);
  if (resume) {
    const url = await sharedApp(resume);
    if (url) {
      console.log(`This session is open in a terminal. The app shows the same session: ${url}`);
      if (!o["no-open"]) openWithOs(url);
      return;
    }
  }
  const a = await startApp({ folder, start: process.cwd(), resume, model: str(o.model), adapters: (o.adapter as string[]) ?? [] }).catch((e: Error) => fail(`The app did not start: ${e.message}`));
  console.log(`Cuvette app: ${a.url}\nThe app runs on this computer only. Press Ctrl+C to stop it.`);
  if (!o["no-open"]) openWithOs(a.url);
  await new Promise<void>((done) => {
    process.once("SIGINT", done);
    process.once("SIGTERM", done);
  });
  await a.close();
  process.exit(0);
}

async function main() {
  if (o.help) return console.log(HELP);
  if (typeof o.print === "string") return headless(o.print);
  const [cmd, a1, a2, a3] = pos;
  switch (cmd) {
    case undefined:
      return interactive();
    case "resume":
      return interactive(a1 || (await chooseSession(true)));
    case "help":
      return console.log(HELP);
    case "app":
      return app(a1);
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
      if (a1 === "check" && o.drive) {
        const { runDrive, driveText } = await import("./onboarding/drive.ts");
        const results = await runDrive(a2, { model: str(o.model) ?? "ollama:qwen3:8b", only: (o.tool as string[]) ?? [] });
        console.log(driveText(results));
        process.exitCode = results.every((r) => r.rightTool && r.validArgs && r.reached !== false) ? 0 : 1;
        return;
      }
      if (a1 === "check") {
        const r = await checker.checkAdapter(a2, { runTests: !!o["run-tests"], gui: !!o.gui });
        for (const e of r.errors) console.log(`error: ${e}`);
        for (const w of r.warnings) console.log(`warning: ${w}`);
        for (const t of r.tests ?? []) console.log(t.skipped ? `skip ${t.id}: ${t.skipped}` : `${t.ok ? "pass" : "FAIL"} ${t.id}${t.failures.length ? ": " + t.failures.join("; ") : ""}`);
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
    case "config": {
      const st = await import("./core/settings.ts");
      const ctx = { cwd: process.cwd() };
      const rows = st.describe(ctx);
      const line = (r: (typeof rows)[number]) => `${r.def.name.padEnd(16)} ${r.value.padEnd(40)} ${r.source ? st.scopeLabel(r.source) : ""}`.trimEnd();
      if (!a1) {
        let group = "";
        for (const r of rows) {
          if (r.def.group !== group) console.log(`${group ? "\n" : ""}${(group = r.def.group)}`);
          console.log(`  ${line(r)}`);
        }
        return console.log(`\nUser settings: ${st.settingsPath("user", ctx.cwd)}\nProject settings: ${st.settingsPath("project", ctx.cwd)}`);
      }
      if (a1 === "get") {
        const r = rows.find((x) => x.def.name === a2);
        if (!r) return fail(`No setting named ${a2}. Type ga config to see the names.`);
        return console.log([line(r), r.def.help, ...(r.def.details?.(ctx) ?? []).map((d) => `  ${d}`)].join("\n"));
      }
      if (a1 === "set") {
        if (!a2 || a3 === undefined) return fail("usage: ga config set <name> <value> [--user|--project]");
        const scope = o.project ? "project" : "user";
        try {
          const r = await st.changeSetting(ctx, a2, a3, scope);
          console.log(`${a2}: ${st.show(r.old)} -> ${st.show(r.value)} (${st.scopeLabel(scope)}, ${st.settingsPath(scope, ctx.cwd)})${r.note ? `\n${r.note}` : ""}`);
        } catch (e) {
          fail((e as Error).message);
        }
        return;
      }
      return fail("usage: ga config [get <name> | set <name> <value> [--user|--project]]");
    }
    case "doctor": {
      const dr = await import("./core/doctor.ts");
      const tty = process.stderr.isTTY;
      const progress = (t: string) => tty && process.stderr.write(`\rChecking ${t}...`.padEnd(40));
      let checks = await dr.runDoctor({ onProgress: progress });
      if (tty) process.stderr.write("\r".padEnd(41) + "\r");
      console.log(dr.doctorText(checks));
      if (o.fix) {
        const cmds = dr.safeFixes(checks);
        if (!cmds.length) console.log("\nNothing to install: no Python environment or R package set is missing that --fix can install.");
        else {
          console.log(`\nThese commands install the missing parts:\n${cmds.map((c) => `  ${c}`).join("\n")}`);
          if (!/^y(es)?$/i.test((await ask("Run them now? [y/N] ")).trim())) return console.log("Nothing was installed.");
          const { spawnSync } = await import("node:child_process");
          const PATH = [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", join(homedir(), ".local/bin")].join(":");
          for (const c of cmds) {
            console.log(`\n$ ${c}`);
            const r = spawnSync("/bin/sh", ["-c", c], { stdio: "inherit", env: { ...process.env, PATH } });
            if (r.status !== 0) console.log(`This command stopped with exit code ${r.status}.`);
          }
          checks = await dr.runDoctor({ onProgress: progress });
          if (tty) process.stderr.write("\r".padEnd(41) + "\r");
          console.log(`\nAfter the install:\n${dr.doctorText(checks, { only: ["missing", "old"] })}`);
        }
      }
      process.exitCode = dr.canStart(checks) ? 0 : 1;
      return;
    }
    case "install-finder-action":
    case "uninstall-finder-action":
    case "install-launcher":
    case "uninstall-launcher": {
      if (process.platform !== "darwin") return fail("This command works only on macOS.");
      const mac = await import("./core/macos.ts");
      if (cmd === "install-finder-action") {
        const p = mac.gaPaths();
        const dir = mac.installFinderAction({ paths: p });
        return console.log(`Installed the Quick Action "${mac.ACTION_NAME}" in ${dir}.\nIt runs ${p.node} ${p.ga}.\nIn Finder, Control-click a folder or a file, then choose Quick Actions > ${mac.ACTION_NAME}.\nIf it is not in the menu, open System Settings > Keyboard > Keyboard Shortcuts > Services > Files and Folders and turn it on.\nTo remove it: ga uninstall-finder-action`);
      }
      if (cmd === "uninstall-finder-action") return console.log(mac.uninstallFinderAction() ? `Removed ${mac.actionPath()}.` : "The Quick Action is not installed.");
      if (cmd === "install-launcher") {
        const p = mac.gaPaths();
        const dir = mac.installLauncher({ paths: p });
        return console.log(`Installed ${dir}.\nIt runs ${p.node} ${p.ga}.\nDouble-click Cuvette in Applications in your home folder (or find it with Spotlight). It asks for a folder, then starts Cuvette in that folder.\nTo remove it: ga uninstall-launcher`);
      }
      return console.log(mac.uninstallLauncher() ? `Removed ${mac.launcherPath()}.` : "The launcher is not installed.");
    }
    case "models": {
      const { listModels } = await import("./providers/index.ts");
      for (const m of await listModels()) console.log(`${m.spec.padEnd(32)} ${m.local ? "local" : "cloud"} tools:${m.tools ? "yes" : "no"} context:${m.contextWindow}  ${m.label}`);
      return;
    }
    case "sessions": {
      const { listSessions, sessionLine } = await import("./core/sessions.ts");
      const list = listSessions();
      if (!list.length) return console.log("No sessions yet.");
      for (const s of list) console.log(sessionLine(s));
      return;
    }
    case "open":
      return interactive(a1 ?? ".");
    case "export": {
      const { Session } = await import("./core/session.ts");
      const s = await Session.resume(a1, { model: "fake:" });
      const fmt = str(o.format) ?? "html";
      if (fmt === "pptx" || (fmt === "pdf" && (o.images || o.order || o["per-page"] || o.size))) {
        const deck = await import("./core/imagedeck.ts");
        const opts = deck.parseDeckArgs([fmt, ...[o.images, o.order, o["per-page"], o.size].map(str).filter((v): v is string => !!v)]);
        if (typeof opts === "string") fail(opts.replace("Use: /export images", "Use: ga export <session> --format"));
        console.log(deck.deckLine(await s.exportImages(opts)));
        return s.close();
      }
      console.log(await s.exportAs(fmt as never));
      return s.close();
    }
    case "databook": {
      const db = await import("./core/databook.ts");
      const formats = (str(o.format) ?? "pdf").split(",").map((f) => f.trim()) as ("pdf" | "html" | "docx")[];
      if (formats.some((f) => !["pdf", "html", "docx"].includes(f))) fail("Use --format pdf, docx or html.");
      const cwd = process.cwd();
      const t = db.resolveTarget(a1, cwd, str(o.sessions)?.split(","));
      let author = db.bookSettings(t.project).author;
      if (!author && process.stdin.isTTY) {
        const rl = (await import("node:readline/promises")).createInterface({ input: process.stdin, output: process.stdout });
        author = (await rl.question("Author for the title page of each data book (saved in user settings): ")).trim() || undefined;
        rl.close();
        if (author) await (await import("./core/settings.ts")).changeSetting({ cwd }, "databook_author", author, "user");
      }
      const w = await db.writeDatabook({ target: a1, cwd, sessions: str(o.sessions)?.split(","), formats, author });
      console.log(db.writtenLines(w).join("\n"));
      return;
    }
    case "replay": {
      const { replayFlow } = await import("./core/replay.ts");
      const inputs = Object.fromEntries(((o.input as string[]) ?? []).map((kv) => kv.split("=", 2)));
      const { findPlace } = await import("./core/places.ts");
      const sessionDir = o.session ? (findPlace(str(o.session)!)?.recordDir ?? fail(`no session ${str(o.session)}`)) : undefined;
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
