import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { TSX_CLI } from "../src/adapters/kinds/common.ts";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { COPY_LIMIT_BYTES, discardPlace, findPlace, listPlaces, readIndex, slug } from "../src/core/places.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { trustFolder } from "../src/core/trust.ts";

const lockAtDiscard: boolean[] = [];
vi.mock("../src/core/places.ts", async (original) => {
  const real = await original<typeof import("../src/core/places.ts")>();
  return {
    ...real,
    discardPlace: (p: import("../src/core/places.ts").Place) => {
      lockAtDiscard.push(existsSync(join(p.recordDir, "open.json")));
      real.discardPlace(p);
    },
  };
});

let session: Session | undefined;
let home = "";
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-places-home-"));
  process.env.CUVETTE_HOME = home;
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

function project(git = false): string {
  const p = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-places-proj-")));
  mkdirSync(join(p, "LDL", "Set 1"), { recursive: true });
  writeFileSync(join(p, "LDL", "Set 1", "20X_CH1.txt"), "cells");
  if (git) mkdirSync(join(p, ".git"));
  return p;
}

const listCall = (path: string) => ({ calls: [{ name: "list_dir", args: { path } }] });

async function analysed(cwd: string, request = "Count the red cells in LDL") {
  const provider = new FakeProvider([listCall("LDL/Set 1"), { text: "There is one file." }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none" } });
  await session.send(request);
  return session;
}

test("a session with a damaged meta.json is left out of the search, and the other sessions stay", async () => {
  const cwd = project();
  const s = await analysed(cwd);
  const good = s.id;
  await s.close();
  session = undefined;
  const bad = join(cwd, "cuvette", "broken", ".record");
  mkdirSync(bad, { recursive: true });
  for (const body of ["", "null", "{bad", '{"id": 5}']) {
    writeFileSync(join(bad, "meta.json"), body);
    expect(findPlace(good, { cwd })?.id).toBe(good);
    expect(findPlace("20990101-000000-none", { cwd })).toBeUndefined();
  }
});

test("slug keeps the words that name the request", () => {
  expect(slug("Can we use ImageJ to count these things?")).toBe("use-imagej-count-things");
  expect(slug("Count the red-positive cells in the images we have stored.")).toBe("count-red-positive-cells-images-have");
});

test("the outputs and the record go to a titled folder in the project, and the home index finds it", async () => {
  const cwd = project(true);
  const s = await analysed(cwd);
  const root = join(cwd, "cuvette");
  const [name] = readdirSync(root).filter((d) => !d.startsWith("."));
  expect(name).toMatch(/^\d{4}-\d\d-\d\d-count-red-cells-ldl$/);
  const folder = join(root, name!);
  expect(s.workDir).toBe(folder);
  expect(s.dir).toBe(join(folder, ".record"));
  expect(existsSync(join(folder, ".record", "log.jsonl"))).toBe(true);
  expect(readFileSync(join(folder, "README.txt"), "utf8")).toContain('run "cuvette open ." in this folder');
  expect(readFileSync(join(root, ".gitignore"), "utf8")).toBe(".record/\n");
  expect(readdirSync(root).filter((d) => d.startsWith(".new-"))).toEqual([]);
  expect(readIndex()).toEqual([{ id: s.id, project: cwd, folder, title: "Count the red cells in LDL", date: expect.any(String) }]);
  expect(existsSync(join(home, "sessions", s.id))).toBe(false);
});

test("no .gitignore outside a git repository", async () => {
  const cwd = project(false);
  await analysed(cwd);
  expect(existsSync(join(cwd, "cuvette", ".gitignore"))).toBe(false);
});

test("index.html is current after each turn and opens without a server", async () => {
  const cwd = project();
  const provider = new FakeProvider([listCall("LDL/Set 1"), { text: "There is one file." }, { text: "The second answer." }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none" } });
  await session.send("Count the red cells in LDL");
  const index = join(session.workDir, "index.html");
  const first = readFileSync(index, "utf8");
  expect(first).toContain("Count the red cells in LDL");
  expect(first).not.toMatch(/src="(?!data:)/);
  await session.send("Now list the second set");
  expect(readFileSync(index, "utf8")).toContain("Now list the second set");
});

test("open from the session folder, from the project folder, from .record and by id", async () => {
  const cwd = project();
  const s = await analysed(cwd);
  const { id, workDir } = s;
  await s.close();
  session = undefined;
  for (const ref of [workDir, cwd, join(workDir, ".record"), id]) {
    expect(findPlace(ref)?.id).toBe(id);
  }
  expect(findPlace(".", { cwd: workDir })?.id).toBe(id);
  expect(findPlace(".", { cwd })?.id).toBe(id);
  session = await Session.resume(".", { provider: new FakeProvider([{ text: "again" }]), cwd: workDir });
  expect(session.id).toBe(id);
  expect(session.cwd).toBe(cwd);
  expect(session.history.length).toBeGreaterThan(1);
});

test("paths in the project are relative in the record, so a moved project still opens", async () => {
  const cwd = project();
  const s = await analysed(cwd);
  const { id } = s;
  const outsideFile = join(mkdtempSync(join(tmpdir(), "cuvette-outside-")), "x.txt");
  s.record.append("note", { path: outsideFile });
  await s.close();
  session = undefined;
  const raw = readFileSync(join(s.dir, "log.jsonl"), "utf8");
  expect(raw).toContain('"{project}/LDL/Set 1"');
  expect(raw).not.toContain(`"${cwd}`);
  expect(raw).toContain(outsideFile);

  const moved = `${cwd}-moved`;
  renameSync(cwd, moved);
  expect(listPlaces().find((r) => r.id === id)?.moved).toBe(true);
  session = await Session.resume(moved, { provider: new FakeProvider([{ text: "again" }]) });
  expect(session.cwd).toBe(moved);
  const listed = session.record.entries(["tool_result"])[0]!.data.effectiveArgs as { path: string };
  expect(listed.path).toBe(join(moved, "LDL", "Set 1"));
  expect(session.record.entries(["note"])[0]!.data.path).toBe(outsideFile);
  const row = listPlaces().find((r) => r.id === id)!;
  expect(row).toMatchObject({ moved: false, project: moved });
  expect(row.folder.startsWith(moved)).toBe(true);
});

test("a large input is recorded by path, size, time and hash, not copied", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-blobs-"));
  const work = join(dir, "out");
  const r = new AnalysisRecord(join(dir, "rec"), "s1", { workDir: work, exportDir: work, project: dir });
  const big = join(dir, "big.imzML");
  writeFileSync(big, Buffer.alloc(COPY_LIMIT_BYTES + 1, 7));
  const sha = r.putBlob(big, ".imzML");
  expect(readdirSync(r.blobDir)).toEqual([`${sha}.ref.json`]);
  expect(r.blobRef(sha)).toEqual({ path: big, size: COPY_LIMIT_BYTES + 1, mtime: statSync(big).mtime.toISOString(), sha256: sha });
  expect(readFileSync(join(r.blobDir, `${sha}.ref.json`), "utf8")).toContain('"{project}/big.imzML"');
  expect(r.blobPath(sha)).toBe(big);
  const small = join(dir, "small.csv");
  writeFileSync(small, "a,b\n1,2\n");
  expect(r.blobPath(r.putBlob(small))).toMatch(/\.record|rec/);
  const made = join(work, "made.bin");
  writeFileSync(made, Buffer.alloc(COPY_LIMIT_BYTES + 1, 1));
  const madeSha = r.putBlob(made);
  expect(r.blobPath(madeSha)!.startsWith(r.blobDir)).toBe(true);
});

test.skipIf(process.getuid?.() === 0)("a read-only project folder falls back to the home folder and says so", async () => {
  const cwd = project();
  chmodSync(cwd, 0o555);
  try {
    const provider = new FakeProvider([{ text: "ok" }]);
    session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none" } });
    expect(session.workDir.startsWith(join(home, "projects"))).toBe(true);
    expect(existsSync(join(cwd, "cuvette"))).toBe(false);
    const notice = session.record.entries(["notice"]).map((e) => e.data.text);
    expect(notice).toEqual([`The folder ${join(cwd, "cuvette")} is read-only. The session files are in ${join(home, "projects", "cuvette-places-proj-" + cwd.split("cuvette-places-proj-")[1]!.toLowerCase())}.`]);
    await session.send("Count the cells");
    expect(findPlace(session.id)?.project).toBe(cwd);
  } finally {
    chmodSync(cwd, 0o755);
  }
});

test("old sessions in the home folder still open", async () => {
  const cwd = project();
  session = await Session.create({ adapters: [], provider: new FakeProvider([{ text: "hello" }]), cwd, home: true, settings: { guidance: false, referee: "none" } });
  await session.send("hi");
  const id = session.id;
  expect(session.dir).toBe(join(home, "sessions", id));
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([{ text: "again" }]), cwd });
  expect(session.history.length).toBe(2);
  expect(listPlaces().find((r) => r.id === id)).toMatchObject({ legacy: true, moved: false });
  expect(existsSync(join(cwd, "cuvette"))).toBe(false);
});

test("an absolute output folder is used as given, and the session opens again from the project folder", async () => {
  const cwd = project();
  const share = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-labshare-")));
  const provider = new FakeProvider([listCall("LDL/Set 1"), { text: "There is one file." }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none", output_folder: share } });
  expect(session.folderLine).toBe(`Results go to ${share}/<date>-<title>/`);
  await session.send("Count the red cells in LDL");
  expect(session.workDir).toMatch(new RegExp(`^${share}/\\d{4}-\\d\\d-\\d\\d-count-red-cells-ldl$`));
  expect(session.folderLine).toBe(`Results: ${session.workDir}`);
  expect(existsSync(join(cwd, "cuvette"))).toBe(false);
  expect(readFileSync(join(session.dir, "log.jsonl"), "utf8")).toContain(`"${join(cwd, "LDL", "Set 1")}"`);
  const id = session.id;
  await session.close();
  session = undefined;
  expect(findPlace(".", { cwd, outputFolder: share })).toMatchObject({ id, project: cwd });
  session = await Session.resume(".", { provider: new FakeProvider([{ text: "again" }]), cwd, settings: { output_folder: share } });
  expect(session.id).toBe(id);
});

test("a relative output folder is read from the project folder", async () => {
  const cwd = project();
  session = await Session.create({ adapters: [], provider: new FakeProvider([{ text: "ok" }]), cwd, settings: { guidance: false, referee: "none", output_folder: "results/cuvette" } });
  await session.send("Count the cells");
  expect(session.workDir.startsWith(join(cwd, "results", "cuvette") + "/")).toBe(true);
});

test("a project setting for the output folder wins over a user setting", async () => {
  const cwd = project();
  const user = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-user-out-")));
  writeFileSync(join(home, "settings.json"), JSON.stringify({ output_folder: user }));
  session = await Session.create({ adapters: [], provider: new FakeProvider([{ text: "ok" }]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.folderLine).toBe(`Results go to ${user}/<date>-<title>/`);
  await session.close();
  mkdirSync(join(cwd, ".cuvette"));
  writeFileSync(join(cwd, ".cuvette", "settings.json"), JSON.stringify({ output_folder: "project-results" }));
  trustFolder(cwd);
  session = await Session.create({ adapters: [], provider: new FakeProvider([{ text: "ok" }]), cwd, settings: { guidance: false, referee: "none" } });
  expect(session.folderLine).toBe(`Results go to ${join(cwd, "project-results")}/<date>-<title>/`);
});

test("a start that fails leaves no provisional folder and no index row", async () => {
  const cwd = project();
  for (const bad of [{ adapters: ["no-such-adapter"], provider: new FakeProvider([]) }, { adapters: [], model: "gpt4" }]) {
    await expect(Session.create({ ...bad, cwd, settings: { guidance: false, referee: "none" } })).rejects.toThrow();
    expect(readdirSync(join(cwd, "cuvette")).filter((n) => n.startsWith(".new-"))).toEqual([]);
    expect(readIndex()).toEqual([]);
  }
});

test("a session that closes with no request leaves no provisional folder and no index row", async () => {
  const cwd = project();
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  expect(readIndex()).toHaveLength(1);
  await session.close();
  session = undefined;
  expect(readdirSync(join(cwd, "cuvette")).filter((n) => n.startsWith(".new-"))).toEqual([]);
  expect(readIndex()).toEqual([]);
});

test("a session with a request keeps its folder and index row after it closes", async () => {
  const cwd = project();
  const s = await analysed(cwd);
  const id = s.id;
  await s.close();
  session = undefined;
  expect(readIndex().map((r) => r.id)).toEqual([id]);
  expect(findPlace(id, { cwd })?.id).toBe(id);
});

test("a close holds the session lock while it removes the empty folder", async () => {
  const cwd = project();
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  lockAtDiscard.length = 0;
  await session.close();
  session = undefined;
  expect(lockAtDiscard).toEqual([true]);
});

test.skipIf(process.platform === "win32" || process.getuid?.() === 0)("the index row stays when the empty folder cannot be removed", async () => {
  const cwd = project();
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { guidance: false, referee: "none" } });
  const place = findPlace(session.id, { cwd })!;
  const parent = join(place.outDir, "..");
  chmodSync(parent, 0o500);
  try {
    expect(() => discardPlace(place)).not.toThrow();
    expect(existsSync(place.outDir)).toBe(true);
    expect(readIndex().map((r) => r.id)).toEqual([session.id]);
  } finally {
    chmodSync(parent, 0o700);
  }
});

test.skipIf(process.platform === "win32")("Ctrl+C while a session starts removes the provisional folder and the index row", async () => {
  const cwd = project();
  const held: import("node:http").ServerResponse[] = [];
  const server = createServer((_, res) => void held.push(res));
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const host = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const code = `import { Session } from ${JSON.stringify(join(__dirname, "../src/core/session.ts"))}; Session.create({ adapters: [], model: "ollama:slow", cwd: ${JSON.stringify(cwd)}, settings: { guidance: false, referee: "none" } });`;
  const child = spawn(process.execPath, [TSX_CLI, "--eval", code], { env: { ...process.env, CUVETTE_HOME: home, OLLAMA_HOST: host }, stdio: "ignore" });
  const exit = new Promise<number | null>((done) => child.on("exit", (c) => done(c)));
  const root = join(cwd, "cuvette");
  const started = () => existsSync(root) && readdirSync(root).some((n) => n.startsWith(".new-")) && held.length > 0;
  for (let i = 0; i < 600 && !started(); i++) await new Promise((r) => setTimeout(r, 50));
  expect(started()).toBe(true);
  child.kill("SIGINT");
  expect(await exit).toBe(130);
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  expect(readdirSync(root).filter((n) => n.startsWith(".new-"))).toEqual([]);
  expect(readIndex()).toEqual([]);
}, 60_000);
