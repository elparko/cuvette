import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { parse, stringify } from "yaml";
import { REVIEW_PROMPT } from "../src/adapters/audit.ts";
import { adapterIndex, formatIndex } from "../src/adapters/catalog.ts";
import { adapterCommand } from "../src/adapters/commands.ts";
import { applyInstall, cardLines, installedRows, prepareAdd, prepareUpdate, removeInstalled, reviewPlan } from "../src/adapters/install.ts";
import { CATALOG_DIR } from "../src/adapters/manifest.ts";
import { fetchIndex } from "../src/adapters/registry.ts";
import { adapterTrust, confirmCode, hashFolder, readInstalled, saveInstalled, userAdapterDir } from "../src/adapters/source.ts";
import { listPrograms, programsTable, planAction, planFromInstall, runAction } from "../src/core/programs.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { startApp, type AppHandle } from "../src/server/app.ts";
import { appPageHtml } from "../src/server/app-page.ts";
import { programsHtml } from "../src/server/app-html.ts";
import { FakeSession } from "../src/ui/fake-session.ts";

const old = { home: process.env.CUVETTE_HOME, stage: process.env.CUVETTE_STAGING };
let home = "";
let work = "";
let app: AppHandle | undefined;
let session: Session | undefined;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-install-home-"));
  work = mkdtempSync(join(tmpdir(), "cuvette-install-work-"));
  process.env.CUVETTE_HOME = home;
  process.env.CUVETTE_STAGING = join(work, "staging");
});
afterEach(async () => {
  await app?.close();
  app = undefined;
  await session?.close();
  session = undefined;
  if (old.home === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = old.home;
  if (old.stage === undefined) delete process.env.CUVETTE_STAGING;
  else process.env.CUVETTE_STAGING = old.stage;
  rmSync(home, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
});

function fixture(dir: string, o: { name?: string; version?: string; code?: boolean; network?: boolean; tool?: boolean } = {}): string {
  cpSync(join(CATALOG_DIR, "openbabel"), dir, { recursive: true });
  if (!o.code) {
    rmSync(join(dir, "scripts"), { recursive: true, force: true });
    rmSync(join(dir, "checks"), { recursive: true, force: true });
  }
  const file = join(dir, "adapter.yaml");
  const m = parse(readFileSync(file, "utf8"));
  m.adapter.name = o.name ?? "obtest";
  m.adapter.version = o.version ?? "1.0.0";
  if (o.network) m.connection.network = true;
  if (o.tool) {
    m.tools.push({ ...m.tools[0], name: "extra_tool" });
    m.map.push({ ...m.map[0], tool: "extra_tool" });
  }
  writeFileSync(file, stringify(m));
  return dir;
}

function repo(dir: string): string {
  const run = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: dir, stdio: "pipe" }).toString().trim();
  run("init", "-q", "-b", "main");
  run("add", "-A");
  run("commit", "-q", "-m", "first");
  return run("rev-parse", "HEAD");
}

function commit(dir: string): string {
  const run = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: dir, stdio: "pipe" }).toString().trim();
  run("add", "-A");
  run("commit", "-q", "-m", "next");
  return run("rev-parse", "HEAD");
}

