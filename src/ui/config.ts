import { changeSetting, describe, scopeLabel, settingsPath, type Scope, type SettingCtx, type SettingDef, type SettingRow } from "../core/settings.ts";

export type Editor =
  | { t: "message"; text: string; color?: string }
  | { t: "edit"; card: "key" | "eln" }
  | { t: "text"; def: SettingDef }
  | { t: "value"; def: SettingDef; options: string[]; sel: number };

export function settingRows(ctx: SettingCtx, busy: boolean): SettingRow[] {
  return describe(ctx).map((r) => ({ ...r, locked: !!(r.def.lockedInTurn && busy) }));
}

export function settingEditor(row: SettingRow): Editor {
  const d = row.def;
  if (row.locked) return { t: "message", text: `${d.label} is locked until the turn ends.`, color: "yellow" };
  if (d.edit) return { t: "edit", card: d.edit };
  if (!d.scopes.length) return { t: "message", text: "You cannot change this setting here." };
  if (d.number || d.list) return { t: "text", def: d };
  const options = d.choices?.() ?? [];
  const cur = options.indexOf(row.value);
  return { t: "value", def: d, options: cur < 0 && row.value !== "not set" ? [row.value, ...options] : options, sel: Math.max(0, cur) };
}

export function scopeText(s: Scope, cwd: string): string {
  return s === "session" ? "This session only" : s === "user" ? `User settings  ${settingsPath("user", cwd)}` : `Project settings  ${settingsPath("project", cwd)}`;
}

export function rowTag(r: SettingRow): string {
  return [r.source ? scopeLabel(r.source) : "", r.locked ? "locked" : ""].filter(Boolean).join(" · ");
}

export async function saveSetting(ctx: SettingCtx, def: SettingDef, value: string, scope: Scope): Promise<{ text: string; color: string }> {
  try {
    const r = await changeSetting(ctx, def.name, value, scope);
    return { text: `${def.label} is now ${value} (${scopeLabel(scope)}).${r.note ? " " + r.note : ""}`, color: "green" };
  } catch (e) {
    return { text: (e as Error).message, color: "red" };
  }
}

export function rowHelp(r: SettingRow): string {
  return r.locked ? "Locked until the turn ends. " + r.def.help : r.def.help;
}
