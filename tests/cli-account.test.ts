import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { cuvetteToken, saveCuvetteToken } from "../src/core/credentials.ts";

const cuvette = join(__dirname, "..", "bin/cuvette.js");
const oldHome = process.env.CUVETTE_HOME;
let home = "";
let server: Server | undefined;
let calls: { method: string; url: string; auth?: string; body: string }[] = [];

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-cli-acc-"));
  process.env.CUVETTE_HOME = home;
  calls = [];
});
afterEach(async () => {
  await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
  server = undefined;
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

const ACCOUNT = {
  account_id: "acc_9",
  identities: [{ provider: "orcid", email: null }],
  plan: "lab",
  interval: "year",
  sub_status: "active",
  period_end: "2027-10-14T00:00:00Z",
  allowance_usd: 46,
  allowance_remaining_usd: 40.5,
  topup_remaining_usd: 0,
  analyses_left_estimate: 65,
  mean_cost_per_analysis_usd: 0.62,
  resets_at: "2026-11-14T00:00:00Z",
  models: [],
};

async function api(): Promise<string> {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      calls.push({ method: req.method!, url: req.url!, auth: req.headers.authorization, body });
      const send = (status: number, j?: unknown) => (res.writeHead(status, { "content-type": "application/json" }), res.end(j === undefined ? undefined : JSON.stringify(j)));
      if (req.url === "/v1/account") return send(200, ACCOUNT);
      if (req.url === "/v1/auth/logout") return send(204);
      if (req.url === "/v1/auth/token") return send(200, { token: "cuv_from_login", device_id: "dev_1", account_id: "acc_9" });
      if (req.url === "/v1/auth/link") return send(200, { url: "https://api.cuvette.ai/v1/auth/start?link=abc" });
      if (req.url === "/v1/plan") return send(200, { status: "scheduled", effective_at: "2026-11-14T00:00:00Z" });
      if (req.url === "/v1/checkout") return send(200, { url: "https://checkout.stripe.com/x" });
      send(404, {});
    });
  });
  await new Promise<void>((done) => server!.listen(0, "127.0.0.1", () => done()));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

const cli = (args: string[], env: Record<string, string> = {}, stdin = "") =>
  new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
    const child = spawn("node", [cuvette, ...args], { env: { ...process.env, CUVETTE_HOME: home, CUVETTE_NO_OPEN: "1", CUVETTE_TOKEN: "", CUVETTE_HOSTED: "", ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ stdout, stderr, code }));
    child.stdin.end(stdin);
  });

test("hosted mode off: the account command stops and the help does not name it", async () => {
  const r = await cli(["account", "status"]);
  expect(r.code).toBe(1);
  expect(r.stderr).toContain("Cuvette hosted mode is off");
  const help = await cli(["--help"]);
  expect(help.stdout).not.toContain("cuvette account");
  expect(help.stdout).not.toContain('"cuvette" or');
});

test("hosted mode on: the help names the account commands and not the removed ones", async () => {
  const help = await cli(["--help"], { CUVETTE_HOSTED: "1" });
  expect(help.stdout).toContain("cuvette account login [--provider google|microsoft|orcid|github] [--no-browser]");
  expect(help.stdout).toContain("cuvette account plan <id> [--yearly]");
  expect(help.stdout).not.toMatch(/account (create|buy)/);
  expect(help.stdout).toContain('"cuvette" or "cuvette:<model id>"');
});

test("the removed commands show the usage line", async () => {
  for (const sub of ["create", "buy"]) {
    const r = await cli(["account", sub], { CUVETTE_HOSTED: "1" });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("usage: cuvette account login|link|status|plan <id>|topup|billing|logout");
  }
});

test("status without a sign-in", async () => {
  const r = await cli(["account", "status"], { CUVETTE_HOSTED: "1" });
  expect(r.stdout).toContain("You are not signed in to Cuvette");
});

test("status shows the plan, the allowance in dollars and the analyses left", async () => {
  const url = await api();
  saveCuvetteToken("cuv_abcdefghijkl");
  const r = await cli(["account", "status"], { CUVETTE_HOSTED: "1", CUVETTE_INFERENCE_URL: url });
  expect(r.stdout).toContain("Plan: Lab, billed each year. Status: active.");
  expect(r.stdout).toContain("Allowance: $40.50 of $46.00 left.");
  expect(r.stdout).toContain("about 65 analyses left");
  expect(calls[0]).toMatchObject({ url: "/v1/account", auth: "Bearer cuv_abcdefghijkl" });
});

