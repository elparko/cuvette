import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import type { Check } from "../src/core/doctor.ts";
import type { ProgramRow } from "../src/core/programs.ts";
import { startApp, UI_DIST, type AppHandle } from "../src/server/app.ts";
import { doctorJson, programsJson, sessionsJson, settingsJson } from "../src/server/app-json.ts";
import { FakeSession } from "../src/ui/fake-session.ts";

const oldHome = process.env.CUVETTE_HOME;
let cwd = "";
let app: AppHandle | undefined;

beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-home-"));
  cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
});
afterEach(async () => {
  await app?.close();
  app = undefined;
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

const DAY = 86_400_000;

test("sessionsJson gives a title, a clipped text, the folder name, the age and a thumbnail link", () => {
  const now = Date.now();
  const list = sessionsJson(
    [
      { id: "a", cwd: "/data/exp-12", used: now - 2 * DAY, ask: "Is drug 2 better?", name: "Drug 2 vs drug 1", description: "x".repeat(300), status: "answered", figure: "/data/exp-12/fig.png" },
      { id: "b", cwd: "/data/old", used: now, ask: "", moved: true },
    ],
    "tok",
    now,
  );
  expect(list[0]).toMatchObject({ id: "a", title: "Drug 2 vs drug 1", folderName: "exp-12", status: "answered", moved: false, thumb: "api/thumb?id=a&t=tok" });
  expect(list[0]!.text.length).toBe(220);
  expect(list[0]!.text.endsWith("…")).toBe(true);
  expect(list[1]).toMatchObject({ title: "No request yet", status: "moved", moved: true, thumb: "" });
});

test("programsJson groups the rows by field and splits each row into state, tags and actions", () => {
  const row = (over: Partial<ProgramRow>): ProgramRow =>
    ({ name: "fiji", program: "Fiji", field: "imaging", root: "/r", adapterStatus: "approved", state: "missing", version: "", tested: [], how: "", detail: "Not found.", access: {}, codeTools: [], trust: "reviewed", trustDetail: "", codePending: false, codeFiles: [], ...over }) as ProgramRow;
  const j = programsJson([row({}), row({ name: "napari", program: "napari", state: "installed", version: "0.6.1", size: 2048, access: { off: true }, network: false })], { checking: true });
  expect(j.checking).toBe(true);
  expect(j.summary).toContain("Checking versions and sizes");
  expect(j.groups).toHaveLength(1);
  expect(j.groups[0]!.title).toBe("Imaging");
  const [fiji, napari] = j.groups[0]!.rows;
  expect(fiji).toMatchObject({ program: "Fiji", tone: "bad", off: false });
  expect(fiji!.actions.map((a) => a.action)).toContain("path");
  expect(napari).toMatchObject({ tone: "ok", version: "0.6.1", off: true });
  expect(napari!.tags.map((t) => t.text)).toEqual(expect.arrayContaining(["off", "no network"]));
});

test("settingsJson gives each row its control, its choices and the scopes where it can save", () => {
  const j = settingsJson({ cwd, env: {} }, false);
  expect(j.sections.length).toBeGreaterThan(3);
  const model = j.rows.find((r) => r.name === "model")!;
  expect(model.control).toBe("options");
  expect(model.choices.some((c) => c.note.includes("per million tokens"))).toBe(true);
  expect(model.scopes.map((s) => s.id)).not.toContain("session");
  const mode = j.rows.find((r) => r.name === "mode")!;
  expect(mode.control).toBe("segmented");
  expect(mode.choices.map((c) => c.value)).toEqual(expect.arrayContaining(["watch", "follow", "teach", "plan"]));
  const spend = j.rows.find((r) => r.name === "spend_month")!;
  expect(spend.spend?.text).toContain("this month");
});

test("doctorJson keeps the fix command, the link and the counts", () => {
  const checks: Check[] = [
    { id: "node", group: "Core" as never, name: "Node", status: "ok" as never, detail: "v24" },
    { id: "fiji", group: "Programs" as never, name: "Fiji", status: "missing" as never, detail: "Not found.", fix: { command: "brew install --cask fiji", link: "https://fiji.sc" } as never },
  ];
  const j = doctorJson(checks, true);
  expect(j.ready).toBe(true);
  expect(j.counts).toEqual({ ok: 1, missing: 1, old: 0 });
  expect(j.checks[1]).toMatchObject({ command: "brew install --cask fiji", link: "https://fiji.sc" });
});

test("the server gives the JSON routes, the new page and the old page", async () => {
  const s = new FakeSession();
  s.cwd = cwd;
  app = await startApp({ session: s, env: {}, doctor: async () => [{ id: "node", group: "Core" as never, name: "Node", status: "ok" as never, detail: "v24" }] });
  const base = `http://127.0.0.1:${app.port}`;
  const t = app.token;
  const settings = await (await fetch(`${base}/api/settings.json?t=${t}`)).json();
  expect(settings.rows.find((r: { name: string }) => r.name === "mode").scopes.map((x: { id: string }) => x.id)).toContain("session");
  expect(Array.isArray(await (await fetch(`${base}/api/sessions.json?t=${t}`)).json())).toBe(true);
  const doc = await (await fetch(`${base}/api/doctor`, { method: "POST", headers: { "content-type": "application/json", "x-token": t }, body: JSON.stringify({ json: true, all: true }) })).json();
  expect(doc).toMatchObject({ counts: { ok: 1, missing: 0 } });
  expect(doc.checks.map((c: { id: string }) => c.id)).toEqual(["node"]);
  expect((await fetch(`${base}/api/settings.json`)).status).toBe(401);
  expect((await (await fetch(`${base}/api/state?t=${t}`)).json()).finder).toBe(false);
  expect((await fetch(`${base}/api/choose-folder`, { method: "POST", headers: { "content-type": "application/json", "x-token": t }, body: "{}" })).status).toBe(501);
  const old = await (await fetch(`${base}/?ui=old&t=${t}`)).text();
  expect(old).toContain("window.cuvetteDesktop");
  const page = await (await fetch(`${base}/?t=${t}`)).text();
  expect(page).toContain("<title>Cuvette</title>");
  if (existsSync(join(UI_DIST, "index.html"))) expect(page).toContain('<div id="root">');
});

test("the server sends the built assets without the token, and only from the assets folder", async () => {
  const dir = join(UI_DIST, "assets");
  const made = !existsSync(dir);
  mkdirSync(dir, { recursive: true });
  const name = "test-asset-0123.js";
  writeFileSync(join(dir, name), "console.log(1)");
  app = await startApp({ session: new FakeSession(), env: {} });
  const base = `http://127.0.0.1:${app.port}`;
  try {
    const r = await fetch(`${base}/assets/${name}`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("javascript");
    expect((await fetch(`${base}/assets/..%2F..%2Fpackage.json`)).status).toBe(401);
    expect((await fetch(`${base}/assets/nothing.js`)).status).toBe(401);
  } finally {
    (await import("node:fs")).rmSync(made ? dir : join(dir, name), { recursive: true, force: true });
  }
});
