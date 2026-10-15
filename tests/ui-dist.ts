import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { UI_DIST } from "../src/server/app.ts";

const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "src", "ui-web");

function newestSource(dir: string): number {
  let newest = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const t = e.isDirectory() ? newestSource(join(dir, e.name)) : statSync(join(dir, e.name)).mtimeMs;
    if (t > newest) newest = t;
  }
  return newest;
}

export function ensureUiBuild() {
  const index = join(UI_DIST, "index.html");
  if (existsSync(index) && statSync(index).mtimeMs >= newestSource(SOURCE)) return;
  execFileSync("npx", ["vite", "build", "--config", "src/ui-web/vite.config.ts", "--logLevel", "warn"], { cwd: ROOT, stdio: "ignore" });
}
