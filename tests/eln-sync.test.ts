import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { credentialsPath, elabftwConfig, saveElabftw } from "../src/core/credentials.ts";
import type { Session } from "../src/core/session.ts";
import { analysedSession } from "./fixtures/eln-session.ts";
import { startMock, type Mock } from "./fixtures/elabftw-mock.ts";

let s: Session;
let mock: Mock;
beforeEach(async () => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-eln-sync-"));
  mock = await startMock();
  saveElabftw(mock.url, mock.key);
  s = await analysedSession();
});
afterEach(async () => {
  await s.close();
  await mock.close();
});

function approve(ok: boolean, seen: { args?: Record<string, unknown>; touches?: string }[] = []) {
  s.bus.on((e) => {
    if (e.type !== "permission") return;
    seen.push({ args: e.args, touches: e.touches });
    s.respondPermission(e.rid, ok, ok ? "" : "not now");
  });
  return seen;
}

test("the key is saved with mode 600 and the push sends nothing before approval", async () => {
  if (process.platform !== "win32") expect(statSync(credentialsPath()).mode & 0o777).toBe(0o600);
  const seen = approve(false);
  await expect(s.elnPush()).rejects.toThrow(/did not approve/);
  expect(mock.requests).toEqual([]);
  expect(seen).toHaveLength(1);
  expect(s.record.entries(["eln_push"])).toEqual([]);
  expect(s.record.entries(["permission"]).at(-1)!.data).toMatchObject({ tool: "eln_push", decision: "denied" });
});

test("bypass permissions does not skip the eLabFTW confirmation", async () => {
  s.setPermissionMode("bypass");
  const seen = approve(false);
  await expect(s.elnPush()).rejects.toThrow(/did not approve/);
  expect(seen).toHaveLength(1);
  expect(mock.requests).toEqual([]);
});

test("the permission card lists the server, the action and the files", async () => {
  const seen = approve(true);
  await s.elnPush();
  const card = seen[0]!;
  expect(card.args).toMatchObject({ server: mock.url, action: "create a new experiment", not_sent: "input data files" });
  expect(String(card.args!.sends)).toMatch(/\.eln \(.* KB\)/);
  expect(String(card.args!.sends)).toMatch(/trail\.html/);
  expect(card.touches).toContain(mock.url);
});

test("a push creates an experiment, tags it, uploads the files and records the push", async () => {
  approve(true);
  const r = await s.elnPush();
  expect(r).toMatchObject({ experiment: 1, version: 1, created: true });
  const exp = mock.experiments.get(1)!;
  expect(exp.title).toMatch(/How many particles/);
  expect(exp.body).toMatch(/<h1>Version 1, /);
  expect(exp.body).toMatch(/Threshold method/);
  expect(exp.tags).toEqual(["guided-analysis", "lab"]);
  expect(exp.uploads.map((u) => u.name).sort()).toEqual([`${s.id}.eln`, "log.jsonl", "protocol.md", "trail.html"]);
  expect(mock.requests.every((q) => q.auth === mock.key)).toBe(true);
  const e = s.record.entries(["eln_push"]).at(-1)!;
  expect(e.data).toMatchObject({ experiment: 1, version: 1, server: mock.url, created: true });
  expect(String(e.data.hash)).toMatch(/^[0-9a-f]{64}$/);
  expect(String(e.data.url)).toContain("id=1");
});

test("a second push updates the same experiment with a new version section", async () => {
  approve(true);
  await s.elnPush();
  s.record.append("note", { text: "another entry changes the log" });
  const r = await s.elnPush();
  expect(r).toMatchObject({ experiment: 1, version: 2, created: false });
  expect(mock.experiments.size).toBe(1);
  const exp = mock.experiments.get(1)!;
  expect(exp.body).toMatch(/Version 1, [\s\S]*Version 2, /);
  expect(exp.revisions).toHaveLength(2);
  const names = exp.uploads.map((u) => u.name);
  expect(names).toContain("log-v2.jsonl");
  expect(names.filter((n) => n === "protocol.md")).toHaveLength(1);
  expect(mock.requests.filter((q) => q.method === "POST" && q.path === "/api/v2/experiments")).toHaveLength(1);
});

test("a wrong key fails and records no push", async () => {
  saveElabftw(mock.url, "wrong-key");
  approve(true);
  await expect(s.elnPush()).rejects.toThrow(/401/);
  expect(s.record.entries(["eln_push"])).toEqual([]);
});

test("push without setup says how to set up", async () => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-eln-none-"));
  await expect(s.elnPush()).rejects.toThrow(/not set up/);
});

