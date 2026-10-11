import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");

test("the sidecar prints the port and the token, serves the page, and stops when stdin closes", async () => {
  const home = mkdtempSync(join(tmpdir(), "cuvette-sidecar-"));
  const child = spawn(process.execPath, ["--import", "tsx", "desktop/sidecar/main.ts"], {
    cwd: ROOT,
    env: { HOME: home, PATH: "/usr/bin:/bin", SHELL: "/bin/sh", CUVETTE_NO_OPEN: "1" },
    stdio: ["pipe", "pipe", "inherit"],
  });
  const line = await new Promise<string>((done) => createInterface({ input: child.stdout }).once("line", done));
  const s = JSON.parse(line) as { url: string; port: number; token: string };
  expect(s.url).toBe(`http://127.0.0.1:${s.port}/?t=${s.token}`);
  expect(s.token.length).toBeGreaterThanOrEqual(32);
  const page = await fetch(s.url);
  expect(page.status).toBe(200);
  expect(await page.text()).toContain("<title>Cuvette</title>");
  expect((await fetch(`http://127.0.0.1:${s.port}/api/state`)).status).toBe(401);
  const state = (await (await fetch(`http://127.0.0.1:${s.port}/api/state?t=${s.token}`)).json()) as { session: unknown; home: string };
  expect(state.session).toBeNull();
  expect(state.home).toBe(home);
  expect(readFileSync(join(home, ".cuvette", "desktop-path.txt"), "utf8")).toContain("/usr/bin");
  const code = await new Promise<number | null>((done) => {
    child.on("exit", done);
    child.stdin.end();
  });
  expect(code).toBe(0);
}, 30000);
