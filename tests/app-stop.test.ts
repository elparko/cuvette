import { spawn } from "node:child_process";
import { join } from "node:path";
import { expect, test } from "vitest";
import { TSX_CLI } from "../src/adapters/kinds/common.ts";

test.skipIf(process.platform === "win32")("a second Ctrl+C while the app closes slowly ends the process with code 130", async () => {
  const code = `import { stopApp } from ${JSON.stringify(join(__dirname, "../src/server/app.ts"))}; setInterval(() => {}, 1000); process.once("SIGINT", () => { void stopApp(() => new Promise(() => {})); console.log("stopping"); }); console.log("ready");`;
  const child = spawn(process.execPath, [TSX_CLI, "--eval", code], { stdio: ["ignore", "pipe", "ignore"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  const exit = new Promise<number | null>((done) => child.on("exit", (c) => done(c)));
  const waitFor = async (text: string) => {
    for (let i = 0; i < 600 && !out.includes(text); i++) await new Promise((r) => setTimeout(r, 50));
    expect(out).toContain(text);
  };
  try {
    await waitFor("ready");
    child.kill("SIGINT");
    await waitFor("stopping");
    child.kill("SIGINT");
    expect(await exit).toBe(130);
  } finally {
    child.kill("SIGKILL");
  }
}, 60_000);

test.skipIf(process.platform === "win32")("a second SIGTERM while the app closes slowly ends the process with code 143", async () => {
  const code = `import { stopApp } from ${JSON.stringify(join(__dirname, "../src/server/app.ts"))}; setInterval(() => {}, 1000); process.on("SIGTERM", () => {}); process.once("SIGTERM", () => { void stopApp(() => new Promise(() => {})); console.log("stopping"); }); console.log("ready");`;
  const child = spawn(process.execPath, [TSX_CLI, "--eval", code], { stdio: ["ignore", "pipe", "ignore"] });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  const exit = new Promise<number | null>((done) => child.on("exit", (c) => done(c)));
  const waitFor = async (text: string) => {
    for (let i = 0; i < 600 && !out.includes(text); i++) await new Promise((r) => setTimeout(r, 50));
    expect(out).toContain(text);
  };
  try {
    await waitFor("ready");
    child.kill("SIGTERM");
    await waitFor("stopping");
    child.kill("SIGTERM");
    expect(await exit).toBe(143);
  } finally {
    child.kill("SIGKILL");
  }
}, 60_000);
