import { afterEach, expect, test } from "vitest";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";

let live: { h: Harness; done: Promise<void> } | undefined;

afterEach(async () => {
  if (!live) return;
  live.h.type("\x03");
  await sleep(20);
  live.h.type("\x03");
  await Promise.race([live.done, sleep(500)]);
  live = undefined;
});

const EVIL = "START\x1b]52;c;ZXZpbA==\x07 CLEAR\x1b[2J UP\x1b[5A\x1b[2K TITLE\x1b]0;pwned\x07 BACK\rOVER BELL\x07 SCREEN\x1b[?1049h HIDE\x1b[8mSECRET\x1b[0m BLACK\x1b[30;40mINVISIBLE\x1b[0m LINK\x1b]8;;http://127.0.0.1:1/steal\x07click\x1b]8;;\x07 ST\x1b]52;c;U1RDT1BZ\x1b\\ DCS\x1bPq#0;2;0;0;0\x1b\\ FLIP\u202eexe.txt END";

test("the terminal shows hostile text of the model as plain text and runs none of its control codes", async () => {
  const h = makeHarness(100, 40);
  const s = new FakeSession({ delayMs: 0 });
  const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
  live = { h, done };
  await until(() => h.all().includes("Type /plan"));
  s.record.append("assistant", { text: EVIL, final: true });
  s.record.append("user", { text: EVIL });
  s.record.append("notice", { text: EVIL });
  s.bus.emit({ type: "permission", rid: "r1", tool: "run_script", args: { purpose: EVIL, does: EVIL, code: EVIL }, code: EVIL, touches: EVIL });
  await until(() => h.term.view().includes("y allow"));
  const raw = h.frames.join("");
  expect(raw).toContain("START");
  expect(raw).not.toContain("ZXZpbA");
  expect(raw).not.toContain("pwned");
  expect(raw).not.toContain("\x1b[5A\x1b[2K");
  expect(raw).not.toContain("\x1b[?1049h");
  expect(raw).not.toContain("\x1b[8m");
  expect(raw).not.toContain("127.0.0.1:1/steal");
  expect(raw).not.toContain("U1RDT1BZ");
  expect(raw).not.toContain("\x1bP");
  expect(raw).not.toContain("\u202e");
  expect(raw).not.toContain("\x1b[30;40m");
  expect(raw.replace(/\r\n/g, "")).not.toMatch(/BACK\rOVER/);
  expect(raw).not.toContain("BELL\x07");
  expect(h.term.view()).toContain("y allow");
});
