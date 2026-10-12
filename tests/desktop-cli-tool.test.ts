import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test as base } from "vitest";

const test = base.skipIf(process.platform === "win32");

const SCRIPT = resolve(import.meta.dirname, "../desktop/src-tauri/cli-tool.sh");
const tool = (args: string[], path = "") => spawnSync("/bin/sh", [SCRIPT, ...args], { encoding: "utf8", env: { PATH: "/usr/bin:/bin", CUVETTE_PATH: path } });

function setup() {
  const root = mkdtempSync(join(tmpdir(), "cuvette cli "));
  const app = join(root, "It's Cuvette.app");
  mkdirSync(join(app, "Contents/MacOS"), { recursive: true });
  writeFileSync(join(app, "Contents/MacOS/node"), '#!/bin/sh\nprintf "%s|" "$@"\n');
  chmodSync(join(app, "Contents/MacOS/node"), 0o755);
  const npm = join(root, "npm");
  mkdirSync(npm);
  writeFileSync(join(npm, "cuvette"), "#!/usr/bin/env node\n");
  chmodSync(join(npm, "cuvette"), 0o755);
  return { root, app, npm, bin: join(root, "bin") };
}

test("install writes a launcher that runs the core of the app with the arguments", () => {
  const t = setup();
  const r = tool(["install", t.bin, t.app]);
  expect(r.status).toBe(0);
  const out = spawnSync(join(t.bin, "cuvette"), ["app", "a folder"], { encoding: "utf8" });
  expect(out.stdout).toBe(`${t.app}/Contents/Resources/core/dist/cli.mjs|app|a folder|`);
  expect(tool(["status"], `${t.npm}:${t.bin}:${t.npm}`).stdout).toBe(`other ${t.npm}/cuvette\napp ${t.bin}/cuvette\n`);
  expect(tool(["uninstall", t.bin]).status).toBe(0);
  expect(existsSync(join(t.bin, "cuvette"))).toBe(false);
});

test("install and uninstall do not touch another cuvette command", () => {
  const t = setup();
  expect(tool(["install", t.npm, t.app]).status).toBe(3);
  expect(tool(["uninstall", t.npm]).status).toBe(3);
  expect(readFileSync(join(t.npm, "cuvette"), "utf8")).toBe("#!/usr/bin/env node\n");
});

test("the launcher says what to do when the app moved", () => {
  const t = setup();
  tool(["install", t.bin, join(t.root, "Gone.app")]);
  const out = spawnSync(join(t.bin, "cuvette"), [], { encoding: "utf8" });
  expect(out.status).toBe(1);
  expect(out.stderr).toContain("Install Command Line Tool");
});
