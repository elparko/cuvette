import { homedir } from "node:os";
import { relative } from "node:path";
import { removeClaudeKey, removeElabftw } from "../core/credentials.ts";
import { canReset, changeSetting, describe, resetSetting, settingsPath, show, type Scope, type SettingCtx, type SettingDef, type SettingRow } from "../core/settings.ts";
import { budgetUsd, modelPrice, monthStart, totalSpend } from "../core/spend.ts";
import { DEFAULT_CLAUDE_MODEL } from "../providers/claude.ts";
import { CLAUDE_MODELS } from "../providers/index.ts";

export type Editor =
  | { t: "message"; text: string; color?: string }
  | { t: "edit"; card: "key" | "eln" | "programs" }
  | { t: "text"; def: SettingDef }
  | { t: "value"; def: SettingDef; options: string[]; sel: number };

export type Control = "toggle" | "segmented" | "options" | "select" | "number" | "text" | "path" | "secret" | "card" | "info";

export const RESET = "Reset to default";

export const SCOPE_BUTTON: Record<Scope, string> = { session: "This session", user: "Me (all projects)", project: "This project" };
const SAVED_FOR: Record<Scope, string> = { session: "Saved for this session.", user: "Saved for me (all projects).", project: "Saved for this project." };
const BADGE: Record<string, string> = { default: "Default", user: "User", project: "Project", session: "This session", env: "Environment", ant: "ant login" };

export function settingRows(ctx: SettingCtx, busy: boolean): SettingRow[] {
  return describe(ctx).map((r) => ({ ...r, locked: !!(r.def.lockedInTurn && busy) }));
}

export function sections(rows: SettingRow[]): string[] {
  return [...new Set(rows.map((r) => r.def.group))];
}