describe("adapter add", () => {
  test("a local folder installs after the card, with the source and a SHA-256 in the index", async () => {
    const src = fixture(join(work, "src"));
    const plan = await prepareAdd(src);
    expect(plan.refused).toBeUndefined();
    expect(existsSync(userAdapterDir("obtest"))).toBe(false);
    expect(applyInstall(plan.id, { confirmed: false })).toMatchObject({ ok: false });
    expect(existsSync(userAdapterDir("obtest"))).toBe(false);
    const done = applyInstall(plan.id, { confirmed: true });
    expect(done.ok).toBe(true);
    expect(existsSync(join(userAdapterDir("obtest"), "adapter.yaml"))).toBe(true);
    const e = readInstalled().obtest!;
    expect(e).toMatchObject({ kind: "folder", source: src, version: "1.0.0" });
    expect(e.sha256).toBe(hashFolder(userAdapterDir("obtest")));
    expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(existsSync(plan.work)).toBe(false);
    expect(installedRows()[0]).toMatchObject({ name: "obtest", trust: "Unlisted", state: "as installed" });
  });

  test("a zip file installs", async () => {
    fixture(join(work, "zsrc"));
    execFileSync("zip", ["-q", "-r", join(work, "obtest.zip"), "."], { cwd: join(work, "zsrc") });
    const plan = await prepareAdd(join(work, "obtest.zip"));
    expect(plan.refused).toBeUndefined();
    expect(applyInstall(plan.id, { confirmed: true }).ok).toBe(true);
    expect(readInstalled().obtest!.kind).toBe("zip");
  });

  test("a repository installs pinned to a commit, and a later commit does not change it", async () => {
    const r = join(work, "repo");
    fixture(r);
    const first = repo(r);
    const plan = await prepareAdd(`file://${r}`);
    expect(plan.entry).toMatchObject({ kind: "git", commit: first });
    expect(cardLines(plan.card).join("\n")).toContain(`pinned to commit ${first}`);
    expect(applyInstall(plan.id, { confirmed: true }).ok).toBe(true);
    fixture(r, { version: "1.1.0" });
    commit(r);
    expect(readInstalled().obtest).toMatchObject({ commit: first, version: "1.0.0" });
    expect(parse(readFileSync(join(userAdapterDir("obtest"), "adapter.yaml"), "utf8")).adapter.version).toBe("1.0.0");
    const pinned = await prepareAdd(`file://${r}#${first}`).catch((e: Error) => e);
    expect(pinned).toMatchObject({ refused: expect.stringMatching(/already installed/) });
  });

  test("a symbolic link in the source is refused", async () => {
    const src = fixture(join(work, "link"));
    execFileSync("ln", ["-s", "/etc/hosts", join(src, "hosts")]);
    await expect(prepareAdd(src)).rejects.toThrow(/symbolic link/);
  });

  test("a broken adapter is refused and nothing is installed", async () => {
    const src = fixture(join(work, "broken"));
    const file = join(src, "adapter.yaml");
    const m = parse(readFileSync(file, "utf8"));
    m.tools[0].required = ["no_such_argument"];
    writeFileSync(file, stringify(m));
    const plan = await prepareAdd(src);
    expect(plan.refused).toMatch(/The check found \d+ errors?/);
    expect(plan.card.lint.ok).toBe(false);
    expect(applyInstall(plan.id, { confirmed: true }).ok).toBe(false);
    expect(existsSync(userAdapterDir("obtest"))).toBe(false);
    expect(readInstalled()).toEqual({});
  });

  test("the command asks first and installs only after yes", async () => {
    const src = fixture(join(work, "cmd"));
    const said: string[] = [];
    const no = await adapterCommand("add", src, { ask: async () => "n", say: (l) => said.push(l) });
    expect(no).toBe(0);
    expect(said.join("\n")).toContain("Nothing changed.");
    expect(existsSync(userAdapterDir("obtest"))).toBe(false);
    const prompts: string[] = [];
    const yes = await adapterCommand("add", src, { ask: async (p) => (prompts.push(p), "y"), say: (l) => said.push(l) }, {});
    expect(yes).toBe(0);
    expect(prompts.some((p) => /Install obtest 1\.0\.0\? This adapter is Unlisted\./.test(p))).toBe(true);
    expect(existsSync(userAdapterDir("obtest"))).toBe(true);
  });
});

