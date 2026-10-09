import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { startApp } from "../../src/server/app.ts";

const MARK = "__CUVETTE_PATH__";
const home = homedir();
const CACHE = join(home, ".guided-analysis", "desktop-path.txt");

function loginPath(): Promise<string> {
  return new Promise((done) => {
    execFile(process.env.SHELL || "/bin/zsh", ["-ilc", `printf '${MARK}%s${MARK}' "$PATH"`], { encoding: "utf8", timeout: 8000 }, (_e, out) => done(String(out ?? "").split(MARK)[1] ?? ""));
  });
}

function setPath(login: string) {
  const parts = [login, process.env.PATH ?? "", "/opt/homebrew/bin", "/usr/local/bin", `${home}/.local/bin`, `${home}/.cargo/bin`, dirname(process.execPath)];
  process.env.PATH = [...new Set(parts.join(":").split(":").filter(Boolean))].join(":");
}

const base = process.env.PATH ?? "";
let cached = "";
try {
  cached = readFileSync(CACHE, "utf8").trim();
} catch {}
const fresh = loginPath().then((p) => {
  if (!p) return;
  process.env.PATH = base;
  setPath(p);
  try {
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(CACHE, p);
  } catch {}
});
if (cached) setPath(cached);
else await fresh;

const folder = process.argv[2] || undefined;
const app = await startApp({ folder, start: folder ?? home });
process.stdout.write(`${JSON.stringify({ port: app.port, token: app.token, url: app.url })}\n`);

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await app.close().catch(() => {});
  process.exit(0);
};
process.stdin.on("end", stop);
process.stdin.on("close", stop);
process.stdin.resume();
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