test("link reads the experiment and its items and proposes setup values without applying them", async () => {
  mock.experiments.set(5, {
    id: 5, title: "Particle count plan", body: "<p>Plan</p>", tags: [], uploads: [], revisions: [], items: [7],
    metadata: { extra_fields: { "Threshold method": { type: "select", value: "Triangle" }, min_size: { type: "number", value: "12" }, unrelated: { value: "x" } } },
  });
  mock.items.set(7, { id: 7, title: "Sample 7", body: "", metadata: { extra_fields: { blur: { type: "number", value: "3" }, method: { value: "Bogus" } } } });
  const r = await s.elnLink(5);
  expect(r.text).toMatch(/Experiment 5: Particle count plan/);
  expect(r.text).toMatch(/7: Sample 7/);
  expect(r.proposals.map((p) => [p.key, p.value])).toEqual([["method", "Triangle"], ["min_size", "12"], ["sigma", "3"]]);
  expect(s.decisions.value("method")).toBe("Otsu");
  const link = s.record.entries(["eln_link"]).at(-1)!;
  expect(link.data).toMatchObject({ experiment: 5, title: "Particle count plan", proposed: { method: "Triangle", min_size: "12", sigma: "3" } });
  expect(s.record.entries(["decision"])).toEqual([]);
});

test("after a link, a push updates the linked experiment", async () => {
  mock.experiments.set(5, { id: 5, title: "Plan", body: "<p>Plan</p>", tags: [], uploads: [], revisions: [""], items: [], metadata: null });
  await s.elnLink(5);
  approve(true);
  const r = await s.elnPush();
  expect(r).toMatchObject({ experiment: 5, created: false, version: 1 });
  expect(mock.experiments.get(5)!.body).toMatch(/^<p>Plan<\/p><h1>Version 1/);
});

test("the log and the key never appear in the card or the record", async () => {
  const seen = approve(true);
  await s.elnPush();
  expect(JSON.stringify(seen)).not.toContain(mock.key);
  expect(readFileSync(join(s.dir, "log.jsonl"), "utf8")).not.toContain(mock.key);
});

const ga = join(__dirname, "..", "bin/ga.js");
const cli = (args: string[], input: string) =>
  new Promise<{ stdout: string; stderr: string; status: number | null }>((resolve) => {
    const child = spawn("node", [ga, ...args], { env: { ...process.env, GA_HOME: process.env.GA_HOME } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ stdout, stderr, status }));
    child.stdin.end(input);
  });

test("ga eln push asks in the terminal and sends nothing on n", async () => {
  await s.close();
  const no = await cli(["eln", "push", s.id], "n\n");
  expect(no.stdout).toMatch(/This will be sent/);
  expect(no.stdout).toMatch(/not_sent: input data files/);
  expect(no.stderr).toMatch(/did not approve/);
  expect(mock.requests).toEqual([]);
  const yes = await cli(["eln", "push", s.id], "y\n");
  expect(yes.stdout).toMatch(/Created experiment 1 \(version 1\)/);
  const again = await cli(["eln", "push", s.id], "y\n");
  expect(again.stdout).toMatch(/Updated experiment 1 \(version 2\)/);
  expect(mock.experiments.size).toBe(1);
});

test("ga eln link applies the proposed values only after y", async () => {
  mock.experiments.set(5, { id: 5, title: "Plan", body: "", tags: [], uploads: [], revisions: [], items: [], metadata: { extra_fields: { min_size: { value: "12" } } } });
  await s.close();
  const no = await cli(["eln", "link", s.id, "5"], "n\n");
  expect(no.stdout).toMatch(/Smallest particle = 12/);
  expect(no.stdout).not.toMatch(/Applied/);
  const yes = await cli(["eln", "link", s.id, "5"], "y\n");
  expect(yes.stdout).toMatch(/Applied/);
  const log = readFileSync(join(s.dir, "log.jsonl"), "utf8");
  expect(log).toMatch(/"key":"min_size"/);
});

test("ga eln setup reads the address and key from the terminal and rejects plain http", async () => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-eln-cli-"));
  const bad = await cli(["eln", "setup", "--url", "http://elab.example.org"], "abc\n");
  expect(bad.status).toBe(1);
  expect(elabftwConfig()).toBeUndefined();
  const ok = await cli(["eln", "setup"], "https://elab.example.org\nsecret-key-1234567\n");
  expect(ok.stdout).toContain("Saved the address and key");
  expect(ok.stdout).not.toContain("secret-key-1234567");
  expect(elabftwConfig()).toEqual({ url: "https://elab.example.org", key: "secret-key-1234567" });
  expect((await cli(["eln", "status"], "")).stdout).not.toContain("secret-key-1234567");
});
