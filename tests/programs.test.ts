import { mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir, uptime } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { accessOf, codeTools, isCodeTool, saveAccess } from "../src/adapters/access.ts";
import { adapterIndex, formatIndex } from "../src/adapters/catalog.ts";
import { CUSTOM_HOW, type Located } from "../src/adapters/locate.ts";
import { Manifest } from "../src/adapters/manifest.ts";
import { lastUsedMap, listPrograms, planAction, programsTable, readLog, runAction, type Plan, type ProgramRow, type ProgramsOpts } from "../src/core/programs.ts";
import { Session } from "../src/core/session.ts";
import { trustFolder } from "../src/core/trust.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { startApp, type AppHandle } from "../src/server/app.ts";
import { appPageHtml } from "../src/server/app-page.ts";
import { programsHtml } from "../src/server/app-html.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { planFor } from "../src/ui/programs.ts";

const oldHome = process.env.CUVETTE_HOME;
let home = "";
let cwd = "";
let custom = "";
let session: Session | undefined;
let app: AppHandle | undefined;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-programs-"));
  cwd = mkdtempSync(join(tmpdir(), "cuvette-programs-cwd-"));
  process.env.CUVETTE_HOME = home;
  custom = touch(join(cwd, "tools", "delta-good", "delta"));
  touch(join(home, "envs", "biostats", "bin", "python"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
  await app?.close();
  app = undefined;
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

function touch(path: string): string {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "");
  return path;
}

function man(name: string, o: { field?: string; program?: string; tested?: string[]; paths?: string[]; install?: string; tools?: unknown[]; status?: string } = {}) {
  return Manifest.parse({
    adapter: { name, field: o.field ?? "testing", status: o.status ?? "draft" },
    program: { name: o.program ?? name.toUpperCase(), tested_versions: o.tested ?? [], install: o.install ?? "" },
    connection: { kind: "cli" },
    locate: { paths: o.paths ?? [`/opt/${name}/bin/${name}`] },
    tools: o.tools ?? [],
  });
}

function fakes(extra: Partial<ProgramsOpts> = {}): ProgramsOpts {
  const env = join(home, "envs", "biostats", "bin", "python");
  const adapters: Record<string, { manifest: Manifest; root: string }> = {
    alpha: { manifest: man("alpha", { field: "statistics", program: "Alpha stats", paths: ["~/.cuvette/envs/biostats/bin/python"] }), root: join(cwd, "a/alpha") },
    tables: { manifest: man("tables", { field: "statistics", paths: ["~/.cuvette/envs/biostats/bin/python"] }), root: join(cwd, "a/tables") },
    beta: { manifest: man("beta", { install: "Download BETA from the lab share." }), root: join(cwd, "a/beta") },
    gamma: { manifest: man("gamma", { tested: ["2.0"] }), root: join(cwd, "a/gamma") },
    delta: { manifest: man("delta", { field: "microscopy" }), root: join(cwd, "a/delta") },
    epsilon: { manifest: man("epsilon", { field: "microscopy", program: "Epsilon", tools: [{ name: "run_macro", description: "Run macro code.", params: { code: { type: "string" } } }] }), root: join(cwd, "a/epsilon") },
    zeta: { manifest: man("zeta", { field: "microscopy", paths: ["~/.cuvette/envs/cellpose/bin/python"] }), root: join(cwd, "a/zeta") },
    samtools: { manifest: man("samtools", { field: "genomics" }), root: join(cwd, "a/samtools") },
    qupath: { manifest: man("qupath", { field: "pathology" }), root: join(cwd, "a/qupath") },
  };
  const where: Record<string, Located> = {
    alpha: { path: env, version: "0.30.3", how: "path" },
    tables: { path: env, version: "0.30.3", how: "path" },
    beta: { version: "", how: "not found" },
    gamma: { path: "/opt/gamma/bin/gamma", version: "1.0", how: "path" },
    delta: { path: custom, version: "2.1", how: CUSTOM_HOW },
    epsilon: { path: "/Applications/Epsilon.app/Contents/MacOS/epsilon", version: "3.0", how: "path" },
    zeta: { version: "", how: "not found" },
    samtools: { version: "", how: "not found" },
    qupath: { version: "", how: "not found" },
  };
  return {
    cwd,
    home,
    env: {},
    adapters,
    locate: async (m, _root, path) => {
      if (!m.locate.paths.length) return path?.includes("good") ? { path, version: "9.9", how: CUSTOM_HOW } : { version: "", how: `not found; ${path} did not identify as ${m.program.name}` };
      return where[m.adapter.name]!;
    },
    run: async () => ({ code: 0, stdout: "", stderr: "" }),
    find: (n) => ({ uv: "/x/uv", brew: "/x/brew" })[n],
    size: async (paths) => paths.length * 1300,
    lastUsed: () => new Map([["alpha", Date.now() - 2 * 3600_000]]),
    ...extra,
  };
}

async function rows(o = fakes()): Promise<Record<string, ProgramRow>> {
  return Object.fromEntries((await listPrograms(o)).map((r) => [r.name, r]));
}

describe("the listing", () => {
  test("shows installed, missing, old, custom path and outside Cuvette, grouped by field", async () => {
    saveAccess("delta", { path: custom });
    const r = await rows();
    expect(r.alpha).toMatchObject({ state: "installed", version: "0.30.3", field: "statistics", size: 1300, owned: { kind: "folder", paths: [join(home, "envs", "biostats")], shared: ["tables"] } });
    expect(r.alpha!.lastUsed).toBeGreaterThan(0);
    expect(r.beta).toMatchObject({ state: "missing", install: { kind: "manual" } });
    expect(r.gamma).toMatchObject({ state: "old", owned: undefined });
    expect(r.gamma!.detail).toMatch(/1.0 is older than the tested version 2.0/);
    expect(r.delta).toMatchObject({ state: "custom", access: { path: custom } });
    expect(r.epsilon).toMatchObject({ state: "installed", owned: undefined, code: true, codeTools: ["run_macro"] });
    expect(r.zeta).toMatchObject({ state: "missing", install: { kind: "uv" } });
    expect(r.samtools!.install).toMatchObject({ kind: "brew", command: "brew install samtools" });
    expect(r.qupath!.install).toMatchObject({ kind: "link", link: "https://qupath.github.io" });
    const list = await listPrograms(fakes());
    expect(list.map((x) => x.field)).toEqual([...list.map((x) => x.field)].sort());
    const text = programsTable(list);
    for (const t of ["Statistics", "Microscopy", "Genomics", "alpha", "installed", "missing", "old version", "custom path", "outside Cuvette", "Cuvette", "2 h ago", "never"]) expect(text).toContain(t);
  });

  test("the quick listing does not run version commands", async () => {
    const locate = vi.fn();
    const r = await listPrograms(fakes({ quick: true, locate }));
    expect(locate).not.toHaveBeenCalled();
    expect(r.length).toBe(9);
  });

  test("the last use comes from the session records", () => {
    const log = join(home, "sessions", "s1", "log.jsonl");
    mkdirSync(dirname(log), { recursive: true });
    writeFileSync(log, [JSON.stringify({ id: 1, ts: "2026-10-01T10:00:00Z", kind: "session", data: { adapters: [{ name: "tables" }] } }), JSON.stringify({ id: 2, ts: "2026-10-02T10:00:00Z", kind: "adapter", data: { name: "imagej" } })].join("\n"));
    const m = lastUsedMap(home);
    expect(m.get("tables")).toBe(Date.parse("2026-10-01T10:00:00Z"));
    expect(m.get("imagej")).toBe(Date.parse("2026-10-02T10:00:00Z"));
  });
});

describe("the actions", () => {
  test("install runs only after confirmation, shows progress lines, and goes in the log and the session record", async () => {
    const r = await rows();
    const plan = await planAction(r.zeta!, "install");
    expect(plan).toMatchObject({ confirm: "Install", runs: true });
    expect(plan.command).toMatch(/^uv venv --python 3.12 .*envs[\\/]cellpose/);
    const exec = vi.fn(async (_c: string, line: (l: string) => void) => (line("Resolved 12 packages"), 0));
    const record = { append: vi.fn() };
    const no = await runAction(plan, { ...fakes(), via: "terminal", exec, record });
    expect(no).toMatchObject({ ok: false, text: "Nothing changed. This action needs your confirmation." });
    expect(exec).not.toHaveBeenCalled();
    const lines: string[] = [];
    const yes = await runAction(plan, { ...fakes(), via: "terminal", exec, record, confirmed: true, onLine: (l) => lines.push(l) });
    expect(yes).toMatchObject({ ok: true, text: "Installed zeta." });
    expect(exec).toHaveBeenCalledWith(plan.command, expect.any(Function), undefined);
    expect(lines).toEqual([`$ ${plan.command}`, "Resolved 12 packages"]);
    expect(readLog(home).at(-1)).toMatchObject({ action: "install", adapter: "zeta", ok: true, via: "terminal", command: plan.command });
    expect(record.append).toHaveBeenCalledWith("program", expect.objectContaining({ action: "install", adapter: "zeta", ok: true }));
  });

  test("an install command does not get the API keys and tokens of the shell", async () => {
    const old = { key: process.env.ANTHROPIC_API_KEY, gh: process.env.GITHUB_TOKEN };
    process.env.ANTHROPIC_API_KEY = "sk-ant-secret";
    process.env.GITHUB_TOKEN = "ghp-secret";
    try {
      const plan: Plan = { action: "install", name: "envtest", title: "", lines: [], runs: true, command: 'echo "key=${ANTHROPIC_API_KEY:-none} token=${GITHUB_TOKEN:-none} home=${HOME:+set}"' };
      const lines: string[] = [];
      expect((await runAction(plan, { home, via: "terminal", confirmed: true, onLine: (l) => lines.push(l) })).ok).toBe(true);
      expect(lines).toContain("key=none token=none home=set");
    } finally {
      if (old.key === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = old.key;
      if (old.gh === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = old.gh;
    }
  });

  test("Homebrew runs only after an explicit confirmation; a download shows the link and runs nothing", async () => {
    const r = await rows();
    const brew = await planAction(r.samtools!, "install");
    expect(brew).toMatchObject({ confirm: "Run Homebrew", command: "brew install samtools", runs: true });
    expect(brew.lines.join(" ")).toMatch(/Cuvette does not remove it later/);
    const exec = vi.fn(async () => 0);
    expect((await runAction(brew, { ...fakes(), via: "app", exec })).ok).toBe(false);
    expect(exec).not.toHaveBeenCalled();
    const link = await planAction(r.qupath!, "install");
    expect(link).toMatchObject({ runs: false, link: "https://qupath.github.io" });
    expect(link.confirm).toBeUndefined();
    expect(await runAction(link, { ...fakes(), via: "app", exec, confirmed: true })).toMatchObject({ ok: false });
    expect(exec).not.toHaveBeenCalled();
    const noBrew = await planAction((await rows(fakes({ find: () => undefined }))).samtools!, "install");
    expect(noBrew.refused).toMatch(/Homebrew is not installed/);
  });

  test("update installs the version that the adapter supports; install of an installed program says to update", async () => {
    const r = await rows();
    const up = await planAction(r.alpha!, "update");
    expect(up.command).toMatch(/uv pip install --python .*biostats[\\/](bin|Scripts)[\\/]python(\.exe)?.? --upgrade statsmodels/);
    expect((await planAction(r.alpha!, "install")).refused).toMatch(/already installed. Choose Update/);
    expect((await planAction(r.beta!, "update")).refused).toMatch(/not installed. Choose Install/);
  });

  test("remove shows the path and the size, and deletes only after confirmation", async () => {
    const r = await rows();
    const plan = await planAction(r.alpha!, "remove");
    expect(plan).toMatchObject({ confirm: "Delete", danger: true, paths: [join(home, "envs", "biostats")], size: 1300 });
    expect(plan.lines.join("\n")).toMatch(/Cuvette deletes this folder:[\s\S]*envs[\\/]biostats[\s\S]*Size: 1.3 KB[\s\S]*use the same environment and stop working too: tables/);
    const remove = vi.fn();
    expect((await runAction(plan, { ...fakes(), via: "terminal", remove })).ok).toBe(false);
    expect(remove).not.toHaveBeenCalled();
    const done = await runAction(plan, { ...fakes(), via: "terminal", remove, confirmed: true });
    expect(done.ok).toBe(true);
    expect(remove).toHaveBeenCalledWith(join(home, "envs", "biostats"));
    expect(readLog(home).at(-1)).toMatchObject({ action: "remove", paths: [join(home, "envs", "biostats")], size: 1300 });
  });

  test("remove refuses a program that Cuvette did not install", async () => {
    const r = await rows();
    const plan = await planAction(r.epsilon!, "remove");
    expect(plan.refused).toBe("Installed outside Cuvette: /Applications/Epsilon.app/Contents/MacOS/epsilon. Cuvette removes only what it installed.");
    const remove = vi.fn();
    expect(await runAction(plan, { ...fakes(), via: "app", remove, confirmed: true })).toMatchObject({ ok: false });
    const forged: Plan = { action: "remove", name: "imagej", title: "Remove", lines: [], runs: true, confirm: "Delete", paths: ["/Applications/ImageJ.app"] };
    const r2 = await runAction(forged, { ...fakes(), via: "app", remove, confirmed: true });
    expect(r2.text).toMatch(/Refused: \/Applications\/ImageJ.app is outside the folders that Cuvette installs into/);
    expect(remove).not.toHaveBeenCalled();
    expect(r.epsilon!.owned).toBeUndefined();
  });

  test("set path checks the identity, then saves the path in settings", async () => {
    const r = await rows();
    const bad = touch(join(cwd, "tools", "other", "delta"));
    const no = await planFor("delta", "path", { ...fakes(), path: bad });
    expect(no.plan!.refused).toMatch(/is not DELTA: .* did not identify as DELTA/);
    const plan = await planAction(r.delta!, "path", { path: custom, manifest: fakes().adapters!.delta!.manifest, locate: fakes().locate });
    expect(plan).toMatchObject({ confirm: "Save the path", customPath: custom });
    expect(plan.lines[0]).toMatch(/Found DELTA 9.9/);
    expect(accessOf("delta").path).toBeUndefined();
    await runAction(plan, { ...fakes(), via: "terminal", confirmed: true });
    expect(accessOf("delta").path).toBe(custom);
    expect(JSON.parse(readFileSync(join(home, "settings.json"), "utf8")).programs.delta.path).toBe(custom);
    const clear = await planAction((await rows()).delta!, "path", { path: "" });
    expect(clear).toMatchObject({ confirm: "Remove the path" });
    await runAction(clear, { ...fakes(), via: "terminal", confirmed: true });
    expect(accessOf("delta").path).toBeUndefined();
  });

  test("access: turn off and on, block the code tools, approve a draft", async () => {
    const r = await rows();
    const off = await planAction(r.epsilon!, "disable");
    expect(off.confirm).toBe("Turn off");
    expect((await runAction(off, { ...fakes(), via: "app" })).ok).toBe(false);
    expect(accessOf("epsilon").off).toBeUndefined();
    await runAction(off, { ...fakes(), via: "app", confirmed: true });
    expect(accessOf("epsilon").off).toBe(true);
    expect((await rows()).epsilon!.access.off).toBe(true);
    await runAction(await planAction((await rows()).epsilon!, "enable"), { ...fakes(), via: "app", confirmed: true });
    expect(accessOf("epsilon").off).toBeUndefined();

    const code = await planAction(r.epsilon!, "code-off");
    expect(code.lines[0]).toMatch(/does not get these tools: run_macro/);
    await runAction(code, { ...fakes(), via: "app", confirmed: true });
    expect(accessOf("epsilon").code).toBe(false);
    expect((await planAction(r.alpha!, "code-off")).refused).toMatch(/has no tool that runs code/);
    expect((await planAction(r.alpha!, "network-on")).refused).toMatch(/does not control network use/);
    expect(isCodeTool("run_script")).toBe(true);
    expect(isCodeTool("count", { input: {} })).toBe(false);
    expect(codeTools(fakes().adapters!.epsilon!.manifest)).toEqual(["run_macro"]);

    const approve = vi.fn(async () => ({}));
    const ap = await planAction(r.alpha!, "approve", { by: "Parker" });
    expect(ap.lines.join(" ")).toMatch(/approved_by: Parker/);
    expect((await runAction(ap, { ...fakes(), via: "app", approve })).ok).toBe(false);
    expect(approve).not.toHaveBeenCalled();
    expect(await runAction(ap, { ...fakes(), via: "app", approve, by: "Parker", confirmed: true })).toMatchObject({ ok: true, text: "Approved alpha (by Parker)." });
    expect(approve).toHaveBeenCalledWith(join(cwd, "a/alpha"), "Parker");
  });
});

function labCwd(): string {
  const dir = join(cwd, ".cuvette", "adapters", "lab");
  mkdirSync(dir, { recursive: true });
  const yaml = readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8");
  writeFileSync(join(dir, "adapter.yaml"), yaml.replace('adapter: { name: lab, title: Lab counter, version: "0.2.0" }', 'adapter: { name: lab, title: Lab counter, version: "0.2.0", field: microscopy, file_types: [".lab"] }'));
  symlinkSync(join(__dirname, "fixtures/lab/server.ts"), join(dir, "server.ts"));
  const coder = join(cwd, ".cuvette", "adapters", "coder");
  mkdirSync(coder, { recursive: true });
  writeFileSync(
    join(coder, "adapter.yaml"),
    `adapter: { name: coder, field: testing }
program: { name: Coder }
connection: { kind: cli }
tools:
  - { name: hello, description: Say hello., command: [echo, hello] }
  - { name: run_code, description: Run code., params: { code: { type: string } }, command: [echo, "{code}"] }
`,
  );
  trustFolder(cwd);
  return cwd;
}

describe("access in a session", () => {
  test("a disabled adapter is not offered by list_adapters and cannot load", async () => {
    labCwd();
    const quick = await rows({ cwd, quick: true, lastUsed: () => new Map() });
    expect(formatIndex(adapterIndex(cwd))).toMatch(/- lab \|/);
    await runAction(await planAction(quick.lab!, "disable"), { cwd, via: "terminal", confirmed: true });
    expect(formatIndex(adapterIndex(cwd))).not.toMatch(/- lab \|/);
    session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd });
    session.decisions.applySetup({});
    session.setOwner("adapter", "agent");
    expect(session.adapterList().map((a) => a.name)).not.toContain("lab");
    const r = await session.useAdapter("lab", "it reads .lab files");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/the adapter lab is turned off in Programs/);
    await session.close();
    session = undefined;
    await expect(Session.create({ adapters: ["lab"], provider: new FakeProvider([]), cwd })).rejects.toThrow(/turned off/);
    await runAction(await planAction((await rows({ cwd, quick: true, lastUsed: () => new Map() })).lab!, "enable"), { cwd, via: "terminal", confirmed: true });
    expect(formatIndex(adapterIndex(cwd))).toMatch(/- lab \|/);
  });

  test("blocking its own code removes the code tools from a session", async () => {
    labCwd();
    saveAccess("coder", { code: false });
    session = await Session.create({ adapters: ["coder"], provider: new FakeProvider([]), cwd });
    const names = session.allTools().map((t) => t.name);
    expect(names).toContain("hello");
    expect(names).not.toContain("run_code");
  });
});

