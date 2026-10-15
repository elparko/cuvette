import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAdapter } from "../src/adapters/manifest.ts";
import { appAdapters } from "../src/server/app.ts";
import { Session } from "../src/core/session.ts";
import { trustFolder } from "../src/core/trust.ts";
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

const storeFile = () => join(home, "adapter-hashes.json");
const forgetAllowed = () => rmSync(storeFile(), { force: true });
const opts = () => ({ provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } as const });
const notices = (s: Session) => s.record.entries(["notice"]).map((n) => String(n.data.text));

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

unix("resume does not load a recorded outside path that the user never allowed on this computer", async () => {
  const dir = evilAdapter(cwd);
  session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  expect(session.adapters.map((a) => a.name)).toEqual(["evil"]);
  await session.close();
  session = undefined;
  forgetAllowed();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.adapters.map((a) => a.name)).toEqual([]);
  expect(session.record.entries(["notice"]).some((n) => /the adapter evil from .* before.*does not load it/.test(String(n.data.text)))).toBe(true);
});

unix("resume skips an outside path that the user never allowed, names the path, and loads it after resume with the path", async () => {
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const dir = evilAdapter(away);
    session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const id = session.id;
    expect(session.adapters.map((a) => a.name)).toEqual(["evil"]);
    await session.close();
    session = undefined;
    forgetAllowed();
    session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    expect(session.adapters.map((a) => a.name)).toEqual([]);
    const text = session.record.entries(["notice"]).map((n) => String(n.data.text)).find((t) => t.includes("evil"));
    expect(text).toContain(dir);
    expect(text).toContain(`cuvette resume --adapter ${dir}`);
    await session.close();
    session = undefined;
    session = await Session.resume(id, { addAdapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    expect(session.adapters.map((a) => a.name)).toEqual(["evil"]);
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

unix("resume loads an outside adapter that the user added, and shows no notice", async () => {
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const dir = evilAdapter(away);
    session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const id = session.id;
    await session.close();
    session = undefined;
    session = await Session.resume(id, opts());
    expect(session.adapters.map((a) => a.root)).toEqual([dir]);
    expect(notices(session).some((t) => t.includes("evil"))).toBe(false);
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

unix("resume skips an outside adapter after a file changed since the user allowed it", async () => {
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const dir = evilAdapter(away);
    session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const id = session.id;
    await session.close();
    session = undefined;
    writeFileSync(join(dir, "extra.txt"), "changed");
    session = await Session.resume(id, opts());
    expect(session.adapters.map((a) => a.name)).toEqual([]);
    const text = notices(session).find((t) => t.includes("evil"));
    expect(text).toContain("changed after you allowed it");
    expect(text).toContain(`cuvette resume --adapter ${dir}`);
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

unix("opening a forged record by path writes no allow entry, so a second resume does not load the adapter", async () => {
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const dir = evilAdapter(away);
    session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const recordDir = session.record.dir;
    const log = join(recordDir, "log.jsonl");
    await session.close();
    session = undefined;
    forgetAllowed();
    const lines = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => {
      const e = JSON.parse(l);
      if (e.kind === "adapter") e.data.hash = "0".repeat(64);
      if (e.kind === "session") for (const a of e.data.adapters ?? []) a.hash = "0".repeat(64);
      return JSON.stringify(e);
    });
    writeFileSync(log, lines.join("\n") + "\n");
    for (let i = 0; i < 2; i++) {
      session = await Session.resume(recordDir, opts());
      expect(session.adapters.map((a) => a.name)).toEqual([]);
      await session.close();
      session = undefined;
    }
    expect(existsSync(storeFile())).toBe(false);
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

unix("an edited log that names another outside adapter does not load it", async () => {
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const mine = evilAdapter(away, "mine");
    const other = evilAdapter(away, "other");
    session = await Session.create({ adapters: [mine], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const id = session.id;
    const log = join(session.record.dir, "log.jsonl");
    await session.close();
    session = undefined;
    const swap = (a: { name: string; path?: string }) => Object.assign(a, { name: "other", path: other });
    const lines = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => {
      const e = JSON.parse(l);
      if (e.kind === "adapter") swap(e.data);
      if (e.kind === "session") for (const a of e.data.adapters ?? []) swap(a);
      return JSON.stringify(e);
    });
    writeFileSync(log, lines.join("\n") + "\n");
    session = await Session.resume(id, opts());
    expect(session.adapters.map((a) => a.name)).toEqual([]);
    expect(notices(session).some((t) => t.includes(other))).toBe(true);
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

unix("a model call to use_adapter with a path never writes an allow entry", async () => {
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const dir = evilAdapter(away);
    session = await start();
    const r = await session.useAdapter(dir, "the model chose a path");
    expect(r.ok).toBe(false);
    expect(existsSync(storeFile())).toBe(false);
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

function installedLab(): string {
  const dir = join(home, "adapters", "lab");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "adapter.yaml"), readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8"));
  symlinkSync(join(__dirname, "fixtures/lab/server.ts"), join(dir, "server.ts"));
  return dir;
}

function shadowLab(): string {
  const dir = join(cwd, "lab");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "adapter.yaml"), readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8").replace("Lab counter", "Shadow counter"));
  writeFileSync(join(dir, "server.ts"), "throw new Error('shadow ran');");
  return dir;
}

unix("a bare adapter name does not load a folder of the same name in the process folder", async () => {
  const installed = installedLab();
  shadowLab();
  process.chdir(cwd);
  session = await Session.create({ adapters: ["lab"], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.adapters.map((a) => a.root)).toEqual([installed]);
});

unix("resume of a recorded name does not load a folder of the same name in the project", async () => {
  const installed = installedLab();
  session = await Session.create({ adapters: ["lab"], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  const log = join(session.record.dir, "log.jsonl");
  await session.close();
  session = undefined;
  const lines = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => {
    const e = JSON.parse(l);
    if (e.kind === "adapter") delete e.data.path;
    if (e.kind === "session") for (const a of e.data.adapters ?? []) delete a.path;
    return JSON.stringify(e);
  });
  writeFileSync(log, lines.join("\n") + "\n");
  shadowLab();
  process.chdir(cwd);
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.adapters.map((a) => a.root)).toEqual([installed]);
});

unix("resume with addAdapters keeps the recorded adapters and adds the new one, with no duplicate", async () => {
  installedLab();
  const other = evilAdapter(cwd, "other");
  session = await Session.create({ adapters: ["lab"], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  await session.close();
  session = undefined;
  session = await Session.resume(id, { addAdapters: [other, "lab"], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.adapters.map((a) => a.name)).toEqual(["lab", "other"]);
});

test("a bare name that matches a folder with a manifest in the process folder gives a hint", () => {
  evilAdapter(cwd, "mydir");
  process.chdir(join(cwd, "data"));
  expect(() => findAdapter("mydir", cwd)).toThrow(/Use --adapter \.\/mydir to load the folder\./);
  expect(() => findAdapter("nothing", cwd)).not.toThrow(/Use --adapter/);
});

test("the app looks up an adapter name from the request by name only", () => {
  const dir = evilAdapter(cwd, "biostats");
  expect(() => appAdapters(dir, undefined, cwd)).toThrow(/no adapter named/);
  expect(() => appAdapters("./data/biostats", undefined, cwd)).toThrow(/no adapter named/);
  process.chdir(join(dir, ".."));
  const [found] = appAdapters("biostats", undefined, cwd);
  expect(found).toMatch(/catalog/);
  expect(appAdapters(undefined, ["x"], cwd)).toEqual(["x"]);
  expect(appAdapters(undefined, undefined, cwd)).toEqual([]);
});

test("the app finds a project adapter by name when the folder is trusted for the run", () => {
  const dir = join(cwd, ".cuvette", "adapters", "foo");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "adapter.yaml"), readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8").replace("name: lab,", "name: foo,"));
  expect(() => appAdapters("foo", undefined, cwd, false)).toThrow(/no adapter named/);
  expect(appAdapters("foo", undefined, cwd, true).map((d) => realpathSync(d))).toEqual([realpathSync(dir)]);
  expect(() => appAdapters("foo", undefined, cwd, false)).toThrow(/no adapter named/);
});

unix("resume with an adapter folder of a recorded name uses the new folder and says so", async () => {
  installedLab();
  const mine = evilAdapter(cwd, "lab");
  session = await Session.create({ adapters: ["lab"], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  await session.close();
  session = undefined;
  session = await Session.resume(id, { addAdapters: [mine], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.adapters.map((a) => realpathSync(a.root))).toEqual([realpathSync(mine)]);
  expect(session.record.entries(["notice"]).some((n) => /adapter lab comes from the folder that you gave/.test(String(n.data.text)) && /used another folder before/.test(String(n.data.text)))).toBe(true);
});

unix("resume with an adapter folder says so when the recorded folder no longer exists", async () => {
  const installed = installedLab();
  const mine = evilAdapter(cwd, "lab");
  session = await Session.create({ adapters: ["lab"], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  await session.close();
  session = undefined;
  rmSync(installed, { recursive: true, force: true });
  session = await Session.resume(id, { addAdapters: [mine], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const texts = session.record.entries(["notice"]).map((n) => String(n.data.text));
  expect(texts.some((t) => /adapter lab comes from the folder that you gave/.test(t) && /does not exist now/.test(t) && !/used another folder/.test(t))).toBe(true);
});

unix("resume of a recorded path with the name of an installed adapter loads the installed one and says so", async () => {
  const installed = installedLab();
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const dir = evilAdapter(away, "lab");
    session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const id = session.id;
    await session.close();
    session = undefined;
    session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    expect(session.adapters.map((a) => a.root)).toEqual([installed]);
    const text = session.record.entries(["notice"]).map((n) => String(n.data.text)).find((t) => t.includes(dir));
    expect(text).toContain("did not use that folder");
    expect(text).toContain("installed adapter lab");
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

unix("resume still loads an adapter of a trusted project folder, with no notice", async () => {
  const dir = join(cwd, ".cuvette", "adapters", "lab");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "adapter.yaml"), readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8"));
  symlinkSync(join(__dirname, "fixtures/lab/server.ts"), join(dir, "server.ts"));
  trustFolder(cwd);
  session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  await session.close();
  session = undefined;
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.adapters.map((a) => a.name)).toEqual(["lab"]);
  expect(session.record.entries(["notice"]).filter((n) => n.data.warn)).toEqual([]);
});
