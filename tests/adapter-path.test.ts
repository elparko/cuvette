import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAdapter } from "../src/adapters/manifest.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const oldHome = process.env.CUVETTE_HOME;
const oldCwd = process.cwd();
let home = "";
let cwd = "";
let session: Session | undefined;

function evilAdapter(root: string, name = "evil"): string {
  const dir = join(root, "data", name);
  mkdirSync(dir, { recursive: true });
  const yaml = readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8");
  writeFileSync(join(dir, "adapter.yaml"), yaml.replace("name: lab,", `name: ${name},`));
  symlinkSync(join(__dirname, "fixtures/lab/server.ts"), join(dir, "server.ts"));
  return dir;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-path-home-"));
  process.env.CUVETTE_HOME = home;
  writeFileSync(join(home, "settings.json"), JSON.stringify({ defaultAdapters: [] }));
  cwd = mkdtempSync(join(tmpdir(), "cuvette-path-"));
});
afterEach(async () => {
  process.chdir(oldCwd);
  await session?.close();
  session = undefined;
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
  rmSync(home, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
});

const start = () => Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });

const unix = test.skipIf(process.platform === "win32");

unix("use_adapter refuses a path to an adapter folder outside the adapter folders", async () => {
  const dir = evilAdapter(cwd);
  session = await start();
  const r = await session.useAdapter(dir, "the model chose a path");
  expect(r.ok).toBe(false);
  expect(session.adapters.map((a) => a.name)).toEqual([]);
});

unix("use_adapter refuses a relative path that starts with a dot", async () => {
  evilAdapter(cwd);
  process.chdir(cwd);
  session = await start();
  const r = await session.useAdapter("./data/evil", "the model chose a path");
  expect(r.ok).toBe(false);
  expect(session.adapters.map((a) => a.name)).toEqual([]);
});

test("a folder in the working directory with the name of a catalog adapter does not shadow it", () => {
  const dir = evilAdapter(cwd, "biostats");
  process.chdir(join(dir, ".."));
  const a = findAdapter("biostats", cwd, { byName: true });
  expect(a.root).not.toBe(dir);
  expect(a.root).toMatch(/catalog/);
});

test("a path is an unknown name when the caller asks for names only", () => {
  const dir = evilAdapter(cwd);
  expect(() => findAdapter(dir, cwd, { byName: true })).toThrow(/no adapter named/);
});

unix("resume does not load an adapter from a recorded path outside the adapter folders", async () => {
  const dir = evilAdapter(cwd);
  session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  expect(session.adapters.map((a) => a.name)).toEqual(["evil"]);
  await session.close();
  session = undefined;
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.adapters.map((a) => a.name)).toEqual([]);
  expect(session.record.entries(["notice"]).some((n) => /evil is not installed here/.test(String(n.data.text)))).toBe(true);
});
