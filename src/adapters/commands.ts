import { existsSync } from "node:fs";
import { auditLines, runReview } from "./audit.ts";
import { cardLines, discardPlan, installedRows, installLines, inspectDir, prepareAdd, prepareUpdate, removeLines, reviewPlan, type InstallPlan } from "./install.ts";
import { adapterDirs } from "./manifest.ts";
import { fetchIndex, trustedRegistry } from "./registry.ts";
import { confirmCode, adapterTrust, readInstalled, userAdapterDir } from "./source.ts";
import { runAction, planFromInstall, planAction, listPrograms } from "../core/programs.ts";

export interface Io {
  ask(prompt: string): Promise<string>;
  say(line: string): void;
}

export interface Flags {
  runTests?: boolean;
  model?: string;
  installed?: boolean;
  registry?: boolean;
  by?: string;
}

const yes = (s: string) => /^y(es)?$/i.test(s.trim());

async function decide(p: InstallPlan, io: Io, flags: Flags): Promise<number> {
  io.say(["", ...installLines(p)].join("\n"));
  if (p.refused) {
    io.say(p.refused);
    discardPlan(p.id);
    return 1;
  }
  if (p.review && p.card.trust === "unlisted" && yes(await io.ask(`Ask Claude to review the files before you decide? This sends them to the Anthropic API and costs ${p.review.text}. [y/N] `))) {
    try {
      io.say(auditLines((await reviewPlan(p.id, { model: flags.model })).card.audit!).join("\n"));
    } catch (e) {
      io.say(`The review did not run: ${(e as Error).message}`);
    }
  }
  const warn = p.card.trust === "unlisted" ? " This adapter is Unlisted." : "";
  if (!yes(await io.ask(`${p.mode === "add" ? "Install" : "Update"} ${p.name} ${p.entry.version}?${warn} [y/N] `))) {
    discardPlan(p.id);
    io.say("Nothing changed.");
    return 0;
  }
  const done = await runAction(planFromInstall(p), { via: "command line", confirmed: true, by: flags.by });
  io.say(done.text);
  return done.ok ? 0 : 1;
}

async function add(source: string | undefined, io: Io, flags: Flags): Promise<number> {
  if (!source) return usage(io);
  let plan: InstallPlan;
  try {
    plan = await prepareAdd(source, { runTests: flags.runTests });
  } catch (e) {
    io.say((e as Error).message);
    return 1;
  }
  return decide(plan, io, flags);
}

async function update(name: string | undefined, io: Io, flags: Flags): Promise<number> {
  const names = name ? [name] : Object.keys(readInstalled());
  if (!names.length) {
    io.say("No adapter is installed with cuvette adapter add.");
    return 0;
  }
  let code = 0;
  for (const n of names) {
    let plan: InstallPlan;
    try {
      plan = await prepareUpdate(n, { runTests: flags.runTests });
    } catch (e) {
      io.say((e as Error).message);
      code = 1;
      continue;
    }
    if (plan.upToDate) {
      io.say(`${n} is up to date: version ${plan.entry.version}${plan.entry.commit ? `, commit ${plan.entry.commit.slice(0, 12)}` : ""}.`);
      discardPlan(plan.id);
      continue;
    }
    code = Math.max(code, await decide(plan, io, flags));
  }
  return code;
}

async function remove(name: string | undefined, io: Io, flags: Flags): Promise<number> {
  if (!name) return usage(io);
  if (!readInstalled()[name]) {
    io.say(`${name} was not installed with cuvette adapter add. Cuvette removes only those adapters.`);
    return 1;
  }
  io.say(removeLines(name).join("\n"));
  if (!yes(await io.ask(`Remove ${name}? [y/N] `))) {
    io.say("Nothing changed.");
    return 0;
  }
  const rows = await listPrograms({ quick: true, only: [name] });
  const row = rows[0];
  const plan = row ? await planAction(row, "adapter-remove") : { action: "adapter-remove" as const, name, title: "", lines: [], runs: true, confirm: "Remove" };
  const done = await runAction(plan, { via: "command line", confirmed: true, by: flags.by });
  io.say(done.text);
  return done.ok ? 0 : 1;
}

function table(head: string[], rows: string[][]): string {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const fmt = (r: string[]) => r.map((c, i) => c.padEnd(w[i]!)).join("  ").trimEnd();
  return [fmt(head), fmt(w.map((n) => "-".repeat(n))), ...rows.map(fmt)].join("\n");
}