test("logout revokes the device and removes the token", async () => {
  const url = await api();
  saveCuvetteToken("cuv_abc");
  const r = await cli(["account", "logout"], { CUVETTE_HOSTED: "1", CUVETTE_INFERENCE_URL: url });
  expect(r.stdout).toContain("Signed out. Cuvette revoked this device.");
  expect(calls[0]).toMatchObject({ method: "POST", url: "/v1/auth/logout" });
  expect(cuvetteToken({}).from).toBe("none");
});

test("login --no-browser prints the start URL and takes the pasted code", async () => {
  const url = await api();
  const r = await cli(["account", "login", "--provider", "github", "--no-browser"], { CUVETTE_HOSTED: "1", CUVETTE_INFERENCE_URL: url }, "pasted-code\n");
  const start = new URL(r.stdout.split("\n").find((l) => l.includes("/v1/auth/start"))!);
  expect(start.searchParams.get("port")).toBe("paste");
  expect(start.searchParams.get("provider")).toBe("github");
  const token = calls.find((c) => c.url === "/v1/auth/token")!;
  expect(JSON.parse(token.body)).toMatchObject({ code: "pasted-code" });
  expect(cuvetteToken({}).token).toBe("cuv_from_login");
  expect(r.stdout).toContain("Account acc_9");
});

test("link --no-browser asks for the link with the device token and takes the pasted code", async () => {
  const url = await api();
  saveCuvetteToken("cuv_old");
  const r = await cli(["account", "link", "--provider", "github", "--no-browser"], { CUVETTE_HOSTED: "1", CUVETTE_INFERENCE_URL: url }, "pasted-code\n");
  expect(r.code).toBe(0);
  const link = calls.find((c) => c.url === "/v1/auth/link")!;
  expect(link).toMatchObject({ method: "POST", auth: "Bearer cuv_old" });
  expect(JSON.parse(link.body)).toMatchObject({ provider: "github", port: "paste" });
  expect(r.stdout).toContain("link=abc");
  expect(r.stdout).toContain("The account has a new sign-in method: github.");
  expect(cuvetteToken({}).token).toBe("cuv_from_login");
});

test("link needs a provider and a sign-in", async () => {
  const none = await cli(["account", "link"], { CUVETTE_HOSTED: "1" });
  expect(none.code).toBe(1);
  expect(none.stderr).toContain("usage: cuvette account link --provider");
  const out = await cli(["account", "link", "--provider", "github", "--no-browser"], { CUVETTE_HOSTED: "1" });
  expect(out.code).toBe(1);
  expect(out.stderr).toContain("You are not signed in to Cuvette");
});

test("login stops with a non-zero code and the text when the sign-in is denied", async () => {
  const child = spawn("node", [cuvette, "account", "login", "--provider", "github"], { env: { ...process.env, CUVETTE_HOME: home, CUVETTE_NO_OPEN: "1", CUVETTE_TOKEN: "", CUVETTE_HOSTED: "1" } });
  let stdout = "";
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  const closed = new Promise<number | null>((resolve) => child.on("close", resolve));
  await new Promise<void>((resolve) => {
    child.stdout.on("data", async (d) => {
      stdout += d;
      const line = stdout.split("\n").find((l) => l.includes("/v1/auth/start"));
      if (!line || !stdout.includes("\n", stdout.indexOf(line) + line.length - 1)) return;
      child.stdout.removeAllListeners("data");
      const u = new URL(line);
      await fetch(`http://127.0.0.1:${u.searchParams.get("port")}/auth/cuvette?error=access_denied&state=${u.searchParams.get("state")}`);
      resolve();
    });
  });
  expect(await closed).toBe(1);
  expect(stderr).toContain("You stopped the sign-in.");
  expect(cuvetteToken({}).from).toBe("none");
});

test("login with an unknown provider stops", async () => {
  const r = await cli(["account", "login", "--provider", "yahoo", "--no-browser"], { CUVETTE_HOSTED: "1" });
  expect(r.code).toBe(1);
  expect(r.stderr).toContain("Choose a provider");
});

test("plan for an account with a plan asks the server to change it", async () => {
  const url = await api();
  saveCuvetteToken("cuv_abc");
  const r = await cli(["account", "plan", "basic", "--yearly"], { CUVETTE_HOSTED: "1", CUVETTE_INFERENCE_URL: url });
  expect(JSON.parse(calls.find((c) => c.url === "/v1/plan")!.body)).toEqual({ plan: "basic", interval: "year" });
  expect(r.stdout).toContain("The plan changes on");
});