describe("the capability card", () => {
  test("the card shows the program, code, network, decisions, license, citations and the check result", async () => {
    const src = fixture(join(work, "card"), { code: true, network: true });
    writeFileSync(join(src, "LICENSE"), "MIT License\n\nPermission is hereby granted, free of charge, to any person\n");
    const plan = await prepareAdd(src);
    const text = cardLines(plan.card).join("\n");
    expect(text).toContain("Adapter: obtest 1.0.0");
    expect(text).toMatch(/Trust: Unlisted\./);
    expect(text).toContain("WARNING: Read the files");
    expect(text).toMatch(/Program: needs Open Babel/);
    expect(text).toMatch(/Code that runs on this computer: \d+ files?: .*scripts\/obabel\.sh/);
    expect(text).toContain("Network: yes, the manifest allows the network");
    expect(text).toMatch(/Decisions that it adds: \d+: /);
    expect(text).toContain("License: MIT.");
    expect(text).toMatch(/Citations: 1: .*Open Babel/);
    expect(text).toMatch(/Check: passes with 0 errors/);
    expect(text).toContain("Known-answer tests: not run.");
    expect(plan.card.code.length).toBeGreaterThan(0);
  });

  test("an adapter without code says so, and a name from the catalog gets a replacement note", async () => {
    const plain = await prepareAdd(fixture(join(work, "plain")));
    const text = cardLines(plain.card).join("\n");
    expect(text).toContain("Code that runs on this computer: none.");
    expect(text).toContain("Network: no.");
    expect(text).toContain("License: none stated.");
    const named = await prepareAdd(fixture(join(work, "same"), { name: "openbabel" }));
    expect(cardLines(named.card).join("\n")).toContain("The built-in catalog has an adapter named openbabel");
  });

  test("the check imports no code before the install", async () => {
    const src = fixture(join(work, "evil"), { code: true });
    writeFileSync(join(src, "adapter.ts"), `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(join(work, "pwned"))}, "x");\nexport default {};\n`);
    const file = join(src, "adapter.yaml");
    const m = parse(readFileSync(file, "utf8"));
    m.module = "adapter.ts";
    writeFileSync(file, stringify(m));
    const plan = await prepareAdd(src);
    expect(existsSync(join(work, "pwned"))).toBe(false);
    expect(plan.card.code).toContain("adapter.ts");
  });

  test("bypass permissions does not skip the confirmation", async () => {
    const s = new FakeSession();
    s.setPermissionMode("bypass");
    const plan = await prepareAdd(fixture(join(work, "bypass")));
    const r = await runAction(planFromInstall(plan), { via: "app", confirmed: false });
    expect(r).toMatchObject({ ok: false, text: "Nothing changed. This action needs your confirmation." });
    expect(existsSync(userAdapterDir("obtest"))).toBe(false);
  });
});

describe("update and remove", () => {
  test("update shows the changed files, the new tool and the new permission before it applies", async () => {
    const r = join(work, "upd");
    fixture(r);
    repo(r);
    const first = await prepareAdd(`file://${r}`);
    expect(applyInstall(first.id, { confirmed: true }).ok).toBe(true);
    const same = await prepareUpdate("obtest");
    expect(same.upToDate).toBe(true);
    fixture(r, { version: "1.1.0", network: true, tool: true });
    const next = commit(r);
    const plan = await prepareUpdate("obtest");
    expect(plan.upToDate).toBeUndefined();
    expect(plan.changes).toMatchObject({ toolsAdded: ["extra_tool"], changed: ["adapter.yaml"] });
    expect(plan.changes!.permissions).toContain("It now uses the network.");
    expect(plan.changes!.to).toContain(next.slice(0, 8));
    expect(readInstalled().obtest!.version).toBe("1.0.0");
    const said: string[] = [];
    await adapterCommand("update", "obtest", { ask: async () => "n", say: (l) => said.push(l) });
    const out = said.join("\n");
    expect(out).toContain("Update: 1.0.0");
    expect(out).toContain("New tools: extra_tool.");
    expect(out).toContain("New permission: It now uses the network.");
    expect(readInstalled().obtest!.version).toBe("1.0.0");
    const again = await prepareUpdate("obtest");
    const applied = applyInstall(again.id, { confirmed: true });
    expect(applied.text).toContain("Updated obtest 1.1.0");
    expect(readInstalled().obtest).toMatchObject({ version: "1.1.0", commit: next });
  });

  test("remove deletes the folder and the index entry, and only for an installed adapter", async () => {
    const plan = await prepareAdd(fixture(join(work, "rm")));
    applyInstall(plan.id, { confirmed: true });
    expect(removeInstalled("openbabel").ok).toBe(false);
    expect(removeInstalled("obtest").ok).toBe(true);
    expect(existsSync(userAdapterDir("obtest"))).toBe(false);
    expect(readInstalled()).toEqual({});
    const said: string[] = [];
    expect(await adapterCommand("remove", "obtest", { ask: async () => "y", say: (l) => said.push(l) })).toBe(1);
  });

  test("list --installed shows the source, the commit and the SHA-256", async () => {
    const r = join(work, "lst");
    fixture(r);
    const sha = repo(r);
    applyInstall((await prepareAdd(`file://${r}`)).id, { confirmed: true });
    const said: string[] = [];
    await adapterCommand("list", undefined, { ask: async () => "", say: (l) => said.push(l) }, { installed: true });
    expect(said.join("\n")).toContain("obtest");
    expect(said.join("\n")).toContain(sha.slice(0, 12));
    expect(said.join("\n")).toContain(readInstalled().obtest!.sha256.slice(0, 16));
  });
});