async function list(io: Io, flags: Flags): Promise<number> {
  if (flags.registry) {
    try {
      const idx = await fetchIndex();
      io.say(idx.adapters.length ? table(["Name", "Version", "Program", "Field", "Trust", "Needs"], idx.adapters.map((a) => [a.name, a.version, a.program, a.field, a.trust === "checked" && trustedRegistry(idx.registry) ? "Checked" : "Unlisted", [a.needs.network ? "network" : "", a.needs.code ? "code" : "", ...a.needs.programs].filter(Boolean).join(", ") || "nothing"])) : `The registry ${idx.registry} lists no adapters.`);
      return 0;
    } catch (e) {
      io.say((e as Error).message);
      return 1;
    }
  }
  if (!flags.installed) {
    io.say("Use: cuvette adapter list --installed, or cuvette adapter list --registry");
    return 1;
  }
  const rows = installedRows();
  io.say(rows.length ? table(["Name", "Version", "Trust", "State", "Source", "Commit", "SHA-256"], rows.map((r) => [r.name, r.version, r.trust, r.state, r.source, r.commit.slice(0, 12), r.sha256.slice(0, 16)])) : "No adapter is installed with cuvette adapter add.");
  return 0;
}

async function audit(arg: string | undefined, io: Io, flags: Flags): Promise<number> {
  if (!arg) return usage(io);
  const dir = existsSync(arg) ? arg : readInstalled()[arg] ? userAdapterDir(arg) : adapterDirs()[arg];
  if (!dir) {
    io.say(`No folder or adapter named ${arg}.`);
    return 1;
  }
  let inspected;
  try {
    inspected = await inspectDir(dir);
  } catch (e) {
    io.say((e as Error).message);
    return 1;
  }
  io.say(cardLines(inspected.card).join("\n"));
  const { estimateReview } = await import("./audit.ts");
  const est = estimateReview(dir, inspected.lint, flags.model);
  if (!yes(await io.ask(`Ask Claude to review the code and text? This sends the files to the Anthropic API and costs ${est.text}. [y/N] `))) {
    io.say("No review.");
    return inspected.lint.ok ? 0 : 1;
  }
  try {
    const a = await runReview(dir, inspected.lint, { model: flags.model });
    io.say(auditLines(a).join("\n"));
    return a.verdict === "pass" && inspected.lint.ok ? 0 : 1;
  } catch (e) {
    io.say(`The review did not run: ${(e as Error).message}`);
    return 1;
  }
}

async function allowCode(name: string | undefined, io: Io): Promise<number> {
  if (!name) return usage(io);
  const dir = readInstalled()[name] ? userAdapterDir(name) : adapterDirs()[name];
  if (!dir) {
    io.say(`No adapter named ${name}.`);
    return 1;
  }
  const t = adapterTrust(dir);
  if (t.codeConfirmed) {
    io.say(`${name} needs no confirmation.`);
    return 0;
  }
  io.say(`${name} is Unlisted: nobody reviewed or checked it.\nCuvette runs this code with your user permissions: ${t.codeFiles.join(", ")}.\nAllow it only if you read every one of these files. The permission ends when the files change.`);
  if (!yes(await io.ask(`Allow the code of ${name} to run? [y/N] `))) {
    io.say("Nothing changed.");
    return 0;
  }
  confirmCode(dir);
  io.say(`${name}: the code may run.`);
  return 0;
}

function usage(io: Io): number {
  io.say("Use: cuvette adapter add <name | git address | folder | .zip> [--run-tests]\n     cuvette adapter update [name]\n     cuvette adapter remove <name>\n     cuvette adapter list --installed | --registry\n     cuvette adapter audit <folder | name> [--model <claude model>]\n     cuvette adapter allow-code <name>");
  return 1;
}

export const ADAPTER_SUBS = ["add", "update", "remove", "list", "audit", "allow-code"];

export async function adapterCommand(sub: string, arg: string | undefined, io: Io, flags: Flags = {}): Promise<number> {
  switch (sub) {
    case "add":
      return add(arg, io, flags);
    case "update":
      return update(arg, io, flags);
    case "remove":
      return remove(arg, io, flags);
    case "list":
      return list(io, flags);
    case "audit":
      return audit(arg, io, flags);
    case "allow-code":
      return allowCode(arg, io);
    default:
      return usage(io);
  }
}