export function matches(r: SettingRow, query: string): boolean {
  const text = `${r.def.label} ${r.def.help}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w));
}

export function controlOf(r: SettingRow): Control {
  const d = r.def;
  if (d.secret) return "secret";
  if (d.edit) return "card";
  if (!d.scopes.length) return "info";
  if (d.number) return "number";
  if (d.path) return "path";
  if (d.list) return "text";
  const choices = d.choices?.() ?? [];
  if (!choices.length) return "text";
  if (choices.some((c) => choiceNote(d, c))) return "options";
  if (!d.free && choices.length === 2 && choices.includes("on") && choices.includes("off")) return "toggle";
  if (!d.free && choices.length <= 6 && choices.every((c) => c.length <= 12)) return "segmented";
  return "select";
}

export function choiceList(r: SettingRow): string[] {
  const options = r.def.choices?.() ?? [];
  return options.includes(r.value) || r.value === "not set" ? options : [r.value, ...options];
}

export function settingEditor(row: SettingRow): Editor {
  const d = row.def;
  if (row.locked) return { t: "message", text: lockText(row), color: "yellow" };
  if (d.edit) return { t: "edit", card: d.edit };
  if (!d.scopes.length) return { t: "message", text: "You cannot change this setting here." };
  const options = d.choices?.() ?? [];
  if (d.number || d.list || !options.length) return { t: "text", def: d };
  const list = choiceList(row);
  return { t: "value", def: d, options: canReset(row) ? [...list, RESET] : list, sel: Math.max(0, list.indexOf(row.value)) };
}

export function lockText(r: SettingRow): string {
  return `${r.def.label} cannot change until the turn ends. A change applies to the next message.`;
}

export function scopeText(s: Scope, cwd: string): string {
  return s === "session" ? SCOPE_BUTTON.session : `${SCOPE_BUTTON[s]}  ${tilde(settingsPath(s, cwd))}`;
}

export function tilde(p: string): string {
  const h = homedir();
  return p.startsWith(h + "/") ? "~" + p.slice(h.length) : p;
}

export function sourceBadge(r: SettingRow, cwd: string): { text: string; file?: string } {
  const text = BADGE[r.source] ?? "";
  if (!r.file) return { text };
  return { text, file: r.source === "project" ? relative(cwd, r.file) : tilde(r.file) };
}

export function rowTag(r: SettingRow, cwd: string): string {
  const b = sourceBadge(r, cwd);
  return [b.text, r.source === "project" ? b.file : "", r.locked ? "locked" : ""].filter(Boolean).join(" · ");
}

export function rowHelp(r: SettingRow): string {
  return r.locked ? "Locked until the turn ends. " + r.def.help : r.def.help;
}

export function modelNote(spec: string): string {
  if (spec === "same" || spec === "none" || spec === "not set") return "";
  if (spec.startsWith("ollama:") || /^openai:https?:\/\/(localhost|127\.0\.0\.1)/.test(spec)) return "free, on this computer";
  if (spec !== "claude" && !spec.startsWith("claude:")) return "";
  const p = modelPrice(spec === "claude" ? DEFAULT_CLAUDE_MODEL : spec);
  return p ? `$${p.input} in, $${p.output} out per million tokens` : "";
}

export function briefHelp(d: SettingDef): string {
  return d.brief ?? /^.*?\.(?=\s|$)/.exec(d.help)?.[0] ?? d.help;
}

export function choiceLabel(def: SettingDef, choice: string): string {
  if (def.name !== "model" && def.name !== "referee") return choice;
  const m = CLAUDE_MODELS.find((x) => x.spec === choice || (choice === "claude" && x.spec === `claude:${DEFAULT_CLAUDE_MODEL}`));
  if (m) return choice === "claude" ? `Default Claude model (${m.label.replace(" (default)", "")})` : m.label.replace(" (default)", "");
  return choice === "same" ? "Same as the analysis model" : choice === "none" ? "No check" : choice;
}

export function choiceNote(def: SettingDef, choice: string): string {
  return def.name === "model" || def.name === "referee" ? modelNote(choice) : "";
}

export function spendState(env: Record<string, string | undefined> = process.env): { spent: number; budget?: number; pct?: number; text: string } {
  const spent = totalSpend(monthStart());
  const budget = budgetUsd(env);
  if (budget === undefined) return { spent, text: `$${spent.toFixed(2)} this month. No budget.` };
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  return { spent, budget, pct, text: `$${spent.toFixed(2)} of $${budget.toFixed(2)} this month (${pct}%)` };
}

export function spendBar(s: { pct?: number }, width = 20): string {
  if (s.pct === undefined) return "";
  const n = Math.round((s.pct / 100) * width);
  return "█".repeat(n) + "░".repeat(width - n);
}

export function secretState(r: SettingRow): string {
  return r.source === "env" ? "set by environment" : r.source === "ant" ? "signed in with ant auth login" : r.value === "saved" ? "saved" : "not set";
}

export async function saveSetting(ctx: SettingCtx, def: SettingDef, value: string, scope: Scope, confirmed = false): Promise<{ text: string; color: string; confirm?: boolean }> {
  if (value === RESET) return resetRow(ctx, def);
  const ask = confirmed ? undefined : def.confirm?.(value);
  if (ask) return { text: ask, color: "yellow", confirm: true };
  try {
    const r = await changeSetting(ctx, def.name, value, scope);
    return { text: `${SAVED_FOR[scope]} ${def.label} is now ${show(r.value)}.${r.note ? " " + r.note : ""}`, color: "green" };
  } catch (e) {
    return { text: (e as Error).message, color: "red" };
  }
}

export async function resetRow(ctx: SettingCtx, def: SettingDef): Promise<{ text: string; color: string }> {
  try {
    const r = await resetSetting(ctx, def.name);
    const now = describe(ctx).find((x) => x.def.name === def.name);
    const from = now && now.source !== "default" && now.source !== "" ? ` The ${BADGE[now.source]!.toLowerCase()} value applies.` : "";
    return { text: `${from ? "Removed the change." : "Reset to default."} ${def.label} is now ${now?.value ?? show(r.value)}.${from}`, color: "green" };
  } catch (e) {
    return { text: (e as Error).message, color: "red" };
  }
}

export function removeSecret(ctx: SettingCtx, def: SettingDef): { text: string; color: string } {
  const env = ctx.env ?? process.env;
  if (def.name === "claude_key" && env.ANTHROPIC_API_KEY) return { text: "ANTHROPIC_API_KEY in the shell sets the key. Remove it there.", color: "red" };
  const done = def.name === "claude_key" ? removeClaudeKey() : def.name === "elabftw_key" ? removeElabftw() : false;
  if (!done) return { text: `${def.label} has no value.`, color: "red" };
  ctx.session?.record.append("setting", { name: def.name, scope: "user", change: "removed" });
  return { text: `Removed the ${def.label}.`, color: "green" };
}


