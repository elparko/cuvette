import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { findAdapter } from "../src/adapters/manifest.ts";
import { appAdapters } from "../src/server/app.ts";
import { Session } from "../src/core/session.ts";
import { shellQuote, trustFolder } from "../src/core/trust.ts";
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
  expect(session.record.entries(["notice"]).map((n) => String(n.data.text))).toContain(`Cuvette did not load the adapter folder ${dir} from the record. Run in a terminal: cuvette resume ${id} --adapter ${shellQuote(dir)}`);
});

unix("resume does not load an adapter from a recorded path outside the project and names the path in a notice", async () => {
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const dir = evilAdapter(away);
    session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const id = session.id;
    expect(session.adapters.map((a) => a.name)).toEqual(["evil"]);
    await session.close();
    session = undefined;
    session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    expect(session.adapters.map((a) => a.name)).toEqual([]);
    const text = session.record.entries(["notice"]).map((n) => String(n.data.text)).find((t) => t.includes("evil"));
    expect(text).toContain(dir);
    expect(text).toContain(`Cuvette did not load the adapter folder ${dir} from the record. Run in a terminal: cuvette resume ${id} --adapter ${shellQuote(dir)}`);
    await session.close();
    session = undefined;
    session = await Session.resume(id, { addAdapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    expect(session.adapters.map((a) => a.name)).toEqual(["evil"]);
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

unix("resume with the adapter folder that the record names adds no notice", async () => {
  const mine = evilAdapter(cwd, "lab");
  session = await Session.create({ adapters: [mine], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  await session.close();
  session = undefined;
  session = await Session.resume(id, { addAdapters: [mine], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.record.entries(["notice"]).filter((n) => n.data.warn)).toEqual([]);
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

unix("resume with an adapter folder outside the project, recorded with the name of an installed adapter, loads the given folder", async () => {
  const installed = installedLab();
  const away = mkdtempSync(join(tmpdir(), "cuvette-away-"));
  try {
    const dir = evilAdapter(away, "lab");
    session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const id = session.id;
    await session.close();
    session = undefined;
    session = await Session.resume(id, { addAdapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    expect(session.adapters.map((a) => realpathSync(a.root))).toEqual([realpathSync(dir)]);
    expect(session.adapters.map((a) => a.root)).not.toContain(installed);
    expect(session.record.entries(["notice"]).some((n) => /another folder before/.test(String(n.data.text)))).toBe(false);
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

unix("the notice for a recorded adapter folder quotes a path with a space", async () => {
  const away = mkdtempSync(join(tmpdir(), "cuvette away "));
  try {
    const dir = evilAdapter(away);
    session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const id = session.id;
    await session.close();
    session = undefined;
    session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
    const text = session.record.entries(["notice"]).map((n) => String(n.data.text)).find((t) => t.includes("evil"));
    expect(text).toContain(`Run in a terminal: cuvette resume ${id} --adapter ${shellQuote(dir)}`);
  } finally {
    rmSync(away, { recursive: true, force: true });
  }
});

async function strayNotice(folderName: string): Promise<{ dir: string; id: string; text: string }> {
  const away = join(mkdtempSync(join(tmpdir(), "cuvette-away-")), folderName);
  const dir = evilAdapter(away);
  session = await Session.create({ adapters: [dir], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const id = session.id;
  await session.close();
  session = undefined;
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const text = session.record.entries(["notice"]).map((n) => String(n.data.text)).find((t) => t.includes("did not load the adapter folder"))!;
  return { dir, id, text };
}

unix("the resume notice shows a path with control characters as plain text and gives no command", async () => {
  const { text } = await strayNotice("a\u0001b");
  expect(text).toContain("The path has control characters, so Cuvette shows no command.");
  expect(text).not.toContain("cuvette resume");
});

unix("the resume notice gives no command for a path with a newline or a tab", async () => {
  for (const name of ["a\nb", "a\tb"]) {
    const { text } = await strayNotice(name);
    expect(text).toContain("The path has control characters, so Cuvette shows no command. Start the session again. Give the folder with --adapter.");
    expect(text).not.toContain("cuvette resume");
  }
});

unix("the resume notice puts a path with a special character in single quotes", async () => {
  const { dir, id, text } = await strayNotice("it's!ok");
  expect(text).toContain(`cuvette resume ${id} --adapter '${dir.replace(/'/g, "'\\''")}'`);
});
