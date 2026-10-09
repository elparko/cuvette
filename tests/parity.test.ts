import { expect, test } from "vitest";
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
