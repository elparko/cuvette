import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { SETTINGS } from "../src/core/settings.ts";
import { sections, settingRows } from "../src/ui/config.ts";
import { settingsHtml } from "../src/server/app-settings.ts";
import { commands } from "../src/ui/commands.ts";
import { CARDS, COMMANDS } from "../src/ui/parity.ts";
import { TUI_CARD_TYPES } from "../src/tui/app.tsx";
import { WEB_CARDS } from "../src/server/app-html.ts";

const sorted = (a: readonly string[]) => [...a].sort();

test("the shared command list is the parity list", () => {
  expect(sorted(commands.map((c) => c.name))).toEqual(sorted(COMMANDS));
});

test("the terminal shows every card type", () => {
  expect(sorted(TUI_CARD_TYPES)).toEqual(sorted(CARDS));
});

test("the browser app shows every card type", () => {
  expect(sorted(Object.keys(WEB_CARDS))).toEqual(sorted(CARDS));
});

test("the browser settings page shows the registry rows and sections that the terminal panel shows", () => {
  const ctx = { cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), env: {}, ui: { details: () => false, toggleDetails() {} } };
  const rows = settingRows(ctx, false);
  const html = settingsHtml({ settings: ctx });
  expect(sorted([...html.matchAll(/data-setting="([^"]+)"/g)].map((m) => m[1]!))).toEqual(sorted(rows.map((r) => r.def.name)));
  expect([...html.matchAll(/data-cfg-sec="([^"]+)"/g)].map((m) => m[1]!)).toEqual(sections(rows));
  expect(sections(rows)).toEqual([...new Set(SETTINGS.map((d) => d.group))].filter((g) => rows.some((r) => r.def.group === g)));
});
