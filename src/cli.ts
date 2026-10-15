import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { moveOldHome, readOldEnv } from "./core/old-names.ts";
import { plainText } from "./core/plain.ts";
import type { Mode } from "./core/types.ts";

readOldEnv();
// Chalk reads FORCE_COLOR once, when Ink loads. Child processes must not get it: Python Rich takes FORCE_COLOR=0 as "force color".
if (process.env.NO_COLOR && process.env.FORCE_COLOR === undefined) {
  process.env.FORCE_COLOR = "0";
  await import("ink");
  delete process.env.FORCE_COLOR;
}
if (!process.env.CUVETTE_HOME) {
  const moved = moveOldHome();
  if (moved) console.error(moved);
}

const HELP = `cuvette - a guided analysis agent for science programs

Usage
  cuvette [--adapter imagej] [--model claude|ollama:qwen3:8b] [--referee <model>] [--mode watch|follow|teach|plan] [--resume [<id>|<folder>]] [--output <folder>]
  cuvette resume [<id>]                pick one of the last 10 sessions and continue it [--bypass-permissions]
  cuvette open [<folder>]              continue a session from its folder or from the project folder (default: this folder)
  cuvette app [<folder>] [--resume [<id>|<folder>]] [--model <model>] [--no-open (no browser or other window; for tests)]
                                       the browser app: a full session in a browser window on this computer only.
                                       With a folder it starts a session there; with no folder it shows a folder chooser.
                                       cuvette --resume in the terminal continues a session that the app started, and back.
  cuvette -p "<request>" [--adapter imagej] --model <model> [--setup setup.json] [--answers answers.json] [--allow tool,tool|all] [--output text|json|stream-json]

  With no --adapter, the agent calls list_adapters and asks to load the adapter that fits
  the request with use_adapter. The program is your decision: accept or change it on the
  card, or set "adapter": "<name>" in the answers file. The record keeps each load and its
  reason. With --adapter, the session has only the adapters that you name.

  With --method, the harness compares the new data with the data that the method used.
  A likely unit change stops the run. Add data-change to --allow to continue.
  A search of a large folder outside the project needs search in --allow, or all.

  --bypass-permissions
  WARNING: In bypass, the agent can run commands and write files without asking.
  The harness allows each tool call that has a permission card and logs it with the reason
  "bypass permissions". The status line shows "bypass permissions". Also /permissions bypass,
  or "permissions": "bypass" in ~/.cuvette/settings.json or .cuvette/settings.json.
  Bypass does not change these: method decisions stay with you (/decisions agent gives them
  to the agent); plan and teach mode still block steps; blind benchmark rules and the macOS
  sandbox still apply; a push to eLabFTW still asks; "deny" rules in settings still deny.

  cuvette adapters                   list the adapters (name, kind, status, trust, field, program)
  cuvette adapter add <name | git address | folder | .zip> [--run-tests]
                                     install an adapter in the user adapter folder. A git address
                                     is pinned to a commit (add #ref to choose one). A name comes
                                     from the registry (setting adapter_registry). Cuvette checks
                                     the adapter, shows what it can do, and asks before it installs.
  cuvette adapter update [name]      show what changed (files, tools, permissions), then ask
  cuvette adapter remove <name>
  cuvette adapter list --installed   the source, version, commit and SHA-256 of each installed adapter
  cuvette adapter list --registry    the adapters in the registry
  cuvette adapter audit <folder|name> [--model claude:<id>]
                                     ask Claude to review the files; asks first because it costs tokens
  cuvette adapter allow-code <name>  allow the code of an installed Unlisted adapter to run
  cuvette adapter check <name|dir> [--static] [--run-tests] [--gui]
                                     --static checks the files only. It imports no code and starts no program.
                                     --gui also runs the tests marked gui: true (they open a window)
  cuvette adapter check <name|dir> --drive [--model ollama:qwen3:8b] [--tool <name>]
                                     drive test: one plain request for each tool, run by the
                                     model with this adapter only; reports the tool choice, the
                                     arguments and the answer
  cuvette adapter approve <name|dir> --by <name>
  cuvette onboard <program> --model <model> [--docs <url>] [--kind cli]
  Each session saves its work in the folder where you start cuvette, in cuvette/<date>-<title>/:
  tables, figures, scripts, exports and index.html (open it in a browser). The record is in
  .record/ in that folder. To continue later, run "cuvette open <that folder>", or run
  "cuvette --resume" with no value in the session folder or the project folder.
  --output <folder> or the setting output_folder changes "cuvette": a name is a folder in the
  project folder, an absolute path (a lab share, a results drive) is used as given. A project
  setting wins over a user setting. If the folder is read-only, the session folder goes to
  ~/.cuvette/projects/.

  cuvette doctor [--fix] [--adapter <name>] [--no-self-test]
                                       check Node, the model, the Python environments, R, Java and each adapter's program;
                                       then run the known-answer test of each adapter, for example "Fails by 0.003 on the t statistic";
                                       --adapter checks and tests one adapter only; --no-self-test skips the tests;
                                       --fix installs the missing Python environments and R packages after it asks
  cuvette programs                     list each adapter with its program: status, version, size, last use, access
  cuvette programs install|update|remove|check <adapter>
  cuvette programs path <adapter> <path|none>   use a program in a custom place (none: forget the path)
  cuvette programs enable|disable|approve <adapter>
  cuvette programs network|code <adapter> on|off   let the adapter use the network, or run code that the agent writes
                                       Each change shows what it does and asks first. The log: ~/.cuvette/programs-log.jsonl
  cuvette install-finder-action        add "Analyze with Cuvette" to the Quick Actions of folders and files in Finder (macOS)
  cuvette uninstall-finder-action      remove it
  cuvette install-launcher             add Cuvette.app to ~/Applications: double-click it, choose a folder (macOS)
  cuvette uninstall-launcher           remove it

  On the first start with no Claude API key and no local model, cuvette asks which model to use,
  checks this computer, and offers a 2-minute sample analysis.

  cuvette trust list                   list the trusted folders
  cuvette trust add|remove|show <folder>    trust a folder, remove the trust, or show what the folder contains
  --trust-folder                       trust the project folder for this run only (for scripts and -p)

  WARNING: The settings, hooks and adapters in <folder>/.ga or <folder>/.cuvette can run programs.
  A <folder>/LAB.md file goes into the instructions of the agent.
  Cuvette ignores them until you trust the folder. A session shows a card with what the folder
  contains. If a trusted file changes, the card shows again.

  cuvette models                       list the models
  cuvette config                       show each setting, its value and where it comes from
  cuvette config get <name>            show one setting
  cuvette config set <name> <value> [--user|--project]   save a setting (default: user settings)
  cuvette spend                        Claude spend by day and model (set CUVETTE_BUDGET_USD to stop at a limit)
  cuvette key [status|remove|workspace <id>] save, show or remove your Claude API key
  cuvette key help|open                show how to get a key, or open the keys page in the browser
  cuvette eln setup [--url <address>]  save your eLabFTW address and API key
  cuvette eln status|remove            show or remove the saved eLabFTW key
  cuvette eln push <session>           send a session to eLabFTW after you approve the list
  cuvette eln link <session> <id>      read an eLabFTW experiment and propose setup values
  cuvette sessions                     list the sessions, newest first: folder, age, first request ("moved" if a folder is gone)
  cuvette export <session> --format html|md|jsonl|pdf|protocol|script|notebook|flow|eln|xlsx
  cuvette export <session> --format pptx|pdf --images figures|qc|pilot|all|<glob> [--order step|group|name]
            [--per-page 1|2|4|6|9] [--size 16:9|a4|letter]
                                       put the session images in images.pptx or images.pdf in the session
                                       folder: a title slide, the images with captions from the record, and
                                       a last slide with the methods and the record hash. pptx needs
                                       python-pptx in the science environment (cuvette doctor --fix)
  cuvette databook [<session folder>|<project folder>] [--format pdf|docx|html] [--sessions all|<id,...>]
                                       write a data book: the data, methods, results and figures of a session,
                                       or of all sessions of a project folder (default: the current folder)
  cuvette method list|show <name>|delete <name>
  cuvette method export <name> [<file or folder>]   write the method as one file to share with the lab
  cuvette method import <file> [<name>]     save a method file from a colleague
  cuvette --method <name> [<folder>]   start a session on new data with a saved method: the questions come with the
                                       saved answers for you to confirm, the metrics come filled in, and the
                                       demonstration on one sample still runs before the batch
                                       (in a session: /save-method <name>, /method <name>)
  cuvette replay <flow.json> [--input name=path ...] [--session <id>]
  cuvette run-step <adapter> <tool> '<json args>'
  cuvette questions                    open questions in every session
  cuvette status [session]             list each step as up to date or out of date, with the reason
                                       (a changed decision, input file, adapter, program or package version)
  cuvette bench [scenario|all] --model <model> [--guidance on|off|both]
  cuvette bench papers [--papers id,id|all] --models spec,spec [--runs N] [--out file] [--dry-run] [--no-blind]
  cuvette bench rescore --results a.json[,b.json]   score each run again from its record and write the result files again
  cuvette bench compare --results a.json,b.json [--model spec]
                                       paired test of two result files: each paper run and item in A and B (exact McNemar)
  cuvette bench site --results a.json[,b.json] --out <folder>
  cuvette bench cases --results a.json[,b.json] --out <folder> [--style site/style.css]
  cuvette mcp [--adapter <name>]       run the harness as an MCP server on stdio (no --adapter: the client loads adapters with use_adapter)

Proposed analysis: in an interactive session the agent goes through four stages before the batch runs:
  Questions (what counts as one n, what counts as positive), Proposed metrics (each with its settings, which you
  can change), Demonstration on a sample (numbers and a QC image), and Confirmed.
  --no-plan, /plan off, or "planFirst": "off" in settings.json skips it. --plan turns it on for a -p run.
  A step that processes many files waits for a confirmed demonstration. /pilot off skips that.
  CUVETTE_NO_OPEN=1 or "openImages": "off" keeps the QC images from opening on screen.

cuvette --version shows the version. cuvette help shows this text.

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
    method: { type: "string" },
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
    static: { type: "boolean" },
    installed: { type: "boolean" },
    registry: { type: "boolean" },
    drive: { type: "boolean" },
    gui: { type: "boolean" },
    tool: { type: "string", multiple: true },
    generic: { type: "boolean" },
    "bypass-permissions": { type: "boolean" },
    "trust-folder": { type: "boolean" },
    plan: { type: "boolean" },
    "no-plan": { type: "boolean" },
    fix: { type: "boolean" },
    "no-self-test": { type: "boolean" },
    "no-open": { type: "boolean" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
});

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const planSetting = () => (o.plan ? { planFirst: true } : o["no-plan"] ? { planFirst: false } : {});
const FORMATS = new Set(["text", "json", "stream-json"]);
const outputFolder = () => {
  const v = str(o.output);
  return v && !FORMATS.has(v) ? { output_folder: v } : {};
};
const trustFolder = !!o["trust-folder"];
const bypass = () => ({ ...(o["bypass-permissions"] ? { permissionMode: "bypass" as const } : {}), ...outputFolder() });

async function headless(prompt: string) {
  const { Session } = await import("./core/session.ts");
  const { applyHeadlessSetup, attachHeadless, readJsonObject } = await import("./core/headless.ts");
  const readJson = (p?: string) => {
    if (!p) return undefined;
    try {
      return readJsonObject(p);
    } catch (e) {
      fail(`Cannot read the JSON file ${p}: ${(e as Error).message}`);
    }
  };
  const answers = (readJson(str(o.answers)) ?? {}) as Record<string, unknown>;
  const allow = new Set((str(o.allow) ?? "").split(",").filter(Boolean));
  const out = FORMATS.has(str(o.output) ?? "") ? str(o.output)! : "text";
  const s = await Session.create({ adapters: (o.adapter as string[]) ?? [], model: str(o.model), referee: str(o.referee), mode: str(o.mode) as Mode, generic: !!o.generic, defaults: true, trustFolder, method: str(o.method), settings: { headless: true, ...bypass(), ...planSetting() } });
  if (s.trustNotice) process.stderr.write(`Note: ${plainText(s.trustNotice)}\n`);
  attachHeadless(s, { answers, allow });
  let printed = false;
  s.bus.on((e) => {
    if (out === "stream-json") process.stdout.write(JSON.stringify(e) + "\n");
    if (out !== "stream-json" && e.type === "entry" && (e.entry.kind === "error" || e.entry.kind === "notice")) process.stderr.write(`${e.entry.kind === "error" ? "Error" : "Note"}: ${plainText(String(e.entry.data.message ?? e.entry.data.text))}\n`);
    if (out === "text" && e.type === "entry" && e.entry.kind === "tool_result") process.stderr.write(`  ${e.entry.data.ok ? "●" : "✗"} ${plainText(String(e.entry.data.summary ?? e.entry.data.error ?? e.entry.data.tool))}\n`);
    if (out !== "stream-json" && e.type === "entry" && e.entry.kind === "finding") process.stderr.write(`Review ${String(e.entry.data.severity)}: ${plainText(String(e.entry.data.message))}\n`);
    if (out === "text" && e.type === "entry" && e.entry.kind === "assistant" && e.entry.data.final) {
      if (printed) console.log("\nCorrected answer. The review found problems in the answer above:\n");
      console.log(plainText(String(e.entry.data.annotated ?? e.entry.data.text)));
      if (e.entry.data.assumed) console.log(`\n${plainText(String(e.entry.data.assumed))}`);
      printed = true;
    }
  });
  applyHeadlessSetup(s, readJson(str(o.setup)) as Record<string, unknown> | undefined, answers);
  const answer = await s.send(prompt);
  if (s.endedBy !== "answer") process.exitCode = 1;
  const result = { session: s.id, dir: s.dir, answer, assumptions: s.assumptions, stop: s.endedBy, findings: s.findings.list(), review: s.reviewState, findingCount: s.reviewFindings, answerReadyMs: s.answerReadyMs ?? null, turnMs: s.turnMs ?? null };
  if (out === "json") console.log(JSON.stringify(result, null, 1));
  else if (out === "stream-json") process.stdout.write(JSON.stringify({ type: "result", ...result }) + "\n");
  else if (out === "text") console.log(`${printed ? "" : `${plainText(answer)}\n${s.assumptions ? `\n${plainText(s.assumptions)}\n` : ""}`}\nSession: ${s.id}\nFolder: ${plainText(s.workDir)}\nRecord: ${plainText(join(s.dir, "log.jsonl"))}`);
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
      const pasted = await readSecret("Paste your Claude API key (it starts with sk-ant-). Type ? and press Enter if you have no key: ");
      if (pasted.trim() === "?") {
        const kh = await import("./core/keyhelp.ts");
        console.log(`\n${kh.keyGuideText()}\n`);
        if (/^y/i.test((await ask("Open the keys page in your browser? [y/N] ")).trim())) (await import("./ui/commands.ts")).openWithOs(kh.KEYS_URL);
        i--;
        continue;
      }
      if (!pasted.trim()) {
        i--;
        continue;
      }
      if (!(await import("./core/credentials.ts")).keyProblem(pasted.trim())) process.stderr.write("Checking the key...\n");
      const r = await fs.chooseClaude(pasted);
      console.log(r.text);
      if (r.ok) break;
      if (i === 3) fail("No key was saved. Run cuvette key when you have a key, or run cuvette again and choose the local model.");
    }
  } else {
    const st = await fs.ollamaState();
    let model = st.recommended ?? fs.RECOMMENDED_LOCAL;
    if (st.models.length > 1) {
      console.log("\nModels in Ollama on this computer:");
      st.models.forEach((m, i) => console.log(`  ${i + 1}  ${m}${m === model ? " (recommended)" : ""}`));
      let a = (await ask(`Type a number, or press Enter for ${model}: `)).trim();
      while (/^\d+$/.test(a) && !st.models[Number(a) - 1]) a = (await ask(`Type a number from 1 to ${st.models.length}, or press Enter for ${model}: `)).trim();
      model = st.models[Number(a) - 1] ?? (a || model);
    }
    const r = await fs.chooseLocal(model);
    console.log(r.text);
    if (!r.ok) {
      console.log("Then start Cuvette again.");
      process.exit(0);
    }
  }
  console.log("\nChecking this computer for the programs that Cuvette uses (about 15 seconds)...");
  const dr = await import("./core/doctor.ts");
  const checks = await dr.runDoctor();
  console.log(dr.doctorText(checks, { only: ["missing", "old"], brief: true }) + "\nThe full list: cuvette doctor\n");
  const yes = (await ask("Try a 2-minute sample analysis? It uses a small public data set: extra sleep of 10 patients with two drugs (Student, 1908). [Y/n] ")).trim();
  if (/^n/i.test(yes)) return undefined;
  const s = fs.copySample();
  console.log(`Copied the data to ${s.file}. The results go in that folder.\n`);
  return { cwd: s.folder, message: s.request };
}

function needTerminal() {
  if (!process.stdin.isTTY) fail('The terminal app needs a terminal for the input. For a request from a pipe or a script, use cuvette -p "<request>". For the browser app, use cuvette app.');
  if (process.env.TERM === "dumb") fail('The terminal app cannot draw its screen in this terminal (TERM=dumb). For the browser app, use cuvette app. For no screen, use cuvette -p "<request>".');
}

async function interactive(resumeId?: string, folder?: string) {
  const { Session } = await import("./core/session.ts");
  const { runTui } = await import("./tui/app.tsx");
  const adapters = (o.adapter as string[]) ?? [];
  needTerminal();
  if (o.resume !== undefined && !resumeId) resumeId = str(o.resume) || (await chooseSession(false));
  let sample: { cwd: string; message: string } | undefined;
  if (!resumeId && !str(o.model) && process.stdin.isTTY && (await import("./core/firststart.ts")).needsFirstStart()) sample = await firstStart();
  if (resumeId) {
    const lock = await liveLock(resumeId);
    if (lock) fail(lock.app ? `This session is open in the app: ${lock.app}\nUse it there, or close the session there (Sessions, or /quit) and run this again.` : "This session is open in another terminal. Close it there first.");
  }
  if (!adapters.length && !resumeId && !sample) console.error("No adapter given. The agent proposes an adapter after your request, and you accept or change it. Use --adapter <name> to choose now; see `cuvette adapters`.");
  if (!adapters.length && !resumeId && !sample) {
    const dir = resolve(folder ?? process.cwd());
    const { suggestPrograms, suggestLines } = await import("./core/suggest.ts");
    const { adapterIndex } = await import("./adapters/catalog.ts");
    const hint = suggestPrograms(dir, adapterIndex(dir));
    const lines = suggestLines(hint);
    if (lines.length) console.error([...lines, `To use it, run: cuvette --adapter ${hint.matches[0].adapter}`].join("\n"));
  }
  const s = resumeId
    ? await Session.resume(resumeId, { model: str(o.model), interactive: true, trustFolder, settings: { ...bypass(), ...planSetting() } }).catch((e: Error) => fail(`${e.message}. Give a session id, a session folder or a project folder. See cuvette sessions.`))
    : await Session.create({ adapters, model: str(o.model), referee: str(o.referee), mode: str(o.mode) as Mode, generic: !!o.generic, defaults: true, interactive: true, trustFolder, cwd: sample?.cwd ?? folder, method: str(o.method), settings: { ...bypass(), ...planSetting() } }).catch((e: Error) => fail(e.message));
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
  if (o["no-open"]) process.env.CUVETTE_NO_OPEN = "1";
  const { startApp } = await import("./server/app.ts");
  const { openWithOs } = await import("./ui/commands.ts");
  let resume: string | undefined;
  if (o.resume !== undefined) {
    const { listSessions, defaultSession } = await import("./core/sessions.ts");
    resume = str(o.resume) || defaultSession(listSessions(), folder ?? process.cwd())?.info.id;
    if (!resume) fail("There is no session to resume.");
  }
  if (folder && !existsSync(folder)) fail(`No folder ${folder}.`);
  if (folder && !statSync(folder).isDirectory()) fail(`${folder} is not a folder. Give the folder that has the data.`);
  if (resume) {
    const url = await sharedApp(resume);
    if (url) {
      console.log(`This session is open in a terminal. The app shows the same session: ${url}`);
      if (!o["no-open"]) openWithOs(url);
      return;
    }
  }
  const a = await startApp({ folder, start: process.cwd(), resume, model: str(o.model), adapters: (o.adapter as string[]) ?? [], trustFolder }).catch((e: Error) => fail(`The app did not start: ${e.message}`));
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
  if (o.version) return console.log(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
  if (typeof o.print === "string") return headless(o.print);
  const [cmd, a1, a2, a3] = pos;
  if (typeof o.method === "string" && (cmd === undefined || existsSync(cmd))) {
    if (cmd && !statSync(cmd).isDirectory()) fail(`${cmd} is not a folder.`);
    return interactive(undefined, cmd ? resolve(cmd) : undefined);
  }
  switch (cmd) {
    case undefined:
      return interactive();
    case "resume":
      needTerminal();
      return interactive(a1 || (await chooseSession(true)));
    case "help":
      return console.log(HELP);
    case "app":
      return app(a1);
    case "adapters": {
      const { adapterDirs, loadAdapter } = await import("./adapters/manifest.ts");
      for (const [name, dir] of Object.entries(adapterDirs())) {
        try {
          const a = loadAdapter(dir);
          const m = a.manifest;
          const trust = (await import("./adapters/source.ts")).adapterTrust(dir).label;
          console.log(`${name.padEnd(16)} ${m.connection.kind.padEnd(7)} ${m.adapter.status.padEnd(9)} ${trust.padEnd(9)} ${m.adapter.field.padEnd(28)} ${m.program.name} ${m.program.tested_versions.join(", ")}  ${dir}`);
        } catch (e) {
          console.log(`${name.padEnd(16)} invalid: ${(e as Error).message.split("\n")[0]}`);
        }
      }
      return;
    }
    case "adapter": {
      const ac = await import("./adapters/commands.ts");
      if (ac.ADAPTER_SUBS.includes(a1 ?? "")) {
        process.exitCode = await ac.adapterCommand(a1!, a2, { ask, say: (l) => console.log(l) }, { runTests: !!o["run-tests"], model: str(o.model), installed: !!o.installed, registry: !!o.registry, by: str(o.by) ?? process.env.USER ?? "scientist" });
        return;
      }
      const checker = await import("./onboarding/checker.ts");
      if ((a1 === "check" || a1 === "approve") && !a2) return fail(`usage: cuvette adapter ${a1} <name|dir>${a1 === "approve" ? " --by <name>" : ""}`);
      if (a1 === "check" && o.drive) {
        const { runDrive, driveText } = await import("./onboarding/drive.ts");
        const results = await runDrive(a2, { model: str(o.model) ?? "ollama:qwen3:8b", only: (o.tool as string[]) ?? [] });
        console.log(driveText(results));
        process.exitCode = results.every((r) => r.rightTool && r.validArgs && r.reached !== false) ? 0 : 1;
        return;
      }
      if (a1 === "check") {
        const r = await checker.checkAdapter(a2, { runTests: !!o["run-tests"], gui: !!o.gui, static: !!o.static });
        for (const e of r.errors) console.log(`error: ${e}`);
        for (const w of r.warnings) console.log(`warning: ${w}`);
        for (const t of r.tests ?? []) console.log(t.skipped ? `skip ${t.id}: ${t.skipped}` : `${t.ok ? "pass" : "FAIL"} ${t.id}${t.failures.length ? ": " + t.failures.join("; ") : ""}`);
        console.log(r.ok ? "The adapter passes." : "The adapter does not pass.");
        process.exitCode = r.ok ? 0 : 1;
        return;
      }
      if (a1 === "approve") {
        const { adapterDirs } = await import("./adapters/manifest.ts");
        const dir = existsSync(a2) ? a2 : adapterDirs()[a2];
        if (!dir) fail(`No adapter ${a2}. cuvette adapters lists the names.`);
        await checker.approveAdapter(dir, str(o.by) ?? process.env.USER ?? "scientist");
        return console.log(`Approved ${a2}.`);
      }
      return fail("usage: cuvette adapter add|update|remove|list|audit|allow-code|check|approve");
    }
    case "onboard": {
      if (!a1) return fail("usage: cuvette onboard <program> --model <model> [--docs <url>] [--kind cli]");
      needTerminal();
      const { onboardCommand } = await import("./onboarding/agent.ts");
      const { Session } = await import("./core/session.ts");
      const { runTui } = await import("./tui/app.tsx");
      const plan = await onboardCommand(a1, { model: str(o.model) ?? "claude", docs: (o.docs as string[]) ?? [], kind: str(o.kind) });
      process.env.CUVETTE_DRAFT_DIR = plan.draftDir;
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
        return console.log((k.from === "none" ? "There is no Claude API key." : `${cred.maskKey(k.key!)} from ${k.from === "env" ? "ANTHROPIC_API_KEY" : cred.credentialsPath()}`) + (ws ? `\nWorkspace ID: ${ws}` : ""));
      }
      if (a1 === "remove") return console.log(cred.removeClaudeKey() ? `Removed the key from ${cred.credentialsPath()}.` : "There is no saved key.");
      if (a1 === "workspace") {
        cred.saveClaudeWorkspace(a2 ?? "");
        return console.log(a2 ? `Saved the workspace ID ${a2}. Each request now sends it.` : "Removed the workspace ID.");
      }
      if (a1 === "help" || a1 === "open") {
        const kh = await import("./core/keyhelp.ts");
        if (a1 === "help") return console.log(kh.keyGuideText());
        (await import("./ui/commands.ts")).openWithOs(kh.KEYS_URL);
        return console.log(`Opening ${kh.KEYS_URL}`);
      }
      if (a1) return fail("usage: cuvette key [status|remove|workspace <id>|help|open]");
      const key = (await readSecret("Claude API key (type ? for help): ")).trim();
      if (key === "?") return console.log((await import("./core/keyhelp.ts")).keyGuideText());
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
      if (a1 === "remove") return console.log(cred.removeElabftw() ? "Removed the eLabFTW address and key." : "There is no saved eLabFTW key.");
      if (a1 === "setup") {
        const url = (str(o.url) ?? (await ask("eLabFTW address (https://...): "))).trim();
        const key = (await readSecret("eLabFTW API key: ")).trim();
        const problem = cred.elabftwProblem(url, key);
        if (problem) return fail(problem);
        return console.log(`Saved the address and key ${cred.maskKey(key)} to ${cred.saveElabftw(url, key)}.`);
      }
      if (a1 !== "push" && a1 !== "link") return fail("usage: cuvette eln setup|status|remove|push <session>|link <session> <id>");
      if (!a2) return fail(`usage: cuvette eln ${a1} <session>${a1 === "link" ? " <id>" : ""}`);
      if (a1 === "link" && !/^\d+$/.test(a3 ?? "")) return fail("usage: cuvette eln link <session> <experiment id>");
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
      console.log(`Total: $${total.toFixed(2)} (list prices, from ${spendFile()})${b ? `. Budget: $${b.toFixed(2)} (CUVETTE_BUDGET_USD).` : ""}`);
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
        if (!r) return fail(`No setting named ${a2}. Type cuvette config to see the names.`);
        return console.log([line(r), r.def.help, ...(r.def.details?.(ctx) ?? []).map((d) => `  ${d}`)].join("\n"));
      }
      if (a1 === "set") {
        if (!a2 || a3 === undefined) return fail("usage: cuvette config set <name> <value> [--user|--project]");
        const scope = o.project ? "project" : "user";
        try {
          const r = await st.changeSetting(ctx, a2, a3, scope);
          console.log(`${a2}: ${st.show(r.old)} -> ${st.show(r.value)} (${st.scopeLabel(scope)}, ${st.settingsPath(scope, ctx.cwd)})${r.note ? `\n${r.note}` : ""}`);
        } catch (e) {
          fail((e as Error).message);
        }
        return;
      }
      return fail("usage: cuvette config [get <name> | set <name> <value> [--user|--project]]");
    }
    case "trust": {
      const tr = await import("./core/trust.ts");
      if (!a1 || a1 === "list") {
        const list = tr.trustedFolders();
        if (!list.length) return console.log("No folder is trusted. cuvette trust add <folder> trusts one.");
        for (const e of list) {
          const t = existsSync(e.path) ? tr.trustStatus(e.path) : undefined;
          console.log(`${tr.oneLine(e.path)}  ${!t ? "missing" : t.state === "trusted" ? "trusted" : t.state === "changed" ? "files changed: asks again" : tr.stateLabel(t)}  ${e.trusted.slice(0, 10)}`);
        }
        return;
      }
      const folder = resolve(a2 ?? ".");
      if (a1 === "add") {
        if (!existsSync(folder)) return fail(`No folder ${folder}.`);
        const t = tr.trustStatus(folder);
        tr.trustFolder(folder);
        console.log([`Trusted ${tr.oneLine(t.scan.folder)}.`, ...(t.state === "none" ? ["It has no settings, hooks or adapters that need trust now. A file that it gets later asks again."] : tr.folderLines(t.scan, true))].join("\n"));
        return;
      }
      if (a1 === "remove") return console.log(tr.untrustFolder(folder) ? `${tr.folderKey(folder)} is not trusted now.` : `${tr.folderKey(folder)} was not in the list.`);
      if (a1 === "show") {
        const t = tr.trustStatus(folder);
        return console.log([`${tr.oneLine(t.scan.folder)}: ${tr.stateLabel(t)}`, ...(t.state === "none" ? [] : tr.folderLines(t.scan)), ...t.changes.map((c) => `  ${c}`)].join("\n"));
      }
      return fail("usage: cuvette trust [list | add <folder> | remove <folder> | show <folder>]");
    }
    case "doctor": {
      const dr = await import("./core/doctor.ts");
      const tty = process.stderr.isTTY;
      const progress = (t: string) => tty && process.stderr.write(`\rChecking ${t}...`.padEnd(40));
      const only = (o.adapter as string[] | undefined)?.[0];
      const { adapterDirs, loadAdapter } = await import("./adapters/manifest.ts");
      if (only && !adapterDirs()[only]) return fail(`No adapter named ${only}. cuvette adapters lists the names.`);
      const scope = only ? { adapters: { [only]: loadAdapter(adapterDirs()[only]!).manifest } } : {};
      let checks = await dr.runDoctor({ onProgress: progress, ...scope });
      if (tty) process.stderr.write("\r".padEnd(41) + "\r");
      console.log(dr.doctorText(checks));
      let selfTestFailed = false;
      if (!o["no-self-test"]) {
        const rows = await dr.runSelfTests(checks, { only, onProgress: (t) => tty && process.stderr.write(`\rTesting ${t}...`.padEnd(40)) });
        if (tty) process.stderr.write("\r".padEnd(41) + "\r");
        console.log(`\n${dr.selfTestText(rows)}`);
        selfTestFailed = rows.some((r) => r.status === "fail");
      }
      if (o.fix) {
        const cmds = dr.safeFixes(checks);
        if (!cmds.length) console.log("\nNothing to install: no Python environment or R package set is missing that --fix can install.");
        else {
          console.log(`\nThese commands install the missing parts:\n${cmds.map((c) => `  ${c}`).join("\n")}`);
          if (!/^y(es)?$/i.test((await ask("Run them now? [y/N] ")).trim())) {
            process.exitCode = dr.canStart(checks) && !selfTestFailed ? 0 : 1;
            return console.log("Nothing was installed.");
          }
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
      process.exitCode = dr.canStart(checks) && !selfTestFailed ? 0 : 1;
      return;
    }
    case "programs": {
      const pr = await import("./core/programs.ts");
      const { planFor, runFor } = await import("./ui/programs.ts");
      const tty = process.stderr.isTTY;
      if (!a1) {
        if (tty) process.stderr.write("Checking the programs...");
        const rows = await pr.listPrograms({ cwd: process.cwd() });
        if (tty) process.stderr.write("\r".padEnd(30) + "\r");
        console.log(pr.programsTable(rows));
        return console.log(`\nLog: ${pr.logFile()}\nChange one: cuvette programs install|update|remove|path|enable|disable|check <adapter>`);
      }
      const verbs: Record<string, string> = { network: a3 === "off" ? "network-off" : "network-on", code: a3 === "off" ? "code-off" : "code-on" };
      const action = verbs[a1] ?? a1;
      if (!pr.isProgramAction(action) || ((a1 === "network" || a1 === "code") && a3 !== "on" && a3 !== "off")) return fail("usage: cuvette programs [install|update|remove|path|enable|disable|check|approve <adapter>] [network|code <adapter> on|off]");
      if (!a2 && action === "check") {
        const rows = await pr.listPrograms({ cwd: process.cwd() });
        return console.log(pr.programsTable(rows));
      }
      if (!a2) return fail(`usage: cuvette programs ${a1} <adapter>${a1 === "path" ? " <path|none>" : ""}`);
      if (action === "path" && !a3) return fail("usage: cuvette programs path <adapter> <path|none>");
      const by = str(o.by) ?? process.env.USER ?? "scientist";
      const r = await planFor(a2, action, { cwd: process.cwd(), path: action === "path" && a3 !== "none" ? a3 : undefined, by });
      if (!r.plan) return fail(r.error ?? "no plan");
      const plan = r.plan;
      if (action !== "check") console.log(pr.planText(plan));
      if (plan.refused) return void (process.exitCode = 1);
      if (!plan.runs) return;
      let confirmed = false;
      if (plan.confirm) {
        confirmed = /^y(es)?$/i.test((await ask(`${plan.confirm}? [y/N] `)).trim());
        if (!confirmed) return console.log("Nothing changed.");
      }
      const done = await runFor(plan, "command line", { cwd: process.cwd(), by, confirmed, onLine: (l) => console.log(l) });
      console.log(done.text);
      process.exitCode = done.ok ? 0 : 1;
      return;
    }
    case "install-finder-action":
    case "uninstall-finder-action":
    case "install-launcher":
    case "uninstall-launcher": {
      if (process.platform !== "darwin") return fail("This command works only on macOS.");
      const mac = await import("./core/macos.ts");
      if (cmd === "install-finder-action") {
        const p = mac.cuvettePaths();
        const dir = mac.installFinderAction({ paths: p });
        return console.log(`Installed the Quick Action "${mac.ACTION_NAME}" in ${dir}.\nIt runs ${p.node} ${p.cuvette}.\nIn Finder, Control-click a folder or a file, then choose Quick Actions > ${mac.ACTION_NAME}.\nIf it is not in the menu, open System Settings > Keyboard > Keyboard Shortcuts > Services > Files and Folders and turn it on.\nTo remove it: cuvette uninstall-finder-action`);
      }
      if (cmd === "uninstall-finder-action") return console.log(mac.uninstallFinderAction() ? `Removed ${mac.actionPath()}.` : "The Quick Action is not installed.");
      if (cmd === "install-launcher") {
        const p = mac.cuvettePaths();
        const dir = mac.installLauncher({ paths: p });
        return console.log(`Installed ${dir}.\nIt runs ${p.node} ${p.cuvette}.\nDouble-click Cuvette in Applications in your home folder (or find it with Spotlight). It asks for a folder, then starts Cuvette in that folder.\nTo remove it: cuvette uninstall-launcher`);
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
      if (!a1) return fail("usage: cuvette export <session> --format html|md|jsonl|pdf|protocol|script|notebook|flow|eln|xlsx|pptx. See cuvette sessions.");
      const { Session } = await import("./core/session.ts");
      const s = await Session.resume(a1, { model: "fake:" });
      const fmt = str(o.format) ?? "html";
      if (fmt === "pptx" || (fmt === "pdf" && (o.images || o.order || o["per-page"] || o.size))) {
        const deck = await import("./core/imagedeck.ts");
        const opts = deck.parseDeckArgs([fmt, ...[o.images, o.order, o["per-page"], o.size].map(str).filter((v): v is string => !!v)]);
        if (typeof opts === "string") fail(opts.replace("Use: /export images", "Use: cuvette export <session> --format"));
        console.log(deck.deckLine(await s.exportImages(opts)));
        return s.close();
      }
      try {
        console.log(await s.exportAs(fmt as never));
      } catch (e) {
        console.error((e as Error).message);
        process.exitCode = 1;
      }
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
    case "method": {
      const m = await import("./core/methods.ts");
      if (!a1 || a1 === "list") {
        const list = m.listMethods(process.cwd());
        if (!list.length) return console.log(`No saved methods in ${m.methodsDir()}. In a session, confirm the analysis, then type /save-method <name>.`);
        for (const x of list) console.log(`${x.name.padEnd(24)} ${x.saved.slice(0, 10)}  ${(x.where === "home" ? "home" : x.trusted ? "project" : "project, not trusted").padEnd(20)} ${x.question.slice(0, 80)}`);
        return;
      }
      try {
        if (a1 === "show" && a2) return console.log(m.methodText(m.loadMethod(a2, process.cwd())));
        if (a1 === "delete" && a2) return console.log(`Deleted ${m.deleteMethod(a2)}`);
        if (a1 === "export" && a2) return console.log(`Wrote ${m.exportMethod(a2, a3 ?? process.cwd())}`);
        if (a1 === "import" && a2) return console.log(`Saved ${m.importMethod(a2, a3)}`);
      } catch (e) {
        fail((e as Error).message);
      }
      return fail("Use: cuvette method list | show <name> | delete <name> | export <name> [<file or folder>] | import <file> [<name>]");
    }
    case "replay": {
      if (!a1) return fail("usage: cuvette replay <flow.json> [--input name=path ...] [--session <id>]");
      const { replayFlow } = await import("./core/replay.ts");
      const inputs = Object.fromEntries(((o.input as string[]) ?? []).map((kv) => (kv.includes("=") ? [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)] : [kv, ""])));
      const { findPlace } = await import("./core/places.ts");
      const sessionDir = o.session ? (findPlace(str(o.session)!)?.recordDir ?? fail(`No session ${str(o.session)}. See cuvette sessions.`)) : undefined;
      const { mkdtempSync, rmSync } = await import("node:fs");
      const { tmpdir } = await import("node:os");
      const workDir = mkdtempSync(join(tmpdir(), "cuvette-run-"));
      const r = await replayFlow(a1, inputs, { sessionDir, workDir }).finally(() => rmSync(workDir, { recursive: true, force: true }));
      for (const st of r.steps) console.log(st.skipped ? `- ${st.tool} skipped: ${st.skipped}` : `${st.ok ? "●" : "✗"} ${st.tool} ${st.diffs.length ? "differs: " + st.diffs.join("; ") : st.before ? "same" : `ran, no original to compare: ${JSON.stringify(st.metrics)}`}`);
      if (r.steps.some((st) => !st.ok || st.diffs.length)) process.exitCode = 1;
      if (r.steps.every((st) => st.skipped)) {
        console.error("Replay ran no step: the flow has no adapter step.");
        process.exitCode = 1;
      }
      return;
    }
    case "run-step": {
      if (!a1 || !a2) return fail("usage: cuvette run-step <adapter> <tool> '<json args>'");
      let args: Record<string, unknown> = {};
      try {
        if (a3) args = JSON.parse(a3);
      } catch {
        return fail(`The arguments are not valid JSON: ${a3}`);
      }
      const { ToolRunner } = await import("./core/replay.ts");
      const run = await ToolRunner.start([a1]);
      try {
        const r = await run.call(a1, a2, args);
        console.log(JSON.stringify(r, null, 1));
        if (!r.ok) process.exitCode = 1;
      } finally {
        await run.close();
      }
      return;
    }
    case "status": {
      const { AnalysisRecord } = await import("./core/record.ts");
      const { listSessions, defaultSession } = await import("./core/sessions.ts");
      const { findPlace, inProject } = await import("./core/places.ts");
      const st = await import("./core/status.ts");
      const cwd = process.cwd();
      const ref = a1 ?? defaultSession(listSessions(), cwd)?.info.id ?? fail("There is no session here. Give a session id or a session folder. See cuvette sessions.");
      const place = findPlace(ref, { cwd }) ?? fail(`No session ${ref}. See cuvette sessions.`);
      if (!existsSync(join(place.recordDir, "log.jsonl"))) fail(`No session ${ref}. See cuvette sessions.`);
      const record = new AnalysisRecord(place.recordDir, place.id, place.legacy ? {} : { workDir: place.outDir, exportDir: place.outDir, project: inProject(place) ? place.project : undefined });
      const { current, labels } = await st.currentFromDisk(record, place.legacy ? cwd : place.project);
      const live = await st.liveReasons(record, current);
      console.log(`Session ${place.id}\n`);
      console.log(st.statusText(st.stepStatus(record, { live, labels }), `To run the out-of-date steps again, type cuvette resume ${place.id}, then type /rerun.`));
      return;
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
        if (!models.length) return fail("usage: cuvette bench papers [--papers id,id|all] --models spec,spec [--runs N] [--out file] [--dry-run]");
        const papers = str(o.papers);
        const runs = o.runs === undefined ? 1 : Number(str(o.runs));
        if (!Number.isInteger(runs) || runs < 1) return fail(`--runs must be a whole number of 1 or more, not "${str(o.runs) ?? ""}".`);
        const r = await runPapers({ papers: !papers || papers === "all" ? "all" : papers.split(",").filter(Boolean), models, runs, out: str(o.out), dryRun: !!o["dry-run"], blind: !o["no-blind"] });
        if (r.problems.length) process.exitCode = 1;
        if (r.paths) console.log(`${r.paths.md}\n${r.paths.json}`);
        return;
      }
      if (a1 === "rescore") {
        const results = (str(o.results) ?? "").split(",").filter(Boolean);
        if (!results.length) return fail("usage: cuvette bench rescore --results a.json[,b.json]");
        const { rescoreResults } = await import("./bench/papers.ts");
        for (const f of results) {
          const r = rescoreResults(f);
          console.log(`${f}: rescored ${r.rescored} of ${r.runs} runs`);
        }
        return;
      }
      if (a1 === "compare") {
        const results = (str(o.results) ?? "").split(",").filter(Boolean);
        if (results.length !== 2) return fail("usage: cuvette bench compare --results a.json,b.json [--model spec]");
        const { compareFiles } = await import("./bench/papers-compare.ts");
        console.log(compareFiles(results[0]!, results[1]!, str(o.model)));
        return;
      }
      if (a1 === "site") {
        const results = (str(o.results) ?? "").split(",").filter(Boolean);
        const out = str(o.out);
        if (!results.length || !out) return fail("usage: cuvette bench site --results a.json[,b.json] --out <folder>");
        const { buildSite } = await import("./bench/papers-site.ts");
        const info = buildSite({ results, out, log: (l) => console.error(l) });
        console.log(`${info.index}\n${info.images.length} images, ${info.papers} papers, ${info.runs} runs`);
        return;
      }
      if (a1 === "cases") {
        const results = (str(o.results) ?? "").split(",").filter(Boolean);
        const out = str(o.out);
        if (!results.length || !out) return fail("usage: cuvette bench cases --results a.json[,b.json] --out <folder> [--style site/style.css]");
        const { buildCases } = await import("./bench/papers-cases.ts");
        const info = buildCases({ results, out, style: str(o.style), log: (l) => console.error(l) });
        for (const p of info.problems) console.error(`problem: ${p}`);
        console.log(`${info.index}\n${info.pages.length} pages, ${info.records.length} session records`);
        return;
      }
      const { runBench } = await import("./bench/run.ts");
      const { scenarioIds } = await import("./bench/scenario.ts");
      const g = str(o.guidance) ?? "both";
      if (g !== "on" && g !== "off" && g !== "both") return fail(`--guidance must be on, off or both, not "${g}".`);
      const ids = !a1 || a1 === "all" ? "all" : a1.split(",").filter(Boolean);
      const unknown = ids === "all" ? [] : ids.filter((id) => !scenarioIds().includes(id));
      if (unknown.length) return fail(`No scenario ${unknown.join(", ")}. The scenarios: ${scenarioIds().join(", ")}, all, papers, rescore, compare, site, cases.`);
      const r = await runBench(ids, { model: str(o.model) ?? "claude", guidance: g });
      console.log(typeof r === "string" ? r : JSON.stringify(r, null, 1));
      return;
    }
    case "mcp": {
      const { runMcpServer } = await import("./mcp-server.ts");
      return runMcpServer({ adapters: (o.adapter as string[]) ?? [], trustFolder });
    }
    default:
      fail(`Unknown command: ${cmd}. Type cuvette help to see the commands.`);
  }
}

main().catch((e) => fail(`cuvette: ${(e as Error).message}`));

let lines: string[] | undefined;

async function ask(prompt: string): Promise<string> {
  process.stderr.write(prompt);
  if (!lines) {
    let all = "";
    if (process.stdin.isTTY) {
      const { createInterface } = await import("node:readline");
      const rl = createInterface({ input: process.stdin, terminal: false });
      const stop = () => {
        process.stderr.write("\n");
        process.exit(130);
      };
      process.once("SIGINT", stop);
      return new Promise((resolve) => {
        rl.once("line", (l) => (process.off("SIGINT", stop), resolve(l), rl.close()));
        rl.once("close", () => (process.off("SIGINT", stop), resolve("")));
      });
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
        if (ch === "\u0003") {
          input.setRawMode(false);
          process.stderr.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          if (v.length) (v = v.slice(0, -1)), process.stderr.write("\b \b");
        } else if (ch >= " ") (v += ch), process.stderr.write("*");
      }
    };
    input.on("data", on);
  });
}