describe("trust labels", () => {
  test("a catalog adapter is Reviewed and an installed folder is Unlisted", async () => {
    expect(adapterTrust(join(CATALOG_DIR, "openbabel")).label).toBe("Reviewed");
    applyInstall((await prepareAdd(fixture(join(work, "t1")))).id, { confirmed: true });
    const t = adapterTrust(userAdapterDir("obtest"));
    expect(t).toMatchObject({ label: "Unlisted", level: "unlisted" });
    expect(t.detail).toContain("nobody reviewed or checked it");
  });

  test("the label shows in list_adapters, the Programs table, the Programs page and the Programs rows", async () => {
    applyInstall((await prepareAdd(fixture(join(work, "t2")))).id, { confirmed: true });
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-install-cwd-"));
    const index = formatIndex(adapterIndex(cwd));
    expect(index).toMatch(/- obtest \|.*\| trust: Unlisted \|/);
    expect(index).toMatch(/- openbabel \|.*\| trust: Reviewed \|/);
    const rows = await listPrograms({ cwd, quick: true, only: ["obtest", "openbabel"], lastUsed: () => new Map() });
    expect(rows.map((r) => [r.name, r.trust])).toEqual([["obtest", "unlisted"], ["openbabel", "reviewed"]]);
    expect(programsTable(rows)).toMatch(/obtest.*Unlisted/);
    expect(programsTable(rows)).toMatch(/openbabel.*Reviewed/);
    const html = programsHtml(rows);
    expect(html).toContain('trust-unlisted warn');
    expect(html).toContain(">Unlisted<");
    expect(html).toContain(">Reviewed<");
    expect(html).toContain("nobody reviewed or checked it");
  });

  test("the label shows in the program choice and in the record", async () => {
    applyInstall((await prepareAdd(fixture(join(work, "t3")))).id, { confirmed: true });
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-install-cwd-"));
    session = await Session.create({ adapters: ["obtest"], provider: new FakeProvider([]), cwd });
    expect(session.adapterInfo[0]!.trust).toBe("Unlisted");
    await session.close();
    session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd });
    session.decisions.applySetup({});
    session.setOwner("adapter", "human");
    const asking = session.useAdapter("obtest", "it reads smiles files");
    let q;
    for (let i = 0; i < 100 && !q; i++) {
      await new Promise((r) => setTimeout(r, 20));
      q = session.questions.open().find((x) => x.decisionKey === "adapter");
    }
    expect(q!.text).toContain("(trust: Unlisted)");
    await session.answer(q!.qid, q!.options[0]!.value);
    expect((await asking).ok).toBe(true);
    expect(session.record.entries(["adapter"]).at(-1)!.data.trust).toBe("Unlisted");
  });

  test("an Unlisted adapter with code needs one more confirmation the first time it runs", async () => {
    const src = fixture(join(work, "t4"), { code: true });
    applyInstall((await prepareAdd(src)).id, { confirmed: true });
    const root = userAdapterDir("obtest");
    expect(adapterTrust(root)).toMatchObject({ codeConfirmed: false });
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-install-cwd-"));
    await expect(Session.create({ adapters: ["obtest"], provider: new FakeProvider([]), cwd })).rejects.toThrow(/Unlisted and ships code.*cuvette adapter allow-code obtest/);

    session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { askWaits: false } });
    session.decisions.applySetup({});
    session.setOwner("adapter", "agent");
    const r = await session.useAdapter("obtest", "it reads smiles files");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/BLOCKED: obtest is Unlisted and ships code/);
    const q = session.questions.open().find((x) => x.title === "Run the code of obtest?")!;
    expect(q).toBeTruthy();
    expect(q.text).toContain("scripts/obabel.sh");
    await session.answer(q.qid, "run");
    const ok = await session.useAdapter("obtest", "it reads smiles files");
    expect(ok.ok).toBe(true);
    expect(adapterTrust(root).codeConfirmed).toBe(true);
    await session.close();
    session = undefined;

    writeFileSync(join(root, "scripts", "extra.sh"), "echo hi\n");
    expect(adapterTrust(root).codeConfirmed).toBe(false);
    confirmCode(root);
    expect(adapterTrust(root).codeConfirmed).toBe(true);
  });

  test("the confirmation is also a row action on the Programs page", async () => {
    applyInstall((await prepareAdd(fixture(join(work, "t5"), { code: true }))).id, { confirmed: true });
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-install-cwd-"));
    const [row] = await listPrograms({ cwd, quick: true, only: ["obtest"], lastUsed: () => new Map() });
    expect(row!.codePending).toBe(true);
    const plan = await planAction(row!, "trust-code");
    expect(plan).toMatchObject({ confirm: "Allow", danger: true });
    expect(plan.lines.join(" ")).toContain("scripts/obabel.sh");
    expect(await runAction(plan, { via: "terminal", confirmed: false, cwd, home })).toMatchObject({ ok: false });
    expect(adapterTrust(userAdapterDir("obtest")).codeConfirmed).toBe(false);
    await runAction(plan, { via: "terminal", confirmed: true, cwd, home });
    expect(adapterTrust(userAdapterDir("obtest")).codeConfirmed).toBe(true);
  });

  test("a registry adapter is Checked until its files change", async () => {
    saveInstalled({ name: "obtest", kind: "registry", source: "obtest@1.0.0", version: "1.0.0", sha256: "x", installed_on: "", checked: true });
    const dir = fixture(userAdapterDir("obtest"));
    saveInstalled({ ...readInstalled().obtest!, sha256: hashFolder(dir) });
    expect(adapterTrust(dir).label).toBe("Checked");
    writeFileSync(join(dir, "NOTE.md"), "changed\n");
    expect(adapterTrust(dir)).toMatchObject({ label: "Unlisted", changed: true });
  });
});

