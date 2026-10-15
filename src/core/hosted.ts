import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";

export function hostedMode(env: Record<string, string | undefined> = process.env): boolean {
  if (env.CUVETTE_HOSTED === "1") return true;
  const path = join(cuvetteHome(), "settings.json");
  if (!existsSync(path)) return false;
  try {
    const v = JSON.parse(readFileSync(path, "utf8")).hosted_mode;
    return v === true || v === "on" || v === "true";
  } catch {
    return false;
  }
}