describe("the browser app", () => {
  test("the page has a Programs page in the navigation and renders the list grouped by field", async () => {
    const page = appPageHtml("tok");
    expect(page).toContain('data-page="programs"');
    expect(page).toContain('id="p-programs"');
    expect(page).toContain('id="progdlg"');
    const html = programsHtml(await listPrograms(fakes()));
    for (const t of ["<h3>Statistics</h3>", "<h3>Microscopy</h3>", 'data-prog="alpha"', 'data-prog-act="install"', 'data-prog-act="remove"', 'data-prog-act="check"', "Installed outside Cuvette", "last use: 2 h ago", "1.3 KB", "old version"]) expect(html).toContain(t);
    expect(html).not.toMatch(/<table/);
  });

  test("an action asks first, bypass permissions does not skip it, and install progress streams", async () => {
    const s = new FakeSession();
    s.setPermissionMode("bypass");
    const exec = vi.fn(async (_c: string, line: (l: string) => void) => {
      line("step one");
      line("step two");
      return 0;
    });
    app = await startApp({ session: s, env: {}, programs: { ...fakes(), exec } });
    const base = app.url.split("?")[0]!;
    const post = (p: string, body: unknown) => fetch(`${base}${p}?t=${app!.token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    const list = await fetch(`${base}api/programs?t=${app.token}`).then((r) => r.text());
    expect(list).toContain('data-prog="zeta"');
    const plan = await post("api/programs/plan", { name: "zeta", action: "install" });
    expect(plan.plan).toMatchObject({ confirm: "Install", runs: true });
    const no = await post("api/programs/run", { name: "zeta", action: "install" });
    expect(no).toMatchObject({ ok: false, text: "Nothing changed. This action needs your confirmation." });
    expect(exec).not.toHaveBeenCalled();
    const job = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    expect(job.job).toMatch(/^[0-9a-f]+$/);
    const stream = await fetch(`${base}api/programs/progress?job=${job.job}&t=${app.token}`).then((r) => r.text());
    expect(stream).toContain('"line":"step one"');
    expect(stream).toContain('"line":"step two"');
    expect(stream).toContain('"done":true,"ok":true,"text":"Installed zeta."');
    expect(s.record.entries(["program"]).at(-1)!.data).toMatchObject({ action: "install", adapter: "zeta", via: "app" });
    const refused = await post("api/programs/run", { name: "epsilon", action: "remove", confirmed: true });
    expect(refused.text).toMatch(/Installed outside Cuvette/);
  });

  test("a second install of the same program while the first runs gets the first job", async () => {
    let release = () => {};
    const exec = vi.fn(async (_c: string, line: (l: string) => void) => {
      line("started");
      await new Promise<void>((r) => (release = r));
      return 0;
    });
    app = await startApp({ session: new FakeSession(), env: {}, programs: { ...fakes(), exec } });
    const base = app.url.split("?")[0]!;
    const post = (p: string, body: unknown) => fetch(`${base}${p}?t=${app!.token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    const first = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    await vi.waitFor(() => expect(exec).toHaveBeenCalledTimes(1));
    const second = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    expect(second.job).toBe(first.job);
    expect(exec).toHaveBeenCalledTimes(1);
    release();
    const stream = await fetch(`${base}api/programs/progress?job=${first.job}&t=${app.token}`).then((r) => r.text());
    expect(stream).toContain('"line":"started"');
    expect(stream).toContain('"done":true');
    const third = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    expect(third.job).not.toBe(first.job);
    release();
  });
});

describe("a long install that throws", () => {
  test("the job ends as failed with the message, and a new install can start", async () => {
    const s = new FakeSession();
    const append = vi.spyOn(s.record, "append").mockImplementationOnce(() => {
      throw new Error("disk full");
    });
    app = await startApp({ session: s, env: {}, programs: { ...fakes(), exec: async () => 0 } });
    const base = app.url.split("?")[0]!;
    const post = (p: string, body: unknown) => fetch(`${base}${p}?t=${app!.token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    const first = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    const stream = await fetch(`${base}api/programs/progress?job=${first.job}&t=${app.token}`).then((r) => r.text());
    expect(stream).toMatch(/"done":true,"ok":false,"text":"The install did not finish: disk full/);
    append.mockRestore();
    const second = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    expect(second.job).not.toBe(first.job);
  });
});

describe("a long install: stop, password, and a second action at the same time", () => {
  const server = async (exec: (c: string, l: (x: string) => void, s?: AbortSignal) => Promise<number | null>) => {
    app = await startApp({ session: new FakeSession(), env: {}, programs: { ...fakes(), exec } });
    const base = app.url.split("?")[0]!;
    const post = (p: string, body: unknown) => fetch(`${base}${p}?t=${app!.token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
    const get = (p: string) => fetch(`${base}${p}${p.includes("?") ? "&" : "?"}t=${app!.token}`).then((r) => r.text());
    return { post, get };
  };
  const waitAbort = (line: (l: string) => void, signal?: AbortSignal) =>
    new Promise<number | null>((done) => {
      line("Downloading 1.2 GB");
      signal?.addEventListener("abort", () => done(null));
    });

  test("Stop ends the job, and the result says that the install can be partial", async () => {
    const { post, get } = await server(async (_c, line, signal) => waitAbort(line, signal));
    const job = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    const list = JSON.parse(await get("api/programs.json?quick=1"));
    expect(list.jobs).toEqual([expect.objectContaining({ id: job.job, name: "zeta", action: "install" })]);
    expect(await post("api/programs/stop", { job: job.job })).toMatchObject({ status: 200, ok: true });
    const stream = await get(`api/programs/progress?job=${job.job}`);
    expect(stream).toContain('"line":"Downloading 1.2 GB"');
    expect(stream).toMatch(/"done":true,"ok":false,"text":"You stopped the install\. Part of zeta can be on this computer\. Choose Install again/);
    expect(readLog(home).at(-1)).toMatchObject({ action: "install", adapter: "zeta", ok: false, stopped: true });
    expect(JSON.parse(await get("api/programs.json?quick=1")).jobs).toEqual([]);
    expect((await post("api/programs/stop", { job: "nope" })).status).toBe(404);
  });

  test("an update of the program while its install runs gets the install job, and a remove is refused", async () => {
    const { post, get } = await server(async (_c, line, signal) => waitAbort(line, signal));
    const job = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    const plan = (await planFor("zeta", "install", fakes())).plan!;
    const staged = await post("api/programs/run", { name: "zeta", action: "update", confirmed: true });
    expect(staged.job ?? staged.error).toBe(job.job);
    const removed = await post("api/programs/run", { name: "zeta", action: "path", path: "", confirmed: true });
    expect(removed.status).toBe(409);
    expect(removed.error).toMatch(/zeta: an install runs now/);
    expect(await runAction(plan, { ...fakes(), via: "terminal", confirmed: true, exec: async () => 0 })).toMatchObject({ ok: false, text: expect.stringMatching(/zeta: an install runs now/) });
    await post("api/programs/stop", { job: job.job });
    await get(`api/programs/progress?job=${job.job}`);
  });

  test("a command that asks for a password says so and names the command to run in Terminal", async () => {
    const { post, get } = await server(async (_c, line) => (line("Password:"), line("sudo: a terminal is required to read the password; either use the -S option"), 1));
    const job = await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    const stream = await get(`api/programs/progress?job=${job.job}`);
    expect(stream).toMatch(/"ok":false,"text":"The command asks for your password, and Cuvette cannot type it\. Run the command in Terminal/);
  });

  test("a stop ends the real command and its child processes at once", async () => {
    const plan: Plan = { action: "install", name: "zeta", title: "", lines: [], runs: true, confirm: "Install", command: "sh -c 'sleep 30'; echo after" };
    const abort = new AbortController();
    const lines: string[] = [];
    setTimeout(() => abort.abort(), 300);
    const t0 = Date.now();
    const r = await runAction(plan, { ...fakes(), via: "app", confirmed: true, signal: abort.signal, onLine: (l) => lines.push(l) });
    expect(Date.now() - t0).toBeLessThan(3000);
    expect(r.text).toMatch(/^You stopped the install/);
    expect(lines).not.toContain("after");
  });

  test("two programs install at the same time, but two Homebrew commands do not", async () => {
    const plan = (name: string, command: string): Plan => ({ action: "install", name, title: "", lines: [], runs: true, confirm: "Install", command });
    let release = () => {};
    const slow = vi.fn(() => new Promise<number>((r) => (release = () => r(0))));
    const first = runAction(plan("samtools", "brew install samtools"), { ...fakes(), via: "app", confirmed: true, exec: slow });
    await vi.waitFor(() => expect(slow).toHaveBeenCalled());
    const exec = vi.fn(async () => 0);
    expect(await runAction(plan("zeta", "uv pip install zeta"), { ...fakes(), via: "app", confirmed: true, exec })).toMatchObject({ ok: true });
    expect(await runAction(plan("qupath", "brew install --cask qupath"), { ...fakes(), via: "app", confirmed: true, exec })).toMatchObject({ ok: false, text: expect.stringMatching(/^samtools: an install runs now/) });
    expect(exec).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toMatchObject({ ok: true });
    expect(await runAction(plan("qupath", "brew install --cask qupath"), { ...fakes(), via: "app", confirmed: true, exec })).toMatchObject({ ok: true });
  });

  test("an install that runs in another process blocks a second one until that process ends", async () => {
    const plan = (await planFor("zeta", "install", fakes())).plan!;
    mkdirSync(join(home, "programs-running"), { recursive: true });
    writeFileSync(join(home, "programs-running", "zeta.json"), JSON.stringify({ pid: process.ppid, action: "update", name: "zeta" }));
    const exec = vi.fn(async () => 0);
    expect(await runAction(plan, { ...fakes(), via: "terminal", confirmed: true, exec })).toMatchObject({ ok: false, text: expect.stringMatching(/zeta: an update runs now/) });
    expect(exec).not.toHaveBeenCalled();
    writeFileSync(join(home, "programs-running", "zeta.json"), JSON.stringify({ pid: 999999, action: "update", name: "zeta" }));
    expect(await runAction(plan, { ...fakes(), via: "terminal", confirmed: true, exec })).toMatchObject({ ok: true });
    expect(exec).toHaveBeenCalledTimes(1);
  });

  test("a damaged or empty lock file does not block and does not stop the install", async () => {
    const plan = (await planFor("zeta", "install", fakes())).plan!;
    mkdirSync(join(home, "programs-running"), { recursive: true });
    const exec = vi.fn(async () => 0);
    for (const body of ["", "null", "{bad", "7"]) {
      writeFileSync(join(home, "programs-running", "zeta.json"), body);
      expect(await runAction(plan, { ...fakes(), via: "terminal", confirmed: true, exec })).toMatchObject({ ok: true });
    }
    expect(exec).toHaveBeenCalledTimes(4);
  });

  test("a lock file from before a restart of the computer does not block, also if a new process has its process ID", async () => {
    const plan = (await planFor("zeta", "install", fakes())).plan!;
    mkdirSync(join(home, "programs-running"), { recursive: true });
    const before = new Date(Date.now() - uptime() * 1000 - 3_600_000).toISOString();
    writeFileSync(join(home, "programs-running", "zeta.json"), JSON.stringify({ pid: process.ppid, action: "install", name: "zeta", started: before }));
    const exec = vi.fn(async () => 0);
    expect(await runAction(plan, { ...fakes(), via: "terminal", confirmed: true, exec })).toMatchObject({ ok: true });
    writeFileSync(join(home, "programs-running", "zeta.json"), JSON.stringify({ pid: process.ppid, action: "install", name: "zeta", started: new Date().toISOString() }));
    expect(await runAction(plan, { ...fakes(), via: "terminal", confirmed: true, exec })).toMatchObject({ ok: false });
    expect(exec).toHaveBeenCalledTimes(1);
  });

  test("closing the app (Ctrl+C in the terminal) stops a running install and removes its lock", async () => {
    let stopped = false;
    const { post } = await server(async (_c, line, signal) => {
      const code = await waitAbort(line, signal);
      stopped = true;
      return code;
    });
    await post("api/programs/run", { name: "zeta", action: "install", confirmed: true });
    await vi.waitFor(() => expect(readdirSync(join(home, "programs-running"))).toContain("zeta.json"));
    await app!.close();
    app = undefined;
    expect(stopped).toBe(true);
    expect(readdirSync(join(home, "programs-running"))).not.toContain("zeta.json");
  });
});