describe("the registry", () => {
  const builder = async () => (await import(pathToFileURL(join(__dirname, "../scripts/build-registry-index.mjs")).href)) as { buildIndex(folder: string, o: Record<string, unknown>): Promise<{ index: { adapters: Record<string, any>[] }; skipped: Record<string, any>[] }> };

  function registry(): { dir: string; sha: string } {
    const dir = join(work, "registry");
    mkdirSync(join(dir, "adapters"), { recursive: true });
    fixture(join(dir, "adapters", "obtest"), { name: "obtest", version: "2.0.0" });
    writeFileSync(join(dir, "adapters", "obtest", "LICENSE"), "MIT License\n\nPermission is hereby granted, free of charge, to any person\n");
    fixture(join(dir, "adapters", "bad"), { name: "bad" });
    const bad = join(dir, "adapters", "bad", "adapter.yaml");
    const m = parse(readFileSync(bad, "utf8"));
    m.tools[0].required = ["no_such_argument"];
    writeFileSync(bad, stringify(m));
    return { dir, sha: repo(dir) };
  }

  test("the index builder lists name, version, program, field, file types, author, license, trust, lint, tests, needs and citations", async () => {
    const { dir, sha } = registry();
    const { index, skipped } = await (await builder()).buildIndex(join(dir, "adapters"), { git: `file://${dir}`, commit: sha, repoRoot: dir });
    expect(index.adapters.map((a) => a.name)).toEqual(["obtest"]);
    expect(skipped.map((s) => s.name)).toEqual(["bad"]);
    const e = index.adapters[0]!;
    expect(e).toMatchObject({
      name: "obtest",
      version: "2.0.0",
      program: "Open Babel",
      field: "chemistry",
      file_types: [".smi", ".sdf", ".mol", ".mol2"],
      author: "onboarding agent",
      license: "MIT",
      trust: "checked",
      lint: { ok: true, errors: 0 },
      tests: { ran: 0, failed: 0 },
      needs: { network: false, code: false, programs: ["Open Babel"] },
      path: "adapters/obtest",
      git: `file://${dir}`,
      commit: sha,
    });
    expect(e.citations[0]).toContain("Open Babel");
    expect(e.sha256).toBe(hashFolder(join(dir, "adapters", "obtest")));
  });

  test("a name installs from the registry as Checked, and a changed file is refused", async () => {
    const { dir, sha } = registry();
    const { index } = await (await builder()).buildIndex(join(dir, "adapters"), { git: `file://${dir}`, commit: sha, repoRoot: dir });
    const file = join(work, "index.json");
    writeFileSync(file, JSON.stringify(index));
    writeFileSync(join(home, "settings.json"), JSON.stringify({ adapter_registry: file }));
    const plan = await prepareAdd("obtest");
    expect(plan.refused).toBeUndefined();
    expect(plan.card.trust).toBe("checked");
    expect(plan.entry).toMatchObject({ kind: "registry", version: "2.0.0", commit: sha, checked: true });
    expect(cardLines(plan.card).join("\n")).toContain("Trust: Checked.");
    expect(applyInstall(plan.id, { confirmed: true }).ok).toBe(true);
    expect(adapterTrust(userAdapterDir("obtest")).label).toBe("Checked");
    expect(installedRows()[0]!.trust).toBe("Checked");

    removeInstalled("obtest");
    index.adapters[0]!.sha256 = "0".repeat(64);
    writeFileSync(file, JSON.stringify(index));
    await expect(prepareAdd("obtest")).rejects.toThrow(/do not match the SHA-256/);
    await expect(prepareAdd("nothing-here")).rejects.toThrow(/has no adapter nothing-here/);
  });

  test("an unreachable registry gives one clear line", async () => {
    await expect(fetchIndex("http://127.0.0.1:9/index.json")).rejects.toThrow(/^The adapter registry at http:\/\/127\.0\.0\.1:9\/index\.json is not reachable: .*\. Check the network, or set adapter_registry to another address\.$/);
    await expect(fetchIndex(join(work, "missing.json"))).rejects.toThrow(/is not reachable: no such file/);
    writeFileSync(join(work, "junk.json"), "not json");
    await expect(fetchIndex(join(work, "junk.json"))).rejects.toThrow(/cannot read/);
    const said: string[] = [];
    writeFileSync(join(home, "settings.json"), JSON.stringify({ adapter_registry: "http://127.0.0.1:9/index.json" }));
    expect(await adapterCommand("add", "some-name", { ask: async () => "", say: (l) => said.push(l) })).toBe(1);
    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(/is not reachable/);
    expect(said[0]).not.toContain("\n");
    expect(await adapterCommand("list", undefined, { ask: async () => "", say: (l) => said.push(l) }, { registry: true })).toBe(1);
  });
});

