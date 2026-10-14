import { basename } from "node:path";
import type { Check } from "../core/doctor.ts";
import { lastUseText, originText, sizeText, STATE_LABEL, type ProgramRow } from "../core/programs.ts";
import { cutText } from "../core/places.ts";
import { ageText, type SessionInfo } from "../core/sessions.ts";
import { canReset, type SettingCtx } from "../core/settings.ts";
import { TRUST_NAME } from "../adapters/source.ts";
import { briefHelp, choiceLabel, choiceList, choiceNote, controlOf, lockText, SCOPE_BUTTON, secretState, sections, settingRows, sourceBadge, spendState } from "../ui/config.ts";
import { fieldTitle, groupRows, rowActions, summaryLine } from "../ui/programs.ts";

const clip = (s: string, n: number) => (s.length > n ? cutText(s, n - 1).trimEnd() + "…" : s);

export function sessionsJson(list: SessionInfo[], token: string, now = Date.now()) {
  return list.map((s) => ({
    id: s.id,
    title: s.name || (s.ask ? clip(s.ask, 80) : basename(s.cwd) || "No request yet"),
    text: s.name || s.ask ? clip(s.description || (s.name ? s.ask : ""), 220) : "No request yet.",
    hasRequest: !!s.ask,
    folder: s.cwd,
    folderName: basename(s.cwd) || s.cwd || "unknown folder",
    age: ageText(now - s.used),
    status: s.moved ? "moved" : (s.status ?? ""),
    moved: !!s.moved,
    thumb: s.figure ? `api/thumb?id=${encodeURIComponent(s.id)}&t=${encodeURIComponent(token)}` : "",
  }));
}

const STATE_TONE: Record<string, string> = { installed: "ok", custom: "ok", found: "ok", missing: "bad", old: "warn", none: "none" };

export function programsJson(rows: ProgramRow[], opts: { checking?: boolean; now?: number } = {}) {
  const now = opts.now ?? Date.now();
  return {
    summary: summaryLine(rows) + (opts.checking ? " Checking versions and sizes..." : ""),
    checking: !!opts.checking,
    groups: groupRows(rows).map((g) => ({
      title: fieldTitle(g.field),
      rows: g.rows.map((r) => {
        const tags = [
          { text: TRUST_NAME[r.trust], tone: r.trust === "unlisted" ? "warn" : "", title: r.trustDetail },
          r.adapterStatus === "approved" ? undefined : { text: r.adapterStatus, tone: "" },
          r.access.off ? { text: "off", tone: "warn" } : undefined,
          r.network === undefined ? undefined : { text: r.network ? "network allowed" : "no network", tone: "" },
          r.code === false ? { text: "own code blocked", tone: "" } : undefined,
        ].filter((x) => !!x);
        return {
          name: r.name,
          program: r.program,
          state: STATE_LABEL[r.state],
          tone: STATE_TONE[r.state] ?? "none",
          version: r.version,
          size: r.size === undefined ? "" : sizeText(r.size),
          lastUse: lastUseText(r.lastUsed, now),
          origin: originText(r),
          detail: r.detail,
          warn: r.trust === "unlisted" ? r.trustDetail + (r.codePending ? " Its code needs your permission before it first runs." : "") : "",
          cite: r.cite ?? "",
          off: !!r.access.off,
          path: r.access.path ?? "",
          tags,
          actions: rowActions(r),
        };
      }),
    })),
  };
}

export function settingsJson(ctx: SettingCtx, busy: boolean) {
  const rows = settingRows(ctx, busy);
  return {
    sections: sections(rows),
    rows: rows.map((r) => {
      const d = r.def;
      const brief = briefHelp(d);
      const control = controlOf(r);
      const spend = d.name === "spend_month" ? spendState(ctx.env) : undefined;
      return {
        name: d.name,
        label: d.label,
        group: d.group,
        control,
        value: r.value,
        source: r.source,
        badge: sourceBadge(r, ctx.cwd),
        brief,
        more: d.help.startsWith(brief) ? d.help.slice(brief.length).trim() : d.help,
        details: d.details?.(ctx) ?? [],
        choices: ["segmented", "options", "select"].includes(control) ? choiceList(r).map((v) => ({ value: v, label: choiceLabel(d, v), note: choiceNote(d, v) })) : [],
        free: !!d.free,
        min: d.min ?? 0,
        unit: d.unit ?? "",
        locked: !!r.locked,
        lock: r.locked ? lockText(r) : "",
        scopes: d.scopes.filter((s) => s !== "session" || ctx.session).map((s) => ({ id: s, label: SCOPE_BUTTON[s] })),
        reset: canReset(r),
        secret: control === "secret" ? secretState(r) : "",
        edit: d.edit ?? "",
        spend: spend ? { pct: spend.pct ?? null, text: spend.text } : null,
      };
    }),
  };
}

export function doctorJson(checks: Check[], ready: boolean) {
  const n = (st: string) => checks.filter((x) => x.status === st).length;
  return {
    ready,
    counts: { ok: n("ok"), missing: n("missing"), old: n("old") },
    checks: checks.map((x) => ({ id: x.id, group: x.group, name: x.name, status: x.status, detail: x.detail, command: x.fix?.command ?? "", link: x.fix?.link ?? "", cite: x.cite ?? "" })),
  };
}
