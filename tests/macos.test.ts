import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { ACTION_NAME, actionFiles, actionPath, actionScript, installFinderAction, installLauncher, launcherFiles, launcherPath, launcherScript, LAUNCHER_ID, uninstallFinderAction, uninstallLauncher, type CuvettePaths } from "../src/core/macos.ts";

const P: CuvettePaths = { node: "/opt/homebrew/bin/node", cuvette: "/Users/a/Code/guided-analysis/bin/cuvette.js", path: "/opt/homebrew/bin:/usr/bin" };
const mac = process.platform === "darwin";
const unxml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

test("the Quick Action is a Finder service for files and folders with the absolute paths in its script", () => {
  const f = actionFiles(P);
  expect(Object.keys(f).sort()).toEqual(["Contents/Info.plist", "Contents/document.wflow"]);
  const info = f["Contents/Info.plist"]!;
  expect(info).toContain(`<string>${ACTION_NAME}</string>`);
  expect(info).toContain("<string>runWorkflowAsService</string>");
  expect(info).toContain("<string>com.apple.finder</string>");
  expect(info).toContain("<string>public.item</string>");
  const doc = f["Contents/document.wflow"]!;
  expect(doc).toContain("<string>com.apple.Automator.servicesMenu</string>");
  expect(doc).toContain("<key>serviceInputTypeIdentifier</key>\n\t\t<string>com.apple.Automator.fileSystemObject</string>");
  expect(doc).toContain("<key>inputMethod</key>\n\t\t\t\t\t<integer>1</integer>");
  expect(doc).not.toMatch(/\$\$\{|&&(?!amp;)/);
  const script = unxml(/<key>COMMAND_STRING<\/key>\n\t+<string>([\s\S]*?)<\/string>/.exec(doc)![1]!);
  expect(script).toBe(actionScript(P));
  expect(script).toContain("NODE='/opt/homebrew/bin/node'");
  expect(script).toContain("CUVETTE_JS='/Users/a/Code/guided-analysis/bin/cuvette.js'");
  expect(script).toContain(`export PATH="$PATH:"'/opt/homebrew/bin:/usr/bin:/opt/homebrew/bin:/usr/local/bin'`);
  expect(script).toContain(`open -a "$app" --args "$dir"`);
  expect(script).toContain(`"$NODE" "$CUVETTE_JS" app "$dir"`);
  expect(script).toContain("open -a Terminal");
});

test("the launcher is a small app bundle that asks for a folder", () => {
  const f = launcherFiles(P);
  expect(Object.keys(f).sort()).toEqual(["Contents/Info.plist", "Contents/MacOS/Cuvette"]);
  const info = f["Contents/Info.plist"]!;
  expect(info).toContain("<key>CFBundleExecutable</key>\n\t<string>Cuvette</string>");
  expect(info).toContain(`<string>${LAUNCHER_ID}</string>`);
  expect(info).toContain("<key>LSUIElement</key>\n\t<true/>");
  const sh = f["Contents/MacOS/Cuvette"]!;
  expect(sh.startsWith("#!/bin/bash\n")).toBe(true);
  expect(sh).toBe(launcherScript(P));
  expect(sh).toContain("choose folder with prompt");
  expect(sh).toContain(`cuvette_run "$(cuvette_folder "$dir")"`);
});

test.skipIf(process.platform === "win32")("install and uninstall write and remove the bundles in a home folder", () => {
  const home = mkdtempSync(join(tmpdir(), "cuvette-mac-"));
  const a = installFinderAction({ home, paths: P });
  expect(a).toBe(join(home, "Library/Services", `${ACTION_NAME}.workflow`));
  expect(a).toBe(actionPath(home));
  expect(readdirSync(join(a, "Contents")).sort()).toEqual(["Info.plist", "document.wflow"]);
  const l = installLauncher({ home, paths: P });
  expect(l).toBe(launcherPath(home));
  expect(statSync(join(l, "Contents/MacOS/Cuvette")).mode & 0o777).toBe(0o755);
  if (mac) {
    for (const f of [join(a, "Contents/Info.plist"), join(a, "Contents/document.wflow"), join(l, "Contents/Info.plist")]) expect(spawnSync("plutil", ["-lint", f]).status, f).toBe(0);
    expect(spawnSync("/bin/bash", ["-n", join(l, "Contents/MacOS/Cuvette")]).status).toBe(0);
  }
  expect(uninstallFinderAction({ home })).toBe(true);
  expect(uninstallFinderAction({ home })).toBe(false);
  expect(uninstallLauncher({ home })).toBe(true);
  expect(existsSync(l)).toBe(false);
});

function sandbox(withApp: boolean) {
  const root = mkdtempSync(join(tmpdir(), "cuvette-mac-run-"));
  const bin = join(root, "bin");
  mkdirSync(bin);
  const log = join(root, "calls.log");
  const stub = (name: string, body: string) => {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
    return join(bin, name);
  };
  stub("open", `echo "open $*" >> '${log}'`);
  stub("osascript", `echo "osascript" >> '${log}'`);
  const node = stub("node", `if [ "$2" = help ]; then ${withApp ? "echo '  cuvette app [<folder>]'" : "echo '  cuvette models'"}; else echo "node $* in $(pwd)" >> '${log}'; fi`);
  const cuvette = join(root, "cuvette.js");
  writeFileSync(cuvette, "");
  const data = join(root, "data dir");
  mkdirSync(data);
  writeFileSync(join(data, "a.csv"), "x\n");
  const env = { PATH: `${bin}:/usr/bin:/bin`, HOME: join(root, "home"), TMPDIR: root + "/" };
  return { root, log, data, env, paths: { node, cuvette, path: "" } };
}

const waitFor = (f: string) => {
  for (let i = 0; i < 50 && !(existsSync(f) && readFileSync(f, "utf8").includes("node")); i++) spawnSync("/bin/sleep", ["0.1"]);
  return existsSync(f) ? readFileSync(f, "utf8") : "";
};

test.runIf(mac)("the launcher starts cuvette app in the folder when cuvette has the app command", () => {
  const s = sandbox(true);
  const r = spawnSync("/bin/bash", ["-c", launcherScript(s.paths), "Cuvette", s.data], { env: s.env, encoding: "utf8" });
  expect(r.status).toBe(0);
  expect(waitFor(s.log)).toContain(`node ${s.paths.cuvette} app ${s.data} in ${s.data}`);
  expect(readFileSync(join(s.env.HOME, ".cuvette/logs/launcher.log"), "utf8")).toContain(`cuvette app ${s.data}`);
});

test.runIf(mac)("the launcher falls back to Terminal with cuvette in the folder", () => {
  const s = sandbox(false);
  spawnSync("/bin/bash", ["-c", launcherScript(s.paths), "Cuvette", s.data], { env: s.env });
  const call = readFileSync(s.log, "utf8").trim();
  expect(call).toMatch(/^open -a Terminal .*cuvette-\d+\.command$/);
  const cmd = readFileSync(call.split(" ").pop()!, "utf8");
  expect(cmd).toBe(`#!/bin/bash\nrm -f "$0"\ncd ${s.data.replace(/ /g, "\\ ")} && exec ${s.paths.node} ${s.paths.cuvette}\n`);
});

test.runIf(mac && !existsSync("/Applications/Cuvette.app"))("the Quick Action uses the folder of a file, and opens Cuvette.app when it is installed", () => {
  const s = sandbox(true);
  spawnSync("/bin/bash", ["-c", actionScript(s.paths), "action", join(s.data, "a.csv")], { env: s.env });
  expect(waitFor(s.log)).toContain(`node ${s.paths.cuvette} app ${s.data} in ${s.data}`);
  const t = sandbox(true);
  mkdirSync(join(t.env.HOME, "Applications/Cuvette.app"), { recursive: true });
  spawnSync("/bin/bash", ["-c", actionScript(t.paths), "action", t.data], { env: t.env });
  expect(readFileSync(t.log, "utf8").trim()).toBe(`open -a ${join(t.env.HOME, "Applications/Cuvette.app")} --args ${t.data}`);
  const d = sandbox(true);
  const desktop = join(d.env.HOME, "Applications/Cuvette.app");
  mkdirSync(join(desktop, "Contents"), { recursive: true });
  writeFileSync(join(desktop, "Contents/Info.plist"), "<string>com.elparko.cuvette</string>");
  spawnSync("/bin/bash", ["-c", actionScript(d.paths), "action", d.data], { env: d.env });
  expect(readFileSync(d.log, "utf8").trim()).toBe(`open -a ${desktop} ${d.data}`);
});