describe("the Claude review", () => {
  const verdict = (text: string) => new FakeProvider([{ text }]);

  test("the card shows the verdict and the cost after the review", async () => {
    const plan = await prepareAdd(fixture(join(work, "rev"), { code: true }));
    expect(plan.review!.text).toMatch(/^about .* with claude-sonnet-5-5/);
    await reviewPlan(plan.id, { provider: verdict("VERDICT: reject\n- [check 1] scripts/obabel.sh:3: sends the input file to a server.\n- [check 3] LICENSE: missing.") });
    const text = cardLines(plan.card).join("\n");
    expect(text).toContain("Claude review: reject.");
    expect(text).toContain("scripts/obabel.sh:3: sends the input file");
    expect(text).toMatch(/Review cost: .* tokens in/);
    expect(text).toContain("The review is advice.");
  });

  test("a reply with no verdict line counts as unknown", async () => {
    const plan = await prepareAdd(fixture(join(work, "rev2")));
    await reviewPlan(plan.id, { provider: verdict("Looks fine to me.") });
    expect(plan.card.audit!.verdict).toBe("unknown");
  });

  test("the command asks before it spends tokens, then shows the verdict and the cost", async () => {
    const dir = fixture(join(work, "aud"));
    const said: string[] = [];
    const prompts: string[] = [];
    const none = await adapterCommand("audit", dir, { ask: async (p) => (prompts.push(p), "n"), say: (l) => said.push(l) });
    expect(none).toBe(0);
    expect(prompts[0]).toMatch(/costs about .* with claude-sonnet-5-5/);
    expect(said.join("\n")).toContain("No review.");
    expect(said.join("\n")).not.toContain("Claude review:");
  });

  test("the local audit and the registry workflow use the same review prompt", () => {
    expect(REVIEW_PROMPT).toMatch(/registry-template\/\.github\/review-prompt\.md$/);
    const prompt = readFileSync(REVIEW_PROMPT, "utf8");
    for (const t of ["file writes", "Network calls", "Shell commands", "credentials", "Obfuscation", "VERDICT: needs-changes"]) expect(prompt.toLowerCase()).toContain(t.toLowerCase().replace("file writes", "writes or deletes of files"));
    const workflow = readFileSync(join(__dirname, "../registry-template/.github/workflows/review.yml"), "utf8");
    expect(workflow).toContain(".github/review-prompt.md");
    expect(workflow).toMatch(/anthropics\/claude-code-action@v\d+\.\d+\.\d+/);
    expect(workflow).toContain("adapter check");
    expect(workflow).toContain("--run-tests");
    for (const f of ["CODEOWNERS", "PULL_REQUEST_TEMPLATE.md"]) expect(existsSync(join(__dirname, "../registry-template/.github", f))).toBe(true);
  });
});

