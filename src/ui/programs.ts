import { spawn } from "node:child_process";
import { loadAdapter } from "../adapters/manifest.ts";
import { ACTION_LABEL, availableActions, listPrograms, planAction, runAction, type Action, type Plan, type ProgramRow, type ProgramsOpts, type RunOpts, type Via } from "../core/programs.ts";

export type ProgramHooks = Partial<RunOpts>;

export interface ProgramGroup {
  field: string;
  rows: ProgramRow[];
}

export function groupRows(rows: ProgramRow[]): ProgramGroup[] {
  const out: ProgramGroup[] = [];
  for (const r of rows) {
    const last = out.at(-1);
    if (last && last.field === r.field) last.rows.push(r);
    else out.push({ field: r.field, rows: [r] });
  }
  return out;
}

export const fieldTitle = (f: string) => f.charAt(0).toUpperCase() + f.slice(1);

export function rowActions(r: ProgramRow): { action: Action; label: string }[] {
  return availableActions(r).map((a) => ({ action: a, label: ACTION_LABEL[a] }));
}

export function summaryLine(rows: ProgramRow[]): string {
  const n = (f: (r: ProgramRow) => boolean) => rows.filter(f).length;
  return `${rows.length} adapters: ${n((r) => ["installed", "custom", "found"].includes(r.state))} with the program, ${n((r) => r.state === "missing")} missing, ${n((r) => r.state === "old")} old, ${n((r) => !!r.access.off)} off.`;
}

export async function planFor(name: string, action: Action, opts: ProgramsOpts & { path?: string; by?: string } = {}): Promise<{ plan?: Plan; row?: ProgramRow; error?: string }> {
  const [row] = await listPrograms({ ...opts, only: [name] });
  if (!row) return { error: `No adapter named ${name}. Type /programs to see the names.` };
  const manifest = opts.adapters?.[name]?.manifest ?? (action === "path" ? loadAdapter(row.root).manifest : undefined);
  return { row, plan: await planAction(row, action, { path: opts.path, by: opts.by, locate: opts.locate, manifest }) };
}

export async function runFor(plan: Plan, via: Via, hooks: ProgramHooks & { confirmed?: boolean; onLine?: (l: string) => void } = {}): Promise<{ ok: boolean; text: string; rows?: ProgramRow[] }> {
  return runAction(plan, { ...hooks, via });
}

export function copyText(text: string): boolean {
  if (process.env.VITEST || process.platform !== "darwin") return false;
  try {
    const child = spawn("pbcopy", [], { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", () => {});
    child.stdin.end(text);
    return true;
  } catch {
    return false;
  }
}

export function mergeRows(rows: ProgramRow[], fresh: ProgramRow[]): ProgramRow[] {
  const by = new Map(fresh.map((r) => [r.name, r]));
  return rows.map((r) => by.get(r.name) ?? r);
}