describe("the browser app", () => {
  test("the Programs page has the Add an adapter button and the flow runs through the same plan", async () => {
    const page = appPageHtml("tok");
    expect(page).toContain('id="progaddbtn"');
    expect(page).toContain("Add an adapter");
    expect(page).toContain('id="progreview"');
    const s = new FakeSession();
    s.setPermissionMode("bypass");
    app = await startApp({ session: s, env: {}, review: { provider: new FakeProvider([{ text: "VERDICT: pass\n- [check 1] read all files." }]) } });
    const base = app.url.split("?")[0]!;
    const post = (p: string, body: unknown) => fetch(`${base}${p}?t=${app!.token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
    const src = fixture(join(work, "web"));
    const planned = await post("api/adapters/plan", { source: src });
    expect(planned.plan).toMatchObject({ action: "adapter-add", name: "obtest", confirm: "Install", danger: true });
    expect(planned.plan.lines.join("\n")).toContain("Trust: Unlisted.");
    expect(planned.plan.review).toMatch(/Ask Claude to review the files/);
    const reviewed = await post("api/adapters/review", { install: planned.plan.installId });
    expect(reviewed.plan.lines.join("\n")).toContain("Claude review: pass.");
    expect(reviewed.plan.review).toBeUndefined();
    const no = await post("api/programs/run", { action: "adapter-add", name: "obtest", install: planned.plan.installId });
    expect(no).toMatchObject({ ok: false, text: "Nothing changed. This action needs your confirmation." });
    expect(existsSync(userAdapterDir("obtest"))).toBe(false);
    const yes = await post("api/programs/run", { action: "adapter-add", name: "obtest", install: planned.plan.installId, confirmed: true });
    expect(yes.ok).toBe(true);
    expect(existsSync(userAdapterDir("obtest"))).toBe(true);
    expect(s.record.entries(["program"]).at(-1)!.data).toMatchObject({ action: "adapter-add", adapter: "obtest", via: "app" });
    const bad = await post("api/adapters/plan", { source: join(work, "nowhere") });
    expect(bad.error).toMatch(/not a git address|is not reachable|No adapter/);
    const list = await fetch(`${base}api/programs?t=${app.token}`).then((r) => r.text());
    expect(list).toContain('data-prog="obtest"');
    expect(list).toContain('data-prog-act="adapter-update"');
    expect(list).toContain('data-prog-act="adapter-remove"');
  });
});
